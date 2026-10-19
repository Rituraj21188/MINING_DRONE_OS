/**
 * MINING_DRONE_OS - Application Orchestration & Event Controller
 * Coordinates GIS Map, Operational Modules, UI Modals, 1GB File Ingestion, and Reporting.
 */

window.MiningApp = (function () {
  let activeSiteId = "pit_04";
  let sitesData = {};
  let activeModule = "split_viewer";

  async function init() {
    console.log("Initializing MINING_DRONE_OS v2.5...");

    // 1. Fetch Sites & Metadata
    await loadSites();

    // 2. Setup Active Site
    applySite(activeSiteId);

    // 3. Bind UI Events & Navigation Tabs
    bindModuleTabs();
    bindUIEvents();
    bindModals();
    bindUploadDropzone();

    // 4. Initial Topo Contours & Sample Transect Profile
    loadContours(5);
    setupInitialTransect();
  }

  async function loadSites() {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) {
        const data = await res.json();
        sitesData = data.sites;
      }
    } catch (e) {
      console.warn("Using bundled site presets:", e);
    }
  }

  function getActiveSiteId() {
    return activeSiteId;
  }

  function getActiveSite() {
    return sitesData[activeSiteId] || {
      id: "pit_04",
      name: "Pit 04 North Bench Quarry",
      utm_zone: "UTM Zone 19S (EPSG:32719)",
      flight_date: "2026-10-18",
      uav_platform: "DJI Matrice 350 RTK",
      gsd_cm: 2.8,
      base_elevation_m: 2460,
      pit_floor_elevation_m: 2130,
      center: [-23.8640, -69.1420],
      bounds: [[-23.8740, -69.1560], [-23.8540, -69.1280]],
      initial_features: []
    };
  }

  function applySite(siteId) {
    activeSiteId = siteId;
    const site = getActiveSite();

    // Update Topbar
    const siteSelect = document.getElementById('site-select');
    if (siteSelect) siteSelect.value = siteId;

    document.getElementById('tele-gsd').textContent = `${site.gsd_cm || 2.8} cm/px`;
    document.getElementById('active-crs-badge').innerHTML = `<i class="fa-solid fa-globe"></i> ${site.utm_zone || 'UTM'}`;

    // Update Right Telemetry Sidebar
    document.getElementById('pit-utm-display').textContent = site.id === 'cerro_verde' ? '228,450 E • 8,170,120 N' : (site.id === 'bingham_canyon' ? '402,110 E • 4,486,500 N' : '512,884 E • 4,687,201 N');
    document.getElementById('pit-crs-display').textContent = site.utm_zone || 'WGS 84';
    document.getElementById('pit-area-display').innerHTML = `${site.total_area_ha || 142.8} <span class="unit-sm">ha</span>`;
    document.getElementById('pit-stockpile-display').innerHTML = `${site.stockpile_count ? site.stockpile_count * 1200 : 4850}k <span class="unit-sm">m³</span>`;
    document.getElementById('report-site-name').textContent = site.name;

    // Update Elevation Engine
    window.MiningElevation.setSite(siteId);

    // Initialize Map with Site Center & Bounds
    window.MiningMap.initMap(site.center, site.bounds);

    // Initialize Digitizer with initial features
    window.MiningDigitizer.init(site.initial_features || []);
    window.MiningDigitizer.subscribe((feats) => {
      window.MiningMap.updateVectors(feats);
    });

    // Populate Stockpile Selector in Volumetrics Panel
    populateStockpileSelector(site.initial_features || []);
  }

  function populateStockpileSelector(features) {
    const sel = document.getElementById('stockpile-select');
    if (!sel) return;

    const stocks = features.filter(f => f.category === 'stockpile');
    if (stocks.length > 0) {
      sel.innerHTML = stocks.map((s, idx) => `<option value="${s.id}">${s.name}</option>`).join('') + '<option value="custom">Draw New Custom Stockpile...</option>';
    }
  }

  function bindModuleTabs() {
    document.querySelectorAll('.mod-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const mod = tab.dataset.module;
        switchModule(mod);
      });
    });
  }

  function switchModule(modName) {
    activeModule = modName;

    // Update Tab states
    document.querySelectorAll('.mod-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.module === modName);
    });

    // Update Left Sidebar Panels
    document.querySelectorAll('.tool-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${modName}`);
    });

    // Module-specific UI adjustments
    const curtainDivider = document.getElementById('curtain-divider');
    if (modName === 'split_viewer') {
      if (curtainDivider) curtainDivider.style.display = 'block';
    } else {
      // In other modes, ensure full map visibility
      if (curtainDivider) curtainDivider.style.display = 'none';
      window.MiningMap.updateSplitCurtain(100);
    }
  }

  function bindUIEvents() {
    // Site selector change
    document.getElementById('site-select')?.addEventListener('change', (e) => {
      applySite(e.target.value);
    });

    // Split curtain slider
    document.getElementById('split-slider')?.addEventListener('input', (e) => {
      window.MiningMap.updateSplitCurtain(parseFloat(e.target.value));
    });

    // Ortho opacity slider
    document.getElementById('ortho-opacity')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('ortho-opacity-val').textContent = `${val}%`;
      window.MiningMap.setOrthoOpacity(val / 100.0);
    });

    // Basemap selector pills
    document.querySelectorAll('.bm-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.bm-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.MiningMap.setBasemap(btn.dataset.basemap);
      });
    });

    // Layer toggles
    document.getElementById('chk-ortho')?.addEventListener('change', (e) => {
      document.getElementById('chip-ortho')?.classList.toggle('active', e.target.checked);
      window.MiningMap.toggleLayer('ortho', e.target.checked);
    });
    document.getElementById('chk-dem')?.addEventListener('change', (e) => {
      document.getElementById('chip-dem')?.classList.toggle('active', e.target.checked);
      window.MiningMap.toggleLayer('dem', e.target.checked);
    });
    document.getElementById('chk-contours')?.addEventListener('change', (e) => {
      document.getElementById('chip-contours')?.classList.toggle('active', e.target.checked);
      window.MiningMap.toggleLayer('contours', e.target.checked);
    });
    document.getElementById('chk-vectors')?.addEventListener('change', (e) => {
      document.getElementById('chip-vectors')?.classList.toggle('active', e.target.checked);
      window.MiningMap.toggleLayer('vectors', e.target.checked);
    });

    // Digitizer buttons
    document.querySelectorAll('.digi-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        const current = window.MiningDigitizer.getActiveTool();
        window.MiningDigitizer.setActiveTool(current === tool ? null : tool);
      });
    });

    document.getElementById('btn-clear-vectors')?.addEventListener('click', () => {
      if (confirm("Clear all digitized mining vectors?")) {
        window.MiningDigitizer.clearAll();
      }
    });

    // Transect button
    document.getElementById('btn-draw-transect')?.addEventListener('click', function() {
      this.classList.toggle('btn-primary');
      window.MiningMap.startTransectDrawing();
    });

    // Contour interval change
    document.getElementById('contour-interval')?.addEventListener('change', (e) => {
      loadContours(parseInt(e.target.value));
    });

    // Volumetrics Run button
    document.getElementById('btn-run-volumetrics')?.addEventListener('click', () => {
      const targetId = document.getElementById('stockpile-select').value;
      const density = parseFloat(document.getElementById('material-type').value) || 2.70;
      const baseMode = document.querySelector('input[name="base_mode"]:checked')?.value || 'min';

      const feats = window.MiningDigitizer.getFeatures();
      const target = feats.find(f => f.id === targetId) || feats.find(f => f.category === 'stockpile');

      if (target && target.coordinates) {
        window.MiningVolumetrics.calculateForCoordinates(target.coordinates, target.name, density, baseMode);
      } else {
        alert("Please select or digitize a stockpile polygon first.");
      }
    });

    // Drawer toggle
    document.getElementById('drawer-toggle-bar')?.addEventListener('click', (e) => {
      if (e.target.closest('#btn-export-profile-csv')) return;
      const drawer = document.getElementById('bottom-profile-drawer');
      drawer.classList.toggle('collapsed');
      const icon = drawer.querySelector('.btn-icon i');
      if (icon) {
        icon.className = drawer.classList.contains('collapsed') ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
      }
    });

    document.getElementById('btn-toggle-profile-panel')?.addEventListener('click', () => {
      const drawer = document.getElementById('bottom-profile-drawer');
      drawer.classList.remove('collapsed');
      const icon = drawer.querySelector('.btn-icon i');
      if (icon) icon.className = 'fa-solid fa-chevron-down';
    });

    // Export Buttons
    document.getElementById('btn-export-dxf-quick')?.addEventListener('click', () => window.MiningExport.downloadDXF());
    document.getElementById('btn-export-kml-quick')?.addEventListener('click', () => window.MiningExport.downloadKML());
    document.getElementById('btn-modal-dxf')?.addEventListener('click', () => window.MiningExport.downloadDXF());
    document.getElementById('btn-modal-kml')?.addEventListener('click', () => window.MiningExport.downloadKML());
    document.getElementById('btn-modal-geojson')?.addEventListener('click', () => window.MiningExport.downloadGeoJSON());
    document.getElementById('btn-modal-pdf')?.addEventListener('click', () => window.MiningExport.downloadPDFReport());
    document.getElementById('btn-client-report')?.addEventListener('click', () => window.MiningExport.downloadPDFReport());
    document.getElementById('btn-export-pdf-main')?.addEventListener('click', () => window.MiningExport.downloadPDFReport());
    document.getElementById('btn-export-dxf-main')?.addEventListener('click', () => window.MiningExport.downloadDXF());
    document.getElementById('btn-export-kml-main')?.addEventListener('click', () => window.MiningExport.downloadKML());
    document.getElementById('btn-export-geojson-main')?.addEventListener('click', () => window.MiningExport.downloadGeoJSON());
  }

  function bindModals() {
    // 3D View Modal
    document.getElementById('btn-open-3d')?.addEventListener('click', () => {
      document.getElementById('modal-3d').classList.add('open');
      window.MiningViewer3D.render3D(activeSiteId);
    });
    document.getElementById('btn-reset-3d-camera')?.addEventListener('click', () => {
      window.MiningViewer3D.resetCamera();
    });

    // Upload Modal
    document.getElementById('btn-open-upload')?.addEventListener('click', () => {
      document.getElementById('modal-upload').classList.add('open');
    });

    // Export Modal
    document.getElementById('btn-open-export')?.addEventListener('click', () => {
      document.getElementById('modal-export').classList.add('open');
    });

    // Close buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.close;
        document.getElementById(targetId)?.classList.remove('open');
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    });
  }

  function bindUploadDropzone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse-file');

    btnBrowse?.addEventListener('click', () => fileInput?.click());
    dropZone?.addEventListener('click', (e) => {
      if (e.target !== btnBrowse) fileInput?.click();
    });

    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        uploadFile(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', () => {
      if (fileInput.files.length) {
        uploadFile(fileInput.files[0]);
      }
    });
  }

  async function uploadFile(file) {
    const statusBox = document.getElementById('upload-status');
    const progressBar = document.getElementById('upload-progress-bar');
    const statusMsg = document.getElementById('upload-status-msg');

    if (statusBox) statusBox.style.display = 'block';
    if (progressBar) progressBar.style.width = '30%';
    if (statusMsg) statusMsg.textContent = `Uploading ${file.name} (${(file.size / (1024*1024)).toFixed(2)} MB)...`;

    const formData = new FormData();
    formData.append('file', file);

    try {
      if (progressBar) progressBar.style.width = '70%';
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (progressBar) progressBar.style.width = '100%';

      if (data.success) {
        if (statusMsg) statusMsg.innerHTML = `<span style="color:#c6ff00;">✔ ${data.message}</span>`;
        
        // If GeoJSON was uploaded, add features
        if (data.geojson && data.geojson.features) {
          data.geojson.features.forEach((feat, idx) => {
            const coords = feat.geometry.coordinates;
            // Leaflet requires [lat, lng], GeoJSON has [lng, lat]
            if (feat.geometry.type === 'Polygon') {
              const flipped = coords[0].map(pt => [pt[1], pt[0]]);
              window.MiningDigitizer.addFeature('Polygon', flipped, { name: feat.properties.name || `Imported #${idx+1}` });
            }
          });
        }
      } else {
        if (statusMsg) statusMsg.innerHTML = `<span style="color:#ff5252;">✖ ${data.error || 'Upload error'}</span>`;
      }
    } catch (e) {
      if (progressBar) progressBar.style.width = '100%';
      if (statusMsg) statusMsg.innerHTML = `<span style="color:#ff5252;">Upload error: ${e.message}</span>`;
    }
  }

  async function loadContours(interval) {
    try {
      const res = await fetch(`/api/contours?site=${activeSiteId}&interval=${interval}`);
      if (res.ok) {
        const geojson = await res.json();
        window.MiningMap.updateContours(geojson);
      }
    } catch (e) {
      console.warn("Could not fetch contours:", e);
    }
  }

  function setupInitialTransect() {
    // Default Pit Cross-Section Transect across Pit 04 North Bench
    const transectCoords = [
      [-23.8565, -69.1510], // North Rim
      [-23.8640, -69.1420], // Sump bottom
      [-23.8710, -69.1350]  // South-East Rim
    ];
    setTimeout(() => {
      window.MiningElevation.generateProfile(transectCoords);
    }, 400);
  }

  // Auto-init on page load
  window.addEventListener('DOMContentLoaded', init);

  return {
    init,
    getActiveSiteId,
    getActiveSite,
    switchModule
  };
})();
