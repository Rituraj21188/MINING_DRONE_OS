import React from 'react';
import { 
  X, 
  Activity, 
  Printer, 
  Download, 
  Mountain, 
  Compass, 
  Layers,
  CheckCircle2
} from 'lucide-react';
import { MiningSite, ContourConfig } from '../types/gis';

interface ElevationProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: MiningSite;
  contourConfig: ContourConfig;
  theme: 'dark' | 'light';
}

export const ElevationProfileModal: React.FC<ElevationProfileModalProps> = ({
  isOpen,
  onClose,
  site,
  contourConfig,
  theme
}) => {
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  // Generate 20 profile points across the pit from West to East
  const profilePoints = [
    { dist: 0, elev: 1842, bench: 'Pit Rim North' },
    { dist: 40, elev: 1820, bench: 'Catch Berm 01' },
    { dist: 70, elev: 1780, bench: 'Bench 02 Crest' },
    { dist: 110, elev: 1780, bench: 'Bench 02 Toe' },
    { dist: 140, elev: 1735, bench: 'Bench 03 Crest' },
    { dist: 180, elev: 1735, bench: 'Bench 03 Toe' },
    { dist: 220, elev: 1680, bench: 'Bench 04 Crest' },
    { dist: 280, elev: 1680, bench: 'Bench 04 Shovel Floor' },
    { dist: 330, elev: 1610, bench: 'Bench 05 Crest' },
    { dist: 380, elev: 1610, bench: 'Bench 05 Toe' },
    { dist: 430, elev: 1530, bench: 'Bench 06 Crest' },
    { dist: 490, elev: 1450, bench: 'Haul Ramp Transition' },
    { dist: 560, elev: 1380, bench: 'Pit Sump Floor (Water)' },
    { dist: 630, elev: 1460, bench: 'South Ramp' },
    { dist: 700, elev: 1550, bench: 'South Bench 03' },
    { dist: 760, elev: 1640, bench: 'South Bench 02' },
    { dist: 830, elev: 1750, bench: 'South Crest Berm' },
    { dist: 900, elev: 1810, bench: 'Pit Rim South' }
  ];

  const maxElev = 1860;
  const minElev = 1340;
  const range = maxElev - minElev;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className={`w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isDark ? 'bg-[#0b0e0c] border-[#222e23] text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#101612] border-[#1f2c21]' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-sans text-base flex items-center gap-2">
                Topographic Bench Elevation Profile (Cut-Section A-A')
                <span className="text-[10px] font-mono-tech px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {contourConfig.interval}M CONTOURS
                </span>
              </h3>
              <p className="text-xs text-neutral-400 font-mono-tech">
                Cross-section terrain slice across Pit 04 North Bench to Sump
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Graph Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Key Geotechnical Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono-tech text-xs">
            <div className={`p-3 rounded border ${isDark ? 'bg-[#101511] border-[#202c21]' : 'bg-neutral-50 border-neutral-200'}`}>
              <div className="text-[10px] text-neutral-400">PIT CREST ELEVATION</div>
              <div className="text-base font-bold text-[#c6ff00] mt-0.5">1,842.0 m ASL</div>
            </div>

            <div className={`p-3 rounded border ${isDark ? 'bg-[#101511] border-[#202c21]' : 'bg-neutral-50 border-neutral-200'}`}>
              <div className="text-[10px] text-neutral-400">PIT FLOOR / SUMP</div>
              <div className="text-base font-bold text-teal-400 mt-0.5">1,380.0 m ASL</div>
            </div>

            <div className={`p-3 rounded border ${isDark ? 'bg-[#101511] border-[#202c21]' : 'bg-neutral-50 border-neutral-200'}`}>
              <div className="text-[10px] text-neutral-400">OVERALL PIT DEPTH</div>
              <div className="text-base font-bold text-[#00e5ff] mt-0.5">462.0 m</div>
            </div>

            <div className={`p-3 rounded border ${isDark ? 'bg-[#101511] border-[#202c21]' : 'bg-neutral-50 border-neutral-200'}`}>
              <div className="text-[10px] text-neutral-400">MAX BENCH SLOPE</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">64.5° (Stable)</div>
            </div>
          </div>

          {/* SVG 2D Elevation Cross-Section Chart */}
          <div className={`p-4 rounded-xl border relative ${
            isDark ? 'bg-[#080b09] border-[#1d271e]' : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div className="flex justify-between items-center text-xs font-mono-tech text-neutral-400 mb-2">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <Activity className="w-3.5 h-3.5 text-[#c6ff00]" />
                Section Profile A (North Crest) ➔ A' (South Crest)
              </span>
              <span className="text-[#c6ff00]">Length: 900 m</span>
            </div>

            <svg viewBox="0 0 900 320" className="w-full h-64 overflow-visible">
              {/* Elevation Horizontal Grid lines */}
              {[1400, 1500, 1600, 1700, 1800].map((h) => {
                const y = 290 - ((h - minElev) / range) * 260;
                return (
                  <g key={h}>
                    <line x1="40" y1={y} x2="880" y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <text x="5" y={y + 4} fill="#6e7f70" fontSize="10" fontFamily="monospace">{h}m</text>
                  </g>
                );
              })}

              {/* Shaded Earth Terrain polygon underneath curve */}
              <defs>
                <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c6ff00" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#0d9488" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#042f2e" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              <path
                d={`
                  M 40 290
                  ${profilePoints.map((p) => {
                    const x = 40 + (p.dist / 900) * 840;
                    const y = 290 - ((p.elev - minElev) / range) * 260;
                    return `L ${x} ${y}`;
                  }).join(' ')}
                  L 880 290 Z
                `}
                fill="url(#terrainGrad)"
              />

              {/* Surface Elevation Line */}
              <path
                d={profilePoints.map((p, i) => {
                  const x = 40 + (p.dist / 900) * 840;
                  const y = 290 - ((p.elev - minElev) / range) * 260;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#c6ff00"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Sump Water fill line */}
              <line x1="530" y1="262" x2="600" y2="262" stroke="#22d3ee" strokeWidth="4" />
              <text x="540" y="255" fill="#22d3ee" fontSize="10" fontFamily="monospace">SUMP POOL</text>

              {/* Bench Crest Markers */}
              {profilePoints.filter((_, i) => i % 2 === 0).map((p, idx) => {
                const x = 40 + (p.dist / 900) * 840;
                const y = 290 - ((p.elev - minElev) / range) * 260;
                return (
                  <g key={idx}>
                    <circle cx={x} cy={y} r="3.5" fill="#ffffff" stroke="#c6ff00" strokeWidth="2" />
                    <text x={x} y={y - 8} fill="#ffffff" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      {p.elev}m
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Topographic Sheet Metadata Block */}
          <div className={`p-4 rounded-lg border font-mono-tech text-xs space-y-2 ${
            isDark ? 'bg-[#0f1411] border-[#1e2a20]' : 'bg-neutral-50 border-neutral-200'
          }`}>
            <div className="font-bold text-[#c6ff00] flex items-center justify-between">
              <span>MINE ENGINEERING TOPOGRAPHIC SHEET BLOCK</span>
              <span className="text-neutral-400 text-[10px]">SCALE 1:2500 · 5M CONTOUR SET</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-neutral-300">
              <div>Surveyor: <span className="text-white">UAV-04 Autonomous</span></div>
              <div>Datum: <span className="text-white">WGS 84 / UTM 46N</span></div>
              <div>GSD: <span className="text-white">2.8 cm / pixel</span></div>
              <div>Quality: <span className="text-emerald-400">RTK Fixed (±1.2cm)</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'bg-[#101612] border-[#1f2c21]' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <span className="text-xs font-mono-tech text-neutral-400">
            Print-ready format calibrated for mining geotechnical review
          </span>

          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-lg bg-[#c6ff00] hover:bg-[#b0e600] text-black font-mono-tech font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT / SAVE TOPO SHEET</span>
          </button>
        </div>
      </div>
    </div>
  );
};
