import React from 'react';
import { 
  Layers, 
  Mountain, 
  PenTool, 
  HardDrive, 
  CloudUpload, 
  Download, 
  Sun, 
  Moon, 
  Radio, 
  Compass, 
  CheckCircle2, 
  Activity,
  Maximize2,
  FolderSync
} from 'lucide-react';
import { ModuleId, UTMCoords } from '../types/gis';

interface TopBarProps {
  activeModule: ModuleId;
  setActiveModule: (mod: ModuleId) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  coords: UTMCoords;
  onOpenDriveModal: () => void;
  onOpenExportModal: () => void;
  onOpenUploadModal: () => void;
  featuresCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeModule,
  setActiveModule,
  theme,
  toggleTheme,
  coords,
  onOpenDriveModal,
  onOpenExportModal,
  onOpenUploadModal,
  featuresCount
}) => {
  const isDark = theme === 'dark';

  return (
    <header className={`w-full border-b transition-colors duration-200 z-30 select-none ${
      isDark 
        ? 'bg-[#0b0e0c]/95 border-[#1e261f] text-neutral-200' 
        : 'bg-white border-neutral-200 text-neutral-800'
    } backdrop-blur-md`}>
      {/* Top micro-telemetry ticker bar */}
      <div className={`px-4 py-1 text-[11px] font-mono-tech flex flex-wrap items-center justify-between border-b ${
        isDark ? 'border-[#171f18] bg-[#070908] text-[#8e9f8f]' : 'border-neutral-100 bg-neutral-50 text-neutral-500'
      }`}>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center gap-1.5 text-[#c6ff00] font-semibold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#c6ff00] animate-pulse"></span>
            LIVE SESSION · PIT 04 NORTH BENCH
          </span>
          <span className="opacity-40">/</span>
          <span>SRC UAV-04 · 2.8 CM GSD</span>
          <span className="opacity-40">/</span>
          <span className="text-[#00e5ff]">EPSG:32646 (UTM 46N)</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Web-ODM: SYNCED
          </span>
          <span className="flex items-center gap-1 text-sky-400">
            <Activity className="w-3 h-3" /> Web-GIS TILE: 2.4ms
          </span>
          <span className="text-amber-400 font-semibold">
            1GB CACHE BUFFER
          </span>
          <span className="opacity-60">14:32:07 UTC</span>
        </div>
      </div>

      {/* Main navigation & action bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveModule('overview')}
            className="flex items-center space-x-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c6ff00] via-[#00e5ff] to-[#0b2b1a] p-0.5 shadow-[0_0_15px_rgba(198,255,0,0.3)]">
              <div className={`w-full h-full rounded-[6px] flex items-center justify-center font-bold text-xs ${
                isDark ? 'bg-[#090d0a] text-[#c6ff00]' : 'bg-white text-emerald-800'
              }`}>
                M
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-mono-tech font-extrabold tracking-tight text-sm ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}>
                  MINING_DRONE_OS
                </span>
                <span className="text-[10px] font-mono-tech font-bold px-1.5 py-0.2 bg-[#c6ff00] text-black rounded-sm">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium tracking-wide">
                The Unified Web-GIS & Drone Operations for Mining
              </p>
            </div>
          </button>
        </div>

        {/* Module View Navigation Tabs */}
        <nav className={`flex items-center p-1 rounded-lg border ${
          isDark ? 'bg-[#111712] border-[#222e23]' : 'bg-neutral-100 border-neutral-200'
        }`}>
          <button
            onClick={() => setActiveModule('overview')}
            className={`px-3 py-1.5 text-xs font-mono-tech font-medium rounded-md transition-all ${
              activeModule === 'overview'
                ? isDark
                  ? 'bg-[#1b251d] text-[#c6ff00] shadow-sm border border-[#2d3f30]'
                  : 'bg-white text-emerald-700 shadow-sm'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            OVERVIEW
          </button>

          <button
            onClick={() => setActiveModule('module1_split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tech font-medium rounded-md transition-all ${
              activeModule === 'module1_split'
                ? isDark
                  ? 'bg-[#1b251d] text-[#c6ff00] shadow-sm border border-[#2d3f30]'
                  : 'bg-white text-emerald-700 shadow-sm'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            MOD 01: SPLIT SURFACE
          </button>

          <button
            onClick={() => setActiveModule('module2_contours')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tech font-medium rounded-md transition-all ${
              activeModule === 'module2_contours'
                ? isDark
                  ? 'bg-[#1b251d] text-[#c6ff00] shadow-sm border border-[#2d3f30]'
                  : 'bg-white text-emerald-700 shadow-sm'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            MOD 02: CONTOURS
          </button>

          <button
            onClick={() => setActiveModule('module3_digitize')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tech font-medium rounded-md transition-all ${
              activeModule === 'module3_digitize'
                ? isDark
                  ? 'bg-[#1b251d] text-[#c6ff00] shadow-sm border border-[#2d3f30]'
                  : 'bg-white text-emerald-700 shadow-sm'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            MOD 03: LIVE .SHP
            {featuresCount > 0 && (
              <span className="ml-1 text-[10px] px-1 py-0.2 bg-[#c6ff00]/20 text-[#c6ff00] rounded">
                {featuresCount}
              </span>
            )}
          </button>
        </nav>

        {/* Real-Time Live Cursor Coordinates readout */}
        <div className={`hidden lg:flex items-center gap-3 px-3 py-1.5 rounded border font-mono-tech text-xs ${
          isDark ? 'bg-[#0f1410] border-[#222e23] text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
        }`}>
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="text-[#8e9f8f]">E:</span>
            <span className="font-semibold text-white">{coords.easting.toLocaleString()} m</span>
          </div>
          <span className="opacity-40">|</span>
          <div>
            <span className="text-[#8e9f8f]">N:</span>
            <span className="font-semibold text-white">{coords.northing.toLocaleString()} m</span>
          </div>
          <span className="opacity-40">|</span>
          <div className="text-[#c6ff00]">
            <span>Z: </span>
            <span className="font-bold">{coords.elevation} m</span>
          </div>
        </div>

        {/* Action Controls: 1GB Upload, Google Drive, Export, Theme */}
        <div className="flex items-center space-x-2">
          {/* 1GB Upload */}
          <button
            onClick={onOpenUploadModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono-tech border transition-all ${
              isDark 
                ? 'bg-[#151c16] hover:bg-[#1d271f] border-[#29362a] text-neutral-200' 
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
            }`}
            title="Upload Ortho/DSM/GeoTIFF/SHP up to 1GB"
          >
            <CloudUpload className="w-3.5 h-3.5 text-[#c6ff00]" />
            <span className="hidden sm:inline">1GB UPLOAD</span>
          </button>

          {/* Google Drive Plugin */}
          <button
            onClick={onOpenDriveModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono-tech border transition-all ${
              isDark
                ? 'bg-[#131b24] hover:bg-[#1c2734] border-[#1e344a] text-sky-200'
                : 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-800'
            }`}
            title="Google Drive Sync & Direct Links"
          >
            <FolderSync className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">G-DRIVE</span>
          </button>

          {/* Multi-Format Export */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-tech font-bold bg-[#c6ff00] hover:bg-[#b0e600] text-black shadow-[0_0_12px_rgba(198,255,0,0.25)] transition-all cursor-pointer"
            title="Export GeoJSON, KML, DXF, SHP"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded border transition-colors ${
              isDark
                ? 'bg-[#151c16] border-[#29362a] text-amber-300 hover:text-white'
                : 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:text-black'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
