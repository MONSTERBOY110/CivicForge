import mongoose from 'mongoose';

export function isMongoConfigured(): boolean {
  return true;
}

export function getModelAdapter(modelName: string, schema: mongoose.Schema) {
  try {
    return mongoose.model(modelName);
  } catch (e) {
    return mongoose.model(modelName, schema);
  }
}
