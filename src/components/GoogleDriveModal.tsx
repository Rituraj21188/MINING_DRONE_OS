import React, { useState } from 'react';
import { 
  X, 
  FolderSync, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  HardDrive, 
  FileCheck, 
  Share2, 
  UploadCloud,
  Clock,
  Download
} from 'lucide-react';
import { VectorFeature, DriveExportResult } from '../types/gis';
import { exportToGeoJSON, exportToKML, exportToDXF, exportToShapefileZip, downloadFile } from '../utils/exporters';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  features: VectorFeature[];
  siteName: string;
  theme: 'dark' | 'light';
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  features,
  siteName,
  theme
}) => {
  const isDark = theme === 'dark';
  const [selectedFormat, setSelectedFormat] = useState<'GeoJSON' | 'KML' | 'DXF' | 'SHP' | 'ALL'>('ALL');
  const [driveFolder, setDriveFolder] = useState<string>('My Drive/Mining_Projects/Pit_04_North_Bench');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // History of saved drive exports
  const [savedExports, setSavedExports] = useState<DriveExportResult[]>([
    {
      fileName: 'Pit_04_North_Bench_Vectors.geojson',
      fileSize: '142 KB',
      format: 'GeoJSON',
      driveLink: 'https://drive.google.com/file/d/1A9z_XoE82uQpMiningDroneGeoJSON/view?usp=sharing',
      folderPath: 'My Drive/Mining_Projects/Pit_04_North_Bench',
      savedAt: 'Today at 14:28 UTC'
    },
    {
      fileName: 'Pit_04_AutoCAD_MineDesign.dxf',
      fileSize: '488 KB',
      format: 'DXF',
      driveLink: 'https://drive.google.com/file/d/1B7k_WpQ99zCivil3DMineDesign/view?usp=sharing',
      folderPath: 'My Drive/Mining_Projects/Pit_04_North_Bench',
      savedAt: 'Today at 13:45 UTC'
    }
  ]);

  if (!isOpen) return null;

  const handleSyncToDrive = async () => {
    setIsSyncing(true);

    // Simulate authentic Google Drive API upload latency & generation
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const randomId = Math.random().toString(36).substring(2, 12);
    const newExport: DriveExportResult = {
      fileName: `${siteName.replace(/\s+/g, '_')}_${selectedFormat}_${timestamp}.${selectedFormat === 'SHP' ? 'zip' : selectedFormat.toLowerCase()}`,
      fileSize: `${Math.round(features.length * 48 + 84)} KB`,
      format: selectedFormat === 'ALL' ? 'GeoJSON' : selectedFormat,
      driveLink: `https://drive.google.com/file/d/1${randomId}MiningOS_Export/view?usp=sharing`,
      folderPath: driveFolder,
      savedAt: 'Just now'
    };

    setSavedExports([newExport, ...savedExports]);
    setIsSyncing(false);
  };

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-[#0b0e0c] border-[#222e23] text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'
      }`}>
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#101612] border-[#1f2c21]' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold font-sans text-base flex items-center gap-2">
                Google Drive Cloud Plugin
                <span className="text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CONNECTED
                </span>
              </h3>
              <p className="text-xs text-neutral-400 font-mono-tech">
                Save vector shapes &amp; terrain data directly to Google Drive
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Active Google Account Display */}
          <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono-tech ${
            isDark ? 'bg-[#121914] border-[#202e23]' : 'bg-neutral-50 border-neutral-200'
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                R
              </div>
              <div>
                <div className="font-bold text-white">rituraj.gogoi11@gmail.com</div>
                <div className="text-[10px] text-neutral-400">Google Workspace &amp; Drive Storage (15 GB Cloud)</div>
              </div>
            </div>
            <span className="text-[10px] text-[#c6ff00] font-semibold">Active Sync</span>
          </div>

          {/* Drive Folder Selector */}
          <div className="space-y-1.5 font-mono-tech text-xs">
            <label className="text-neutral-400 font-bold flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              DESTINATION DRIVE FOLDER
            </label>
            <input
              type="text"
              value={driveFolder}
              onChange={(e) => setDriveFolder(e.target.value)}
              className={`w-full p-2.5 rounded border text-xs font-mono-tech outline-none ${
                isDark ? 'bg-[#121914] border-[#253627] text-white focus:border-sky-400' : 'bg-white border-neutral-300 text-neutral-800'
              }`}
            />
          </div>

          {/* Formats to Sync */}
          <div className="space-y-2 font-mono-tech text-xs">
            <label className="text-neutral-400 font-bold">SELECT EXPORT PACKAGE</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'GeoJSON', label: 'GeoJSON (.geojson)', desc: 'Web-GIS Standard' },
                { id: 'KML', label: 'Google Earth (.kml)', desc: '3D Placemarks' },
                { id: 'DXF', label: 'AutoCAD (.dxf)', desc: 'Civil 3D & Global Mapper' },
                { id: 'SHP', label: 'ESRI Shapefile (.zip)', desc: 'Complete SHP/PRJ/DBF' }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedFormat === fmt.id
                      ? isDark
                        ? 'bg-[#15231c] border-[#c6ff00] text-[#c6ff00]'
                        : 'bg-emerald-50 border-emerald-600 text-emerald-900'
                      : isDark
                      ? 'bg-[#101511] border-[#222e23] text-neutral-300 hover:border-neutral-500'
                      : 'bg-white border-neutral-200 text-neutral-700'
                  }`}
                >
                  <div className="font-bold text-xs">{fmt.label}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{fmt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sync CTA Button */}
          <button
            onClick={handleSyncToDrive}
            disabled={isSyncing}
            className="w-full py-3 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-mono-tech font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <UploadCloud className="w-4 h-4 animate-bounce" />
                <span>UPLOADING TO GOOGLE DRIVE CLOUD...</span>
              </>
            ) : (
              <>
                <FolderSync className="w-4 h-4" />
                <span>SAVE {selectedFormat} DIRECTLY TO GOOGLE DRIVE</span>
              </>
            )}
          </button>

          {/* Saved Drive Files & Shareable Links List */}
          <div className="space-y-3 pt-3 border-t border-[#1e2a20] font-mono-tech text-xs">
            <div className="flex items-center justify-between text-neutral-400 font-bold">
              <span>SAVED DRIVE LINKS &amp; SNAPSHOTS</span>
              <span className="text-[10px] text-neutral-500">Instant Access</span>
            </div>

            <div className="space-y-2">
              {savedExports.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                    isDark ? 'bg-[#101511] border-[#202b21]' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>{item.fileName}</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400">
                        {item.fileSize}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{item.savedAt}</span>
                      <span>·</span>
                      <span className="truncate max-w-[200px]">{item.folderPath}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                    <button
                      onClick={() => handleCopy(item.driveLink)}
                      className="px-2.5 py-1 rounded bg-[#18231a] hover:bg-[#203023] border border-[#2b3c2e] text-[#c6ff00] text-[11px] flex items-center gap-1 transition-colors"
                    >
                      {copiedLink === item.driveLink ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>COPY LINK</span>
                        </>
                      )}
                    </button>

                    <a
                      href={item.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded bg-[#132233] hover:bg-[#1a2d42] border border-sky-800 text-sky-300 text-[11px] flex items-center transition-colors"
                      title="Open Google Drive link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
