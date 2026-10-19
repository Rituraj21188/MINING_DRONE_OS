import React, { useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
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
  Info,
  Move,
  Eye,
  Crosshair
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
  canvasToUTM, 
  utmToCanvas, 
  getElevationAt, 
  calculatePolygonAreaHa, 
  calculatePerimeterM, 
  estimateVolumeM3 
} from '../utils/geoCalculations';

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
  uploadedOrthoUrl?: string | null;
  uploadedOrthoName?: string | null;
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
  theme,
  uploadedOrthoUrl,
  uploadedOrthoName
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const orthoOverlayRef = useRef<L.ImageOverlay | null>(null);
  const vectorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const contourLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const isDark = theme === 'dark';

  // Base map selection: Google Hybrid Satellite vs Esri World Imagery
  const [baseMapType, setBaseMapType] = useState<'google_hybrid' | 'esri_sat' | 'osm'>('google_hybrid');
  const [orthoOpacity, setOrthoOpacity] = useState<number>(0.88);
  
  // Georeference Bounds for the uploaded Orthomosaic
  const [orthoBounds, setOrthoBounds] = useState<[[number, number], [number, number]]>(selectedSite.bounds);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);

  // Drawing state in Leaflet
  const [drawingPoints, setDrawingPoints] = useState<L.LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Live telemetry HUD
  const [currentCoords, setCurrentCoords] = useState<UTMCoords>({
    easting: selectedSite.baseEasting,
    northing: selectedSite.baseNorthing,
    elevation: 1680,
    zone: selectedSite.utmZone,
    epsg: selectedSite.epsg
  });
  const [currentLatLng, setCurrentLatLng] = useState<{ lat: number; lng: number }>({
    lat: selectedSite.centerLat,
    lng: selectedSite.centerLng
  });

  // Active orthomosaic image URL: prefer uploaded file, fallback to site orthoUrl
  const activeOrthoImage = uploadedOrthoUrl || selectedSite.orthoUrl;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
      center: [selectedSite.centerLat, selectedSite.centerLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // 1. Google Hybrid Satellite Tile Layer (Primary)
    const googleHybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 22,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // 2. Esri World Imagery
    const esriLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    if (baseMapType === 'google_hybrid') {
      googleHybridLayer.addTo(map);
    } else {
      esriLayer.addTo(map);
    }

    // 3. Layer Groups for overlays
    const vectorGroup = L.layerGroup().addTo(map);
    const contourGroup = L.layerGroup().addTo(map);
    const drawGroup = L.layerGroup().addTo(map);

    vectorLayerGroupRef.current = vectorGroup;
    contourLayerGroupRef.current = contourGroup;
    drawLayerGroupRef.current = drawGroup;

    // 4. Georeferenced Drone Orthomosaic Image Overlay
    const imageOverlay = L.imageOverlay(activeOrthoImage, L.latLngBounds(orthoBounds), {
      opacity: layerVisibility.ortho ? orthoOpacity : 0,
      interactive: true,
      zIndex: 10
    }).addTo(map);

    orthoOverlayRef.current = imageOverlay;
    mapInstanceRef.current = map;

    // Mouse Move event for UTM and Lat/Lng telemetry
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const lat = Math.round(e.latlng.lat * 100000) / 100000;
      const lng = Math.round(e.latlng.lng * 100000) / 100000;
      setCurrentLatLng({ lat, lng });

      // Calculate approximate local UTM coordinate
      const eastingOffset = Math.round((lng - selectedSite.centerLng) * 85000);
      const northingOffset = Math.round((lat - selectedSite.centerLat) * 111000);
      const easting = selectedSite.baseEasting + eastingOffset;
      const northing = selectedSite.baseNorthing + northingOffset;
      const elev = getElevationAt(700 + eastingOffset / 10, 450 - northingOffset / 10);

      const coords: UTMCoords = {
        easting,
        northing,
        elevation: elev,
        zone: selectedSite.utmZone,
        epsg: selectedSite.epsg
      };
      setCurrentCoords(coords);
      onUpdateCoords(coords);
    });

    // Map Click event for Vector Digitization
    map.on('click', (e: L.LeafletMouseEvent) => {
      handleMapClick(e.latlng);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [selectedSite.id, baseMapType]);

  // Update Orthomosaic image / bounds / opacity
  useEffect(() => {
    if (!orthoOverlayRef.current) return;
    orthoOverlayRef.current.setUrl(activeOrthoImage);
    orthoOverlayRef.current.setBounds(L.latLngBounds(orthoBounds));
    orthoOverlayRef.current.setOpacity(layerVisibility.ortho ? orthoOpacity : 0);
  }, [activeOrthoImage, orthoBounds, orthoOpacity, layerVisibility.ortho]);

  // Render Saved Vector Features into Leaflet
  useEffect(() => {
    const group = vectorLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layerVisibility.vectors) return;

    features.forEach((feature) => {
      const isSelected = feature.id === selectedFeatureId;
      
      // Convert feature vertices to LatLngs
      const latLngs: L.LatLngExpression[] = feature.vertices.map((v) => {
        if (v.lat && v.lng) return [v.lat, v.lng];
        // Calculate lat/lng from UTM offset
        const dE = v.easting - selectedSite.baseEasting;
        const dN = v.northing - selectedSite.baseNorthing;
        const lat = selectedSite.centerLat + dN / 111000;
        const lng = selectedSite.centerLng + dE / 85000;
        return [lat, lng];
      });

      if (feature.geometryType === 'Polygon' && latLngs.length >= 3) {
        const poly = L.polygon(latLngs, {
          color: feature.color,
          weight: isSelected ? 3.5 : 2,
          fillColor: feature.color,
          fillOpacity: isSelected ? 0.35 : 0.18,
          dashArray: feature.state === 'EDITING' ? '5, 5' : undefined
        });

        poly.bindTooltip(`<b>${feature.name}</b><br/>Area: ${feature.areaHa} ha | Volume: ${feature.volumeM3 ? feature.volumeM3.toLocaleString() + ' m³' : 'N/A'}`);
        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedFeatureId(feature.id);
        });

        poly.addTo(group);
      } else if (feature.geometryType === 'LineString' && latLngs.length >= 2) {
        const line = L.polyline(latLngs, {
          color: feature.color,
          weight: 3.5,
          dashArray: '6, 4'
        });
        line.bindTooltip(`<b>${feature.name}</b><br/>Perimeter: ${feature.perimeterM} m`);
        line.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedFeatureId(feature.id);
        });
        line.addTo(group);
      } else if (feature.geometryType === 'Point' && latLngs[0]) {
        const marker = L.circleMarker(latLngs[0] as [number, number], {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: feature.color,
          fillOpacity: 1
        });
        marker.bindTooltip(`<b>${feature.name}</b>`);
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedFeatureId(feature.id);
        });
        marker.addTo(group);
      }
    });
  }, [features, selectedFeatureId, layerVisibility.vectors, selectedSite]);

  // Render Elevation Contours
  useEffect(() => {
    const group = contourLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layerVisibility.contours) return;

    // Generate concentric contour isolines around pit center
    const center = [selectedSite.centerLat, selectedSite.centerLng] as [number, number];
    const step = contourConfig.interval;
    const baseElev = 1350;

    for (let r = 0.001; r < 0.015; r += 0.002) {
      const elev = baseElev + Math.round(r * 35000);
      const isIndex = elev % (step * 5) === 0;

      const circle = L.circle(center, {
        radius: r * 111000,
        color: isIndex ? '#c6ff00' : '#00e5ff',
        weight: isIndex ? 2 : 1,
        fill: false,
        dashArray: isIndex ? undefined : '4, 4'
      });

      if (contourConfig.showLabels && isIndex) {
        circle.bindTooltip(`${elev}m ASL`, { permanent: true, direction: 'center', className: 'contour-label-tag' });
      }

      circle.addTo(group);
    }
  }, [layerVisibility.contours, contourConfig, selectedSite]);

  // Handle Vector Drawing Clicks
  const handleMapClick = (latlng: L.LatLng) => {
    if (toolMode === 'select') return;

    const easting = Math.round(selectedSite.baseEasting + (latlng.lng - selectedSite.centerLng) * 85000);
    const northing = Math.round(selectedSite.baseNorthing + (latlng.lat - selectedSite.centerLat) * 111000);
    const elev = getElevationAt(700, 450);

    const vertex: VectorVertex = {
      x: 700,
      y: 450,
      easting,
      northing,
      elevation: elev,
      lat: latlng.lat,
      lng: latlng.lng
    };

    if (toolMode === 'polygon' || toolMode === 'polyline') {
      const newPoints = [...drawingPoints, latlng];
      setDrawingPoints(newPoints);
      setIsDrawing(true);

      // Render drawing guide lines
      const drawGroup = drawLayerGroupRef.current;
      if (drawGroup) {
        drawGroup.clearLayers();
        if (newPoints.length >= 2) {
          L.polyline(newPoints, { color: '#c6ff00', weight: 2.5, dashArray: '5, 5' }).addTo(drawGroup);
        }
        newPoints.forEach((pt) => {
          L.circleMarker(pt, { radius: 5, color: '#ffffff', fillColor: '#c6ff00', fillOpacity: 1 }).addTo(drawGroup);
        });
      }
    } else if (toolMode === 'point') {
      const newFeature: VectorFeature = {
        id: `feat-${Date.now()}`,
        fid: features.length + 12,
        name: `Survey Marker ${features.length + 1}`,
        type: 'BLAST_ZONE',
        geometryType: 'Point',
        vertices: [vertex],
        areaHa: 0,
        perimeterM: 0,
        state: 'SAVED',
        color: '#ff3d71',
        createdDate: new Date().toISOString().replace('T', ' ').slice(0, 16)
      };
      setFeatures((prev) => [...prev, newFeature]);
      setSelectedFeatureId(newFeature.id);
    }
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3 && toolMode === 'polygon') return;
    if (drawingPoints.length < 2 && toolMode === 'polyline') return;

    const vertices: VectorVertex[] = drawingPoints.map((pt) => {
      const easting = Math.round(selectedSite.baseEasting + (pt.lng - selectedSite.centerLng) * 85000);
      const northing = Math.round(selectedSite.baseNorthing + (pt.lat - selectedSite.centerLat) * 111000);
      return {
        x: 700,
        y: 450,
        easting,
        northing,
        elevation: getElevationAt(700, 450),
        lat: pt.lat,
        lng: pt.lng
      };
    });

    const areaHa = toolMode === 'polygon' ? calculatePolygonAreaHa(vertices) : 0;
    const perimeterM = calculatePerimeterM(vertices);
    const volumeM3 = toolMode === 'polygon' ? estimateVolumeM3(vertices, areaHa) : 0;

    const newFeature: VectorFeature = {
      id: `feat-${Date.now()}`,
      fid: features.length + 12,
      name: `${activeFeatureType.replace('_', ' ')} ${features.length + 1}`,
      type: activeFeatureType as any,
      geometryType: toolMode === 'polygon' ? 'Polygon' : 'LineString',
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
    setDrawingPoints([]);
    setIsDrawing(false);
    drawLayerGroupRef.current?.clearLayers();
  };

  const cancelDrawing = () => {
    setDrawingPoints([]);
    setIsDrawing(false);
    drawLayerGroupRef.current?.clearLayers();
  };

  const handleZoom = (delta: number) => {
    if (!mapInstanceRef.current) return;
    const curr = mapInstanceRef.current.getZoom();
    mapInstanceRef.current.setZoom(curr + delta);
  };

  const handleResetExtents = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([selectedSite.centerLat, selectedSite.centerLng], 15);
  };

  // Nudge georeference bounds if user needs to calibrate uploaded orthomosaic
  const nudgeOrthoBounds = (dLat: number, dLng: number) => {
    setOrthoBounds(([sw, ne]) => [
      [sw[0] + dLat, sw[1] + dLng],
      [ne[0] + dLat, ne[1] + dLng]
    ]);
  };

  return (
    <div className={`relative flex-1 h-[calc(100vh-80px)] overflow-hidden select-none ${
      isDark ? 'bg-[#080b09]' : 'bg-[#e5e9e5]'
    }`}>
      {/* Real Leaflet Map Container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-0" 
        style={{ background: '#0b0f0c' }}
      />

      {/* Split Curtain Mode Divider (Module 01) */}
      {activeModule === 'module1_split' && (
        <div 
          className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
          style={{ left: `${splitPosition}%` }}
        >
          <div className="w-1 h-full bg-[#c6ff00] shadow-[0_0_20px_rgba(198,255,0,0.8)]" />
          <div className="absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#0b0f0c] border-2 border-[#c6ff00] text-[#c6ff00] pointer-events-auto cursor-ew-resize shadow-2xl flex items-center justify-center text-xs font-mono-tech">
            ◄ ►
          </div>
        </div>
      )}

      {/* Top Floating GIS Quick Controls: Base Map Switcher, Ortho Opacity, Georeference Calibration */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        {/* Base Map Selector: Google Hybrid Satellite */}
        <div className={`flex items-center rounded-lg border p-1 shadow-lg backdrop-blur-md text-xs font-mono-tech ${
          isDark ? 'bg-[#0e1410]/95 border-[#202f23] text-neutral-200' : 'bg-white/95 border-neutral-300 text-neutral-800'
        }`}>
          <button
            onClick={() => setBaseMapType('google_hybrid')}
            className={`px-2.5 py-1 rounded transition-colors ${
              baseMapType === 'google_hybrid'
                ? 'bg-[#c6ff00] text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Google Hybrid Satellite
          </button>
          <button
            onClick={() => setBaseMapType('esri_sat')}
            className={`px-2.5 py-1 rounded transition-colors ${
              baseMapType === 'esri_sat'
                ? 'bg-[#c6ff00] text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Esri World Imagery
          </button>
        </div>

        {/* Ortho Opacity Slider */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-lg backdrop-blur-md text-xs font-mono-tech ${
          isDark ? 'bg-[#0e1410]/95 border-[#202f23] text-neutral-200' : 'bg-white/95 border-neutral-300 text-neutral-800'
        }`}>
          <span className="text-neutral-400 text-[11px]">ORTHO OPACITY:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={orthoOpacity}
            onChange={(e) => setOrthoOpacity(Number(e.target.value))}
            className="w-20 accent-[#c6ff00] cursor-pointer"
          />
          <span className="text-[#c6ff00] font-bold">{Math.round(orthoOpacity * 100)}%</span>
        </div>

        {/* Georeferencing Calibration Trigger */}
        <button
          onClick={() => setIsCalibrating(!isCalibrating)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono-tech transition-colors cursor-pointer ${
            isCalibrating
              ? 'bg-[#c6ff00] text-black font-bold border-[#c6ff00]'
              : isDark
              ? 'bg-[#0e1410]/95 border-[#202f23] text-neutral-300 hover:text-white'
              : 'bg-white/95 border-neutral-300'
          }`}
          title="Adjust Georeferencing position on Google Hybrid Satellite"
        >
          <Move className="w-3.5 h-3.5" />
          <span>CALIBRATE GEOREFERENCE</span>
        </button>
      </div>

      {/* Georeference Bounds Nudging Panel (when calibrating) */}
      {isCalibrating && (
        <div className={`absolute top-16 left-4 z-10 p-3 rounded-lg border shadow-2xl backdrop-blur-md font-mono-tech text-xs space-y-2 ${
          isDark ? 'bg-[#0a0e0c]/95 border-[#223124] text-neutral-200' : 'bg-white/95 border-neutral-300 text-neutral-900'
        }`}>
          <div className="flex items-center justify-between font-bold text-[#c6ff00]">
            <span>ORTHOMOSAIC POSITION CALIBRATOR</span>
            <button onClick={() => setIsCalibrating(false)} className="text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[10px] text-neutral-400">
            Nudge drone orthomosaic bounds over Google Hybrid Satellite:
          </p>

          <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
            <div></div>
            <button
              onClick={() => nudgeOrthoBounds(0.0005, 0)}
              className="p-1 rounded bg-[#18231a] hover:bg-[#203023] text-center text-[#c6ff00] font-bold"
            >
              ▲
            </button>
            <div></div>
            <button
              onClick={() => nudgeOrthoBounds(0, -0.0005)}
              className="p-1 rounded bg-[#18231a] hover:bg-[#203023] text-center text-[#c6ff00] font-bold"
            >
              ◄
            </button>
            <div className="flex items-center justify-center text-[10px] text-neutral-500">•</div>
            <button
              onClick={() => nudgeOrthoBounds(0, 0.0005)}
              className="p-1 rounded bg-[#18231a] hover:bg-[#203023] text-center text-[#c6ff00] font-bold"
            >
              ►
            </button>
            <div></div>
            <button
              onClick={() => nudgeOrthoBounds(-0.0005, 0)}
              className="p-1 rounded bg-[#18231a] hover:bg-[#203023] text-center text-[#c6ff00] font-bold"
            >
              ▼
            </button>
            <div></div>
          </div>
        </div>
      )}

      {/* Top Right Map Navigation Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className={`flex flex-col rounded-md border shadow-lg backdrop-blur-md overflow-hidden ${
          isDark ? 'bg-[#0f1511]/90 border-[#233125]' : 'bg-white/90 border-neutral-300'
        }`}>
          <button
            onClick={() => handleZoom(1)}
            className={`p-2 transition-colors ${
              isDark ? 'hover:bg-[#1b251d] text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-1)}
            className={`p-2 transition-colors border-t ${
              isDark ? 'border-[#233125] hover:bg-[#1b251d] text-neutral-200' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-800'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetExtents}
            className={`p-2 transition-colors border-t ${
              isDark ? 'border-[#233125] hover:bg-[#1b251d] text-neutral-200' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-800'
            }`}
            title="Fit Mine Pit Extents"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Left Live Telemetry & Real-Time Coordinate HUD */}
      <div className={`absolute bottom-4 left-4 p-3 rounded-lg border backdrop-blur-md shadow-2xl font-mono-tech text-xs z-10 space-y-1.5 ${
        isDark ? 'bg-[#0b0e0c]/95 border-[#222e23] text-neutral-200' : 'bg-white/95 border-neutral-300 text-neutral-800'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c6ff00] animate-ping" />
          <span className="text-[#c6ff00] font-bold">GOOGLE HYBRID SATELLITE HUD</span>
          <span className="text-neutral-500 text-[10px]">· {selectedSite.epsg}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
          <div>
            <span className="text-neutral-500">UTM EAST: </span>
            <span className="text-white font-semibold">{currentCoords.easting.toLocaleString()} m E</span>
          </div>
          <div>
            <span className="text-neutral-500">UTM NORTH: </span>
            <span className="text-white font-semibold">{currentCoords.northing.toLocaleString()} m N</span>
          </div>
          <div>
            <span className="text-neutral-500">LAT / LNG: </span>
            <span className="text-sky-400 font-semibold">{currentLatLng.lat.toFixed(5)}, {currentLatLng.lng.toFixed(5)}</span>
          </div>
          <div>
            <span className="text-neutral-500">ELEVATION: </span>
            <span className="text-amber-400 font-semibold">{currentCoords.elevation} m ASL</span>
          </div>
        </div>

        <div className="text-[10px] text-neutral-400 border-t pt-1 border-[#1e271f] flex items-center justify-between">
          <span>Active Raster: {uploadedOrthoName || selectedSite.name}</span>
          <span className="text-emerald-400">GEOREFERENCED</span>
        </div>
      </div>

      {/* Floating Finish / Cancel Drawing Guide Bar */}
      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/95 border border-[#c6ff00] px-4 py-2.5 rounded-lg text-xs font-mono-tech text-[#c6ff00] shadow-[0_0_25px_rgba(198,255,0,0.35)] flex items-center gap-4 z-20">
          <span className="w-2 h-2 rounded-full bg-[#c6ff00] animate-pulse"></span>
          <span>DIGITIZING {activeFeatureType} ({drawingPoints.length} points)</span>

          <div className="flex items-center gap-2">
            <button
              onClick={finishDrawing}
              className="px-2.5 py-1 rounded bg-[#c6ff00] hover:bg-[#b0e600] text-black font-bold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>SAVE FEATURE</span>
            </button>

            <button
              onClick={cancelDrawing}
              className="px-2 py-1 rounded bg-[#1e271f] hover:bg-[#28352a] text-neutral-300 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>CANCEL</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
