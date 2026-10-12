import mongoose from 'mongoose';
export const STATUSES = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, enum: STATUSES, default: 'Saved' },
  location: { type: String, trim: true, maxlength: 120, default: '' },
  url: { type: String, maxlength: 1000, default: '' },
  notes: { type: String, maxlength: 3000, default: '' },
  appliedAt: { type: Date, default: null },
  followUpAt: { type: Date, default: null }
}, { timestamps: true });
schema.index({ user: 1, status: 1, updatedAt: -1 });
schema.index({ user: 1, followUpAt: 1 });
export default mongoose.model('Application', schema);
