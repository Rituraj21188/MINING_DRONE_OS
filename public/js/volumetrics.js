/**
 * MINING_DRONE_OS - Stockpile Volumetrics & Cut/Fill Core
 * Integrates 3D mesh surface over stockpile footprint to calculate
 * exact cut/fill volumes, net stockpile volume, and commercial ore tonnage.
 */

window.MiningVolumetrics = (function () {
  let currentResult = null;

  async function calculateForCoordinates(coordinates, name = "Stockpile", density = 2.70, baseMode = "min") {
    if (!coordinates || coordinates.length < 3) {
      alert("A valid closed polygon boundary with at least 3 nodes is required for volume calculation.");
      return null;
    }

    const payload = {
      site: window.MiningApp ? window.MiningApp.getActiveSiteId() : "pit_04",
      coordinates: coordinates,
      base_mode: baseMode,
      density: parseFloat(density)
    };

    // Try backend API first
    try {
      const res = await fetch('/api/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        updateUI(data, name);
        currentResult = data;
        return data;
      }
    } catch (e) {
      console.warn("Backend volume calculation failed, utilizing fast client integration:", e);
    }

    // Client-side fallback calculation
    const lats = coordinates.map(p => p[0]);
    const lngs = coordinates.map(p => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

    const perimZ = coordinates.map(p => window.MiningElevation.getElevationAt(p[0], p[1]));
    let datumZ = Math.min(...perimZ);
    if (baseMode === 'mean') datumZ = perimZ.reduce((a, b) => a + b, 0) / perimZ.length;

    const gridN = 35;
    const dLat = (maxLat - minLat) / (gridN - 1);
    const dLng = (maxLng - minLng) / (gridN - 1);
    const midLat = (minLat + maxLat) / 2;
    const cellDyM = dLat * 111320.0;
    const cellDxM = dLng * 111320.0 * Math.cos(midLat * Math.PI / 180.0);
    const cellAreaM2 = cellDxM * cellDyM;

    function isInside(lat, lng) {
      let inside = false;
      const n = coordinates.length;
      let j = n - 1;
      for (let i = 0; i < n; i++) {
        const yi = coordinates[i][0], xi = coordinates[i][1];
        const yj = coordinates[j][0], xj = coordinates[j][1];
        if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
        j = i;
      }
      return inside;
    }

    let cutVol = 0, fillVol = 0, insideCount = 0;
    const insideZ = [];

    for (let i = 0; i < gridN; i++) {
      const lat = minLat + i * dLat;
      for (let j = 0; j < gridN; j++) {
        const lng = minLng + j * dLng;
        if (isInside(lat, lng)) {
          insideCount++;
          const z = window.MiningElevation.getElevationAt(lat, lng);
          insideZ.push(z);
          const diffZ = z - datumZ;
          if (diffZ > 0) fillVol += diffZ * cellAreaM2;
          else cutVol += Math.abs(diffZ) * cellAreaM2;
        }
      }
    }

    const totalAreaM2 = insideCount * cellAreaM2;
    const maxH = insideZ.length ? Math.max(...insideZ) - datumZ : 0;
    const netVol = fillVol - cutVol;
    const tonnage = (fillVol > cutVol ? fillVol : cutVol) * density;

    const result = {
      surface_area_m2: parseFloat(totalAreaM2.toFixed(1)),
      surface_area_ha: parseFloat((totalAreaM2 / 10000.0).toFixed(3)),
      base_datum_z_m: parseFloat(datumZ.toFixed(1)),
      cut_volume_m3: parseFloat(cutVol.toFixed(1)),
      fill_volume_m3: parseFloat(fillVol.toFixed(1)),
      net_volume_m3: parseFloat(netVol.toFixed(1)),
      density_t_m3: parseFloat(density),
      total_tonnage_t: parseFloat(tonnage.toFixed(1)),
      max_height_m: parseFloat(maxH.toFixed(1))
    };

    updateUI(result, name);
    currentResult = result;
    return result;
  }

  function updateUI(res, name) {
    document.getElementById('vol-res-name').textContent = name || "Stockpile Target";
    document.getElementById('vol-res-heap').innerHTML = `${Number(res.fill_volume_m3 || 0).toLocaleString()} <span class="unit">m³</span>`;
    document.getElementById('vol-res-tonnage').innerHTML = `${Number(res.total_tonnage_t || 0).toLocaleString()} <span class="unit">t</span>`;
    document.getElementById('vol-res-area').innerHTML = `${res.surface_area_ha} <span class="unit">ha</span>`;
    document.getElementById('vol-res-height').innerHTML = `${res.max_height_m} <span class="unit">m</span>`;
    document.getElementById('vol-res-datum').textContent = `${res.base_datum_z_m} m RL`;
    document.getElementById('vol-res-cut').textContent = `${Number(res.cut_volume_m3 || 0).toLocaleString()} m³`;
    document.getElementById('vol-res-net').textContent = `${res.net_volume_m3 > 0 ? '+' : ''}${Number(res.net_volume_m3 || 0).toLocaleString()} m³`;

    // Make sure result card is visible
    const card = document.getElementById('volume-result-card');
    if (card) card.style.display = 'block';
  }

  function getLatestResult() {
    return currentResult;
  }

  return {
    calculateForCoordinates,
    getLatestResult
  };
})();
