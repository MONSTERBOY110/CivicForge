import mongoose from 'mongoose';
import { getModelAdapter } from './dbAdapter';

const ProjectBlueprintSchema = new mongoose.Schema({
  mp: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  grievanceCluster: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grievance' }],
  matchedSolution: { type: mongoose.Schema.Types.ObjectId, ref: 'Solution' },
  generatedTitle: { type: String, required: true },
  generatedSummary: { type: String, required: true },
  estimatedBudget: { type: String, required: true },
  generatedByAI: { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ['draft', 'approved', 'submitted_for_funding'], 
    default: 'draft' 
  },
  createdAt: { type: Date, default: Date.now }
});

export const ProjectBlueprint = getModelAdapter('ProjectBlueprint', ProjectBlueprintSchema);
