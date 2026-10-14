import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
const credentials = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z
      .string()
      .min(8)
      .refine(
        (password) => Buffer.byteLength(password, "utf8") <= 72,
        "Password must be at most 72 UTF-8 bytes.",
      ),
  })
  .strict();
const registration = credentials.extend({
  name: z.string().trim().min(2).max(80),
});
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
function setSession(req, res, user) {
  const token = jwt.sign({}, req.app.locals.jwtSecret, {
    subject: user.id,
    expiresIn: "7d",
    algorithm: "HS256",
  });
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: req.app.locals.production,
    maxAge: 7 * 86400000,
    path: "/",
  });
}
router.use(
  ["/login", "/register", "/forgot-password", "/reset-password"],
  rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Try again in 15 minutes." },
  }),
);
router.post("/register", async (req, res) => {
  const input = registration.parse(req.body);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 12),
  });
  setSession(req, res, user);
  res.status(201).json({ user: publicUser(user) });
});
router.post("/login", async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await User.findOne({ email: input.email }).select(
    "+passwordHash",
  );
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
    return res.status(401).json({ error: "Email or password is incorrect." });
  setSession(req, res, user);
  res.json({ user: publicUser(user) });
});
const sha256 = (x) => crypto.createHash("sha256").update(x).digest("hex");
async function sendMail(to, subject, html) {
  const { BREVO_API_KEY, MAIL_FROM, MAIL_FROM_NAME = "ApplyDesk", APP_URL = "http://localhost:5173" } = process.env;
  if (!BREVO_API_KEY || !MAIL_FROM) { console.warn("mail skipped: Brevo not configured"); return; }
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": BREVO_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ sender: { name: MAIL_FROM_NAME, email: MAIL_FROM }, to: [{ email: to }], subject, htmlContent: html }) });
  if (!resp.ok) console.error("mail failed", await resp.text().catch(() => resp.status));
}
router.post("/forgot-password", async (req, res) => {
  const email = z.email().parse(String(req.body?.email || "").toLowerCase());
  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetHash = sha256(token);
    user.resetExpires = new Date(Date.now() + 30 * 60000);
    await user.save();
    const link = `${process.env.APP_URL || "http://localhost:5173"}/?reset=${token}`;
    await sendMail(email, "Reset your ApplyDesk password", `<p>Hi ${user.name},</p><p>You asked to reset your ApplyDesk password.</p><p><a href="${link}">${link}</a></p><p>The link works for 30 minutes. If you did not ask, ignore this mail.</p>`);
  }
  res.json({ ok: true, message: "If that account exists, a reset link is on its way." });
});
router.post("/reset-password", async (req, res) => {
  const input = z.object({ token: z.string().min(10), password: z.string().min(8).refine((p) => Buffer.byteLength(p, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes.") }).strict().parse(req.body);
  const user = await User.findOne({ resetHash: sha256(input.token), resetExpires: { $gt: new Date() } }).select("+passwordHash");
  if (!user) return res.status(400).json({ error: "That reset link is invalid or expired. Request a new one." });
  user.passwordHash = await bcrypt.hash(input.password, 12);
  user.resetHash = null;
  user.resetExpires = null;
  await user.save();
  setSession(req, res, user);
  res.json({ user: publicUser(user) });
});
router.get("/me", requireAuth, (req, res) =>
  res.json({ user: publicUser(req.user) }),
);
router.post("/logout", (req, res) => {
  res.clearCookie("session", {
    httpOnly: true,
    sameSite: "strict",
    secure: req.app.locals.production,
    path: "/",
  });
  res.status(204).end();
});
export default router;
