import mongoose from 'mongoose';
import { getModelAdapter } from './dbAdapter';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'developer', 'mp'], required: true },
  phone: { type: String },
  region: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const User = getModelAdapter('User', UserSchema);
