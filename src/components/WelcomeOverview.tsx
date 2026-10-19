import React, { useState } from 'react';
import { 
  ArrowRight, 
  Layers, 
  Mountain, 
  PenTool, 
  Sparkles, 
  Sliders, 
  MapPin, 
  Maximize2, 
  FileCode, 
  Database,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { ModuleId } from '../types/gis';

interface WelcomeOverviewProps {
  onOpenWorkspace: (module: ModuleId) => void;
  onOpenUpload: () => void;
  theme: 'dark' | 'light';
}

export const WelcomeOverview: React.FC<WelcomeOverviewProps> = ({
  onOpenWorkspace,
  onOpenUpload,
  theme
}) => {
  const isDark = theme === 'dark';
  const [heroSplitPos, setHeroSplitPos] = useState<number>(52);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left));
    setHeroSplitPos((x / rect.width) * 100);
  };

  return (
    <div className={`w-full min-h-[calc(100vh-80px)] overflow-y-auto px-4 md:px-8 py-8 ${
      isDark ? 'bg-[#0a0d0b] text-neutral-100' : 'bg-[#f8faf8] text-neutral-900'
    }`}>
      <div className="max-w-[1360px] mx-auto space-y-12">
        {/* HERO SECTION - RECREATED FROM SCREENSHOT 1 */}
        <section className="space-y-6 pt-2">
          {/* Live session banner line */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono-tech">
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded border ${
              isDark 
                ? 'bg-[#121914] border-[#223125] text-[#c6ff00]' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#c6ff00] animate-ping" />
              <span className="font-semibold tracking-wider">• LIVE SESSION · PIT 04 NORTH BENCH</span>
            </div>

            <div className={`tracking-widest ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              SRC UAV-04 · 2.8 CM GSD · 14:32:07
            </div>
          </div>

          {/* Large Title */}
          <div className="space-y-4 max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight font-sans leading-[1.08]">
              Unified Web-GIS & drone operations for mining.
            </h1>
            <p className={`text-base md:text-lg max-w-3xl leading-relaxed ${
              isDark ? 'text-neutral-300' : 'text-neutral-700'
            }`}>
              Open ortho mosaics, DSM/DTM surfaces, contour models and live shapefile digitization in one browser canvas — QGIS, Agisoft and Global Mapper Pro workflows, without the install.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onOpenWorkspace('module1_split')}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#c6ff00] hover:bg-[#b0e600] text-black font-mono-tech font-bold text-sm tracking-wide rounded-sm shadow-[0_0_25px_rgba(198,255,0,0.35)] transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>OPEN PIT 04 WORKSPACE</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={onOpenUpload}
              className={`inline-flex items-center gap-2 px-5 py-3.5 font-mono-tech text-xs tracking-wider font-semibold rounded-sm border transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#121814] hover:bg-[#1a231d] border-[#2c3d2e] text-neutral-200'
                  : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-800'
              }`}
            >
              INSPECT DATA PIPELINE
            </button>

            <span className={`text-xs font-mono-tech ${isDark ? 'text-[#8e9f8f]' : 'text-neutral-500'}`}>
              No install · 3 modules · 1 workspace · 1GB upload limit
            </span>
          </div>

          {/* HERO SPLIT VIEWER INTERACTIVE SHOWCASE (MATCHING SCREENSHOT 1) */}
          <div 
            className={`relative w-full h-[540px] rounded-lg overflow-hidden border cursor-ew-resize select-none shadow-2xl ${
              isDark ? 'border-[#222e23] bg-[#0c100e]' : 'border-neutral-300 bg-neutral-900'
            }`}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleHeroMouseMove}
          >
            {/* Left Layer: ORTHOMOSAIC RGB */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${heroSplitPos}%` }}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `radial-gradient(ellipse at 40% 50%, rgba(200, 150, 100, 0.4), transparent 70%), linear-gradient(135deg, #704828 0%, #a67c52 35%, #c89d6e 60%, #4a3319 100%)`,
                  width: '100%',
                  minWidth: '900px'
                }}
              >
                {/* Simulated aerial quarry terracing graphic texture */}
                <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 1000 600" preserveAspectRatio="none">
                  {/* Bench contours */}
                  <path d="M 200 100 Q 450 140 700 80 Q 900 160 850 350 Q 800 500 500 520 Q 200 480 150 300 Z" fill="#8c6239" opacity="0.4" />
                  <path d="M 260 160 Q 480 200 660 150 Q 820 220 780 370 Q 720 460 480 470 Q 250 430 220 290 Z" fill="#a47746" opacity="0.5" />
                  <path d="M 330 230 Q 500 260 620 220 Q 740 280 700 390 Q 640 440 460 430 Q 310 390 290 280 Z" fill="#b98a54" opacity="0.6" />
                  <path d="M 400 300 Q 520 320 590 290 Q 660 340 620 400 Q 560 420 440 400 Q 370 370 370 310 Z" fill="#5c8a8a" opacity="0.85" />
                  
                  {/* Haul road zig-zag */}
                  <path d="M 160 310 L 320 330 L 480 340 L 640 330 L 780 370" stroke="#d4b483" strokeWidth="8" strokeDasharray="6 2" fill="none" opacity="0.8" />
                  <path d="M 780 370 L 680 430 L 520 450 L 360 440" stroke="#d4b483" strokeWidth="7" strokeDasharray="6 2" fill="none" opacity="0.8" />

                  {/* Excavator marker */}
                  <rect x="580" y="325" width="16" height="10" fill="#f1c40f" rx="1" />
                  <line x1="596" y1="330" x2="615" y2="336" stroke="#2c3e50" strokeWidth="3" />
                </svg>

                {/* Overlays on Ortho */}
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm border border-[#2b3a2e] px-2.5 py-1 text-[11px] font-mono-tech text-[#c6ff00] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c6ff00]"></span>
                  ORTHO MOSAIC · RGB
                </div>

                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm border border-[#2b3a2e] px-2 py-0.5 text-[11px] font-mono-tech text-neutral-300">
                  2.8 CM GSD
                </div>

                <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-sm px-3 py-1.5 border border-[#273529] text-[11px] font-mono-tech text-neutral-300 flex items-center gap-4">
                  <span className="text-white font-semibold">512,884 E</span>
                  <span className="text-white font-semibold">4,687,201 N</span>
                  <span className="text-[#00e5ff]">EPSG:32646</span>
                </div>
              </div>
            </div>

            {/* Right Layer: DSM & DTM Stacked (Split vertically on right) */}
            <div 
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ left: `${heroSplitPos}%` }}
            >
              <div className="relative w-full h-full flex flex-col min-w-[900px] -translate-x-[0px]">
                {/* Top Half: DSM Surface */}
                <div className="relative h-1/2 w-full bg-[#1b221b] border-b border-[#29382c] overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(45deg, #1e261f 25%, #2a382b 50%, #3e5340 75%, #151d16 100%)`,
                      backgroundSize: '20px 20px'
                    }}
                  >
                    {/* High-density surface points simulation */}
                    <div className="absolute inset-0 bg-[radial-gradient(#3a4e3c_1px,transparent_1px)] [background-size:8px_8px] opacity-70" />
                    
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm border border-amber-900/60 px-2.5 py-1 text-[11px] font-mono-tech text-amber-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      DSM · SURFACE
                    </div>

                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm border border-neutral-700 px-2 py-0.5 text-[11px] font-mono-tech text-neutral-300">
                      18.4 M PTS
                    </div>
                  </div>
                </div>

                {/* Bottom Half: DTM Terrain Topography with Stepped Contours */}
                <div className="relative h-1/2 w-full bg-[#0e1f1c] overflow-hidden">
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(circle at 60% 60%, #155e54 0%, #0c332e 40%, #071f1c 100%)'
                    }}
                  >
                    {/* Stepped elevation wave contour lines */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                      <path d="M 0 50 Q 200 20 400 90 T 800 60 L 800 300 L 0 300 Z" fill="#134e48" opacity="0.4" />
                      <path d="M 0 100 Q 250 80 450 140 T 800 120 L 800 300 L 0 300 Z" fill="#115e59" opacity="0.5" />
                      <path d="M 0 160 Q 300 130 500 210 T 800 180 L 800 300 L 0 300 Z" fill="#0f766e" opacity="0.6" />
                      <path d="M 0 220 Q 350 190 550 250 T 800 230 L 800 300 L 0 300 Z" fill="#14b8a6" opacity="0.7" />
                      
                      {/* Water sump lagoon */}
                      <circle cx="580" cy="180" r="35" fill="#2dd4bf" opacity="0.9" />
                      <circle cx="280" cy="220" r="25" fill="#5eead4" opacity="0.8" />
                    </svg>

                    <div className="absolute top-3 left-4 bg-black/80 backdrop-blur-sm border border-teal-900 px-2.5 py-1 text-[11px] font-mono-tech text-teal-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                      DTM · TERRAIN
                    </div>

                    <div className="absolute top-3 right-4 bg-black/80 backdrop-blur-sm border border-neutral-700 px-2 py-0.5 text-[11px] font-mono-tech text-neutral-300">
                      0.5 M GRID
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Draggable Divider Handle */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-[#c6ff00] cursor-ew-resize z-20 shadow-[0_0_15px_rgba(198,255,0,0.8)]"
              style={{ left: `${heroSplitPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0a0f0b] border-2 border-[#c6ff00] flex items-center justify-center text-[#c6ff00] shadow-xl">
                <Sliders className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Hint overlay */}
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-mono-tech text-neutral-400 pointer-events-none">
              <span className="text-[#c6ff00]">DRAG DIVIDER</span> TO COMPARE ORTHO VS DSM/DTM
            </div>
          </div>
        </section>

        {/* MODULE INDEX SECTION - RECREATED FROM SCREENSHOT 2 */}
        <section className="space-y-6 pt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4 border-[#202b21]">
            <div>
              <div className="text-xs font-mono-tech text-[#c6ff00] tracking-widest uppercase mb-1">
                // MODULE INDEX &nbsp; 03 MODULES · BROWSER-NATIVE
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans">
                Three modules. One survey canvas.
              </h2>
            </div>
            <p className={`text-xs md:text-sm max-w-md font-mono-tech leading-relaxed text-right md:text-right ${
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Each module opens inside the same session, on the same UTM grid — no exports, no re-uploads, no desktop license hand-off between them.
            </p>
          </div>

          {/* 3 Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MODULE 01 CARD */}
            <div 
              onClick={() => onOpenWorkspace('module1_split')}
              className={`group flex flex-col justify-between p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
                isDark 
                  ? 'bg-[#0f1410] border-[#222e23] hover:border-[#c6ff00]/60 hover:bg-[#121914]' 
                  : 'bg-white border-neutral-200 hover:border-emerald-500 hover:shadow-lg'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono-tech">
                  <span className="text-[#c6ff00] font-bold">MODULE 01</span>
                  <Layers className="w-4 h-4 text-neutral-400 group-hover:text-[#c6ff00] transition-colors" />
                </div>

                <h3 className="text-xl font-bold font-sans">
                  Split-surface viewer
                </h3>

                <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Ortho, DSM and DTM stacked in a synced split view — drag the divider to compare surface and terrain over the active pit.
                </p>

                {/* Card Graphic: 3-pane synced preview */}
                <div className="relative h-44 rounded overflow-hidden border border-[#273829] flex">
                  {/* Pane 1 Ortho */}
                  <div className="w-1/3 h-full bg-[#6d4d2e] border-r border-black relative">
                    <div className="absolute inset-0 bg-[radial-gradient(#a37446_2px,transparent_2px)] [background-size:12px_12px]" />
                    <span className="absolute bottom-2 left-2 text-[9px] font-mono-tech font-bold px-1.5 py-0.5 bg-black/80 text-[#c6ff00] rounded">
                      ORTHO
                    </span>
                  </div>

                  {/* Pane 2 DSM */}
                  <div className="w-1/3 h-full bg-[#2a382c] border-r border-black relative">
                    <div className="absolute inset-0 bg-[radial-gradient(#4d6950_1px,transparent_1px)] [background-size:6px_6px]" />
                    <span className="absolute bottom-2 left-2 text-[9px] font-mono-tech font-bold px-1.5 py-0.5 bg-black/80 text-amber-400 rounded">
                      DSM
                    </span>
                  </div>

                  {/* Pane 3 DTM */}
                  <div className="w-1/3 h-full bg-[#114b43] relative">
                    <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,#206a5f,#206a5f_5px,#114b43_5px,#114b43_10px)]" />
                    <span className="absolute bottom-2 left-2 text-[9px] font-mono-tech font-bold px-1.5 py-0.5 bg-black/80 text-teal-300 rounded">
                      DTM
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className={`text-[10px] font-mono-tech px-2 py-1 rounded border ${
                    isDark ? 'bg-[#151d17] border-[#253327] text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}>
                    SYNCED PANES
                  </span>
                  <span className={`text-[10px] font-mono-tech px-2 py-1 rounded border ${
                    isDark ? 'bg-[#151d17] border-[#253327] text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}>
                    2.8 CM GSD
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono-tech font-bold text-[#c6ff00] group-hover:translate-x-1 transition-transform">
                  OPEN MODULE 01 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* MODULE 02 CARD */}
            <div 
              onClick={() => onOpenWorkspace('module2_contours')}
              className={`group flex flex-col justify-between p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
                isDark 
                  ? 'bg-[#0f1410] border-[#222e23] hover:border-[#c6ff00]/60 hover:bg-[#121914]' 
                  : 'bg-white border-neutral-200 hover:border-emerald-500 hover:shadow-lg'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono-tech">
                  <span className="text-[#c6ff00] font-bold">MODULE 02</span>
                  <Mountain className="w-4 h-4 text-neutral-400 group-hover:text-[#c6ff00] transition-colors" />
                </div>

                <h3 className="text-xl font-bold font-sans">
                  Elevation & contours
                </h3>

                <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Run elevation models, export 5 m contour sets and print-ready topographic sheets for high-altitude benches.
                </p>

                {/* Card Graphic: Contour lines with cyan water/hypsometric steps */}
                <div className="relative h-44 rounded overflow-hidden border border-[#273829] bg-[#0c2a26]">
                  <svg className="w-full h-full" viewBox="0 0 300 180" preserveAspectRatio="none">
                    <path d="M 0 30 Q 150 10 300 40 L 300 180 L 0 180 Z" fill="#0f4942" />
                    <path d="M 0 70 Q 120 40 300 80 L 300 180 L 0 180 Z" fill="#13635b" />
                    <path d="M 0 110 Q 180 80 300 120 L 300 180 L 0 180 Z" fill="#168075" />
                    <path d="M 0 145 Q 160 120 300 150 L 300 180 L 0 180 Z" fill="#20b2aa" />
                    <circle cx="160" cy="110" r="18" fill="#5eead4" />
                  </svg>

                  <span className="absolute top-2 left-2 text-[9px] font-mono-tech font-bold px-1.5 py-0.5 bg-black/80 text-[#c6ff00] rounded">
                    5 M INTERVAL
                  </span>

                  <span className="absolute top-2 right-2 text-[9px] font-mono-tech px-1.5 py-0.5 bg-black/80 text-neutral-300 rounded">
                    ZONE 46N
                  </span>

                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[9px] font-mono-tech text-white bg-black/85 px-2 py-1 rounded">
                    <span>MAX 1,842 M</span>
                    <span className="text-[#c6ff00]">TIN 0.5 M</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className={`text-[10px] font-mono-tech px-2 py-1 rounded border ${
                    isDark ? 'bg-[#151d17] border-[#253327] text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}>
                    CONTOUR 5 M
                  </span>
                  <span className={`text-[10px] font-mono-tech px-2 py-1 rounded border ${
                    isDark ? 'bg-[#151d17] border-[#253327] text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}>
                    TOPO SHEET
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono-tech font-bold text-[#c6ff00] group-hover:translate-x-1 transition-transform">
                  OPEN MODULE 02 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* MODULE 03 CARD */}
            <div 
              onClick={() => onOpenWorkspace('module3_digitize')}
              className={`group flex flex-col justify-between p-6 rounded-lg border transition-all duration-200 cursor-pointer ${
                isDark 
                  ? 'bg-[#0f1410] border-[#222e23] hover:border-[#c6ff00]/60 hover:bg-[#121914]' 
                  : 'bg-white border-neutral-200 hover:border-emerald-500 hover:shadow-lg'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono-tech">
                  <span className="text-[#c6ff00] font-bold">MODULE 03</span>
                  <PenTool className="w-4 h-4 text-neutral-400 group-hover:text-[#c6ff00] transition-colors" />
                </div>

                <h3 className="text-xl font-bold font-sans">
                  Live .shp digitization
                </h3>

                <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Digitize .shp vectors over live pits with drawing tools, attribute forms and edit history in the same canvas.
                </p>

                {/* Card Graphic: Vector digitization on mine pit with tools & attribute table preview */}
                <div className="relative h-44 rounded overflow-hidden border border-[#273829] bg-[#1a2d1d]">
                  {/* Background terraced quarry image */}
                  <div className="absolute inset-0 bg-[radial-gradient(#395e3f_2px,transparent_2px)] [background-size:10px_10px]" />

                  {/* Digitized dashed polygon */}
                  <svg className="w-full h-full" viewBox="0 0 300 180">
                    <polygon 
                      points="50,45 130,30 240,55 270,110 200,140 90,135 40,90" 
                      fill="rgba(198,255,0,0.18)" 
                      stroke="#c6ff00" 
                      strokeWidth="2" 
                      strokeDasharray="4 3" 
                    />
                    {/* Vertices */}
                    <circle cx="50" cy="45" r="3" fill="#ffffff" stroke="#c6ff00" strokeWidth="1.5" />
                    <circle cx="130" cy="30" r="3" fill="#ffffff" stroke="#c6ff00" strokeWidth="1.5" />
                    <circle cx="240" cy="55" r="3" fill="#ffffff" stroke="#c6ff00" strokeWidth="1.5" />
                    <circle cx="270" cy="110" r="3" fill="#ffffff" stroke="#c6ff00" strokeWidth="1.5" />
                    <circle cx="200" cy="140" r="3" fill="#ffffff" stroke="#c6ff00" strokeWidth="1.5" />
                    <circle cx="90" cy="135" r="3" fill="#ffffff" stroke="#c6ff00" strokeWidth="1.5" />
                  </svg>

                  {/* Micro tool palette */}
                  <div className="absolute top-2 left-2 bg-black/85 px-2 py-1 rounded flex items-center gap-1.5 text-neutral-300 text-[10px]">
                    <span className="text-[#c6ff00]">●</span>
                    <span>⬡</span>
                    <span>▭</span>
                    <span>✎</span>
                  </div>

                  {/* Table overlay at bottom matching screenshot */}
                  <div className="absolute bottom-1 left-1 right-1 bg-black/90 p-1.5 rounded text-[8px] font-mono-tech border border-neutral-800">
                    <div className="grid grid-cols-4 text-neutral-500 pb-0.5 border-b border-neutral-800">
                      <span>FID</span>
                      <span>TYPE</span>
                      <span>AREA_HA</span>
                      <span>STATE</span>
                    </div>
                    <div className="grid grid-cols-4 text-neutral-300 pt-0.5">
                      <span>012</span>
                      <span className="truncate">PIT_BOUND</span>
                      <span className="text-white">134.6</span>
                      <span className="text-[#c6ff00] font-bold">EDITING</span>
                    </div>
                    <div className="grid grid-cols-4 text-neutral-400">
                      <span>013</span>
                      <span className="truncate">BENCH_04</span>
                      <span>42.1</span>
                      <span className="text-sky-400">SAVED</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className={`text-[10px] font-mono-tech px-2 py-1 rounded border ${
                    isDark ? 'bg-[#151d17] border-[#253327] text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}>
                    .SHP VECTORS
                  </span>
                  <span className={`text-[10px] font-mono-tech px-2 py-1 rounded border ${
                    isDark ? 'bg-[#151d17] border-[#253327] text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}>
                    ATTRIBUTES
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono-tech font-bold text-[#c6ff00] group-hover:translate-x-1 transition-transform">
                  OPEN MODULE 03 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* EXTRA SYSTEM METRICS / PIPELINE SPECS */}
        <section className={`p-6 rounded-lg border ${
          isDark ? 'bg-[#0c100d] border-[#1d271e]' : 'bg-white border-neutral-200'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-mono-tech text-xs">
            <div>
              <div className="text-neutral-500 text-[10px]">WEB-ODM PROCESSING NODE</div>
              <div className="text-sm font-bold text-[#c6ff00] mt-0.5">Cluster Node-04 (GPU)</div>
              <div className="text-[10px] text-neutral-400 mt-1">Dense Cloud · 18.4M Points</div>
            </div>

            <div>
              <div className="text-neutral-500 text-[10px]">COORDINATE REFERENCE</div>
              <div className="text-sm font-bold text-[#00e5ff] mt-0.5">WGS 84 / UTM 46N</div>
              <div className="text-[10px] text-neutral-400 mt-1">EPSG:32646 · False E: 500k</div>
            </div>

            <div>
              <div className="text-neutral-500 text-[10px]">FILE CAPACITY &amp; TILING</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">1,024 MB Streamlit Cache</div>
              <div className="text-[10px] text-neutral-400 mt-1">Zero-Latency Canvas LOD</div>
            </div>

            <div>
              <div className="text-neutral-500 text-[10px]">EXPORT COMPATIBILITY</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">GeoJSON · KML · DXF · SHP</div>
              <div className="text-[10px] text-neutral-400 mt-1">Google Drive Sync Enabled</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
