// Haversine formula implementation
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

export function calculateETA(distanceKm: number, speedKmH: number): number {
  // Prevent division by zero, assume a min speed of 5 km/h in city traffic
  const effectiveSpeed = Math.max(speedKmH, 5);

  // Basic ETA = (Distance / Speed) * 60 minutes
  let etaMinutes = (distanceKm / effectiveSpeed) * 60;

  // Add a buffer for traffic/stopping time (e.g. 1 min per 2 km)
  const dwellTimeBuffer = Math.floor(distanceKm / 2);
  etaMinutes += dwellTimeBuffer;

  return Math.max(1, Math.round(etaMinutes));
}
