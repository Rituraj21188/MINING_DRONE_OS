/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ModuleId, ToolMode, VectorFeature, ContourConfig, UTMCoords, MiningSite } from './types/gis';
import { MINING_SITES, INITIAL_FEATURES } from './data/miningDatasets';
import { TopBar } from './components/TopBar';
import { WelcomeOverview } from './components/WelcomeOverview';
import { StreamlitSidebar } from './components/StreamlitSidebar';
import { MiningCanvas } from './components/MiningCanvas';
import { AttributeTable } from './components/AttributeTable';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { ExportModal } from './components/ExportModal';
import { DatasetUploadModal } from './components/DatasetUploadModal';
import { ElevationProfileModal } from './components/ElevationProfileModal';
import { StreamlitHubModal } from './components/StreamlitHubModal';
import { exportToCSV, downloadFile } from './utils/exporters';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Active Mining Site
  const [selectedSiteId, setSelectedSiteId] = useState<string>('pit-04');
  const selectedSite = MINING_SITES.find((s) => s.id === selectedSiteId) || MINING_SITES[0];

  // Active Module State (defaults to 'overview' matching welcome page)
  const [activeModule, setActiveModule] = useState<ModuleId>('overview');

  // Vector Features
  const [features, setFeatures] = useState<VectorFeature[]>(INITIAL_FEATURES);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>('feat-012');

  // Tool Mode
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [activeFeatureType, setActiveFeatureType] = useState<string>('PIT_BOUNDARY');

  // Split Surface Slider Position (0% to 100%)
  const [splitPosition, setSplitPosition] = useState<number>(50);

  // Contour Configuration
  const [contourConfig, setContourConfig] = useState<ContourConfig>({
    interval: 5, // 5m interval matching screenshot
    minElev: 1342,
    maxElev: 1842,
    colorMap: 'turbo',
    showLabels: true,
    strokeWidth: 1.5,
    opacity: 0.85
  });

  // Layer Visibility
  const [layerVisibility, setLayerVisibility] = useState({
    ortho: true,
    dsm: true,
    dtm: true,
    contours: true,
    vectors: true,
    grid: true
  });

  // Live Crosshair Telemetry
  const [coords, setCoords] = useState<UTMCoords>({
    easting: selectedSite.baseEasting,
    northing: selectedSite.baseNorthing,
    elevation: 1680,
    zone: selectedSite.utmZone,
    epsg: selectedSite.epsg
  });

  // UI Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isAttributeTableOpen, setIsAttributeTableOpen] = useState<boolean>(true);

  // Modals
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isStreamlitModalOpen, setIsStreamlitModalOpen] = useState<boolean>(false);

  // Uploaded georeferenced orthomosaic
  const [uploadedOrthoUrl, setUploadedOrthoUrl] = useState<string | null>(null);
  const [uploadedOrthoName, setUploadedOrthoName] = useState<string | null>(null);

  // Computed KPIs
  const totalAreaHa = features.reduce((acc, f) => acc + (f.areaHa || 0), 0);
  const totalVolumeM3 = features.reduce((acc, f) => acc + (f.volumeM3 || 0), 0);

  // Handle direct module launch from Overview cards
  const handleLaunchModule = (mod: ModuleId) => {
    setActiveModule(mod);
    if (mod === 'module1_split') {
      setSplitPosition(50);
      setLayerVisibility((prev) => ({ ...prev, ortho: true, dsm: true, dtm: true }));
      setToolMode('select');
    } else if (mod === 'module2_contours') {
      setLayerVisibility((prev) => ({ ...prev, contours: true, dtm: true, ortho: false }));
      setToolMode('select');
    } else if (mod === 'module3_digitize') {
      setLayerVisibility((prev) => ({ ...prev, vectors: true, ortho: true }));
      setToolMode('polygon');
      setIsAttributeTableOpen(true);
    }
  };

  const handleQuickExportCSV = () => {
    const csv = exportToCSV(features);
    downloadFile(csv, `${selectedSite.name.replace(/\s+/g, '_')}_attributes.csv`, 'text/csv');
  };

  const handleAddFeatures = (newFeatures: VectorFeature[]) => {
    setFeatures((prev) => [...newFeatures, ...prev]);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#090c0a] text-neutral-100' : 'bg-neutral-100 text-neutral-900'
    }`}>
      {/* Top Telemetry & Navigation Bar */}
      <TopBar
        activeModule={activeModule}
        setActiveModule={handleLaunchModule}
        theme={theme}
        toggleTheme={toggleTheme}
        coords={coords}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenStreamlitModal={() => setIsStreamlitModalOpen(true)}
        featuresCount={features.length}
      />

      {/* Main Workspace Body */}
      {activeModule === 'overview' ? (
        <WelcomeOverview
          onOpenWorkspace={handleLaunchModule}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          theme={theme}
        />
      ) : (
        <div className="flex-1 flex relative overflow-hidden">
          {/* Streamlit Operations Sidebar */}
          <StreamlitSidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            activeModule={activeModule}
            setActiveModule={handleLaunchModule}
            toolMode={toolMode}
            setToolMode={setToolMode}
            selectedSite={selectedSite}
            onSelectSite={(id) => {
              setSelectedSiteId(id);
              const s = MINING_SITES.find((x) => x.id === id);
              if (s && s.features.length > 0) {
                setFeatures(s.features);
              }
            }}
            sites={MINING_SITES}
            layerVisibility={layerVisibility}
            setLayerVisibility={setLayerVisibility}
            splitPosition={splitPosition}
            setSplitPosition={setSplitPosition}
            contourConfig={contourConfig}
            setContourConfig={setContourConfig}
            activeFeatureType={activeFeatureType}
            setActiveFeatureType={setActiveFeatureType}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onOpenDriveModal={() => setIsDriveModalOpen(true)}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onClearDraft={() => {}}
            totalAreaHa={totalAreaHa}
            totalVolumeM3={totalVolumeM3}
            featuresCount={features.length}
            theme={theme}
            onGenerateElevationProfile={() => setIsProfileModalOpen(true)}
          />

          {/* High-Performance Leaflet Google Hybrid Satellite Canvas */}
          <div className="flex-1 flex flex-col relative h-[calc(100vh-80px)] overflow-hidden">
            <MiningCanvas
              activeModule={activeModule}
              toolMode={toolMode}
              features={features}
              setFeatures={setFeatures}
              selectedFeatureId={selectedFeatureId}
              setSelectedFeatureId={setSelectedFeatureId}
              splitPosition={splitPosition}
              setSplitPosition={setSplitPosition}
              contourConfig={contourConfig}
              layerVisibility={layerVisibility}
              activeFeatureType={activeFeatureType}
              onUpdateCoords={setCoords}
              selectedSite={selectedSite}
              theme={theme}
              uploadedOrthoUrl={uploadedOrthoUrl}
              uploadedOrthoName={uploadedOrthoName}
            />

            {/* QGIS-Style Dockable Attribute Table */}
            <AttributeTable
              features={features}
              setFeatures={setFeatures}
              selectedFeatureId={selectedFeatureId}
              setSelectedFeatureId={setSelectedFeatureId}
              isOpen={isAttributeTableOpen}
              setIsOpen={setIsAttributeTableOpen}
              theme={theme}
              onQuickExportCSV={handleQuickExportCSV}
            />
          </div>
        </div>
      )}

      {/* Google Drive Plugin Modal */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        features={features}
        siteName={selectedSite.name}
        theme={theme}
      />

      {/* Multi-Format Export Modal (GeoJSON, KML, DXF, SHP zip) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        features={features}
        siteName={selectedSite.name}
        theme={theme}
      />

      {/* 1GB Dataset Upload Modal */}
      <DatasetUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddFeatures={handleAddFeatures}
        onSelectSite={(id) => {
          setSelectedSiteId(id);
          const s = MINING_SITES.find((x) => x.id === id);
          if (s && s.features.length > 0) {
            setFeatures(s.features);
          }
        }}
        onUploadOrtho={(url, name) => {
          setUploadedOrthoUrl(url);
          setUploadedOrthoName(name);
        }}
        theme={theme}
      />

      {/* 2D Elevation Profile Modal */}
      <ElevationProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        site={selectedSite}
        contourConfig={contourConfig}
        theme={theme}
      />

      {/* Streamlit Python Native Engine Modal */}
      <StreamlitHubModal
        isOpen={isStreamlitModalOpen}
        onClose={() => setIsStreamlitModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}
