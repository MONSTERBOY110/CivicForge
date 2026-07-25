import mongoose from 'mongoose';

export function isMongoConfigured(): boolean {
  return true;
}

/**
 * Returns the already-registered model, or registers it on first call (which is
 * what keeps hot-reload from throwing OverwriteModelError).
 *
 * The <any> document type is deliberate: without it Mongoose 9 infers
 * `Model<unknown>` for the lookup branch, so every `doc.save()` / `doc.email` in
 * the controllers becomes a TS2339 error. Typed per-model interfaces would be
 * stricter, but this keeps `npm run lint` honest today.
 */
export function getModelAdapter(modelName: string, schema: mongoose.Schema): mongoose.Model<any> {
  try {
    return mongoose.model<any>(modelName);
  } catch (e) {
    return mongoose.model<any>(modelName, schema);
  }
}
