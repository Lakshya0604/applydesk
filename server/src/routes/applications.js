import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Application, { STATUSES } from "../models/Application.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
const dateField = z
  .union([z.iso.date(), z.literal(""), z.null()])
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : null));
const inputSchema = z
  .object({
    company: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(120),
    status: z.enum(STATUSES).default("Saved"),
    location: z.string().trim().max(120).default(""),
    url: z
      .union([z.url({ protocol: /^https?$/ }).max(1000), z.literal("")])
      .default(""),
    notes: z.string().max(3000).default(""),
    appliedAt: dateField.default(null),
    followUpAt: dateField.default(null),
  })
  .strict();
const querySchema = z
  .object({
    q: z.string().max(120).optional(),
    status: z.enum(STATUSES).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .strict();
router.use(requireAuth);
router.get("/stats", async (req, res) => {
  const rows = await Application.aggregate([
    { $match: { user: req.user._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const row of rows) counts[row._id] = row.count;
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  const due = await Application.countDocuments({
    user: req.user._id,
    followUpAt: { $ne: null, $lt: tomorrow },
    status: { $nin: ["Rejected", "Offer"] },
  });
  res.json({
    counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    followUpsDue: due,
  });
});
router.get("/", async (req, res) => {
  const { q, status, page, limit } = querySchema.parse(req.query);
  const filter = { user: req.user._id };
  if (status) filter.status = status;
  if (q?.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["company", "role", "location"].map((key) => ({
      [key]: new RegExp(escaped, "i"),
    }));
  }
  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Application.countDocuments(filter),
  ]);
  res.json({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});
router.post("/", async (req, res) => {
  const input = inputSchema.parse(req.body);
  const item = await Application.create({ ...input, user: req.user._id });
  res.status(201).json({ item });
});
router.param("id", (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id))
    return res.status(400).json({ error: "Invalid application ID." });
  next();
});
router.patch("/:id", async (req, res) => {
  // Partial schemas with defaulted fields can silently reset omitted values.
  const patchSchema = z
    .object(
      Object.fromEntries(
        Object.entries(inputSchema.shape).map(([key, schema]) => [
          key,
          (schema.removeDefault ? schema.removeDefault() : schema).optional(),
        ]),
      ),
    )
    .strict();
  const input = patchSchema.parse(req.body);
  if (!Object.keys(input).length)
    return res.status(400).json({ error: "No changes provided." });
  const item = await Application.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!item) return res.status(404).json({ error: "Application not found." });
  res.json({ item });
});
router.delete("/:id", async (req, res) => {
  const result = await Application.deleteOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!result.deletedCount)
    return res.status(404).json({ error: "Application not found." });
  res.status(204).end();
});
export default router;
