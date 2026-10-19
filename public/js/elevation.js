/**
 * MINING_DRONE_OS - Elevation, Contours & Cross-Section Module
 * Computes elevation models, renders contours, and generates cross-section profiles with Chart.js.
 */

window.MiningElevation = (function () {
  let profileChart = null;
  let activeTransectPoints = [];
  let currentSiteId = "pit_04";

  // Analytical Elevation Model (Client-Side mirror of Python DEM Engine for ultra-fast 60fps probing)
  const SITE_PARAMS = {
    pit_04: {
      center: [-23.8640, -69.1420],
      base_z: 2460.0,
      pit_z: 2130.0,
      depth: 330.0,
      radius: 800.0,
      benches: 6,
      stockpiles: [
        { lat: -23.858, lng: -69.129, h: 35.0, r: 65.0 },
        { lat: -23.863, lng: -69.128, h: 28.0, r: 50.0 }
      ]
    },
    cerro_verde: {
      center: [-16.5360, -71.5640],
      base_z: 2720.0,
      pit_z: 2180.0,
      depth: 540.0,
      radius: 1200.0,
      benches: 12,
      stockpiles: [
        { lat: -16.530, lng: -71.552, h: 45.0, r: 80.0 }
      ]
    },
    bingham_canyon: {
      center: [40.5220, -112.1510],
      base_z: 2350.0,
      pit_z: 1250.0,
      depth: 1100.0,
      radius: 1600.0,
      benches: 24,
      stockpiles: [
        { lat: 40.528, lng: -112.138, h: 50.0, r: 90.0 }
      ]
    }
  };

  function setSite(siteId) {
    currentSiteId = siteId;
  }

  function getElevationAt(lat, lng) {
    const site = SITE_PARAMS[currentSiteId] || SITE_PARAMS["pit_04"];
    const dLat = (lat - site.center[0]) * 111320.0;
    const dLng = (lng - site.center[1]) * 111320.0 * Math.cos(lat * Math.PI / 180.0);
    const distM = Math.hypot(dLat, dLng);

    // 1. Natural base terrain
    let base = site.base_z + (dLat * 0.04) + (dLng * 0.02);

    // 2. Stockpile mounds
    for (const sp of (site.stockpiles || [])) {
      const spDist = Math.hypot(
        (lat - sp.lat) * 111320.0,
        (lng - sp.lng) * 111320.0 * Math.cos(lat * Math.PI / 180.0)
      );
      if (spDist < sp.r * 2.5) {
        const mound = sp.h * Math.exp(-0.5 * Math.pow(spDist / sp.r, 2));
        return parseFloat((base + mound).toFixed(1));
      }
    }

    // 3. Open Pit Terraced Benches
    if (distM < site.radius) {
      const normR = distM / site.radius;
      const rawDepth = (1.0 - normR) * site.depth;
      const benchHeight = 15.0;
      const benchIdx = Math.floor(rawDepth / benchHeight);
      const benchRem = rawDepth - (benchIdx * benchHeight);

      let stepZ = benchIdx * benchHeight;
      if (benchRem >= 3.0) {
        stepZ += (benchRem - 3.0) * (benchHeight / 12.0);
      }

      let pitZ = site.base_z - stepZ;

      // Spiral haul ramp effect
      const angle = Math.atan2(dLat, dLng);
      const spiralPos = (angle + Math.PI) / (2 * Math.PI);
      const roadDist = Math.abs(normR - (0.3 + 0.5 * spiralPos));
      if (roadDist < 0.04) {
        pitZ += (1.0 - roadDist / 0.04) * 6.0;
      }

      return parseFloat(Math.max(site.pit_z, pitZ).toFixed(1));
    }

    return parseFloat(base.toFixed(1));
  }

  function getUTM(lat, lng) {
    const site = SITE_PARAMS[currentSiteId] || SITE_PARAMS["pit_04"];
    const dLngM = (lng - site.center[1]) * 111320.0 * Math.cos(lat * Math.PI / 180.0);
    const easting = Math.round(500000 + dLngM);
    let northing = Math.round(lat < 0 ? 10000000 + lat * 111320.0 : lat * 111320.0);
    return { easting, northing };
  }

  // Generate Profile along Polyline
  async function generateProfile(coordinates) {
    if (!coordinates || coordinates.length < 2) return null;

    try {
      // Try backend server first
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site: currentSiteId, coordinates: coordinates })
      });
      if (res.ok) {
        const data = await res.json();
        renderChart(data);
        return data;
      }
    } catch (e) {
      console.warn("Backend profile query failed, using fast client fallback:", e);
    }

    // Client-side fallback calculation
    const samples = 80;
    let totalDist = 0;
    const segments = [];
    for (let i = 0; i < coordinates.length - 1; i++) {
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];
      const dLat = (p2[0] - p1[0]) * 111320.0;
      const dLng = (p2[1] - p1[1]) * 111320.0 * Math.cos((p1[0] + p2[0]) / 2 * Math.PI / 180.0);
      const segLen = Math.hypot(dLat, dLng);
      segments.push({ p1, p2, len: segLen });
      totalDist += segLen;
    }

    const stepDist = totalDist / (samples - 1);
    const points = [];
    let segIdx = 0;
    let segAccum = 0;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let s = 0; s < samples; s++) {
      const targetD = s * stepDist;
      while (segIdx < segments.length - 1 && targetD > (segAccum + segments[segIdx].len)) {
        segAccum += segments[segIdx].len;
        segIdx++;
      }
      const seg = segments[segIdx];
      const t = seg.len > 0 ? (targetD - segAccum) / seg.len : 0;
      const lat = seg.p1[0] + t * (seg.p2[0] - seg.p1[0]);
      const lng = seg.p1[1] + t * (seg.p2[1] - seg.p1[1]);
      const z = getElevationAt(lat, lng);

      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);

      points.push({
        distance_m: parseFloat(targetD.toFixed(1)),
        elevation_m: z,
        lat: lat,
        lng: lng
      });
    }

    const result = {
      points: points,
      total_distance_m: parseFloat(totalDist.toFixed(1)),
      min_z: parseFloat(minZ.toFixed(1)),
      max_z: parseFloat(maxZ.toFixed(1)),
      relief_m: parseFloat((maxZ - minZ).toFixed(1))
    };

    renderChart(result);
    return result;
  }

  function renderChart(data) {
    const ctx = document.getElementById('elevation-chart');
    if (!ctx) return;

    const labels = data.points.map(p => `${p.distance_m}m`);
    const elevations = data.points.map(p => p.elevation_m);

    // Update Drawer Badges
    const badge = document.getElementById('profile-summary-badge');
    if (badge) {
      badge.innerHTML = `Relief: ${data.relief_m} m &bull; Distance: ${data.total_distance_m} m &bull; Min: ${data.min_z}m &bull; Max: ${data.max_z}m`;
    }

    // Open Drawer
    const drawer = document.getElementById('bottom-profile-drawer');
    if (drawer) {
      drawer.classList.remove('collapsed');
      const icon = drawer.querySelector('.btn-icon i');
      if (icon) icon.className = 'fa-solid fa-chevron-down';
    }

    if (profileChart) {
      profileChart.destroy();
    }

    profileChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Pit Elevation (RL meters)',
          data: elevations,
          borderColor: '#c6ff00',
          borderWidth: 2,
          backgroundColor: 'rgba(198, 255, 0, 0.12)',
          fill: true,
          tension: 0.15,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#00e5ff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `RL: ${ctx.parsed.y} m (Station: ${ctx.label})`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#829485',
              font: { family: 'JetBrains Mono', size: 9 },
              maxTicksLimit: 12
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: {
              color: '#c6ff00',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val}m`
            }
          }
        }
      }
    });
  }

  return {
    setSite,
    getElevationAt,
    getUTM,
    generateProfile,
    renderChart
  };
})();
