export type ModuleId = 'module1_split' | 'module2_contours' | 'module3_digitize' | 'overview';

export type ToolMode = 'select' | 'polygon' | 'rectangle' | 'polyline' | 'point' | 'measure' | 'profile';

export type SurfaceType = 'ortho' | 'dsm' | 'dtm';

export interface UTMCoords {
  easting: number;
  northing: number;
  elevation: number;
  zone: string; // e.g. "46N"
  epsg: string; // e.g. "EPSG:32646"
}

export interface VectorVertex {
  x: number; // canvas units
  y: number; // canvas units
  easting: number;
  northing: number;
  elevation: number;
  lat?: number;
  lng?: number;
}

export interface VectorFeature {
  id: string;
  fid: number;
  name: string;
  type: 'PIT_BOUNDARY' | 'BENCH_CREST' | 'BENCH_TOE' | 'HAUL_ROAD' | 'BLAST_ZONE' | 'SUMP' | 'STOCKPILE';
  geometryType: 'Polygon' | 'LineString' | 'Point';
  vertices: VectorVertex[];
  areaHa: number;
  perimeterM: number;
  volumeM3?: number;
  state: 'SAVED' | 'EDITING' | 'DRAFT';
  color: string;
  notes?: string;
  createdDate: string;
}

export interface ContourConfig {
  interval: number; // 1, 2, 5, 10, 25 meters
  minElev: number;
  maxElev: number;
  colorMap: 'turbo' | 'terrain' | 'magma' | 'viridis' | 'topo';
  showLabels: boolean;
  strokeWidth: number;
  opacity: number;
}

export interface MiningSite {
  id: string;
  name: string;
  location: string;
  benchmark: string;
  utmZone: string;
  epsg: string;
  gsdCm: number;
  baseEasting: number;
  baseNorthing: number;
  minElevation: number;
  maxElevation: number;
  centerLat: number;
  centerLng: number;
  bounds: [[number, number], [number, number]]; // [[South, West], [North, East]]
  orthoUrl: string;
  features: VectorFeature[];
}

export interface DriveExportResult {
  fileName: string;
  fileSize: string;
  format: 'GeoJSON' | 'KML' | 'DXF' | 'SHP' | 'TOPO_PDF';
  driveLink: string;
  folderPath: string;
  savedAt: string;
}
