import mongoose from 'mongoose';
import { getModelAdapter } from './dbAdapter';

const SolutionSchema = new mongoose.Schema({
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  techStack: [{ type: String }],
  targetCategory: { 
    type: String, 
    enum: ['water', 'road', 'electricity', 'sanitation', 'health', 'education', 'other'], 
    required: true 
  },
  repoUrl: { type: String },
  demoUrl: { type: String },
  docsUrl: { type: String },
  vouchCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['submitted', 'under_review', 'matched', 'deployed'], 
    default: 'submitted' 
  },
  // AI Suitability Tracking
  aiSuitability: [{
    grievanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grievance' },
    score: { type: Number },
    explanation: { type: String }
  }],
  
  createdAt: { type: Date, default: Date.now }
});

export const Solution = getModelAdapter('Solution', SolutionSchema);