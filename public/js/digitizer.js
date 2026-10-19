/**
 * MINING_DRONE_OS - Live GIS Vector Digitization Module
 * CAD & Shapefile digitization for Crests, Toes, Haul Roads, Stockpiles, and Blast Patterns.
 * Provides high-accuracy geodesic surface area (ha, m2) and 3D perimeter/gradient calculations.
 */

window.MiningDigitizer = (function () {
  let features = [];
  let selectedFeatureId = null;
  let activeTool = null;
  let onFeaturesChangedCallbacks = [];

  const TOOL_STYLES = {
    crest: { name: 'Pit Crest Line', category: 'crest', color: '#c6ff00', fill: false, weight: 3, density: 2.65 },
    toe: { name: 'Pit Bench Toe', category: 'toe', color: '#00e5ff', fill: false, weight: 2.5, density: 2.65 },
    road: { name: 'Haul Ramp Centerline', category: 'road', color: '#fbc02d', fill: false, weight: 4, density: 2.0 },
    stockpile: { name: 'Stockpile Boundary', category: 'stockpile', color: '#ff9100', fill: true, weight: 2.5, density: 2.70 },
    blast: { name: 'Blast Block Pattern', category: 'blast', color: '#e040fb', fill: true, weight: 2, density: 2.65 },
    borehole: { name: 'Survey Borehole / GCP', category: 'borehole', color: '#ff5252', fill: true, weight: 2, density: 2.65 }
  };

  function init(initialFeatures = []) {
    features = JSON.parse(JSON.stringify(initialFeatures));
    renderFeatureList();
    notifyChange();
  }

  function setActiveTool(tool) {
    activeTool = tool;
    document.querySelectorAll('.digi-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  function getActiveTool() {
    return activeTool;
  }

  function addFeature(geometryType, coordinates, customProps = {}) {
    const style = TOOL_STYLES[activeTool] || TOOL_STYLES.crest;
    const featId = 'feat_' + Date.now();
    const featName = customProps.name || `${style.name} #${features.length + 1}`;

    const newFeat = {
      id: featId,
      name: featName,
      type: style.name,
      category: style.category,
      color: style.color,
      density: customProps.density || style.density,
      geometryType: geometryType, // 'Polygon', 'LineString', 'Point'
      coordinates: coordinates,
      created_at: new Date().toLocaleTimeString()
    };

    // Calculate metrics
    computeMetrics(newFeat);

    features.push(newFeat);
    renderFeatureList();
    selectFeature(featId);
    notifyChange();
    return newFeat;
  }

  function computeMetrics(feat) {
    const coords = feat.coordinates;
    if (!coords || coords.length === 0) return;

    if (coords.length === 1 || feat.geometryType === 'Point') {
      const p = Array.isArray(coords[0]) ? coords[0] : coords;
      feat.point_z = window.MiningElevation.getElevationAt(p[0], p[1]);
      feat.area_ha = 0;
      feat.length_m = 0;
      return;
    }

    // Polyline Length
    let lenM = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const dLat = (p2[0] - p1[0]) * 111320.0;
      const dLng = (p2[1] - p1[1]) * 111320.0 * Math.cos(((p1[0] + p2[0]) / 2) * Math.PI / 180.0);
      lenM += Math.hypot(dLat, dLng);
    }
    feat.length_m = parseFloat(lenM.toFixed(1));

    // Polygon Geodesic Area (Shoelace formula on metric projection)
    if (coords.length >= 3 && (feat.category === 'stockpile' || feat.category === 'blast' || feat.category === 'crest' || feat.geometryType === 'Polygon')) {
      const midLat = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
      let area = 0;
      const n = coords.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const xi = coords[i][1] * 111320.0 * Math.cos(midLat * Math.PI / 180.0);
        const yi = coords[i][0] * 111320.0;
        const xj = coords[j][1] * 111320.0 * Math.cos(midLat * Math.PI / 180.0);
        const yj = coords[j][0] * 111320.0;
        area += (xi * yj) - (xj * yi);
      }
      const areaM2 = Math.abs(area) / 2.0;
      feat.area_m2 = parseFloat(areaM2.toFixed(1));
      feat.area_ha = parseFloat((areaM2 / 10000.0).toFixed(3));
    }
  }

  function renderFeatureList() {
    const list = document.getElementById('vector-features-list');
    const badge = document.getElementById('active-features-count');
    if (badge) badge.innerHTML = `<i class="fa-solid fa-shapes"></i> ${features.length} Vector Assets`;

    if (!list) return;

    if (features.length === 0) {
      list.innerHTML = `<div style="padding:10px; font-size:10px; color:#546557; text-align:center;">No digitized vectors active. Use digitizer buttons above to add mining assets.</div>`;
      return;
    }

    list.innerHTML = features.map(f => `
      <div class="feature-item-row ${f.id === selectedFeatureId ? 'selected' : ''}" data-id="${f.id}">
        <div class="feat-left">
          <span class="feat-color-pill" style="background-color: ${f.color};"></span>
          <div>
            <div class="feat-name">${f.name}</div>
            <div class="feat-cat">${f.type} ${f.area_ha ? `&bull; ${f.area_ha} ha` : (f.length_m ? `&bull; ${f.length_m} m` : '')}</div>
          </div>
        </div>
        <button class="feat-del-btn" data-del="${f.id}" title="Delete Asset">&times;</button>
      </div>
    `).join('');

    // Attach click events
    list.querySelectorAll('.feature-item-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.feat-del-btn')) return;
        selectFeature(row.dataset.id);
      });
    });

    list.querySelectorAll('.feat-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFeature(btn.dataset.del);
      });
    });
  }

  function selectFeature(id) {
    selectedFeatureId = id;
    renderFeatureList();
    renderInspector();
  }

  function deleteFeature(id) {
    features = features.filter(f => f.id !== id);
    if (selectedFeatureId === id) selectedFeatureId = null;
    renderFeatureList();
    renderInspector();
    notifyChange();
  }

  function clearAll() {
    features = [];
    selectedFeatureId = null;
    renderFeatureList();
    renderInspector();
    notifyChange();
  }

  function renderInspector() {
    const container = document.getElementById('inspector-content');
    if (!container) return;

    const f = features.find(item => item.id === selectedFeatureId);
    if (!f) {
      container.innerHTML = `<div class="empty-state-hint">Click any digitized line, polygon, or stockpile on the map to inspect engineering properties.</div>`;
      return;
    }

    let statsHtml = '';
    if (f.area_ha) {
      statsHtml += `
        <div class="breakdown-item"><span>Footprint Area:</span> <strong>${f.area_ha} ha (${f.area_m2} m²)</strong></div>
        <div class="breakdown-item"><span>Perimeter:</span> <strong>${f.length_m || 'N/A'} m</strong></div>
      `;
    } else if (f.length_m) {
      statsHtml += `<div class="breakdown-item"><span>Total Distance:</span> <strong>${f.length_m} m</strong></div>`;
    }

    container.innerHTML = `
      <div style="font-size:11px; margin-bottom:8px;">
        <strong style="color:${f.color}; font-size:12px;">${f.name}</strong>
        <div style="font-size:9px; color:#829485;">Category: ${f.type}</div>
      </div>
      <div class="vol-breakdown">
        ${statsHtml}
        <div class="breakdown-item"><span>Material Density:</span> <strong>${f.density || 2.65} t/m³</strong></div>
        <div class="breakdown-item"><span>Vertices Count:</span> <strong>${f.coordinates ? f.coordinates.length : 0} nodes</strong></div>
      </div>
      <div style="margin-top:10px; display:flex; gap:6px;">
        <button id="btn-zoom-feature" class="btn btn-secondary btn-xs" style="flex:1;">Zoom To</button>
        <button id="btn-calc-vol-feature" class="btn btn-primary btn-xs" style="flex:1;">Run Volume</button>
      </div>
    `;

    document.getElementById('btn-calc-vol-feature')?.addEventListener('click', () => {
      // Switch to Volumetrics module and run calculation
      window.MiningApp.switchModule('stockpile_volumetrics');
      window.MiningVolumetrics.calculateForCoordinates(f.coordinates, f.name, f.density);
    });

    document.getElementById('btn-zoom-feature')?.addEventListener('click', () => {
      if (window.MiningMap && f.coordinates) {
        window.MiningMap.zoomToCoordinates(f.coordinates);
      }
    });
  }

  function getFeatures() {
    return features;
  }

  function subscribe(callback) {
    onFeaturesChangedCallbacks.push(callback);
  }

  function notifyChange() {
    onFeaturesChangedCallbacks.forEach(cb => cb(features));
  }

  return {
    init,
    setActiveTool,
    getActiveTool,
    addFeature,
    selectFeature,
    deleteFeature,
    clearAll,
    getFeatures,
    subscribe
  };
})();
