import { Router } from "express";
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
  ["/login", "/register"],
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
