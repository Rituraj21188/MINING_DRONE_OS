import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  Layers, 
  Mountain, 
  PenTool, 
  Upload, 
  FolderSync, 
  Download, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Trash2, 
  RotateCcw, 
  Info,
  Map,
  FileCheck,
  Compass,
  Zap,
  Activity,
  Maximize2
} from 'lucide-react';
import { ModuleId, ToolMode, SurfaceType, ContourConfig, MiningSite } from '../types/gis';

interface StreamlitSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeModule: ModuleId;
  setActiveModule: (mod: ModuleId) => void;
  toolMode: ToolMode;
  setToolMode: (tool: ToolMode) => void;
  selectedSite: MiningSite;
  onSelectSite: (siteId: string) => void;
  sites: MiningSite[];
  layerVisibility: {
    ortho: boolean;
    dsm: boolean;
    dtm: boolean;
    contours: boolean;
    vectors: boolean;
    grid: boolean;
  };
  setLayerVisibility: React.Dispatch<React.SetStateAction<{
    ortho: boolean;
    dsm: boolean;
    dtm: boolean;
    contours: boolean;
    vectors: boolean;
    grid: boolean;
  }>>;
  splitPosition: number;
  setSplitPosition: (pos: number) => void;
  contourConfig: ContourConfig;
  setContourConfig: React.Dispatch<React.SetStateAction<ContourConfig>>;
  activeFeatureType: string;
  setActiveFeatureType: (type: any) => void;
  onOpenUploadModal: () => void;
  onOpenDriveModal: () => void;
  onOpenExportModal: () => void;
  onClearDraft: () => void;
  totalAreaHa: number;
  totalVolumeM3: number;
  featuresCount: number;
  theme: 'dark' | 'light';
  onGenerateElevationProfile: () => void;
}

