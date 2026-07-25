import mongoose from 'mongoose';
import { getModelAdapter } from './dbAdapter';

const CommentSchema = new mongoose.Schema({
  solution: { type: mongoose.Schema.Types.ObjectId, ref: 'Solution', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Comment = getModelAdapter('Comment', CommentSchema);
