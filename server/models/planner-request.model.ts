import { randomUUID } from 'node:crypto';
import mongoose, { type Model } from 'mongoose';

const { Schema } = mongoose;

// One guest trip-planner chat, saved so the Super Admin can see what guests ask for.
// The chat itself is anonymous (no sign-in on /ai/chat), so nothing personal is stored here:
// only the first question, a short excerpt of the reply, and the listings it recommended.
const plannerRequestSchema = new Schema({
  publicId: { type: String, required: true, unique: true, immutable: true, default: () => `pln_${randomUUID()}` },
  request: { type: String, required: true, trim: true, maxlength: 1_000 },
  reply: { type: String, trim: true, maxlength: 500 },
  listings: { type: [String], default: [] },
}, { timestamps: true });

plannerRequestSchema.index({ createdAt: -1 });

export const PlannerRequestModel: Model<any> = (mongoose.models.PlannerRequest as Model<any> | undefined)
  ?? mongoose.model<any>('PlannerRequest', plannerRequestSchema);