export const StreamlitSidebar: React.FC<StreamlitSidebarProps> = ({
  isOpen,
  setIsOpen,
  activeModule,
  setActiveModule,
  toolMode,
  setToolMode,
  selectedSite,
  onSelectSite,
  sites,
  layerVisibility,
  setLayerVisibility,
  splitPosition,
  setSplitPosition,
  contourConfig,
  setContourConfig,
  activeFeatureType,
  setActiveFeatureType,
  onOpenUploadModal,
  onOpenDriveModal,
  onOpenExportModal,
  onClearDraft,
  totalAreaHa,
  totalVolumeM3,
  featuresCount,
  theme,
  onGenerateElevationProfile
}) => {
  const isDark = theme === 'dark';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`absolute top-16 left-3 z-20 p-2 rounded-md shadow-lg border transition-all ${
          isDark 
            ? 'bg-[#121813] border-[#253627] text-[#c6ff00] hover:bg-[#18221a]' 
            : 'bg-white border-neutral-300 text-emerald-800 hover:bg-neutral-50'
        }`}
        title="Open Streamlit Control Sidebar"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    );
  }

  return (
    <aside className={`w-80 md:w-96 flex-shrink-0 h-[calc(100vh-80px)] overflow-y-auto border-r transition-all z-20 ${
      isDark ? 'bg-[#0c100d] border-[#1d271e] text-neutral-200' : 'bg-[#fafafa] border-neutral-200 text-neutral-800'
    } p-4 space-y-6 select-none`}>
      {/* Streamlit Header Bar with Collapse Button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#212c22]">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#c6ff00] animate-pulse"></div>
          <span className="font-mono-tech font-bold text-xs tracking-wider text-[#c6ff00]">
            STREAMLIT OPERATIONS HUB
          </span>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className={`p-1 rounded hover:opacity-80 transition-opacity ${
            isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
          }`}
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Streamlit Metric KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`p-2.5 rounded border font-mono-tech ${
          isDark ? 'bg-[#101612] border-[#223024]' : 'bg-white border-neutral-200'
        }`}>
          <div className="text-[10px] text-neutral-400">DIGITIZED AREA</div>
          <div className="text-lg font-bold text-[#c6ff00] mt-0.5">{totalAreaHa.toFixed(1)} <span className="text-xs font-normal">ha</span></div>
          <div className="text-[9px] text-neutral-500">{featuresCount} Vector Layers</div>
        </div>

        <div className={`p-2.5 rounded border font-mono-tech ${
          isDark ? 'bg-[#101612] border-[#223024]' : 'bg-white border-neutral-200'
        }`}>
          <div className="text-[10px] text-neutral-400">STOCKPILE VOL</div>
          <div className="text-lg font-bold text-[#00e5ff] mt-0.5">{(totalVolumeM3 / 1000).toFixed(0)}k <span className="text-xs font-normal">m³</span></div>
          <div className="text-[9px] text-neutral-500">Cut / Fill Delta</div>
        </div>
      </div>

      {/* Active Mining Site Selector (st.selectbox) */}
      <div className="space-y-1.5 font-mono-tech text-xs">
        <label className="text-neutral-400 flex items-center justify-between">
          <span>ACTIVE SURVEY SITE</span>
          <span className="text-[#00e5ff] text-[10px]">{selectedSite.utmZone}</span>
        </label>
        <select
          value={selectedSite.id}
          onChange={(e) => onSelectSite(e.target.value)}
          className={`w-full p-2 rounded border text-xs font-sans outline-none ${
            isDark 
              ? 'bg-[#121914] border-[#273729] text-white focus:border-[#c6ff00]' 
              : 'bg-white border-neutral-300 text-neutral-900 focus:border-emerald-600'
          }`}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} ({site.utmZone})
            </option>
          ))}
        </select>
      </div>

      {/* 1GB Upload Widget (st.file_uploader) */}
      <div className={`p-3.5 rounded-lg border border-dashed transition-all ${
        isDark 
          ? 'bg-[#101511] border-[#28392b] hover:border-[#c6ff00]/60' 
          : 'bg-white border-neutral-300 hover:border-emerald-500'
      }`}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-xs font-mono-tech font-bold flex items-center gap-1.5 text-neutral-200">
              <Upload className="w-3.5 h-3.5 text-[#c6ff00]" />
              <span>DATASET INGESTION</span>
            </div>
            <p className="text-[10px] font-mono-tech text-neutral-400 leading-tight">
              Limit 1024 MB per file · Drag &amp; Drop (.tif, .shp, .zip, .kml, .geojson, .dxf)
            </p>
          </div>
        </div>

        <button
          onClick={onOpenUploadModal}
          className="w-full mt-2.5 py-1.5 text-xs font-mono-tech font-bold rounded bg-[#18231a] hover:bg-[#203023] border border-[#2d4231] text-[#c6ff00] transition-colors cursor-pointer"
        >
          BROWSE / UPLOAD 1GB FILE
        </button>
      </div>

      {/* MODULE SPECIFIC CONTROLS */}
      
      {/* 1. Split-Surface Controls */}
      <div className="space-y-3 pt-1 border-t border-[#202b21]">
        <div className="flex items-center justify-between text-xs font-mono-tech font-bold text-neutral-300">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#c6ff00]" />
            SPLIT DIVIDER POSITION
          </span>
          <span className="text-[#c6ff00]">{Math.round(splitPosition)}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={splitPosition}
          onChange={(e) => setSplitPosition(Number(e.target.value))}
          className="w-full accent-[#c6ff00] cursor-pointer"
        />

        <div className="flex justify-between text-[10px] font-mono-tech text-neutral-500">
          <span>0% (Full DSM/DTM)</span>
          <span>50% (Split)</span>
          <span>100% (Full Ortho)</span>
        </div>
      </div>

      {/* 2. Elevation & Contours Settings */}
      <div className="space-y-3 pt-2 border-t border-[#202b21]">
        <div className="flex items-center justify-between text-xs font-mono-tech font-bold text-neutral-300">
          <span className="flex items-center gap-1.5">
            <Mountain className="w-3.5 h-3.5 text-teal-400" />
            CONTOUR GENERATOR
          </span>
          <span className="text-teal-300 text-[11px]">{contourConfig.interval}m interval</span>
        </div>

        {/* Interval buttons */}
        <div className="grid grid-cols-5 gap-1 text-[11px] font-mono-tech">
          {[1, 2, 5, 10, 25].map((int) => (
            <button
              key={int}
              onClick={() => setContourConfig((prev) => ({ ...prev, interval: int }))}
              className={`py-1 rounded border transition-colors ${
                contourConfig.interval === int
                  ? isDark
                    ? 'bg-[#1b251d] border-[#c6ff00] text-[#c6ff00] font-bold'
                    : 'bg-emerald-600 border-emerald-600 text-white font-bold'
                  : isDark
                  ? 'bg-[#111712] border-[#222e23] text-neutral-400 hover:text-white'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700'
              }`}
            >
              {int}m
            </button>
          ))}
        </div>

        {/* Color Palette Switcher */}
        <div className="flex items-center justify-between text-xs font-mono-tech">
          <span className="text-neutral-400 text-[11px]">COLOR RAMP</span>
          <select
            value={contourConfig.colorMap}
            onChange={(e) => setContourConfig((prev) => ({ ...prev, colorMap: e.target.value as any }))}
            className={`px-2 py-1 rounded border text-xs font-mono-tech ${
              isDark ? 'bg-[#121914] border-[#273729] text-white' : 'bg-white border-neutral-300'
            }`}
          >
            <option value="turbo">Turbo (Spectral)</option>
            <option value="terrain">Terrain (Earth/Rock)</option>
            <option value="viridis">Viridis (Perceptual)</option>
            <option value="magma">Magma (Thermal)</option>
            <option value="topo">Topo Sheet Classic</option>
          </select>
        </div>

        {/* Cross-section Elevation Profile Trigger */}
        <button
          onClick={onGenerateElevationProfile}
          className="w-full py-1.5 px-3 text-xs font-mono-tech font-bold rounded bg-[#132220] hover:bg-[#1a2f2c] border border-teal-800 text-teal-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>VIEW 2D BENCH PROFILE</span>
        </button>
      </div>

      {/* 3. Live .SHP Digitization Tools */}
      <div className="space-y-3 pt-2 border-t border-[#202b21]">
        <div className="flex items-center justify-between text-xs font-mono-tech font-bold text-neutral-300">
          <span className="flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-[#c6ff00]" />
            VECTOR DIGITIZATION
          </span>
          <span className="text-amber-400 text-[10px]">REAL-TIME .SHP</span>
        </div>

        {/* Tool Selector buttons */}
        <div className="grid grid-cols-3 gap-1.5 font-mono-tech text-xs">
          <button
            onClick={() => setToolMode('select')}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 transition-all ${
              toolMode === 'select'
                ? isDark
                  ? 'bg-[#1d261e] border-[#c6ff00] text-[#c6ff00] font-bold'
                  : 'bg-emerald-600 border-emerald-600 text-white font-bold'
                : isDark
                ? 'bg-[#111712] border-[#222e23] text-neutral-400 hover:text-white'
                : 'bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            <span>SELECT</span>
          </button>

          <button
            onClick={() => setToolMode('polygon')}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 transition-all ${
              toolMode === 'polygon'
                ? isDark
                  ? 'bg-[#1d261e] border-[#c6ff00] text-[#c6ff00] font-bold'
                  : 'bg-emerald-600 border-emerald-600 text-white font-bold'
                : isDark
                ? 'bg-[#111712] border-[#222e23] text-neutral-400 hover:text-white'
                : 'bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            <span>POLYGON</span>
          </button>

          <button
            onClick={() => setToolMode('rectangle')}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 transition-all ${
              toolMode === 'rectangle'
                ? isDark
                  ? 'bg-[#1d261e] border-[#c6ff00] text-[#c6ff00] font-bold'
                  : 'bg-emerald-600 border-emerald-600 text-white font-bold'
                : isDark
                ? 'bg-[#111712] border-[#222e23] text-neutral-400 hover:text-white'
                : 'bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            <span>BOX</span>
          </button>

          <button
            onClick={() => setToolMode('polyline')}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 transition-all ${
              toolMode === 'polyline'
                ? isDark
                  ? 'bg-[#1d261e] border-[#c6ff00] text-[#c6ff00] font-bold'
                  : 'bg-emerald-600 border-emerald-600 text-white font-bold'
                : isDark
                ? 'bg-[#111712] border-[#222e23] text-neutral-400 hover:text-white'
                : 'bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            <span>ROAD</span>
          </button>

          <button
            onClick={() => setToolMode('point')}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 transition-all ${
              toolMode === 'point'
                ? isDark
                  ? 'bg-[#1d261e] border-[#c6ff00] text-[#c6ff00] font-bold'
                  : 'bg-emerald-600 border-emerald-600 text-white font-bold'
                : isDark
                ? 'bg-[#111712] border-[#222e23] text-neutral-400 hover:text-white'
                : 'bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            <span>POINT</span>
          </button>

          <button
            onClick={() => setToolMode('measure')}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 transition-all ${
              toolMode === 'measure'
                ? isDark
                  ? 'bg-[#1d261e] border-[#c6ff00] text-[#c6ff00] font-bold'
                  : 'bg-emerald-600 border-emerald-600 text-white font-bold'
                : isDark
                ? 'bg-[#111712] border-[#222e23] text-neutral-400 hover:text-white'
                : 'bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            <span>RULER</span>
          </button>
        </div>

        {/* Feature Type Dropdown */}
        <div className="space-y-1 font-mono-tech text-xs">
          <label className="text-neutral-400 text-[11px]">ACTIVE FEATURE CLASS</label>
          <select
            value={activeFeatureType}
            onChange={(e) => setActiveFeatureType(e.target.value)}
            className={`w-full p-2 rounded border text-xs outline-none ${
              isDark ? 'bg-[#121914] border-[#273729] text-white' : 'bg-white border-neutral-300'
            }`}
          >
            <option value="PIT_BOUNDARY">PIT_BOUNDARY (Mine Rim)</option>
            <option value="BENCH_CREST">BENCH_CREST (Bench Step)</option>
            <option value="HAUL_ROAD">HAUL_ROAD (Ramp Line)</option>
            <option value="BLAST_ZONE">BLAST_ZONE (Pattern)</option>
            <option value="SUMP">SUMP (Water Basin)</option>
            <option value="STOCKPILE">STOCKPILE (Volume)</option>
          </select>
        </div>
      </div>

      {/* Layer Visibility Toggles */}
      <div className="space-y-2 pt-2 border-t border-[#202b21] font-mono-tech text-xs">
        <div className="text-neutral-400 text-[11px] mb-1 font-bold">LAYERS &amp; OVERLAYS</div>
        
        <div className="space-y-1">
          <label className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-500/10 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c6ff00]"></span>
              RGB Orthomosaic
            </span>
            <input
              type="checkbox"
              checked={layerVisibility.ortho}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, ortho: e.target.checked }))}
              className="accent-[#c6ff00]"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-500/10 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              DSM Elevation Surface
            </span>
            <input
              type="checkbox"
              checked={layerVisibility.dsm}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, dsm: e.target.checked }))}
              className="accent-amber-400"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-500/10 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              DTM Topo Terrain &amp; Benches
            </span>
            <input
              type="checkbox"
              checked={layerVisibility.dtm}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, dtm: e.target.checked }))}
              className="accent-teal-400"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-500/10 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Topographic Contours ({contourConfig.interval}m)
            </span>
            <input
              type="checkbox"
              checked={layerVisibility.contours}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, contours: e.target.checked }))}
              className="accent-cyan-400"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-500/10 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Shapefile Vector Polygons
            </span>
            <input
              type="checkbox"
              checked={layerVisibility.vectors}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, vectors: e.target.checked }))}
              className="accent-emerald-400"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-500/10 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
              UTM Grid Ticks (500m)
            </span>
            <input
              type="checkbox"
              checked={layerVisibility.grid}
              onChange={(e) => setLayerVisibility((prev) => ({ ...prev, grid: e.target.checked }))}
              className="accent-neutral-400"
            />
          </label>
        </div>
      </div>

      {/* Action Footer Buttons: Google Drive Sync & Multi-Format Export */}
      <div className="space-y-2 pt-3 border-t border-[#202b21]">
        <button
          onClick={onOpenDriveModal}
          className="w-full py-2 px-3 rounded text-xs font-mono-tech font-bold bg-[#132233] hover:bg-[#182b40] text-sky-300 border border-sky-800/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <FolderSync className="w-4 h-4 text-sky-400" />
          <span>SAVE TO GOOGLE DRIVE</span>
        </button>

        <button
          onClick={onOpenExportModal}
          className="w-full py-2.5 px-3 rounded text-xs font-mono-tech font-bold bg-[#c6ff00] hover:bg-[#b0e600] text-black shadow-[0_0_15px_rgba(198,255,0,0.2)] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT (GEOJSON / KML / DXF / SHP)</span>
        </button>
      </div>
    </aside>
  );
};
