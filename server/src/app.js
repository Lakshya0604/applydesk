import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import { fileURLToPath } from "node:url";
import auth from "./routes/auth.js";
import applications from "./routes/applications.js";
export function createApp({ jwtSecret, production = false }) {
  if (!jwtSecret || jwtSecret.length < 32)
    throw new Error("JWT_SECRET must have at least 32 characters.");
  const app = express();
  app.locals.jwtSecret = jwtSecret;
  app.locals.production = production;
  app.use(helmet({ contentSecurityPolicy: production ? undefined : false }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 150,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Please wait a minute." },
    }),
  );
  app.use(express.json({ limit: "32kb" }), cookieParser());
  // Require JSON for mutations. Together with no CORS and SameSite cookies this
  // rejects cross-site form submissions, including login CSRF.
  app.use("/api", (req, res, next) => {
    if (
      ["POST", "PATCH", "DELETE"].includes(req.method) &&
      !req.is("application/json")
    )
      return res.status(415).json({ error: "Send application/json." });
    next();
  });
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", auth);
  app.use("/api/applications", applications);
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  if (production) {
    const dist = fileURLToPath(new URL("../../client/dist/", import.meta.url));
    app.use(express.static(dist));
    app.get("/{*path}", (req, res) => res.sendFile(`${dist}index.html`));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({
          error: "Check your input.",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        });
    if (error.code === 11000)
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON." });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "Request is too large." });
    console.error(error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });
  return app;
}
