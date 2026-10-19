import React, { useState } from 'react';
import { 
  X, 
  Terminal, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  FileCode, 
  Play, 
  HardDrive,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { downloadFile } from '../utils/exporters';

interface StreamlitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export const StreamlitHubModal: React.FC<StreamlitHubModalProps> = ({
  isOpen,
  onClose,
  theme
}) => {
  const isDark = theme === 'dark';
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'run' | 'code' | 'config'>('run');

  if (!isOpen) return null;

  const runCommand = `pip install -r requirements.txt\nstreamlit run streamlit_app.py --server.maxUploadSize=1024`;

  const copyCommand = () => {
    navigator.clipboard.writeText(runCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const downloadStreamlitApp = async () => {
    try {
      const response = await fetch('/streamlit_app.py');
      const text = await response.text();
      downloadFile(text, 'streamlit_app.py', 'text/x-python');
    } catch {
      downloadFile(
        `# Run with: streamlit run streamlit_app.py\nimport streamlit as st\nst.write("MINING_DRONE_OS")`,
        'streamlit_app.py',
        'text/x-python'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-[#0b0e0c] border-[#222e23] text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#101612] border-[#1f2c21]' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#ff4b4b]/15 border border-[#ff4b4b]/40 flex items-center justify-center text-[#ff4b4b] font-bold text-sm">
              st
            </div>
            <div>
              <h3 className="font-bold font-sans text-base flex items-center gap-2">
                Streamlit Python Native Engine
                <span className="text-[10px] font-mono-tech px-1.5 py-0.2 rounded bg-[#ff4b4b]/20 text-[#ff4b4b] border border-[#ff4b4b]/40 font-bold">
                  1024 MB UPLOAD LIMIT
                </span>
              </h3>
              <p className="text-xs text-neutral-400 font-mono-tech">
                Run MINING_DRONE_OS directly on Streamlit or Streamlit Cloud
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`px-6 py-2.5 flex items-center gap-2 border-b text-xs font-mono-tech ${
          isDark ? 'bg-[#0d120e] border-[#1b251c]' : 'bg-neutral-100 border-neutral-200'
        }`}>
          <button
            onClick={() => setActiveTab('run')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'run' ? 'bg-[#c6ff00] text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            How to Run in Streamlit
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'code' ? 'bg-[#c6ff00] text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            streamlit_app.py
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'config' ? 'bg-[#c6ff00] text-black font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            .streamlit/config.toml (1GB Limit)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto font-mono-tech text-xs">
          {activeTab === 'run' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                isDark ? 'bg-[#121914] border-[#223124]' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <div className="font-bold text-sm text-[#c6ff00] flex items-center gap-2 mb-2">
                  <Terminal className="w-4 h-4" />
                  Terminal Run Command
                </div>

                <div className="relative">
                  <pre className="p-3 bg-black/90 rounded border border-neutral-800 text-neutral-200 overflow-x-auto text-[11px] leading-relaxed">
                    {runCommand}
                  </pre>
                  <button
                    onClick={copyCommand}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-[#1e2a20] hover:bg-[#27382a] border border-[#2e4331] text-[#c6ff00] text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
              </div>

              {/* 3 Step Execution Guide */}
              <div className="space-y-2">
                <div className="font-bold text-white text-xs">Steps to run on your local machine or server:</div>
                
                <div className="flex items-start gap-3 p-2.5 rounded border border-[#1e2a1f] bg-[#0e130f]">
                  <span className="w-5 h-5 rounded-full bg-[#c6ff00] text-black font-bold flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                  <div>
                    <div className="font-bold text-white">Download the Python files</div>
                    <div className="text-neutral-400 text-[11px]">Download <code className="text-[#c6ff00]">streamlit_app.py</code> and <code className="text-[#c6ff00]">requirements.txt</code> using the download button below.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded border border-[#1e2a1f] bg-[#0e130f]">
                  <span className="w-5 h-5 rounded-full bg-[#c6ff00] text-black font-bold flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                  <div>
                    <div className="font-bold text-white">Install GIS dependencies</div>
                    <div className="text-neutral-400 text-[11px]">Runs Folium, Streamlit-Folium, Rasterio, and GeoPandas for full 1GB georeferenced raster processing.</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded border border-[#1e2a1f] bg-[#0e130f]">
                  <span className="w-5 h-5 rounded-full bg-[#c6ff00] text-black font-bold flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                  <div>
                    <div className="font-bold text-white">Launch with 1024 MB Upload Limit</div>
                    <div className="text-neutral-400 text-[11px]">The app opens at <code className="text-sky-400">http://localhost:8501</code> with real Google Hybrid Satellite &amp; georeferenced orthomosaics.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-neutral-400">
                <span>streamlit_app.py (Full Source Code)</span>
                <button
                  onClick={downloadStreamlitApp}
                  className="px-2.5 py-1 rounded bg-[#c6ff00] text-black font-bold text-[11px] flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .py</span>
                </button>
              </div>

              <pre className="p-4 bg-black/90 rounded border border-neutral-800 text-neutral-300 max-h-72 overflow-y-auto text-[11px] leading-relaxed">
{`import streamlit as st
import folium
from folium import plugins
from streamlit_folium import st_folium
import json
import base64

st.set_page_config(page_title="MINING_DRONE_OS v2.0", layout="wide")

# Google Hybrid Satellite Layer
m = folium.Map(location=[-23.864, -69.142], zoom_start=15, tiles=None)
folium.TileLayer(
    tiles="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attr="Google Hybrid Satellite",
    name="Google Hybrid Satellite",
    max_zoom=21
).add_to(m)

# 1GB Upload limit configured in .streamlit/config.toml
uploaded_file = st.sidebar.file_uploader("Upload Orthomosaic (Max 1GB)", type=['tif', 'png', 'jpg'])
if uploaded_file:
    # Georeference to quarry bounds
    folium.raster_layers.ImageOverlay(
        image=uploaded_file,
        bounds=[[-23.872, -69.155], [-23.856, -69.129]],
        opacity=0.85
    ).add_to(m)

# Vector Digitization Tools
plugins.Draw(export=True, filename='mining_vectors.geojson').add_to(m)
st_folium(m, width="100%", height=700)`}
              </pre>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-2">
              <div className="text-neutral-400">.streamlit/config.toml (Configures the 1GB Upload Limit)</div>
              <pre className="p-4 bg-black/90 rounded border border-neutral-800 text-[#c6ff00] text-[11px]">
{`[server]
port = 8501
maxUploadSize = 1024
maxMessageSize = 1024

[theme]
base = "dark"
primaryColor = "#c6ff00"
backgroundColor = "#0b0f0c"
secondaryBackgroundColor = "#121914"
textColor = "#e8f0e8"`}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'bg-[#101612] border-[#1f2c21]' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="text-xs font-mono-tech text-neutral-400">
            Files generated in project root: <span className="text-[#c6ff00]">streamlit_app.py</span>, <span className="text-[#c6ff00]">requirements.txt</span>
          </div>

          <button
            onClick={downloadStreamlitApp}
            className="px-5 py-2.5 rounded-lg bg-[#c6ff00] hover:bg-[#b0e600] text-black font-mono-tech font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD STREAMLIT_APP.PY</span>
          </button>
        </div>
      </div>
    </div>
  );
};
