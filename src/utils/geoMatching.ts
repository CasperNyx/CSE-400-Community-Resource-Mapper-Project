export interface LocationPoint {
  id: string;
  type: 'need' | 'offer';
  category: string;
  latitude: number;
  longitude: number;
  title: string;
}

export interface MatchResult {
  need: LocationPoint;
  offer: LocationPoint;
  distanceKm: number;
}

// (Haversine Formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export function findSpatialMatches(
  points: LocationPoint[],
  maxRadiusKm: number = 10
): MatchResult[] {
  const needs = points.filter((p) => p.type === 'need');
  const offers = points.filter((p) => p.type === 'offer');
  const matches: MatchResult[] = [];

  needs.forEach((need) => {
    offers.forEach((offer) => {
      if (need.category.toLowerCase() === offer.category.toLowerCase()) {
        const distance = calculateDistance(
          need.latitude,
          need.longitude,
          offer.latitude,
          offer.longitude
        );
        if (distance <= maxRadiusKm) {
          matches.push({ need, offer, distanceKm: distance });
        }
      }
    });
  });

  return matches.sort((a, b) => a.distanceKm - b.distanceKm);
}