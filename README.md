# MINING_DRONE_OS v2.5 - Unified Web-GIS & Drone Operations Platform

A complete, production-grade Web-GIS application tailored for mining site surveys, open-pit quarry drone mapping, stockpile volumetrics, split-surface comparisons, and certified client deliverables.

---

## 🚀 Quick Start (Streamlit Edition)

To launch the **Streamlit** Web-GIS application:
1. Double-click `run_streamlit.bat` (or run in PowerShell / Command Prompt):
   ```cmd
   "C:\Program Files\QGIS 3.40.7\bin\python-qgis-ltr.bat" -m streamlit run app_streamlit.py --server.port 8501 --server.maxUploadSize 1024
   ```
2. Open your browser at **`http://localhost:8501`**.

---

## 🛠️ Key Fixes & Enhancements Over Original Code

### 1. Split-Surface Comparison Viewer (Module 01)
* **Previous Issue:** Streamlit slider `split_pos` did not split the Folium map at all, and re-rendered the entire page on every slider tick.
* **Fixed:** Integrated `folium.plugins.SideBySideLayers` with true hardware-accelerated left (Ortho) and right (DSM / DTM) raster clipping.

### 2. Digital Elevation Model & Contours (Module 02)
* **Previous Issue:** `show_contours` checkbox was an inert placeholder with no contour lines generated.
* **Fixed:** Connected to `gis_engine.MiningDEM` to compute true 3D open-pit terraced benches (15m bench steps, 8m safety berms, 10% spiral haul road, sump floor). Renders 5m/10m index contours with elevation tags and interactive cross-section profiles.

### 3. Live Vector Digitization & Persistence (Module 03)
* **Previous Issue:** Drawing on `plugins.Draw` caused Streamlit to reload and lose drawn shapes, with empty dummy downloads (`[]`, `<kml></kml>`, empty DXF).
* **Fixed:** Digitized polygons, crests, toes, haul ramps, and boreholes are stored in `st.session_state` and synced with real DXF, KML, GeoJSON, and CSV export generators.

### 4. 1GB Dataset Ingestion
* **Previous Issue:** Embedded large files as base64 data URLs in DOM, causing browser crashes and memory bloat.
* **Fixed:** Real streaming file ingestion supporting up to 1024 MB (GeoTIFF, Shapefile .zip, GeoJSON, KML, CSV) with GDAL projection and bounding box extraction.

### 5. Stockpile Volumetrics & Cut/Fill
* **Previous Issue:** Static, hardcoded text (`134.6 ha`, `4,850k m³`).
* **Fixed:** Live numerical integration computing surface area ($m^2$ and $ha$), cut volume ($m^3$), fill volume ($m^3$), net volume, and commercial tonnage ($t$) based on selected material density (Copper Ore 2.70 t/m³, Waste Rock 2.65 t/m³, Aggregates 1.65 t/m³, Iron Ore 3.20 t/m³, Coal 1.30 t/m³).

### 6. Client Deliverables & PDF Audits (Module 05)
* **AutoCAD DXF (.dxf):** Layered CAD format (`0_PIT_CREST`, `0_HAUL_ROADS`, `0_STOCKPILES`, `0_BOREHOLES`, `0_CONTOURS`) with 3D nodes.
* **Google Earth KML (.kml):** 3D extruded polygons with placemark styles.
* **Standard GeoJSON (.geojson):** RFC 7946 compliant FeatureCollection.
* **Executive PDF Survey Audit:** Generated using ReportLab with corporate header, QA/QC certification stamp, volumetric schedule, and surveyor sign-off.

---

## 📁 File Structure

```text
mining_drone_os/
│
├── app_streamlit.py       # Streamlit Production Application
├── run_streamlit.bat      # One-click launcher for Streamlit
│
├── server.py              # High-performance Python Web-GIS Server (Port 8050)
├── start_mining_os.bat    # Launcher for pure Web-GIS HTML5/JS edition
├── gis_engine.py          # Core DEM, volume integration, DXF, KML & PDF engine
│
├── public/                # Web GUI assets (Leaflet, Plotly, Chart.js)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       ├── map.js
│       ├── elevation.js
│       ├── digitizer.js
│       ├── volumetrics.js
│       ├── viewer3d.js
│       └── export.js
│
└── uploads/               # Directory for 1GB ingested survey files
```
