import { VectorVertex, UTMCoords } from '../types/gis';

export const CANVAS_WIDTH = 1400;
export const CANVAS_HEIGHT = 900;

// Base coordinates for Pit 04 North Bench
export const DEFAULT_BASE_EASTING = 512884;
export const DEFAULT_BASE_NORTHING = 4687201;
export const METERS_PER_PIXEL = 0.45; // scale factor

/**
 * Convert canvas coordinate to real-world UTM 46N coordinate
 */
export function canvasToUTM(
  x: number,
  y: number,
  baseEasting = DEFAULT_BASE_EASTING,
  baseNorthing = DEFAULT_BASE_NORTHING
): { easting: number; northing: number } {
  const easting = Math.round(baseEasting + (x - CANVAS_WIDTH / 2) * METERS_PER_PIXEL);
  const northing = Math.round(baseNorthing - (y - CANVAS_HEIGHT / 2) * METERS_PER_PIXEL);
  return { easting, northing };
}

/**
 * Convert UTM coordinate to canvas coordinate
 */
export function utmToCanvas(
  easting: number,
  northing: number,
  baseEasting = DEFAULT_BASE_EASTING,
  baseNorthing = DEFAULT_BASE_NORTHING
): { x: number; y: number } {
  const x = CANVAS_WIDTH / 2 + (easting - baseEasting) / METERS_PER_PIXEL;
  const y = CANVAS_HEIGHT / 2 - (northing - baseNorthing) / METERS_PER_PIXEL;
  return { x, y };
}

/**
 * Synthetic Elevation Query function for the open-pit quarry
 * Returns elevation in meters ASL (Above Sea Level)
 */
export function getElevationAt(x: number, y: number): number {
  // Center is a deep pit spiral
  const cx = CANVAS_WIDTH * 0.46;
  const cy = CANVAS_HEIGHT * 0.52;
  const dx = (x - cx) / 120;
  const dy = (y - cy) / 95;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Bench terracing effect: floor(dist) creates step terraces
  const benchTier = Math.floor(dist * 1.8);
  const benchHeight = benchTier * 15; // 15m bench steps

  // Underlying ridge & base topography
  const ridge = Math.sin(x * 0.008) * 28 + Math.cos(y * 0.007) * 35;
  const pitFloor = 1380; // Lowest floor
  
  // Calculate elevation: higher as we go away from pit center
  const elev = pitFloor + Math.min(dist * 70, 462) + benchHeight * 0.3 + ridge;
  return Math.round(Math.min(Math.max(elev, 1342), 1842) * 10) / 10;
}

/**
 * Calculate polygon area in hectares using Shoelace formula
 */
export function calculatePolygonAreaHa(vertices: VectorVertex[]): number {
  if (vertices.length < 3) return 0;
  let areaM2 = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = vertices[i].easting;
    const yi = vertices[i].northing;
    const xj = vertices[j].easting;
    const yj = vertices[j].northing;
    areaM2 += xi * yj - xj * yi;
  }

  areaM2 = Math.abs(areaM2) / 2;
  const ha = areaM2 / 10000;
  return Math.round(ha * 10) / 10;
}

/**
 * Calculate perimeter in meters
 */
export function calculatePerimeterM(vertices: VectorVertex[]): number {
  if (vertices.length < 2) return 0;
  let dist = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    const dx = vertices[i].easting - next.easting;
    const dy = vertices[i].northing - next.northing;
    dist += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.round(dist * 10) / 10;
}

/**
 * Estimate Cut/Fill Stockpile volume in m3
 */
export function estimateVolumeM3(vertices: VectorVertex[], areaHa: number): number {
  if (vertices.length < 3 || areaHa <= 0) return 0;
  // Calculate average bench depth
  const avgElev = vertices.reduce((acc, v) => acc + v.elevation, 0) / vertices.length;
  const depthFactor = Math.abs(avgElev - 1450) * 0.4 + 12;
  const volume = areaHa * 10000 * depthFactor;
  return Math.round(volume);
}

/**
 * Convert UTM to approximate WGS84 Latitude/Longitude for KML/GeoJSON standards
 * Zone 46N central meridian is 93°E
 */
export function utmToLatLng(easting: number, northing: number, zoneNumber = 46): { lat: number; lng: number } {
  // Approximate standard projection for demo visualization
  const k0 = 0.9996;
  const a = 6378137.0;
  const e = 0.081819191;
  const e1sq = 0.006739497;
  
  const x = easting - 500000.0;
  const y = northing;
  
  const m = y / k0;
  const mu = m / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));
  
  const e1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));
  const phi1Rad = mu + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu)
    + (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu);
    
  const lat = (phi1Rad * 180) / Math.PI;
  const centralMeridian = (zoneNumber - 1) * 6 - 180 + 3;
  const lng = centralMeridian + (x / (a * Math.cos(phi1Rad))) * (180 / Math.PI);

  return {
    lat: Math.round(lat * 1000000) / 1000000,
    lng: Math.round(lng * 1000000) / 1000000
  };
}
