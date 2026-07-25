import mongoose from 'mongoose';
import { getModelAdapter } from './dbAdapter';

const GrievanceSchema = new mongoose.Schema({
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { 
    type: String, 
    enum: ['water', 'road', 'electricity', 'sanitation', 'health', 'education', 'other'], 
    required: true 
  },
  description: { type: String, required: true },
  inputType: { type: String, enum: ['text', 'photo', 'voice'], required: true },
  mediaUrl: { type: String, default: null },
  transcript: { type: String, default: null },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  // GeoJSON Point mirror of `location` for MongoDB Atlas 2dsphere geospatial queries.
  // Note: GeoJSON coordinate order is [lng, lat] (longitude first).
  geoLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined }
  },
  // Gemini text-embedding of the description, powering Atlas Vector Search
  // semantic clustering (grouping grievances by MEANING, not just GPS).
  // select:false keeps the 768-float vector out of normal API payloads.
  embedding: { type: [Number], default: undefined, select: false },
  stressScore: { type: Number, default: 0 },
  recurrenceCount: { type: Number, default: 1 },
  infrastructureGapScore: { type: Number, default: 0 },
  urgencyScore: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending_review', 'verified', 'matched', 'resolved'], 
    default: 'pending_review' 
  },
  // AI Prioritization Fields
  aiPriorityScore: { type: Number, default: 0 },
  aiPriorityExplanation: { type: String, default: null },
  aiLastEvaluatedAt: { type: Date, default: null },
  
  createdAt: { type: Date, default: Date.now }
});

// 2dsphere index enables $geoNear / $near geospatial clustering on Atlas.
// Built at boot via Grievance.syncIndexes() (see config/db.ts).
GrievanceSchema.index({ geoLocation: '2dsphere' });

export const Grievance = getModelAdapter('Grievance', GrievanceSchema);