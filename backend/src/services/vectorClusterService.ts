import { Grievance } from '../models/Grievance';

/**
 * Atlas Vector Search: semantic grievance clustering.
 *
 * Given a grievance's Gemini embedding, finds OTHER grievances in the same
 * category that describe the *same underlying problem* even when the wording is
 * completely different ("water pipe burst" ≈ "no supply, main is broken").
 * This is what lets CivicForge merge duplicate reports by MEANING, not just GPS.
 *
 * Requires an Atlas Vector Search index named `grievance_vector_index` on the
 * `grievances` collection:
 *   { "fields": [
 *       { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
 *       { "type": "filter", "path": "category" } ] }
 *
 * Degrades gracefully: if the index is missing, the field is empty, or the
 * embedding is null, it returns [] and the caller clusters by geography alone.
 */
const VECTOR_INDEX = 'grievance_vector_index';
const SIMILARITY_THRESHOLD = 0.75; // cosine score cutoff, tune on demo data

export async function findSimilarGrievanceIds(
  embedding: number[] | null,
  category: string,
  excludeId?: any
): Promise<any[]> {
  if (!embedding || embedding.length === 0) return [];

  try {
    const results = await Grievance.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 50,
          limit: 10,
          filter: { category }
        }
      },
      { $project: { _id: 1, score: { $meta: 'vectorSearchScore' } } }
    ]);

    const excludeStr = excludeId ? excludeId.toString() : null;
    return results
      .filter((r: any) => r.score >= SIMILARITY_THRESHOLD)
      .map((r: any) => r._id)
      .filter((id: any) => !excludeStr || id.toString() !== excludeStr);
  } catch (error) {
    // Missing/unbuilt vector index, unsupported tier, etc. Fall back to geo-only.
    console.warn('[vectorSearch] unavailable, skipping semantic clustering:', (error as any)?.message);
    return [];
  }
}
