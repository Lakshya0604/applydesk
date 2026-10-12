import jwt from "jsonwebtoken";
import User from "../models/User.js";
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Please sign in." });
    const { sub } = jwt.verify(token, req.app.locals.jwtSecret, {
      algorithms: ["HS256"],
    });
    const user = await User.findById(sub);
    if (!user) return res.status(401).json({ error: "Please sign in again." });
    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "CastError"
    ) {
      return res
        .status(401)
        .json({ error: "Your session has expired. Please sign in again." });
    }
    next(error);
  }
}
