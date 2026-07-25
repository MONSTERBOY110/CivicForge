/**
 * Data Fusion Service
 * 
 * Integrates GIS spatial queries with demographic census data.
 * This service simulates Indian municipal open-data APIs (e.g., data.gov.in, National Spatial Data Infrastructure).
 * It computes localized infrastructure deficits based on population density, access to healthcare/education,
 * and historic municipal budget allocation gaps.
 */

interface CensusRegion {
  name: string;
  lat: number;
  lng: number;
  populationDensity: number; // people per sq km
  literacyRate: number; // %
  nearestHospitalDistKm: number;
  nearestSchoolDistKm: number;
  powerOutageAvgHrs: number;
  waterShortagePercentage: number;
}

// Seeded Kolkata GIS and Census Grid
const KOLKATA_CENSUS_GRID: CensusRegion[] = [
  {
    name: "Salt Lake (Sector V)",
    lat: 22.5726,
    lng: 88.4339,
    populationDensity: 12000,
    literacyRate: 88.5,
    nearestHospitalDistKm: 1.2,
    nearestSchoolDistKm: 0.8,
    powerOutageAvgHrs: 0.5,
    waterShortagePercentage: 15
  },
  {
    name: "Park Street & Chowringhee",
    lat: 22.5530,
    lng: 88.3510,
    populationDensity: 28000,
    literacyRate: 91.2,
    nearestHospitalDistKm: 0.4,
    nearestSchoolDistKm: 0.5,
    powerOutageAvgHrs: 0.1,
    waterShortagePercentage: 10
  },
  {
    name: "Behala & South Suburban",
    lat: 22.4981,
    lng: 88.3184,
    populationDensity: 32000,
    literacyRate: 82.3,
    nearestHospitalDistKm: 4.5,
    nearestSchoolDistKm: 2.1,
    powerOutageAvgHrs: 2.2,
    waterShortagePercentage: 45
  },
  {
    name: "New Town (Action Area III)",
    lat: 22.5850,
    lng: 88.4900,
    populationDensity: 8000,
    literacyRate: 86.4,
    nearestHospitalDistKm: 3.1,
    nearestSchoolDistKm: 1.5,
    powerOutageAvgHrs: 1.1,
    waterShortagePercentage: 30
  },
  {
    name: "Garia & Jadavpur",
    lat: 22.4714,
    lng: 88.3768,
    populationDensity: 24000,
    literacyRate: 85.1,
    nearestHospitalDistKm: 2.8,
    nearestSchoolDistKm: 1.1,
    powerOutageAvgHrs: 1.8,
    waterShortagePercentage: 35
  },
  {
    name: "Howrah Municipal Area",
    lat: 22.5830,
    lng: 88.3300,
    populationDensity: 38000,
    literacyRate: 79.8,
    nearestHospitalDistKm: 3.8,
    nearestSchoolDistKm: 1.9,
    powerOutageAvgHrs: 3.5,
    waterShortagePercentage: 55
  }
];

// Helper to compute haversine distance
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function getInfrastructureGap(lat: number, lng: number, category: string): { 
  gapScore: number;
  regionName: string;
  populationDensity: number;
  literacyRate: number;
  localMetrics: any;
} {
  // Find closest census region in our spatial grid
  let closestRegion = KOLKATA_CENSUS_GRID[0];
  let minDist = Infinity;

  KOLKATA_CENSUS_GRID.forEach(region => {
    const dist = getDistanceKm(lat, lng, region.lat, region.lng);
    if (dist < minDist) {
      minDist = dist;
      closestRegion = region;
    }
  });

  // Calculate infrastructure gap score (0-100) based on category and region characteristics
  let gapScore = 50; // base gap

  switch (category) {
    case 'water':
      gapScore = closestRegion.waterShortagePercentage + Math.min(minDist * 5, 20);
      break;
    case 'road':
      // Denser populations experience higher road wear and pothole safety issues
      gapScore = (closestRegion.populationDensity / 40000) * 60 + Math.min(minDist * 10, 40);
      break;
    case 'electricity':
      gapScore = (closestRegion.powerOutageAvgHrs / 4) * 80 + Math.min(minDist * 5, 20);
      break;
    case 'sanitation':
      // Heavily linked to density and lack of municipal waste channels
      gapScore = (closestRegion.populationDensity / 40000) * 70 + (100 - closestRegion.literacyRate);
      break;
    case 'health':
      gapScore = Math.min((closestRegion.nearestHospitalDistKm / 5) * 100, 100);
      break;
    case 'education':
      gapScore = Math.min((closestRegion.nearestSchoolDistKm / 3) * 100, 100);
      break;
    default:
      gapScore = 45 + (100 - closestRegion.literacyRate) * 0.5;
  }

  // Bound the score between 0 and 100
  gapScore = Math.min(Math.max(Math.round(gapScore), 10), 98);

  return {
    gapScore,
    regionName: closestRegion.name,
    populationDensity: closestRegion.populationDensity,
    literacyRate: closestRegion.literacyRate,
    localMetrics: {
      nearestHospitalDistKm: closestRegion.nearestHospitalDistKm,
      nearestSchoolDistKm: closestRegion.nearestSchoolDistKm,
      powerOutageAvgHrs: closestRegion.powerOutageAvgHrs,
      waterShortagePercentage: closestRegion.waterShortagePercentage
    }
  };
}
