import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Compass, 
  Layers, 
  Sliders, 
  Activity, 
  Check, 
  X, 
  MousePointer, 
  PenTool, 
  Grid,
  Info
} from 'lucide-react';
import { 
  VectorFeature, 
  VectorVertex, 
  ToolMode, 
  ModuleId, 
  ContourConfig, 
  UTMCoords,
  MiningSite
} from '../types/gis';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  canvasToUTM, 
  utmToCanvas, 
  getElevationAt, 
  calculatePolygonAreaHa, 
  calculatePerimeterM, 
  estimateVolumeM3 
} from '../utils/geoCalculations';
import { COLOR_MAP_PALETTES } from '../data/miningDatasets';

interface MiningCanvasProps {
  activeModule: ModuleId;
  toolMode: ToolMode;
  features: VectorFeature[];
  setFeatures: React.Dispatch<React.SetStateAction<VectorFeature[]>>;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  splitPosition: number;
  setSplitPosition: (pos: number) => void;
  contourConfig: ContourConfig;
  layerVisibility: {
    ortho: boolean;
    dsm: boolean;
    dtm: boolean;
    contours: boolean;
    vectors: boolean;
    grid: boolean;
  };
  activeFeatureType: string;
  onUpdateCoords: (coords: UTMCoords) => void;
  selectedSite: MiningSite;
  theme: 'dark' | 'light';
}

