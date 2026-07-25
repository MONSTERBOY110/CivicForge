import mongoose from 'mongoose';
import { getModelAdapter } from './dbAdapter';

const VouchSchema = new mongoose.Schema({
  solution: { type: mongoose.Schema.Types.ObjectId, ref: 'Solution', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Enforce unique vouch per user per solution in real Mongo index if configured
VouchSchema.index({ solution: 1, user: 1 }, { unique: true });

export const Vouch = getModelAdapter('Vouch', VouchSchema);
