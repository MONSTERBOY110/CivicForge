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
  // Execution pipeline ("flow of thought"): AI-sequenced work stages, ordered the
  // way a site engineer plans them (subsurface utilities before surface paving).
  // Stages can cover open grievances of OTHER categories found near the cluster,
  // which is how one road project absorbs the street's water complaints instead
  // of the road being dug up again a month later.
  executionPipeline: [{
    order: { type: Number, required: true },
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    category: {
      type: String,
      enum: ['water', 'road', 'electricity', 'sanitation', 'health', 'education', 'general'],
      default: 'general'
    },
    status: { type: String, enum: ['pending', 'active', 'done'], default: 'pending' },
    coveredGrievanceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grievance' }]
  }],
  // Blueprints created before this feature have an empty pipeline and keep the
  // legacy approve-resolves-everything behaviour; 'not_started' is only
  // meaningful when a pipeline exists.
  executionStatus: {
    type: String,
    enum: ['not_started', 'executing', 'completed'],
    default: 'not_started'
  },
  createdAt: { type: Date, default: Date.now }
});

export const ProjectBlueprint = getModelAdapter('ProjectBlueprint', ProjectBlueprintSchema);
