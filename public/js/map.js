/**
 * MINING_DRONE_OS - High Performance Web-GIS Map Engine & Split Curtain Controller
 * Integrates Leaflet, Google Hybrid & Esri Basemaps, Georeferenced Drone Orthos,
 * DSM Elevation Colormaps, Contours, and interactive curtain swipe comparisons.
 */

window.MiningMap = (function () {
  let map = null;
  let basemapLayers = {};
  let leftPaneLayer = null;
  let rightPaneLayer = null;
  let contoursLayerGroup = null;
  let vectorsLayerGroup = null;
  let transectLayerGroup = null;

  let splitPosition = 50; // percentage
  let isDraggingCurtain = false;
  let isDrawingTransect = false;
  let transectPoints = [];

  let drawingPoints = [];
  let tempDrawingLayer = null;

  function initMap(center, bounds) {
    if (map) {
      map.remove();
    }

    // Initialize Leaflet Map
    map = L.map('map', {
      center: center,
      zoom: 15,
      maxZoom: 21,
      zoomControl: false,
      attributionControl: false
    });

    // Custom panes for split curtain clipping
    map.createPane('leftPane');
    map.createPane('rightPane');
    map.getPane('leftPane').style.zIndex = 400;
    map.getPane('rightPane').style.zIndex = 401;

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).add_to(map);
    L.control.scale({ position: 'bottomright', metric: true, imperial: false }).add_to(map);

    // 1. Basemaps
    basemapLayers.google_hybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 21,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    basemapLayers.esri_imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    basemapLayers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd'
    });

    // Default to Google Hybrid
    basemapLayers.google_hybrid.addTo(map);

    // 2. Layer Groups
    contoursLayerGroup = L.layerGroup().addTo(map);
    vectorsLayerGroup = L.layerGroup().addTo(map);
    transectLayerGroup = L.layerGroup().addTo(map);

    // 3. Create Drone Orthomosaic and DSM Surfaces
    setupSurfaces(bounds);

    // 4. Map Event Listeners (Cursor Probing, Drawing, Split Drag)
    setupEventListeners();

    // 5. Setup Curtain Swipe Controls
    setupCurtainSwipe();

    // Initial Split update
    updateSplitCurtain(50);
  }

  function setupSurfaces(bounds) {
    // High-resolution realistic Drone Orthomosaic Overlay
    const orthoUrl = "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1600&q=85";
    
    // Create canvas-based DSM hypsometric heatmap overlay for the right pane
    const dsmCanvasUrl = createDSMDataUrl(bounds);

    // Left Surface: True Color Drone Orthomosaic
    leftPaneLayer = L.imageOverlay(orthoUrl, bounds, {
      opacity: 0.88,
      pane: 'leftPane'
    }).addTo(map);

    // Right Surface: Digital Surface Model (DSM Hypsometric Tint)
    rightPaneLayer = L.imageOverlay(dsmCanvasUrl, bounds, {
      opacity: 0.90,
      pane: 'rightPane'
    }).addTo(map);
  }

  // Generates a dynamic 2D canvas of the pit elevation colormap
  function createDSMDataUrl(bounds) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(256, 256);

    const minLat = bounds[0][0], maxLat = bounds[1][0];
    const minLng = bounds[0][1], maxLng = bounds[1][1];

    for (let py = 0; py < 256; py++) {
      const lat = maxLat - (py / 255) * (maxLat - minLat);
      for (let px = 0; px < 256; px++) {
        const lng = minLng + (px / 255) * (maxLng - minLng);
        const z = window.MiningElevation.getElevationAt(lat, lng);

        // Normalize between 2130m and 2495m
        const norm = Math.max(0, Math.min(1, (z - 2130) / (2495 - 2130)));
        
        // Turbo color ramp interpolation
        const rgb = turboColormap(norm);
        const idx = (py * 256 + px) * 4;
        imgData.data[idx] = rgb[0];
        imgData.data[idx + 1] = rgb[1];
        imgData.data[idx + 2] = rgb[2];
        imgData.data[idx + 3] = 210; // semi-transparent
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }

  function turboColormap(x) {
    // Fast polynomial Turbo color map approximation
    const r = Math.round(255 * Math.max(0, Math.min(1, 0.1357 + x * (4.5974 + x * (-42.327 + x * (130.58 + x * (-150.56 + x * 58.13)))))));
    const g = Math.round(255 * Math.max(0, Math.min(1, 0.0914 + x * (2.1856 + x * (4.8052 + x * (-14.019 + x * (4.2109 + x * 2.7747)))))));
    const b = Math.round(255 * Math.max(0, Math.min(1, 0.1067 + x * (12.583 + x * (-78.718 + x * (205.51 + x * (-239.53 + x * 101.44)))))));
    return [r, g, b];
  }

  function updateSplitCurtain(percent) {
    splitPosition = Math.max(0, Math.min(100, percent));
    
    // Update divider on screen
    const divider = document.getElementById('curtain-divider');
    if (divider) {
      divider.style.left = `${splitPosition}%`;
    }

    // Clip right pane: only show from splitPosition to 100%
    const rightPane = map.getPane('rightPane');
    if (rightPane) {
      rightPane.style.clipPath = `polygon(${splitPosition}% 0%, 100% 0%, 100% 100%, ${splitPosition}% 100%)`;
    }

    // Clip left pane: only show from 0% to splitPosition
    const leftPane = map.getPane('leftPane');
    if (leftPane) {
      leftPane.style.clipPath = `polygon(0% 0%, ${splitPosition}% 0%, ${splitPosition}% 100%, 0% 100%)`;
    }

    const valEl = document.getElementById('split-pos-val');
    if (valEl) valEl.textContent = `${Math.round(splitPosition)}%`;
  }

  function setupCurtainSwipe() {
    const handle = document.querySelector('.curtain-handle');
    const container = document.getElementById('map-container');
    if (!handle || !container) return;

    handle.addEventListener('mousedown', (e) => {
      isDraggingCurtain = true;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDraggingCurtain) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const pct = (clientX / rect.width) * 100;
      updateSplitCurtain(pct);
      const slider = document.getElementById('split-slider');
      if (slider) slider.value = Math.round(splitPosition);
    });

    window.addEventListener('mouseup', () => {
      isDraggingCurtain = false;
    });

    // Touch support for mobile/touch screens
    handle.addEventListener('touchstart', (e) => {
      isDraggingCurtain = true;
    });
    window.addEventListener('touchmove', (e) => {
      if (!isDraggingCurtain || !e.touches[0]) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.touches[0].clientX - rect.left;
      const pct = (clientX / rect.width) * 100;
      updateSplitCurtain(pct);
    });
    window.addEventListener('touchend', () => {
      isDraggingCurtain = false;
    });
  }

  function setupEventListeners() {
    // 1. Mouse Elevation Probing
    map.on('mousemove', (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const z = window.MiningElevation.getElevationAt(lat, lng);
      const utm = window.MiningElevation.getUTM(lat, lng);

      // Update Top Ribbon Telemetry
      const coordEl = document.getElementById('cursor-coords');
      if (coordEl) coordEl.textContent = `E ${utm.easting.toLocaleString()} • N ${utm.northing.toLocaleString()}`;

      const elevEl = document.getElementById('cursor-elevation');
      if (elevEl) elevEl.textContent = `${z.toFixed(1)} m`;

      // Update Floating Hover Badge
      const probeZ = document.getElementById('probe-z');
      const probeLatLng = document.getElementById('probe-latlng');
      if (probeZ) probeZ.textContent = `${z.toFixed(1)} m RL`;
      if (probeLatLng) probeLatLng.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    });

    // 2. Map Click for Digitizing or Transect Drawing
    map.on('click', (e) => {
      const pt = [e.latlng.lat, e.latlng.lng];

      // A. Transect drawing mode
      if (isDrawingTransect) {
        transectPoints.push(pt);
        renderTransectLine();
        if (transectPoints.length >= 2) {
          window.MiningElevation.generateProfile(transectPoints);
        }
        return;
      }

      // B. Live Digitizer Drawing Mode
      const activeTool = window.MiningDigitizer ? window.MiningDigitizer.getActiveTool() : null;
      if (activeTool) {
        if (activeTool === 'borehole') {
          // Point feature
          window.MiningDigitizer.addFeature('Point', [pt]);
          window.MiningDigitizer.setActiveTool(null);
        } else {
          // Line or Polygon feature
          drawingPoints.push(pt);
          renderTempDrawing(activeTool);
        }
      }
    });

    // Double Click to finish polyline/polygon drawing
    map.on('dblclick', (e) => {
      if (isDrawingTransect) {
        isDrawingTransect = false;
        document.getElementById('btn-draw-transect')?.classList.remove('btn-primary');
        return;
      }

      const activeTool = window.MiningDigitizer ? window.MiningDigitizer.getActiveTool() : null;
      if (activeTool && drawingPoints.length >= 2) {
        const geomType = (activeTool === 'road' || activeTool === 'toe') ? 'LineString' : 'Polygon';
        window.MiningDigitizer.addFeature(geomType, [...drawingPoints]);
        drawingPoints = [];
        if (tempDrawingLayer) {
          map.removeLayer(tempDrawingLayer);
          tempDrawingLayer = null;
        }
        window.MiningDigitizer.setActiveTool(null);
      }
    });
  }

  function renderTempDrawing(tool) {
    if (tempDrawingLayer) map.removeLayer(tempDrawingLayer);
    if (drawingPoints.length < 2) return;

    if (tool === 'road' || tool === 'toe') {
      tempDrawingLayer = L.polyline(drawingPoints, { color: '#c6ff00', weight: 3, dashArray: '5, 5' }).addTo(map);
    } else {
      tempDrawingLayer = L.polygon(drawingPoints, { color: '#ff9100', fillColor: '#ff9100', fillOpacity: 0.3, weight: 2, dashArray: '5, 5' }).addTo(map);
    }
  }

  function startTransectDrawing() {
    isDrawingTransect = true;
    transectPoints = [];
    transectLayerGroup.clearLayers();
  }

  function renderTransectLine() {
    transectLayerGroup.clearLayers();
    if (transectPoints.length < 2) return;

    L.polyline(transectPoints, {
      color: '#00e5ff',
      weight: 3,
      dashArray: '4, 4'
    }).addTo(transectLayerGroup);

    // Add A and B markers
    L.circleMarker(transectPoints[0], { radius: 6, color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 1 })
      .bindTooltip("Station A", { permanent: true, className: 'map-marker-lbl' })
      .addTo(transectLayerGroup);

    L.circleMarker(transectPoints[transectPoints.length - 1], { radius: 6, color: '#c6ff00', fillColor: '#c6ff00', fillOpacity: 1 })
      .bindTooltip("Station B", { permanent: true, className: 'map-marker-lbl' })
      .addTo(transectLayerGroup);
  }

  // Renders the digitized features on the Leaflet map
  function updateVectors(features) {
    if (!vectorsLayerGroup) return;
    vectorsLayerGroup.clearLayers();

    features.forEach(f => {
      const coords = f.coordinates;
      if (!coords || coords.length === 0) return;

      let layer;
      if (f.geometryType === 'Point' || coords.length === 1) {
        const pt = Array.isArray(coords[0]) ? coords[0] : coords;
        layer = L.circleMarker(pt, {
          radius: 6,
          color: f.color || '#ff5252',
          fillColor: f.color || '#ff5252',
          fillOpacity: 0.8
        });
      } else if (f.category === 'road' || f.geometryType === 'LineString') {
        layer = L.polyline(coords, {
          color: f.color || '#fbc02d',
          weight: 4
        });
      } else {
        layer = L.polygon(coords, {
          color: f.color || '#c6ff00',
          fillColor: f.color || '#c6ff00',
          fillOpacity: 0.25,
          weight: 2.5
        });
      }

      layer.bindTooltip(`<b>${f.name}</b><br/>${f.type}`, { sticky: true });
      layer.on('click', () => {
        window.MiningDigitizer.selectFeature(f.id);
      });

      layer.addTo(vectorsLayerGroup);
    });
  }

  // Renders contours GeoJSON
  function updateContours(geojson) {
    if (!contoursLayerGroup) return;
    contoursLayerGroup.clearLayers();

    L.geoJSON(geojson, {
      style: (feature) => ({
        color: feature.properties.color || '#88b300',
        weight: feature.properties.weight || 1.2,
        opacity: 0.85
      }),
      onEachFeature: (feature, layer) => {
        if (feature.properties.is_index) {
          layer.bindTooltip(`${feature.properties.elevation}m RL`, {
            permanent: false,
            sticky: true,
            className: 'contour-tooltip'
          });
        }
      }
    }).addTo(contoursLayerGroup);
  }

  function setBasemap(type) {
    Object.keys(basemapLayers).forEach(k => map.removeLayer(basemapLayers[k]));
    if (basemapLayers[type]) {
      basemapLayers[type].addTo(map);
    }
  }

  function setOrthoOpacity(opacity) {
    if (leftPaneLayer) leftPaneLayer.setOpacity(opacity);
  }

  function toggleLayer(name, visible) {
    if (name === 'ortho' && leftPaneLayer) {
      if (visible) map.addLayer(leftPaneLayer);
      else map.removeLayer(leftPaneLayer);
    } else if (name === 'dem' && rightPaneLayer) {
      if (visible) map.addLayer(rightPaneLayer);
      else map.removeLayer(rightPaneLayer);
    } else if (name === 'contours' && contoursLayerGroup) {
      if (visible) map.addLayer(contoursLayerGroup);
      else map.removeLayer(contoursLayerGroup);
    } else if (name === 'vectors' && vectorsLayerGroup) {
      if (visible) map.addLayer(vectorsLayerGroup);
      else map.removeLayer(vectorsLayerGroup);
    }
  }

  function zoomToCoordinates(coords) {
    if (!map || !coords || coords.length === 0) return;
    if (coords.length === 1 || !Array.isArray(coords[0])) {
      map.setView(coords, 17);
    } else {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }

  return {
    initMap,
    updateSplitCurtain,
    setBasemap,
    setOrthoOpacity,
    toggleLayer,
    updateVectors,
    updateContours,
    startTransectDrawing,
    zoomToCoordinates
  };
})();
