export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ResourcePoint extends Coordinates {
  id: string;
  intent: "Need" | "Offer";
  category: string;
  remainingQuantity?: number;
}

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

/** Return the great-circle distance between two latitude/longitude points. */
export function distanceInKilometers(a: Coordinates, b: Coordinates): number {
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const latitudeA = toRadians(a.lat);
  const latitudeB = toRadians(b.lat);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

/** Find active incidents inside a user's safe-zone radius. */
export function incidentsWithinRadius<T extends Coordinates>(origin: Coordinates, radiusKm: number, incidents: T[]): T[] {
  return incidents.filter((incident) => distanceInKilometers(origin, incident) <= radiusKm);
}

/** Pair needs with nearby offers in the same category, nearest first. */
export function matchNearbyResources(needs: ResourcePoint[], offers: ResourcePoint[], radiusKm = 25) {
  return needs.flatMap((need) => offers
    .filter((offer) => offer.category === need.category && (offer.remainingQuantity ?? 0) > 0)
    .map((offer) => ({ needId: need.id, offerId: offer.id, distanceKm: distanceInKilometers(need, offer) }))
    .filter((match) => match.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm));
}