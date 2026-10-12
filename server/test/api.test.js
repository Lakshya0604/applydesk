import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import User from "../src/models/User.js";
import Application from "../src/models/Application.js";
let mongo, app, alice, bob, applicationId;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Application.init()]);
  app = createApp({
    jwtSecret: "test-only-secret-never-use-in-production-12345",
  });
  alice = request.agent(app);
  bob = request.agent(app);
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
const credentials = {
  name: "Demo User",
  email: "demo@example.com",
  password: "correct-horse-test-123",
};
describe("authentication and private application API", () => {
  it("rejects missing and malformed login data", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "bad", password: "x", name: "A" });
    assert.equal(response.status, 400);
    assert.ok(response.body.details.length >= 2);
    assert.equal((await request(app).get("/api/applications")).status, 401);
  });
  it("registers with an HTTP-only session and never returns password hashes", async () => {
    const response = await alice.post("/api/auth/register").send(credentials);
    assert.equal(response.status, 201);
    assert.equal(response.body.user.email, credentials.email);
    assert.match(response.headers["set-cookie"][0], /HttpOnly/);
    assert.match(response.headers["set-cookie"][0], /SameSite=Strict/);
    assert.equal(response.body.user.passwordHash, undefined);
    const stored = await User.findOne({ email: credentials.email }).select(
      "+passwordHash",
    );
    assert.notEqual(stored.passwordHash, credentials.password);
  });
  it("handles duplicate accounts and incorrect credentials", async () => {
    assert.equal(
      (await request(app).post("/api/auth/register").send(credentials)).status,
      409,
    );
    assert.equal(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: credentials.email, password: "incorrect-password" })
      ).status,
      401,
    );
    assert.equal(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: credentials.email, password: credentials.password })
      ).status,
      200,
    );
    assert.equal(
      (await alice.get("/api/auth/me")).body.user.name,
      credentials.name,
    );
  });
  it("enforces the bcrypt UTF-8 byte limit on registration and login", async () => {
    const password72Bytes = `${"a".repeat(70)}é`;
    const password73Bytes = `${password72Bytes}a`;
    const user = {
      name: "Multibyte User",
      email: "multibyte@example.com",
      password: password72Bytes,
    };

    assert.equal(Buffer.byteLength(password72Bytes, "utf8"), 72);
    assert.equal(Buffer.byteLength(password73Bytes, "utf8"), 73);
    assert.equal(
      (await request(app).post("/api/auth/register").send(user)).status,
      201,
    );
    assert.equal(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: user.email, password: password72Bytes })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: user.email, password: password73Bytes })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(app)
          .post("/api/auth/register")
          .send({
            ...user,
            email: "over-limit@example.com",
            password: password73Bytes,
          })
      ).status,
      400,
    );
  });
  it("creates, persists and lists applications", async () => {
    const response = await alice
      .post("/api/applications")
      .send({
        company: "Northstar",
        role: "MERN intern",
        status: "Applied",
        location: "Remote",
        appliedAt: "2026-10-01",
        followUpAt: "2020-01-01",
      });
    assert.equal(response.status, 201);
    applicationId = response.body.item._id;
    const list = await alice.get("/api/applications");
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].company, "Northstar");
  });
  it("validates IDs, unsafe URLs, dates, enums and mass-assignment fields", async () => {
    assert.equal(
      (await alice.patch("/api/applications/nope").send({ status: "Offer" }))
        .status,
      400,
    );
    for (const extra of [
      { status: "Unknown" },
      { url: "javascript:alert(1)" },
      { followUpAt: "2026-99-99" },
      { user: new mongoose.Types.ObjectId().toString() },
    ]) {
      const response = await alice
        .post("/api/applications")
        .send({ company: "Bad", role: "Bad", ...extra });
      assert.equal(response.status, 400);
    }
    assert.equal(
      (await alice.patch(`/api/applications/${applicationId}`).send({})).status,
      400,
    );
  });
  it("escapes regex searches and filters/paginates", async () => {
    await alice
      .post("/api/applications")
      .send({ company: "A.B Labs", role: "Developer", status: "Interview" });
    assert.equal((await alice.get("/api/applications?q=A.B")).body.total, 1);
    assert.equal((await alice.get("/api/applications?q=.*")).body.total, 0);
    assert.equal(
      (await alice.get("/api/applications?status=Interview")).body.total,
      1,
    );
    const page = await alice.get("/api/applications?limit=1&page=2");
    assert.equal(page.body.items.length, 1);
    assert.equal(page.body.pages, 2);
    assert.equal((await alice.get("/api/applications?page=0")).status, 400);
  });
  it("keeps dashboard totals global, with UTC follow-up dates", async () => {
    const response = await alice.get("/api/applications/stats");
    assert.equal(response.body.total, 2);
    assert.equal(response.body.counts.Interview, 1);
    assert.equal(response.body.followUpsDue, 1);
  });
  it("isolates user data on list, stats, update and delete", async () => {
    await bob
      .post("/api/auth/register")
      .send({ ...credentials, email: "other@example.com" });
    assert.equal((await bob.get("/api/applications")).body.total, 0);
    assert.equal((await bob.get("/api/applications/stats")).body.total, 0);
    assert.equal(
      (
        await bob
          .patch(`/api/applications/${applicationId}`)
          .send({ status: "Offer" })
      ).status,
      404,
    );
    assert.equal(
      (await bob.delete(`/api/applications/${applicationId}`).send({})).status,
      404,
    );
  });
  it("updates only requested fields, then deletes an owned application", async () => {
    const response = await alice
      .patch(`/api/applications/${applicationId}`)
      .send({ status: "Offer" });
    assert.equal(response.status, 200);
    assert.equal(response.body.item.status, "Offer");
    assert.equal(response.body.item.company, "Northstar");
    assert.equal(
      (await alice.get("/api/applications/stats")).body.followUpsDue,
      0,
    );
    assert.equal(
      (await alice.delete(`/api/applications/${applicationId}`).send({}))
        .status,
      204,
    );
    assert.equal(
      (await alice.delete(`/api/applications/${applicationId}`).send({}))
        .status,
      404,
    );
  });
  it("rejects cross-site form content types and clears sessions on logout", async () => {
    assert.equal(
      (await alice.post("/api/auth/logout").type("form").send({})).status,
      415,
    );
    assert.equal((await alice.post("/api/auth/logout").send({})).status, 204);
    assert.equal((await alice.get("/api/auth/me")).status, 401);
    assert.equal((await request(app).get("/api/missing")).status, 404);
  });
});
