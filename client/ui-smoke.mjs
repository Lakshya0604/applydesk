import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.BASE_URL || "http://127.0.0.1:4000");
await page.getByRole("heading", { name: "Welcome back." }).waitFor();
await page.screenshot({ path: "../docs/sign-in.png", fullPage: true, timeout: 10000 });
await page
  .getByRole("button", { name: "Create an account", exact: true })
  .click();
await page.getByLabel("Your name").fill("Demo User");
await page.getByLabel("Email address").fill(`demo-${Date.now()}@example.com`);
await page
  .getByLabel("Password", { exact: true })
  .fill("demo-password-only-123");
await page.getByRole("button", { name: "Create account", exact: true }).click();
await page.getByRole("heading", { name: "Your next chapter." }).waitFor();
await page.getByText("Your board is a fresh start.").waitFor();
const examples = [
  {
    company: "Northstar Labs",
    role: "MERN Developer Intern",
    location: "Remote",
    status: "Interview",
    appliedAt: "2026-10-02",
    followUpAt: "2026-10-10",
  },
  {
    company: "Bluebird Studio",
    role: "Frontend Developer",
    location: "Bengaluru / Hybrid",
    status: "Applied",
    appliedAt: "2026-10-05",
    followUpAt: "2026-10-17",
  },
  {
    company: "Evergreen Tech",
    role: "Full Stack Intern",
    location: "Remote",
    status: "Offer",
    appliedAt: "2026-09-28",
  },
  {
    company: "Orbit Systems",
    role: "React Developer",
    location: "Delhi",
    status: "Saved",
  },
  {
    company: "Cedar Digital",
    role: "Software Engineer Intern",
    location: "Pune / Remote",
    status: "Applied",
    appliedAt: "2026-10-08",
    followUpAt: "2026-10-14",
  },
  {
    company: "Atlas Works",
    role: "Junior Web Developer",
    location: "Remote",
    status: "Rejected",
    appliedAt: "2026-09-25",
  },
];
for (const item of examples) {
  await page
    .getByRole("button", { name: "Add application", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Company", { exact: true }).fill(item.company);
  await dialog.getByLabel("Role", { exact: true }).fill(item.role);
  await dialog.getByLabel("Location", { exact: true }).fill(item.location);
  await dialog.locator("select[name=status]").selectOption(item.status);
  if (item.appliedAt)
    await dialog.getByLabel("Applied on").fill(item.appliedAt);
  if (item.followUpAt)
    await dialog.getByLabel("Follow up on").fill(item.followUpAt);
  await dialog.getByRole("button", { name: "Save application" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: item.company, exact: true }).waitFor();
}
await page.screenshot({
  path: "../docs/dashboard-desktop.png",
  fullPage: true, timeout: 10000,
});
await page.getByRole("button", { name: "Northstar Labs", exact: true }).click();
await page.getByRole("dialog").waitFor();
await page.screenshot({ path: "../docs/edit-application.png", fullPage: true, timeout: 10000 });
await page
  .getByLabel("Notes")
  .fill("Prepare a short walkthrough of API design and ownership checks.");
await page.getByRole("button", { name: "Save application" }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
await page.getByRole("button", { name: /^Interview/ }).click();
await page
  .getByRole("button", { name: "Northstar Labs", exact: true })
  .waitFor();
assert.equal(await page.locator("tbody tr").count(), 1);
await page.getByRole("button", { name: /^All applications/ }).click();
await page
  .getByRole("textbox", { name: "Search applications" })
  .fill("Bluebird");
await page.waitForFunction(
  () =>
    document.querySelector("tbody")?.innerText.includes("Bluebird") &&
    document.querySelectorAll("tbody tr").length === 1,
);
await page.getByRole("button", { name: "Clear search" }).click();
await page.getByRole("button", { name: "Atlas Works", exact: true }).waitFor();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "../docs/dashboard-mobile.png", fullPage: true, timeout: 10000 });
await page.getByRole("button", { name: "Sign out" }).click();
await page.getByRole("heading", { name: "Welcome back." }).waitFor();
assert.deepEqual(errors, []);
console.log(
  "UI smoke passed: register, add 6 applications, edit, filter, search, mobile viewport, logout.",
);
await browser.close();
