import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
    resetHash: { type: String, default: null, select: false },
    resetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);
export default mongoose.model("User", userSchema);
