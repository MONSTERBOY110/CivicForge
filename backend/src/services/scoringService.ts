import { Grievance } from '../models/Grievance';

// Helper to compute haversine distance in km between two lat/lng pairs
export function getHaversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Computes the composite urgency score.
 * Formula: urgencyScore = (recurrenceCount * 0.4) + (stressScore * 0.3) + (infrastructureGapScore * 0.3)
 * where each component is normalized to a 0-100 scale.
 */
export function computeUrgencyScore(recurrenceCount: number, stressScore: number, infrastructureGapScore: number): number {
  // Normalize recurrenceCount: 1 complaint = 10 points, 10+ complaints = 100 points
  const normalizedRecurrence = Math.min(recurrenceCount * 10, 100);
  
  // stressScore and infrastructureGapScore are already on a 0-100 scale.
  const urgency = (normalizedRecurrence * 0.4) + (stressScore * 0.3) + (infrastructureGapScore * 0.3);
  return Math.round(urgency);
}

/**
 * Recomputes the recurrence count and urgency score for all grievances 
 * in the same category and region cluster (within ~2km distance).
 */
export async function updateClusterMetrics(category: string, lat: number, lng: number): Promise<{ count: number }> {
  try {
    // 1. Fetch all grievances of the same category
    const grievances = await Grievance.find({ category });
    
    // 2. Filter grievances that are within 2.0 km of the target location
    const clusterItems = grievances.filter((g: any) => {
      if (!g.location || g.location.lat === undefined || g.location.lng === undefined) return false;
      const distance = getHaversineDistanceKm(lat, lng, g.location.lat, g.location.lng);
      return distance <= 2.0;
    });

    const clusterSize = clusterItems.length;

    // 3. For each grievance in this spatial cluster, update recurrenceCount and compute the new composite urgencyScore
    for (const grievance of clusterItems) {
      const gStress = grievance.stressScore || 50;
      const gGap = grievance.infrastructureGapScore || 50;
      const newUrgency = computeUrgencyScore(clusterSize, gStress, gGap);

      await Grievance.findByIdAndUpdate(grievance._id, {
        recurrenceCount: clusterSize,
        urgencyScore: newUrgency
      });
    }

    return { count: clusterSize };
  } catch (error) {
    console.error('Failed to update cluster metrics:', error);
    return { count: 1 };
  }
}

/**
 * Returns the _ids of same-category grievances within `maxMeters` of (lat,lng)
 * using a REAL MongoDB Atlas 2dsphere `$geoNear` aggregation on `geoLocation`.
 * Falls back to the in-app haversine scan if the geo index/field is unavailable
 * (e.g. legacy docs), so clustering never hard-fails.
 */
export async function getGeoNearIds(
  category: string,
  lat: number,
  lng: number,
  maxMeters: number = 2000
): Promise<any[]> {
  try {
    const results = await Grievance.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] }, // GeoJSON = [lng, lat]
          distanceField: 'distanceMeters',
          maxDistance: maxMeters,
          spherical: true,
          query: { category }
        }
      },
      { $project: { _id: 1 } }
    ]);
    return results.map((r: any) => r._id);
  } catch (error) {
    console.warn('[$geoNear] failed, falling back to haversine scan:', (error as any)?.message);
    const grievances = await Grievance.find({ category });
    return grievances
      .filter((g: any) =>
        g.location &&
        g.location.lat !== undefined &&
        g.location.lng !== undefined &&
        getHaversineDistanceKm(lat, lng, g.location.lat, g.location.lng) <= maxMeters / 1000
      )
      .map((g: any) => g._id);
  }
}

/**
 * Given the full member set of a cluster (geo + semantic union), sets every
 * member's recurrenceCount to the cluster size and recomputes its composite
 * urgencyScore. This is the single write-path shared by geo and vector clustering.
 */
export async function applyClusterMetrics(memberIds: any[]): Promise<{ count: number }> {
  const uniqueIds = Array.from(new Set(memberIds.map((id: any) => id.toString())));
  const clusterSize = uniqueIds.length;
  if (clusterSize === 0) return { count: 0 };

  const members = await Grievance.find({ _id: { $in: uniqueIds } });
  for (const g of members as any[]) {
    const gStress = g.stressScore || 50;
    const gGap = g.infrastructureGapScore || 50;
    const newUrgency = computeUrgencyScore(clusterSize, gStress, gGap);
    await Grievance.findByIdAndUpdate(g._id, {
      recurrenceCount: clusterSize,
      urgencyScore: newUrgency
    });
  }
  return { count: clusterSize };
}
