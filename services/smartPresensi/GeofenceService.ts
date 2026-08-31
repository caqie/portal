/**
 * GeofenceService.ts
 * Geofencing & GPS Validation Engine.
 * 
 * STRICT COMPLIANCE:
 * 1. Primary: POLYGON GEOFENCING (Point-in-Polygon Ray Casting algorithm supporting 4, 5, 6, 7... N points).
 * 2. Secondary: CIRCLE GEOFENCING (Haversine geodesic distance in meters).
 * 3. Configurable GPS Accuracy Limit (default 30 meters).
 * 4. Multi-location support (Multiple active office geofences).
 * 5. GPS Anomaly / Anti-Spoofing heuristic detection.
 */

import { AttendanceLocation, PolygonPoint, GeofenceGeometryType } from '../../types';

export interface GeofenceEvaluationResult {
  isInside: boolean;
  matchedLocation: AttendanceLocation | null;
  accuracyPassed: boolean;
  gpsAccuracy: number;
  userLatitude: number;
  userLongitude: number;
  distanceToNearestOfficeMeters: number;
  isAnomaly: boolean;
  anomalyReason?: string;
  errorMessage?: string;
}

/**
 * Calculates geodesic distance between two coordinates using Haversine formula in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Point-in-Polygon (Ray Casting Algorithm / Jordan Curve Theorem)
 * Checks if point (lat, lon) is inside a polygon with N vertices.
 * Handles 4, 5, 6, 7, ... 20+ points seamlessly.
 */
export function isPointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: PolygonPoint[],
  boundaryPolicy: 'INSIDE' | 'STRICT' = 'INSIDE'
): boolean {
  if (!polygon || polygon.length < 3) return false;

  const x = point.longitude;
  const y = point.latitude;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    // Check if point is exactly on the boundary segment (within small tolerance)
    if (boundaryPolicy === 'INSIDE') {
      const distToSegment = distanceToSegment(x, y, xi, yi, xj, yj);
      // ~ 3-5 meters in degrees is ~ 0.00003
      if (distToSegment < 0.00003) {
        return true;
      }
    }

    // Ray casting intersection test
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Checks if point is inside a circle geofence
 */
export function isPointInCircle(
  point: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  radiusMeters: number
): boolean {
  const dist = calculateHaversineDistance(
    point.latitude,
    point.longitude,
    center.latitude,
    center.longitude
  );
  return dist <= radiusMeters;
}

/**
 * Evaluates current GPS location against all active office geofences
 */
export function evaluateLocation(
  lat: number,
  lng: number,
  accuracy: number,
  activeLocations: AttendanceLocation[],
  globalAccuracyLimit = 30,
  boundaryPolicy: 'INSIDE' | 'STRICT' = 'INSIDE'
): GeofenceEvaluationResult {
  // 1. Anomaly & Integrity Checks
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return {
      isInside: false,
      matchedLocation: null,
      accuracyPassed: false,
      gpsAccuracy: accuracy,
      userLatitude: lat,
      userLongitude: lng,
      distanceToNearestOfficeMeters: 999999,
      isAnomaly: true,
      anomalyReason: 'Koordinat GPS kosong atau tidak valid (0, 0)',
      errorMessage: 'Koordinat lokasi tidak valid. Pastikan GPS aktif.'
    };
  }

  if (accuracy <= 0 || accuracy > 1000) {
    return {
      isInside: false,
      matchedLocation: null,
      accuracyPassed: false,
      gpsAccuracy: accuracy,
      userLatitude: lat,
      userLongitude: lng,
      distanceToNearestOfficeMeters: 999999,
      isAnomaly: true,
      anomalyReason: 'Akurasi GPS di luar batas wajar',
      errorMessage: 'Sinyal GPS tidak terdeteksi dengan benar. Silakan coba lagi di area terbuka.'
    };
  }

  // 2. Evaluate against active office locations
  const activeOffices = activeLocations.filter(loc => loc.status === 'ACTIVE');
  if (activeOffices.length === 0) {
    return {
      isInside: false,
      matchedLocation: null,
      accuracyPassed: true,
      gpsAccuracy: accuracy,
      userLatitude: lat,
      userLongitude: lng,
      distanceToNearestOfficeMeters: 0,
      isAnomaly: false,
      errorMessage: 'Tidak ada master lokasi presensi yang aktif. Hubungi administrator.'
    };
  }

  let matchedOffice: AttendanceLocation | null = null;
  let minDistance = Infinity;

  for (const office of activeOffices) {
    const locAccuracyLimit = office.accuracy_limit || globalAccuracyLimit;

    // Calculate approximate center for distance display
    let centerLat = office.center_latitude;
    let centerLng = office.center_longitude;

    if (!centerLat && office.polygon_points && office.polygon_points.length > 0) {
      centerLat = office.polygon_points.reduce((acc, p) => acc + p.latitude, 0) / office.polygon_points.length;
      centerLng = office.polygon_points.reduce((acc, p) => acc + p.longitude, 0) / office.polygon_points.length;
    }

    if (centerLat && centerLng) {
      const dist = calculateHaversineDistance(lat, lng, centerLat, centerLng);
      if (dist < minDistance) minDistance = dist;
    }

    // Check Geometry
    let isInsideCurrent = false;
    if (office.geometry_type === 'POLYGON' && office.polygon_points && office.polygon_points.length >= 3) {
      isInsideCurrent = isPointInPolygon({ latitude: lat, longitude: lng }, office.polygon_points, boundaryPolicy);
    } else if (office.geometry_type === 'CIRCLE' && office.center_latitude && office.center_longitude && office.radius_meter) {
      isInsideCurrent = isPointInCircle(
        { latitude: lat, longitude: lng },
        { latitude: office.center_latitude, longitude: office.center_longitude },
        office.radius_meter
      );
    }

    if (isInsideCurrent) {
      matchedOffice = office;
      break;
    }
  }

  const effectiveAccuracyLimit = matchedOffice?.accuracy_limit || globalAccuracyLimit;
  const accuracyPassed = accuracy <= effectiveAccuracyLimit;

  if (matchedOffice && !accuracyPassed) {
    return {
      isInside: false,
      matchedLocation: matchedOffice,
      accuracyPassed: false,
      gpsAccuracy: accuracy,
      userLatitude: lat,
      userLongitude: lng,
      distanceToNearestOfficeMeters: Math.round(minDistance),
      isAnomaly: false,
      errorMessage: `Akurasi lokasi tidak cukup (±${Math.round(accuracy)} meter, batas maksimal ±${effectiveAccuracyLimit} meter). Aktifkan GPS berpresisi tinggi dan coba kembali.`
    };
  }

  if (matchedOffice && accuracyPassed) {
    return {
      isInside: true,
      matchedLocation: matchedOffice,
      accuracyPassed: true,
      gpsAccuracy: accuracy,
      userLatitude: lat,
      userLongitude: lng,
      distanceToNearestOfficeMeters: Math.round(minDistance),
      isAnomaly: false
    };
  }

  // Outside Geofence
  return {
    isInside: false,
    matchedLocation: null,
    accuracyPassed,
    gpsAccuracy: accuracy,
    userLatitude: lat,
    userLongitude: lng,
    distanceToNearestOfficeMeters: Math.round(minDistance),
    isAnomaly: false,
    errorMessage: `Anda berada di luar area presensi yang ditentukan (jarak ke kantor terdekat: ±${Math.round(minDistance)} meter).`
  };
}