export const MiningCanvas: React.FC<MiningCanvasProps> = ({
  activeModule,
  toolMode,
  features,
  setFeatures,
  selectedFeatureId,
  setSelectedFeatureId,
  splitPosition,
  setSplitPosition,
  contourConfig,
  layerVisibility,
  activeFeatureType,
  onUpdateCoords,
  selectedSite,
  theme
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === 'dark';

  // Transform state: zoom & pan
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Live cursor telemetry
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 700, y: 450 });
  const [currentUTM, setCurrentUTM] = useState<UTMCoords>({
    easting: selectedSite.baseEasting,
    northing: selectedSite.baseNorthing,
    elevation: 1680,
    zone: selectedSite.utmZone,
    epsg: selectedSite.epsg
  });

  // Vector drawing state
  const [drawingVertices, setDrawingVertices] = useState<VectorVertex[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [draggingVertexIdx, setDraggingVertexIdx] = useState<number | null>(null);

  // Measure ruler state
  const [measurePoints, setMeasurePoints] = useState<VectorVertex[]>([]);

  // Split slider dragging in canvas
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  // Convert mouse screen client coordinates to virtual canvas coordinates
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const x = (rawX - pan.x) / zoom;
    const y = (rawY - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  // Handle Zoom In / Out / Reset
  const handleZoom = (delta: number, focalPoint?: { x: number; y: number }) => {
    setZoom((prev) => {
      const newZoom = Math.min(Math.max(0.4, prev + delta), 4.5);
      return Math.round(newZoom * 100) / 100;
    });
  };

  const handleResetView = () => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setZoom(1);
    setPan({
      x: (rect.width - CANVAS_WIDTH) / 2,
      y: (rect.height - CANVAS_HEIGHT) / 2
    });
  };

  // Center initial canvas on mount
  useEffect(() => {
    handleResetView();
  }, [selectedSite.id]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas buffer to match client rect for sharp retina displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = isDark ? '#0b0f0c' : '#eef2ee';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    // Apply pan and zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw Ground Base / Tiling Grid
    const splitX = (CANVAS_WIDTH * splitPosition) / 100;

    // A. Render ORTHO MOSAIC (Left side up to splitX, or full if ortho is on and not split mode)
    if (layerVisibility.ortho) {
      ctx.save();
      if (activeModule === 'module1_split' || splitPosition < 100) {
        ctx.beginPath();
        ctx.rect(0, 0, splitX, CANVAS_HEIGHT);
        ctx.clip();
      }

      // Draw synthetic photorealistic open-pit quarry
      drawOrthoQuarry(ctx);
      ctx.restore();
    }

    // B. Render DSM / DTM (Right side after splitX)
    if (activeModule === 'module1_split' || splitPosition < 100 || !layerVisibility.ortho) {
      ctx.save();
      if (layerVisibility.ortho) {
        ctx.beginPath();
        ctx.rect(splitX, 0, CANVAS_WIDTH - splitX, CANVAS_HEIGHT);
        ctx.clip();
      }

      if (layerVisibility.dsm && !layerVisibility.dtm) {
        drawDSMModel(ctx);
      } else if (layerVisibility.dtm && !layerVisibility.dsm) {
        drawDTMModel(ctx);
      } else {
        // Half DSM (top right) and half DTM (bottom right) as in screenshot!
        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, 0, CANVAS_WIDTH - splitX, CANVAS_HEIGHT / 2);
        ctx.clip();
        drawDSMModel(ctx);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, CANVAS_HEIGHT / 2, CANVAS_WIDTH - splitX, CANVAS_HEIGHT / 2);
        ctx.clip();
        drawDTMModel(ctx);
        ctx.restore();
      }

      ctx.restore();
    }

    // 2. Render Elevation Contours if enabled
    if (layerVisibility.contours) {
      drawContourLines(ctx, contourConfig);
    }

    // 3. Render UTM Grid lines & ticks if enabled
    if (layerVisibility.grid) {
      drawUTMGrid(ctx, isDark);
    }

    // 4. Render Saved Vector Features
    if (layerVisibility.vectors) {
      features.forEach((feature) => {
        const isSelected = feature.id === selectedFeatureId;
        drawFeature(ctx, feature, isSelected);
      });
    }

    // 5. Render Active Drawing Polygon in Progress
    if (isDrawing && drawingVertices.length > 0) {
      drawActiveDrawing(ctx, drawingVertices, cursorPos, toolMode);
    }

    // 6. Render Measuring Line if in ruler mode
    if (toolMode === 'measure' && measurePoints.length > 0) {
      drawMeasureLine(ctx, measurePoints, cursorPos);
    }

    // 7. Draw Split-Curtain Line and Badge if Split mode is active
    if (activeModule === 'module1_split' || (splitPosition > 0 && splitPosition < 100)) {
      ctx.strokeStyle = '#c6ff00';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, CANVAS_HEIGHT);
      ctx.stroke();

      // Split grip circle
      ctx.fillStyle = '#0b0f0c';
      ctx.beginPath();
      ctx.arc(splitX, CANVAS_HEIGHT / 2, 16 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c6ff00';
      ctx.lineWidth = 2.5 / zoom;
      ctx.stroke();

      // Grip arrows
      ctx.fillStyle = '#c6ff00';
      ctx.font = `${11 / zoom}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◄ ►', splitX, CANVAS_HEIGHT / 2);
    }

    ctx.restore();

  }, [
    pan,
    zoom,
    features,
    selectedFeatureId,
    drawingVertices,
    isDrawing,
    cursorPos,
    measurePoints,
    splitPosition,
    layerVisibility,
    contourConfig,
    toolMode,
    activeModule,
    isDark
  ]);

  // Draw Ortho Quarry photogrammetry
  const drawOrthoQuarry = (ctx: CanvasRenderingContext2D) => {
    // Earth gradient background
    const bgGrad = ctx.createRadialGradient(550, 480, 50, 550, 480, 680);
    bgGrad.addColorStop(0, '#533c2a');
    bgGrad.addColorStop(0.3, '#7d583b');
    bgGrad.addColorStop(0.6, '#a47852');
    bgGrad.addColorStop(0.85, '#8c603e');
    bgGrad.addColorStop(1, '#47301d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Terraced Pit Benches (outer to inner spiral)
    const benches = [
      { r1: 520, r2: 440, fill: '#946c48', stroke: '#5d4127' },
      { r1: 440, r2: 360, fill: '#ad8158', stroke: '#694a2e' },
      { r1: 360, r2: 280, fill: '#bf9368', stroke: '#755435' },
      { r1: 280, r2: 200, fill: '#cca57c', stroke: '#8a6441' },
      { r1: 200, r2: 120, fill: '#946d49', stroke: '#5f4228' },
      { r1: 120, r2: 50,  fill: '#5f442d', stroke: '#3b2819' }
    ];

    benches.forEach((b, i) => {
      ctx.beginPath();
      ctx.ellipse(650, 470, b.r1 * 1.2, b.r1 * 0.85, -0.15, 0, Math.PI * 2);
      ctx.fillStyle = b.fill;
      ctx.fill();
      ctx.strokeStyle = b.stroke;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Rock bench face shadows
      ctx.beginPath();
      ctx.ellipse(650, 470, b.r2 * 1.2, b.r2 * 0.85, -0.15, 0, Math.PI * 2);
      ctx.fillStyle = b.fill;
      ctx.fill();
    });

    // Haul Roads spiraling down the quarry
    ctx.beginPath();
    ctx.moveTo(120, 250);
    ctx.bezierCurveTo(400, 180, 850, 220, 1100, 380);
    ctx.bezierCurveTo(1200, 520, 1050, 750, 750, 780);
    ctx.bezierCurveTo(450, 800, 250, 680, 320, 500);
    ctx.bezierCurveTo(380, 380, 600, 360, 780, 450);
    ctx.bezierCurveTo(850, 520, 780, 600, 650, 540);
    ctx.strokeStyle = '#d6b88d';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Tire tracks on haul road
    ctx.strokeStyle = '#b89668';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pit Bottom Water Sump Lagoon (Turquoise / Emerald mineral pool)
    ctx.beginPath();
    ctx.ellipse(640, 520, 45, 30, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#1ebba6';
    ctx.fill();
    ctx.strokeStyle = '#0e7c6d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mining Equipment: Excavator & Haul Trucks
    // Cat 7495 Shovel Excavator
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(720, 430, 24, 16);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(714, 432, 6, 12);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(744, 438);
    ctx.lineTo(768, 446);
    ctx.stroke();

    // Haul Truck 01
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(860, 380, 18, 12);
    ctx.fillStyle = '#34495e';
    ctx.fillRect(856, 382, 4, 8);

    // Blast Pattern Grid drill markers
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        ctx.beginPath();
        ctx.arc(740 + c * 14, 340 + r * 14, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Draw DSM Digital Surface Model (Hillshade + Elevation Intensity)
  const drawDSMModel = (ctx: CanvasRenderingContext2D) => {
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#151c16');
    bgGrad.addColorStop(0.5, '#2b3a2e');
    bgGrad.addColorStop(1, '#1b251d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // High density point cloud / textured slope ridges
    ctx.strokeStyle = '#435e47';
    ctx.lineWidth = 1;
    for (let y = 50; y < CANVAS_HEIGHT; y += 18) {
      ctx.beginPath();
      ctx.moveTo(50, y);
      for (let x = 50; x < CANVAS_WIDTH; x += 30) {
        const noise = Math.sin(x * 0.03 + y * 0.04) * 8 + Math.cos(x * 0.05) * 5;
        ctx.lineTo(x, y + noise);
      }
      ctx.stroke();
    }

    // DSM Surface Label
    ctx.fillStyle = '#ff9100';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('DSM · DIGITAL SURFACE MODEL (18.4M PTS)', 720, 40);
  };

  // Draw DTM Digital Terrain Model (Stepped Contour Topography)
  const drawDTMModel = (ctx: CanvasRenderingContext2D) => {
    // Stepped gradient fill
    const bg = ctx.createRadialGradient(650, 480, 80, 650, 480, 650);
    bg.addColorStop(0, '#00b4d8');
    bg.addColorStop(0.2, '#06d6a0');
    bg.addColorStop(0.4, '#a2fc3c');
    bg.addColorStop(0.65, '#e4cb35');
    bg.addColorStop(0.85, '#f87621');
    bg.addColorStop(1, '#30123b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Topographic hypsometric contour bands
    for (let r = 50; r < 580; r += 28) {
      ctx.beginPath();
      ctx.ellipse(650, 480, r * 1.15, r * 0.85, -0.1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = r % 112 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // DTM Terrain Label
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('DTM · BARE TERRAIN TOPOGRAPHY (0.5M GRID)', 720, CANVAS_HEIGHT - 30);
  };

  // Draw dynamic contour lines
  const drawContourLines = (ctx: CanvasRenderingContext2D, config: ContourConfig) => {
    const palette = COLOR_MAP_PALETTES[config.colorMap] || COLOR_MAP_PALETTES.turbo;
    const baseElev = 1350;
    const maxElev = 1850;
    const step = config.interval;

    ctx.save();
    let elev = baseElev;
    let idx = 0;

    while (elev <= maxElev) {
      const norm = (elev - baseElev) / (maxElev - baseElev);
      const colorIdx = Math.min(Math.floor(norm * palette.length), palette.length - 1);
      const color = palette[colorIdx];
      const radius = 60 + norm * 500;

      ctx.beginPath();
      ctx.ellipse(640, 480, radius * 1.2, radius * 0.88, -0.12, 0, Math.PI * 2);

      const isIndexContour = elev % (step * 5) === 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = isIndexContour ? 2.2 / zoom : 1 / zoom;
      ctx.setLineDash(isIndexContour ? [] : [4 / zoom, 2 / zoom]);
      ctx.stroke();

      // Contour elevation label
      if (isIndexContour && config.showLabels) {
        ctx.fillStyle = isDark ? '#ffffff' : '#000000';
        ctx.font = `bold ${10 / zoom}px monospace`;
        ctx.fillText(`${elev}m`, 640 + radius * 1.15, 480);
      }

      elev += step;
      idx++;
    }

    ctx.restore();
  };

  // Draw UTM Grid
  const drawUTMGrid = (ctx: CanvasRenderingContext2D, isDarkMode: boolean) => {
    ctx.save();
    ctx.strokeStyle = isDarkMode ? 'rgba(100, 140, 100, 0.18)' : 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1 / zoom;

    const gridSpacing = 150; // pixels
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();

      const utm = canvasToUTM(x, 0, selectedSite.baseEasting, selectedSite.baseNorthing);
      ctx.fillStyle = isDarkMode ? '#6c826e' : '#718096';
      ctx.font = `${9 / zoom}px monospace`;
      ctx.fillText(`${utm.easting}E`, x + 4 / zoom, 16 / zoom);
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();

      const utm = canvasToUTM(0, y, selectedSite.baseEasting, selectedSite.baseNorthing);
      ctx.fillStyle = isDarkMode ? '#6c826e' : '#718096';
      ctx.font = `${9 / zoom}px monospace`;
      ctx.fillText(`${utm.northing}N`, 6 / zoom, y - 4 / zoom);
    }

    ctx.restore();
  };

  // Draw Saved Vector Feature
  const drawFeature = (ctx: CanvasRenderingContext2D, feature: VectorFeature, isSelected: boolean) => {
    if (feature.vertices.length === 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(feature.vertices[0].x, feature.vertices[0].y);

    for (let i = 1; i < feature.vertices.length; i++) {
      ctx.lineTo(feature.vertices[i].x, feature.vertices[i].y);
    }

    if (feature.geometryType === 'Polygon') {
      ctx.closePath();
      // Fill with semi-transparent tint
      ctx.fillStyle = isSelected ? 'rgba(198, 255, 0, 0.28)' : `${feature.color}26`;
      ctx.fill();

      // Stroke boundary with dashed styling if editing
      ctx.strokeStyle = feature.color;
      ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom;
      if (feature.state === 'EDITING') {
        ctx.setLineDash([6 / zoom, 4 / zoom]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    } else if (feature.geometryType === 'LineString') {
      ctx.strokeStyle = feature.color;
      ctx.lineWidth = 3 / zoom;
      ctx.stroke();
    } else {
      // Point
      const v = feature.vertices[0];
      ctx.beginPath();
      ctx.arc(v.x, v.y, 6 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = feature.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    }

    // Render vertex handles if selected
    if (isSelected) {
      feature.vertices.forEach((v, idx) => {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 4.5 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#c6ff00';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      });

      // Feature Label & Area Tag
      const center = feature.vertices[0];
      ctx.fillStyle = '#000000';
      ctx.fillRect(center.x - 2 / zoom, center.y - 24 / zoom, 90 / zoom, 18 / zoom);
      ctx.fillStyle = '#c6ff00';
      ctx.font = `bold ${10 / zoom}px monospace`;
      ctx.fillText(`${feature.name.slice(0, 10)} (${feature.areaHa} ha)`, center.x + 2 / zoom, center.y - 11 / zoom);
    }

    ctx.restore();
  };

  // Draw Active Drawing In Progress
  const drawActiveDrawing = (
    ctx: CanvasRenderingContext2D, 
    vertices: VectorVertex[], 
    curr: { x: number; y: number },
    mode: ToolMode
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);

    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    // Connect to cursor
    ctx.lineTo(curr.x, curr.y);

    if (mode === 'polygon' || mode === 'rectangle') {
      ctx.closePath();
      ctx.fillStyle = 'rgba(198, 255, 0, 0.2)';
      ctx.fill();
    }

    ctx.strokeStyle = '#c6ff00';
    ctx.lineWidth = 2.5 / zoom;
    ctx.setLineDash([5 / zoom, 3 / zoom]);
    ctx.stroke();

    // Draw vertex pins
    vertices.forEach((v) => {
      ctx.beginPath();
      ctx.arc(v.x, v.y, 4 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#c6ff00';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    });

    ctx.restore();
  };

  // Draw Measure Ruler Line
  const drawMeasureLine = (
    ctx: CanvasRenderingContext2D,
    pts: VectorVertex[],
    curr: { x: number; y: number }
  ) => {
    if (pts.length === 0) return;
    const p1 = pts[0];
    const p2 = pts[1] || curr;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.stroke();

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    const distM = Math.round(distPx * 0.45 * 10) / 10;
    const elev1 = getElevationAt(p1.x, p1.y);
    const elev2 = getElevationAt(p2.x, p2.y);
    const deltaZ = Math.abs(elev2 - elev1);
    const slopeDeg = Math.round(Math.atan2(deltaZ, Math.max(1, distM)) * (180 / Math.PI) * 10) / 10;

    // Measurement Bubble
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    ctx.fillStyle = '#0a1014';
    ctx.fillRect(midX - 50 / zoom, midY - 20 / zoom, 100 / zoom, 28 / zoom);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(midX - 50 / zoom, midY - 20 / zoom, 100 / zoom, 28 / zoom);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${10 / zoom}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${distM} m · Δ${deltaZ.toFixed(1)}m`, midX, midY - 6 / zoom);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`Slope: ${slopeDeg}°`, midX, midY + 5 / zoom);

    ctx.restore();
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = screenToCanvas(e.clientX, e.clientY);

    // If middle click or spacebar held, start panning
    if (e.button === 1 || toolMode === 'select' && e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Split curtain dragging in split mode
    if (activeModule === 'module1_split') {
      const splitX = (CANVAS_WIDTH * splitPosition) / 100;
      if (Math.abs(coords.x - splitX) < 25 / zoom) {
        setIsDraggingSplit(true);
        return;
      }
    }

    // Vector Digitization Mode
    if (toolMode === 'polygon') {
      const utm = canvasToUTM(coords.x, coords.y, selectedSite.baseEasting, selectedSite.baseNorthing);
      const elev = getElevationAt(coords.x, coords.y);
      const newVertex: VectorVertex = {
        x: coords.x,
        y: coords.y,
        easting: utm.easting,
        northing: utm.northing,
        elevation: elev
      };

      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingVertices([newVertex]);
      } else {
        // If clicking near first vertex, finish polygon!
        const first = drawingVertices[0];
        const dist = Math.hypot(coords.x - first.x, coords.y - first.y);
        if (drawingVertices.length >= 3 && dist < 15 / zoom) {
          finishDrawingPolygon([...drawingVertices]);
        } else {
          setDrawingVertices((prev) => [...prev, newVertex]);
        }
      }
    } else if (toolMode === 'rectangle') {
      if (!isDrawing) {
        const utm = canvasToUTM(coords.x, coords.y, selectedSite.baseEasting, selectedSite.baseNorthing);
        const elev = getElevationAt(coords.x, coords.y);
        setIsDrawing(true);
        setDrawingVertices([{ x: coords.x, y: coords.y, easting: utm.easting, northing: utm.northing, elevation: elev }]);
      } else {
        // Complete rectangle
        const p1 = drawingVertices[0];
        const p2 = coords;
        const v1 = p1;
        const v2 = { x: p2.x, y: p1.y, ...canvasToUTM(p2.x, p1.y), elevation: getElevationAt(p2.x, p1.y) };
        const v3 = { x: p2.x, y: p2.y, ...canvasToUTM(p2.x, p2.y), elevation: getElevationAt(p2.x, p2.y) };
        const v4 = { x: p1.x, y: p2.y, ...canvasToUTM(p1.x, p2.y), elevation: getElevationAt(p1.x, p2.y) };
        finishDrawingPolygon([v1, v2, v3, v4]);
      }
    } else if (toolMode === 'polyline') {
      const utm = canvasToUTM(coords.x, coords.y, selectedSite.baseEasting, selectedSite.baseNorthing);
      const elev = getElevationAt(coords.x, coords.y);
      const newVertex: VectorVertex = {
        x: coords.x,
        y: coords.y,
        easting: utm.easting,
        northing: utm.northing,
        elevation: elev
      };
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingVertices([newVertex]);
      } else {
        setDrawingVertices((prev) => [...prev, newVertex]);
      }
    } else if (toolMode === 'point') {
      const utm = canvasToUTM(coords.x, coords.y, selectedSite.baseEasting, selectedSite.baseNorthing);
      const elev = getElevationAt(coords.x, coords.y);
      const pointFeature: VectorFeature = {
        id: `feat-${Date.now()}`,
        fid: features.length + 12,
        name: `Survey Marker ${features.length + 1}`,
        type: 'BLAST_ZONE',
        geometryType: 'Point',
        vertices: [{ x: coords.x, y: coords.y, easting: utm.easting, northing: utm.northing, elevation: elev }],
        areaHa: 0,
        perimeterM: 0,
        state: 'SAVED',
        color: '#ff3d71',
        createdDate: new Date().toISOString().replace('T', ' ').slice(0, 16)
      };
      setFeatures((prev) => [...prev, pointFeature]);
      setSelectedFeatureId(pointFeature.id);
    } else if (toolMode === 'measure') {
      const utm = canvasToUTM(coords.x, coords.y, selectedSite.baseEasting, selectedSite.baseNorthing);
      const elev = getElevationAt(coords.x, coords.y);
      const v = { x: coords.x, y: coords.y, easting: utm.easting, northing: utm.northing, elevation: elev };
      if (measurePoints.length === 0 || measurePoints.length >= 2) {
        setMeasurePoints([v]);
      } else {
        setMeasurePoints([measurePoints[0], v]);
      }
    } else if (toolMode === 'select') {
      // Check if clicking on an existing feature
      let hitId: string | null = null;
      for (let i = features.length - 1; i >= 0; i--) {
        const feat = features[i];
        if (feat.vertices.length > 0) {
          const first = feat.vertices[0];
          const dist = Math.hypot(coords.x - first.x, coords.y - first.y);
          if (dist < 40 / zoom) {
            hitId = feat.id;
            break;
          }
        }
      }
      setSelectedFeatureId(hitId);

      // Pan canvas with left click if select tool and not hitting a feature
      if (!hitId) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  const finishDrawingPolygon = (vertices: VectorVertex[]) => {
    if (vertices.length < 3) return;
    const areaHa = calculatePolygonAreaHa(vertices);
    const perimeterM = calculatePerimeterM(vertices);
    const volumeM3 = estimateVolumeM3(vertices, areaHa);

    const newFeature: VectorFeature = {
      id: `feat-${Date.now()}`,
      fid: features.length + 12,
      name: `${activeFeatureType.replace('_', ' ')} ${features.length + 1}`,
      type: activeFeatureType as any,
      geometryType: 'Polygon',
      vertices,
      areaHa,
      perimeterM,
      volumeM3,
      state: 'SAVED',
      color: activeFeatureType === 'PIT_BOUNDARY' ? '#c6ff00' : activeFeatureType === 'BENCH_CREST' ? '#00e5ff' : '#ff9100',
      createdDate: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureId(newFeature.id);
    setIsDrawing(false);
    setDrawingVertices([]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const coords = screenToCanvas(e.clientX, e.clientY);
    setCursorPos(coords);

    // Update Split position if dragging curtain
    if (isDraggingSplit) {
      const newPos = Math.max(5, Math.min(95, (coords.x / CANVAS_WIDTH) * 100));
      setSplitPosition(newPos);
      return;
    }

    // Calculate live real UTM telemetry
    const utm = canvasToUTM(coords.x, coords.y, selectedSite.baseEasting, selectedSite.baseNorthing);
    const elev = getElevationAt(coords.x, coords.y);
    const newCoords: UTMCoords = {
      easting: utm.easting,
      northing: utm.northing,
      elevation: elev,
      zone: selectedSite.utmZone,
      epsg: selectedSite.epsg
    };
    setCurrentUTM(newCoords);
    onUpdateCoords(newCoords);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingSplit(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.12 : -0.12;
    handleZoom(zoomDelta);
  };

  const handleDoubleClick = () => {
    if (isDrawing && drawingVertices.length >= 3) {
      finishDrawingPolygon([...drawingVertices]);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative flex-1 h-[calc(100vh-80px)] overflow-hidden select-none ${
        isDark ? 'bg-[#080b09]' : 'bg-[#e5e9e5]'
      }`}
    >
      {/* HTML5 High-Performance 2D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Floating Canvas Controls (Zoom In, Zoom Out, Reset, Mode badges) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className={`flex flex-col rounded-md border shadow-lg backdrop-blur-md overflow-hidden ${
          isDark ? 'bg-[#0f1511]/90 border-[#233125]' : 'bg-white/90 border-neutral-300'
        }`}>
          <button
            onClick={() => handleZoom(0.2)}
            className={`p-2 transition-colors ${
              isDark ? 'hover:bg-[#1b251d] text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom(-0.2)}
            className={`p-2 transition-colors border-t ${
              isDark ? 'border-[#233125] hover:bg-[#1b251d] text-neutral-200' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-800'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetView}
            className={`p-2 transition-colors border-t ${
              isDark ? 'border-[#233125] hover:bg-[#1b251d] text-neutral-200' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-800'
            }`}
            title="Reset Extents & Fit"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* Current Zoom Indicator */}
        <div className={`px-2 py-1 rounded text-center text-[10px] font-mono-tech border backdrop-blur-md ${
          isDark ? 'bg-[#0f1511]/90 border-[#233125] text-neutral-300' : 'bg-white/90 border-neutral-300 text-neutral-700'
        }`}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Bottom-Left Real-time Mini Telemetry HUD */}
      <div className={`absolute bottom-4 left-4 p-3 rounded-lg border backdrop-blur-md shadow-xl font-mono-tech text-xs z-10 space-y-1.5 ${
        isDark ? 'bg-[#0b0e0c]/90 border-[#222e23] text-neutral-200' : 'bg-white/95 border-neutral-300 text-neutral-800'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c6ff00] animate-ping" />
          <span className="text-[#c6ff00] font-bold">CROSSHAIR TELEMETRY</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
          <div>
            <span className="text-neutral-500">EASTING: </span>
            <span className="text-white font-semibold">{currentUTM.easting.toLocaleString()} m</span>
          </div>
          <div>
            <span className="text-neutral-500">NORTHING: </span>
            <span className="text-white font-semibold">{currentUTM.northing.toLocaleString()} m</span>
          </div>
          <div>
            <span className="text-neutral-500">ELEVATION: </span>
            <span className="text-amber-400 font-semibold">{currentUTM.elevation} m ASL</span>
          </div>
          <div>
            <span className="text-neutral-500">GSD: </span>
            <span className="text-sky-400 font-semibold">{selectedSite.gsdCm} cm/px</span>
          </div>
        </div>

        <div className="text-[10px] text-neutral-400 border-t pt-1 border-[#1e271f] flex items-center justify-between">
          <span>{selectedSite.name}</span>
          <span className="text-[#c6ff00]">{selectedSite.epsg}</span>
        </div>
      </div>

      {/* Drawing Mode Guide Badge */}
      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/90 border border-[#c6ff00] px-4 py-2 rounded-full text-xs font-mono-tech text-[#c6ff00] shadow-[0_0_20px_rgba(198,255,0,0.3)] flex items-center gap-3 z-10">
          <span className="w-2 h-2 rounded-full bg-[#c6ff00] animate-pulse"></span>
          <span>DIGITIZING {activeFeatureType} ({drawingVertices.length} vertices)</span>
          <span className="text-neutral-400">· Double-click or click start point to close</span>
          <button
            onClick={() => {
              setIsDrawing(false);
              setDrawingVertices([]);
            }}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scale Bar bottom-right */}
      <div className={`absolute bottom-4 right-4 p-2 rounded border backdrop-blur-md font-mono-tech text-[10px] z-10 ${
        isDark ? 'bg-[#0b0e0c]/85 border-[#222e23] text-neutral-300' : 'bg-white/90 border-neutral-300 text-neutral-800'
      }`}>
        <div className="flex items-center gap-2">
          <span>SCALE:</span>
          <div className="w-24 h-2 border-b-2 border-l-2 border-r-2 border-[#c6ff00] relative">
            <span className="absolute -top-3 left-0">0</span>
            <span className="absolute -top-3 right-0">100m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
