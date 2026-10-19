import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileCode, 
  Compass, 
  CheckCircle2, 
  Copy, 
  Check, 
  Archive, 
  Table, 
  Layers,
  Map
} from 'lucide-react';
import { VectorFeature } from '../types/gis';
import { 
  exportToGeoJSON, 
  exportToKML, 
  exportToDXF, 
  exportToShapefileZip, 
  exportToCSV, 
  downloadFile 
} from '../utils/exporters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  features: VectorFeature[];
  siteName: string;
  theme: 'dark' | 'light';
}

type ExportTab = 'geojson' | 'kml' | 'dxf' | 'shp' | 'csv';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  features,
  siteName,
  theme
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<ExportTab>('geojson');
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  if (!isOpen) return null;

  const safeProjectName = siteName.replace(/\s+/g, '_');

  const geojsonContent = exportToGeoJSON(features, safeProjectName);
  const kmlContent = exportToKML(features, safeProjectName);
  const dxfContent = exportToDXF(features, safeProjectName);
  const csvContent = exportToCSV(features);

  const getActiveContent = () => {
    switch (activeTab) {
      case 'geojson': return geojsonContent;
      case 'kml': return kmlContent;
      case 'dxf': return dxfContent;
      case 'csv': return csvContent;
      default: return geojsonContent;
    }
  };

  const handleDownloadActive = async () => {
    if (activeTab === 'geojson') {
      downloadFile(geojsonContent, `${safeProjectName}.geojson`, 'application/geo+json');
    } else if (activeTab === 'kml') {
      downloadFile(kmlContent, `${safeProjectName}.kml`, 'application/vnd.google-earth.kml+xml');
    } else if (activeTab === 'dxf') {
      downloadFile(dxfContent, `${safeProjectName}.dxf`, 'application/dxf');
    } else if (activeTab === 'csv') {
      downloadFile(csvContent, `${safeProjectName}_attributes.csv`, 'text/csv');
    } else if (activeTab === 'shp') {
      setIsZipping(true);
      const zipBlob = await exportToShapefileZip(features, safeProjectName);
      downloadFile(zipBlob, `${safeProjectName}_Shapefile_UTM46N.zip`, 'application/zip');
      setIsZipping(false);
    }
  };

  const handleDownloadAllBundle = async () => {
    setIsZipping(true);
    const zipBlob = await exportToShapefileZip(features, `${safeProjectName}_FULL_EXPORT`);
    downloadFile(zipBlob, `${safeProjectName}_All_Formats.zip`, 'application/zip');
    setIsZipping(false);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(getActiveContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-[#0b0e0c] border-[#222e23] text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#101612] border-[#1f2c21]' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#c6ff00]/10 border border-[#c6ff00]/30 text-[#c6ff00]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-sans text-base">
                Multi-Format Data Export Hub
              </h3>
              <p className="text-xs text-neutral-400 font-mono-tech">
                Supporting GeoJSON, KML, AutoCAD DXF, and ESRI Shapefile Bundle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className={`px-6 py-2.5 flex items-center justify-between border-b text-xs font-mono-tech ${
          isDark ? 'border-[#1b251c] bg-[#0d120e]' : 'border-neutral-200 bg-neutral-100'
        }`}>
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('geojson')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeTab === 'geojson'
                  ? 'bg-[#c6ff00] text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              GeoJSON (.geojson)
            </button>

            <button
              onClick={() => setActiveTab('kml')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeTab === 'kml'
                  ? 'bg-[#c6ff00] text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Google Earth (.kml)
            </button>

            <button
              onClick={() => setActiveTab('dxf')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeTab === 'dxf'
                  ? 'bg-[#c6ff00] text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              AutoCAD (.dxf)
            </button>

            <button
              onClick={() => setActiveTab('shp')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeTab === 'shp'
                  ? 'bg-[#c6ff00] text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Shapefile (.zip)
            </button>

            <button
              onClick={() => setActiveTab('csv')}
              className={`px-3 py-1.5 rounded transition-all ${
                activeTab === 'csv'
                  ? 'bg-[#c6ff00] text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Attributes (.csv)
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab !== 'shp' && (
              <button
                onClick={handleCopyContent}
                className="px-2 py-1 rounded border border-[#2b3a2d] hover:bg-[#18231a] text-neutral-300 text-[11px] flex items-center gap-1 transition-colors"
                title="Copy content to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-[#c6ff00]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'shp' ? (
            <div className={`p-6 rounded-lg border text-center space-y-4 font-mono-tech ${
              isDark ? 'bg-[#101511] border-[#223024]' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#c6ff00]">
                <Archive className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-bold text-white text-base">ESRI Shapefile Package (.zip)</h4>
                <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                  Bundles standard GIS shapefile components: <span className="text-[#c6ff00]">.shp</span>, <span className="text-[#c6ff00]">.shx</span>, <span className="text-[#c6ff00]">.dbf</span>, and <span className="text-[#c6ff00]">.prj</span> (WGS 84 / UTM Zone 46N - EPSG:32646).
                </p>
              </div>

              <div className="text-xs text-neutral-400 flex items-center justify-center gap-4 pt-2">
                <span>Features: {features.length}</span>
                <span>·</span>
                <span>CRS: EPSG:32646</span>
                <span>·</span>
                <span>Ready for QGIS / Global Mapper</span>
              </div>
            </div>
          ) : (
            <div className={`rounded-lg border overflow-hidden ${
              isDark ? 'bg-[#080b09] border-[#1d271e]' : 'bg-neutral-900 border-neutral-800'
            }`}>
              <pre className="p-4 text-xs font-mono-tech text-neutral-300 max-h-72 overflow-y-auto overflow-x-auto leading-relaxed">
                {getActiveContent()}
              </pre>
            </div>
          )}

          {/* Quick Details Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono-tech text-neutral-400 pt-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#00e5ff]" />
              <span>Project: {siteName}</span>
              <span>·</span>
              <span className="text-white">Zone 46N (EPSG:32646)</span>
            </div>

            <span className="text-[#c6ff00]">
              {features.length} Vector Polygons &amp; Layers
            </span>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className={`px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-[#101612] border-[#1f2c21]' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <button
            onClick={handleDownloadAllBundle}
            disabled={isZipping}
            className={`px-4 py-2.5 rounded-lg border text-xs font-mono-tech font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              isDark ? 'bg-[#162018] hover:bg-[#1e2c21] border-[#293c2b] text-[#c6ff00]' : 'bg-white hover:bg-neutral-100 border-neutral-300 text-emerald-800'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>DOWNLOAD ALL (.ZIP BUNDLE)</span>
          </button>

          <button
            onClick={handleDownloadActive}
            disabled={isZipping}
            className="px-6 py-2.5 rounded-lg bg-[#c6ff00] hover:bg-[#b0e600] text-black font-mono-tech font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(198,255,0,0.3)] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD {activeTab.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
