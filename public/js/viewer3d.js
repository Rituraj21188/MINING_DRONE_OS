/**
 * MINING_DRONE_OS - 3D Topographic Pit & Bench Surface Visualizer
 * Leverages WebGL via Plotly.js 3D Surface to render interactive orbital views
 * of the open pit quarry, safety benches, haul ramps, and stockpiles.
 */

window.MiningViewer3D = (function () {
  let isRendered = false;

  function render3D(siteId = "pit_04") {
    const container = document.getElementById('plotly-3d-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Generating 3D Topographic Mesh...</div>';

    setTimeout(() => {
      buildSurface(siteId, container);
    }, 50);
  }

  function buildSurface(siteId, container) {
    const site = window.MiningElevation ? window.MiningElevation : null;
    const n = 45; // 45x45 elevation grid
    
    // Grid bounds around center
    const pitCenter = [-23.8640, -69.1420];
    const spanLat = 0.016; // approx 1.8km
    const spanLng = 0.020;

    const xVals = [];
    const yVals = [];
    const zMatrix = [];

    for (let i = 0; i < n; i++) {
      const lat = (pitCenter[0] - spanLat / 2) + (i / (n - 1)) * spanLat;
      yVals.push(parseFloat(((lat - pitCenter[0]) * 111320).toFixed(0)));
      const row = [];
      for (let j = 0; j < n; j++) {
        const lng = (pitCenter[1] - spanLng / 2) + (j / (n - 1)) * spanLng;
        if (i === 0) {
          xVals.push(parseFloat(((lng - pitCenter[1]) * 111320 * Math.cos(pitCenter[0] * Math.PI / 180)).toFixed(0)));
        }
        const elev = window.MiningElevation.getElevationAt(lat, lng);
        row.push(elev);
      }
      zMatrix.push(row);
    }

    const data = [{
      z: zMatrix,
      x: xVals,
      y: yVals,
      type: 'surface',
      colorscale: [
        [0.0, '#1a237e'],
        [0.2, '#0288d1'],
        [0.4, '#26a69a'],
        [0.6, '#a2fc3c'],
        [0.8, '#fbc02d'],
        [1.0, '#d84315']
      ],
      contours: {
        z: {
          show: true,
          usecolormap: true,
          highlightcolor: "#ffffff",
          project: { z: false }
        }
      },
      lighting: {
        ambient: 0.6,
        diffuse: 0.8,
        specular: 0.2,
        roughness: 0.5
      }
    }];

    const layout = {
      title: {
        text: '3D Terrain & Benches Model &bull; Vertical Exaggeration 1.5x',
        font: { family: 'JetBrains Mono', size: 12, color: '#e6ede6' }
      },
      autosize: true,
      paper_bgcolor: '#050706',
      plot_bgcolor: '#050706',
      scene: {
        xaxis: { title: 'Easting (m)', color: '#829485', gridcolor: '#1a251d' },
        yaxis: { title: 'Northing (m)', color: '#829485', gridcolor: '#1a251d' },
        zaxis: { title: 'Elevation (m RL)', color: '#c6ff00', gridcolor: '#1a251d' },
        camera: {
          eye: { x: 1.3, y: -1.4, z: 1.1 }
        },
        aspectratio: { x: 1, y: 1, z: 0.45 }
      },
      margin: { l: 0, r: 0, b: 0, t: 30 }
    };

    container.innerHTML = '';
    Plotly.newPlot(container, data, layout, { responsive: true, displayModeBar: true });
    isRendered = true;
  }

  function resetCamera() {
    const container = document.getElementById('plotly-3d-container');
    if (!container || !isRendered) return;
    Plotly.relayout(container, {
      'scene.camera': { eye: { x: 1.3, y: -1.4, z: 1.1 } }
    });
  }

  return {
    render3D,
    resetCamera
  };
})();
