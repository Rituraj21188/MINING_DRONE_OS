import { MiningSite, VectorFeature } from '../types/gis';

export const INITIAL_FEATURES: VectorFeature[] = [
  {
    id: 'feat-012',
    fid: 12,
    name: 'Main Pit Perimeter Boundary',
    type: 'PIT_BOUNDARY',
    geometryType: 'Polygon',
    vertices: [
      { x: 380, y: 220, easting: 512720, northing: 4687350, elevation: 1820 },
      { x: 580, y: 190, easting: 512810, northing: 4687365, elevation: 1835 },
      { x: 840, y: 230, easting: 512930, northing: 4687345, elevation: 1842 },
      { x: 1040, y: 340, easting: 513020, northing: 4687295, elevation: 1810 },
      { x: 1110, y: 520, easting: 513050, northing: 4687210, elevation: 1785 },
      { x: 990, y: 690, easting: 513000, northing: 4687135, elevation: 1760 },
      { x: 740, y: 760, easting: 512885, northing: 4687105, elevation: 1740 },
      { x: 490, y: 720, easting: 512770, northing: 4687125, elevation: 1775 },
      { x: 320, y: 540, easting: 512695, northing: 4687200, elevation: 1795 },
      { x: 310, y: 350, easting: 512690, northing: 4687290, elevation: 1812 }
    ],
    areaHa: 134.6,
    perimeterM: 2840.4,
    volumeM3: 4850000,
    state: 'EDITING',
    color: '#c6ff00', // Acid Lime from screenshot
    notes: 'Pit crest surveyed by UAV-04 flight 12. Geotechnical stability verified.',
    createdDate: '2026-10-19 14:22'
  },
  {
    id: 'feat-013',
    fid: 13,
    name: 'Bench 04 Intermediate Crest',
    type: 'BENCH_CREST',
    geometryType: 'Polygon',
    vertices: [
      { x: 480, y: 330, easting: 512765, northing: 4687300, elevation: 1680 },
      { x: 720, y: 310, easting: 512875, northing: 4687310, elevation: 1675 },
      { x: 890, y: 400, easting: 512950, northing: 4687270, elevation: 1670 },
      { x: 920, y: 530, easting: 512965, northing: 4687210, elevation: 1665 },
      { x: 810, y: 640, easting: 512915, northing: 4687160, elevation: 1670 },
      { x: 590, y: 650, easting: 512815, northing: 4687155, elevation: 1678 },
      { x: 440, y: 510, easting: 512750, northing: 4687220, elevation: 1682 }
    ],
    areaHa: 42.1,
    perimeterM: 1485.2,
    volumeM3: 1680000,
    state: 'SAVED',
    color: '#00e5ff',
    notes: 'Active shovel loading zone. Grade 1.84% Cu.',
    createdDate: '2026-10-19 13:50'
  },
  {
    id: 'feat-014',
    fid: 14,
    name: 'Main Haul Ramp Alpha',
    type: 'HAUL_ROAD',
    geometryType: 'LineString',
    vertices: [
      { x: 330, y: 580, easting: 512700, northing: 4687180, elevation: 1790 },
      { x: 520, y: 600, easting: 512785, northing: 4687175, elevation: 1730 },
      { x: 700, y: 560, easting: 512865, northing: 4687195, elevation: 1650 },
      { x: 750, y: 460, easting: 512890, northing: 4687240, elevation: 1560 },
      { x: 620, y: 440, easting: 512830, northing: 4687250, elevation: 1470 },
      { x: 570, y: 490, easting: 512805, northing: 4687230, elevation: 1410 }
    ],
    areaHa: 0,
    perimeterM: 1820.0,
    state: 'SAVED',
    color: '#ff9100',
    notes: 'Width 28m for Cat 797F haul trucks. Max grade 8.5%.',
    createdDate: '2026-10-19 12:15'
  },
  {
    id: 'feat-015',
    fid: 15,
    name: 'Pattern 04-B Blast Zone',
    type: 'BLAST_ZONE',
    geometryType: 'Polygon',
    vertices: [
      { x: 730, y: 350, easting: 512880, northing: 4687290, elevation: 1670 },
      { x: 830, y: 360, easting: 512925, northing: 4687285, elevation: 1668 },
      { x: 810, y: 440, easting: 512915, northing: 4687250, elevation: 1665 },
      { x: 710, y: 420, easting: 512870, northing: 4687260, elevation: 1668 }
    ],
    areaHa: 4.8,
    perimeterM: 320.0,
    volumeM3: 96000,
    state: 'SAVED',
    color: '#ff3d71',
    notes: '72 blast holes drilled. ANFO emulsion ready for detonation.',
    createdDate: '2026-10-19 14:10'
  }
];

export const MINING_SITES: MiningSite[] = [
  {
    id: 'pit-04',
    name: 'Pit 04 North Bench Quarry',
    location: 'Atacama Mining District',
    benchmark: 'BM-2026-N4',
    utmZone: '46N',
    epsg: 'EPSG:32646',
    gsdCm: 2.8,
    baseEasting: 512884,
    baseNorthing: 4687201,
    minElevation: 1342,
    maxElevation: 1842,
    orthoUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1600&q=80',
    features: INITIAL_FEATURES
  },
  {
    id: 'cerro-verde',
    name: 'Cerro Verde Copper Pit',
    location: 'Southern Volcanic Arc',
    benchmark: 'CV-SURV-09',
    utmZone: '19S',
    epsg: 'EPSG:32719',
    gsdCm: 3.4,
    baseEasting: 228410,
    baseNorthing: 8182900,
    minElevation: 2150,
    maxElevation: 2890,
    orthoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    features: []
  },
  {
    id: 'thunder-basin',
    name: 'Thunder Basin Open Cast Coal',
    location: 'Powder River Basin',
    benchmark: 'TB-EAST-02',
    utmZone: '13N',
    epsg: 'EPSG:32613',
    gsdCm: 2.2,
    baseEasting: 489200,
    baseNorthing: 4821500,
    minElevation: 1120,
    maxElevation: 1380,
    orthoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1600&q=80',
    features: []
  }
];

export const COLOR_MAP_PALETTES = {
  turbo: ['#30123b', '#4662d8', '#28bbec', '#38f192', '#a2fc3c', '#e4cb35', '#f87621', '#db2824', '#7a0403'],
  terrain: ['#336633', '#558833', '#88aa44', '#ccbb66', '#d4a373', '#a2673e', '#7b4b28', '#ffffff'],
  magma: ['#000004', '#180f3d', '#440f76', '#721f81', '#9e2f7f', '#cd4071', '#f1605d', '#fd9668', '#fcfdbf'],
  viridis: ['#440154', '#482878', '#3e4a89', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#fde725'],
  topo: ['#006699', '#0099cc', '#2abb9b', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#ffffff']
};
