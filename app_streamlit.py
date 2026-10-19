"""
MINING_DRONE_OS v3.0 - Unified Web-GIS & Mining Operations Core
Streamlit Production Edition for Opencast Mining Topography,
UTM 46N COG / Orthomosaic Ingestion, DSM Excavation Cut & Fill, 3D Mesh & Client Deliverables.
"""

import os
import json
import io
import math
import base64
import tempfile
import zipfile
from datetime import datetime
import numpy as np
import pandas as pd
from PIL import Image

import streamlit as st
import folium
from folium import plugins
from folium.plugins import Draw, MeasureControl, Fullscreen

# Optional / External GIS Libs with safe graceful fallbacks
try:
    from streamlit_folium import st_folium
    HAS_ST_FOLIUM = True
except ImportError:
    HAS_ST_FOLIUM = False

try:
    import plotly.graph_objects as go
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

try:
    import rasterio
    from rasterio.mask import mask as raster_mask
    from rasterio.warp import transform_bounds, calculate_default_transform, reproject, Resampling
    from rasterio.crs import CRS
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    from pyproj import Transformer
    HAS_PYPROJ = True
except ImportError:
    HAS_PYPROJ = False

try:
    from shapely.geometry import Polygon as ShapelyPolygon
    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False

try:
    import geopandas as gpd
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False

try:
    import laspy
    HAS_LASPY = True
except ImportError:
    HAS_LASPY = False

# Default Coordinate Reference System: WGS 84 / UTM Zone 46N (North-East India Mining Belt)
DEFAULT_CRS_CODE = "EPSG:32646"

# =====================================================================
# EMBEDDED GIS ENGINE & PRESET DEFINITIONS
# =====================================================================

SITE_PRESETS = {
    "umtyra_limestone": {
        "id": "umtyra_limestone",
        "name": "Umtyra GSCL Limestone Mine",
        "center": [25.1842, 92.3512],
        "bounds": [[25.1780, 92.3440], [25.1900, 92.3590]],
        "utm_zone": "WGS 84 / UTM Zone 46N (EPSG:32646)",
        "uav_platform": "DJI Matrice 350 RTK / M3E",
        "gsd_cm": 3.8,
        "total_area_ha": 6.78,
        "base_elevation_m": 680.0,
        "pit_floor_elevation_m": 612.0,
        "initial_features": [
            {
                "id": "feat_01",
                "name": "Active Pit Bench #01",
                "type": "Pit Face",
                "category": "excavation",
                "color": "#4cd7f6",
                "density": 2.65,
                "coordinates": [
                    [25.1855, 92.3480],
                    [25.1870, 92.3530],
                    [25.1830, 92.3540],
                    [25.1820, 92.3490]
                ]
            }
        ]
    },
    "cerro_verde": {
        "id": "cerro_verde",
        "name": "Cerro Verde Copper Pit",
        "center": [-16.5365, -71.5833],
        "bounds": [[-16.5450, -71.5950], [-16.5280, -71.5720]],
        "utm_zone": "WGS 84 / UTM Zone 19S (EPSG:32719)",
        "uav_platform": "VTOL PPK Mapping UAV",
        "gsd_cm": 4.5,
        "total_area_ha": 184.2,
        "base_elevation_m": 2720.0,
        "pit_floor_elevation_m": 2340.0,
        "initial_features": []
    }
}

# =====================================================================
# STREAMLIT PAGE CONFIGURATION & THEME
# =====================================================================

st.set_page_config(
    page_title="MINING_DRONE_OS v3.0 - Unified Web-GIS",
    page_icon="⛏️",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700;800&family=Space+Grotesk:wght@600;700&display=swap');
    
    html, body, [class*="css"], .stMarkdown, .stText {
        font-family: 'JetBrains Mono', monospace;
    }
    
    .stApp {
        background-color: #090d0a !important;
        color: #e6ede6 !important;
    }
    
    section[data-testid="stSidebar"] {
        background-color: #101712 !important;
        border-right: 1px solid #1f2d22 !important;
    }
    
    .metric-card {
        background-color: #141b16;
        border: 1px solid #233125;
        border-radius: 6px;
        padding: 12px 14px;
        margin-bottom: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .telemetry-ticker {
        background: linear-gradient(90deg, #0d140f 0%, #121c15 100%);
        border: 1px solid #233125;
        border-left: 3px solid #c6ff00;
        padding: 8px 14px;
        font-size: 11px;
        color: #c6ff00;
        margin-bottom: 14px;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        letter-spacing: 0.3px;
    }
    
    .badge-rtk {
        background-color: rgba(198, 255, 0, 0.15);
        color: #c6ff00;
        border: 1px solid #c6ff00;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 700;
        font-size: 9px;
    }

    .stButton>button {
        background-color: #c6ff00 !important;
        color: #000000 !important;
        font-weight: 700 !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        border: none !important;
        border-radius: 4px !important;
        width: 100% !important;
    }
    
    .stTabs [aria-selected="true"] {
        background-color: #17221a !important;
        color: #c6ff00 !important;
        border-bottom: 2px solid #c6ff00 !important;
    }
</style>
""", unsafe_allow_html=True)

# =====================================================================
# SESSION STATE INITIALIZATION
# =====================================================================

if "active_site_id" not in st.session_state:
    st.session_state.active_site_id = "umtyra_limestone"

if "digitized_features" not in st.session_state:
    st.session_state.digitized_features = list(SITE_PRESETS["umtyra_limestone"]["initial_features"])

if "last_volume_res" not in st.session_state:
    st.session_state.last_volume_res = None

# =====================================================================
# SIDEBAR CONTROLS
# =====================================================================

with st.sidebar:
    st.markdown("""
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:24px;">⛏️</span>
        <div>
            <div style="font-weight:800; font-size:16px; color:#ffffff; font-family:'Plus Jakarta Sans',sans-serif;">MINING_DRONE_OS</div>
            <div style="font-size:10px; color:#829485;">v3.0 PRO · Unified Web-GIS Core</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    st.divider()

    # 1. Mining Concession Presets
    site_names = {v["name"]: k for k, v in SITE_PRESETS.items()}
    chosen_label = st.selectbox("🗺️ Active Concession", list(site_names.keys()), index=0)
    selected_site_id = site_names[chosen_label]

    if selected_site_id != st.session_state.active_site_id:
        st.session_state.active_site_id = selected_site_id
        st.session_state.digitized_features = list(SITE_PRESETS[selected_site_id]["initial_features"])
        st.rerun()

    site = SITE_PRESETS[st.session_state.active_site_id]
    st.divider()

    # 2. Mode Selector
    calc_target = st.radio(
        "⚡ Volumetric Calculation Mode",
        ["Mine Pit / Bench Excavation (Rock Cut)", "Stockpile / Mineral Dump (Heap Fill)"]
    )
    st.divider()

    # 3. Layer Visibility Controls
    st.subheader("🗺️ Layer Stack Controls")
    show_google_hybrid = st.checkbox("Google Hybrid Satellite Base", value=True)
    show_ortho_layer = st.checkbox("High-Res Drone Ortho Layer", value=True)
    show_boundary_shp = st.checkbox("Lease Boundary Vector (.shp)", value=True)
    ortho_opacity = st.slider("Orthomosaic Opacity", 0.0, 1.0, 0.85, 0.05)
    st.divider()

    # 4. Ingestion Pipeline
    st.subheader("📁 Ingest Survey Rasters & Vectors")
    uploaded_ortho = st.file_uploader("1. Orthomosaic (.tif / COG)", type=["tif", "tiff"])
    uploaded_dsm = st.file_uploader("2. DSM Elevation (.tif)", type=["tif", "tiff"])
    uploaded_dtm = st.file_uploader("3. DTM Baseline (.tif) [Optional]", type=["tif", "tiff"])
    uploaded_vectors = st.file_uploader(
        "4. Lease Boundary (.shp + .shx + .dbf or .zip / .geojson)",
        type=["shp", "shx", "dbf", "prj", "zip", "geojson", "kml"],
        accept_multiple_files=True
    )
    uploaded_3d = st.file_uploader(
        "5. 3D Model / Point Cloud (.obj+.mtl+.jpg or .las/.laz)",
        type=["obj", "mtl", "jpg", "jpeg", "png", "las", "laz"],
        accept_multiple_files=True
    )

# ----------------- INGESTION PROCESSING HELPERS -----------------
def cache_upload(file_obj, ext=".tif"):
    if file_obj is not None:
        t = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        t.write(file_obj.read())
        return t.name
    return None

ortho_local = cache_upload(uploaded_ortho, ".tif")
dsm_local = cache_upload(uploaded_dsm, ".tif")
dtm_local = cache_upload(uploaded_dtm, ".tif")

# Parse 3D Assets
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)

obj_name, mtl_name, img_name, laz_local = None, None, None, None
if uploaded_3d:
    for f in uploaded_3d:
        n_low = f.name.lower()
        save_path = os.path.join(static_dir, f.name)
        with open(save_path, "wb") as out:
            out.write(f.read())
        if n_low.endswith(".obj"):
            obj_name = f.name
        elif n_low.endswith(".mtl"):
            mtl_name = f.name
        elif n_low.endswith((".jpg", ".jpeg", ".png")):
            img_name = f.name
        elif n_low.endswith((".las", ".laz")):
            laz_local = save_path

# Parse Vectors
gdf_cadastral = None
if uploaded_vectors:
    try:
        temp_vdir = tempfile.mkdtemp()
        target_shp = None
        for vfile in uploaded_vectors:
            vpath = os.path.join(temp_vdir, vfile.name)
            with open(vpath, "wb") as vf:
                vf.write(vfile.read())
            if vfile.name.lower().endswith((".shp", ".geojson")):
                target_shp = vpath
            elif vfile.name.lower().endswith(".zip"):
                with zipfile.ZipFile(vpath, "r") as zr:
                    zr.extractall(temp_vdir)
                z_shps = [f for f in os.listdir(temp_vdir) if f.endswith(".shp")]
                if z_shps:
                    target_shp = os.path.join(temp_vdir, z_shps[0])

        if target_shp and HAS_GEOPANDAS:
            gdf = gpd.read_file(target_shp)
            if gdf.crs is None and HAS_RASTERIO:
                gdf.set_crs(CRS.from_epsg(32646), inplace=True)
            gdf_cadastral = gdf.to_crs(epsg=4326)
    except Exception as e:
        st.sidebar.error(f"Vector parser error: {e}")

# =====================================================================
# RASTER REPROJECTION & WEB MERCATOR OVERLAY ENGINE
# =====================================================================

site_center = site["center"]
site_bounds_leaflet = site["bounds"]
overlay_png_uri = None

active_raster = ortho_local or dsm_local

if active_raster and HAS_RASTERIO:
    try:
        with rasterio.open(active_raster) as src:
            src_crs = src.crs if src.crs else CRS.from_epsg(32646)
            left, bottom, right, top = src.bounds
            min_lon, min_lat, max_lon, max_lat = transform_bounds(src_crs, "EPSG:4326", left, bottom, right, top)
            
            site_bounds_leaflet = [[min_lat, min_lon], [max_lat, max_lon]]
            site_center = [(min_lat + max_lat) / 2.0, (min_lon + max_lon) / 2.0]

            # Reproject Overview to Web Mercator (EPSG:3857) with alpha channel
            dst_crs = "EPSG:3857"
            target_res = 1200
            transform, width, height = calculate_default_transform(
                src_crs, dst_crs, src.width, src.height, *src.bounds, dst_width=target_res
            )
            n_bands = min(src.count, 3)
            dest_arr = np.zeros((n_bands, height, width), dtype=np.uint8)

            for b in range(1, n_bands + 1):
                reproject(
                    source=rasterio.band(src, b),
                    destination=dest_arr[b - 1],
                    src_transform=src.transform,
                    src_crs=src_crs,
                    dst_transform=transform,
                    dst_crs=dst_crs,
                    resampling=Resampling.bilinear
                )

            if n_bands >= 3:
                rgb = np.dstack((dest_arr[0], dest_arr[1], dest_arr[2]))
                alpha = np.where((rgb[:, :, 0] == 0) & (rgb[:, :, 1] == 0) & (rgb[:, :, 2] == 0), 0, 255).astype(np.uint8)
                rgba = np.dstack((rgb, alpha))
            else:
                gray = dest_arr[0]
                alpha = np.where(gray == 0, 0, 255).astype(np.uint8)
                rgba = np.dstack((gray, gray, gray, alpha))

            pil_img = Image.fromarray(rgba, "RGBA")
            buf = BytesIO()
            pil_img.save(buf, format="PNG")
            overlay_png_uri = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"
    except Exception as e:
        st.sidebar.error(f"Raster engine error: {e}")

# =====================================================================
# TOP TELEMETRY RIBBON
# =====================================================================

st.markdown(f"""
<div class="telemetry-ticker">
    <div>
        <strong>• LIVE SURVEY SESSION</strong> &nbsp;|&nbsp; 
        <span>{site['name'].upper()}</span> &nbsp;|&nbsp; 
        <span style="color:#00e5ff;">PLATFORM: {site['uav_platform']}</span> &nbsp;|&nbsp; 
        <span>GSD: {site['gsd_cm']} CM/PX</span>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
        <span>GRID: {site['utm_zone']}</span>
        <span class="badge-rtk">RTK FIXED</span>
        <span style="color:#c6ff00;">READY</span>
    </div>
</div>
""", unsafe_allow_html=True)

# =====================================================================
# MAIN WORKSPACE & MODULE TABS
# =====================================================================

tab_gis, tab_3d_viewer, tab_deliverables = st.tabs([
    "🗺️ Spatial GIS & Volumetric Deck",
    "☁️ 3D Model / Point Cloud Deck",
    "📋 IBM Rule 34A Deliverables"
])

# ----------------- TAB 1: 2D GIS & CUT/FILL CALCULATION -----------------
with tab_gis:
    col_map, col_metrics = st.columns([2.5, 1])

    with col_map:
        m = folium.Map(
            location=site_center,
            zoom_start=16 if active_raster else 15,
            max_zoom=22,
            tiles=None,
            control_scale=True
        )

        if show_google_hybrid:
            folium.TileLayer(
                tiles="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
                attr="Google Satellite Hybrid",
                name="Google Hybrid",
                max_zoom=22,
                overlay=False,
                control=True
            ).add_to(m)

        # Reprojected Orthomosaic Layer
        if show_ortho_layer and overlay_png_uri:
            folium.raster_layers.ImageOverlay(
                image=overlay_png_uri,
                bounds=site_bounds_leaflet,
                opacity=ortho_opacity,
                name="Drone Orthomosaic (RGB)",
                interactive=True,
                cross_origin=False,
                zindex=2
            ).add_to(m)

        # Survey Bound Rectangle
        if site_bounds_leaflet:
            folium.Rectangle(
                bounds=site_bounds_leaflet,
                color="#c6ff00",
                weight=2,
                dash_array="5, 5",
                fill=False,
                tooltip="Survey Boundary Extent"
            ).add_to(m)

        # Cadastral / Lease boundary
        if show_boundary_shp and gdf_cadastral is not None:
            folium.GeoJson(
                gdf_cadastral,
                name="Leasehold Boundary (.shp)",
                style_function=lambda x: {
                    'color': '#ff4d4d',
                    'weight': 3,
                    'fillColor': '#ff9100',
                    'fillOpacity': 0.15
                }
            ).add_to(m)

        # Draw Controls
        Draw(
            export=False,
            filename='mine_features.geojson',
            position='topleft',
            draw_options={
                'polyline': False,
                'rectangle': True,
                'circle': False,
                'marker': False,
                'circlemarker': False,
                'polygon': {'allowIntersection': False, 'showArea': True}
            }
        ).add_to(m)

        Fullscreen().add_to(m)
        MeasureControl(position='bottomleft').add_to(m)
        folium.LayerControl(position='topright').add_to(m)

        if HAS_ST_FOLIUM:
            map_data = st_folium(m, width="100%", height=660, returned_objects=["last_active_drawing"])
        else:
            st.warning("Install `streamlit-folium` to enable interactive drawing.")
            map_data = {}

    with col_metrics:
        st.markdown("### 🧮 Volumetric Analytics")
        active_drawing = map_data.get("last_active_drawing") if map_data else None

        if not dsm_local:
            st.info("Upload your DSM (.tif) in the sidebar to run cut/fill integration.")
        elif active_drawing and active_drawing.get("geometry"):
            with st.spinner("Executing cell integration in UTM 46N..."):
                try:
                    with rasterio.open(dsm_local) as dsm_src:
                        actual_crs = dsm_src.crs if dsm_src.crs else CRS.from_epsg(32646)
                        transformer = Transformer.from_crs("EPSG:4326", actual_crs, always_xy=True)
                        
                        raw_coords = active_drawing["geometry"]["coordinates"][0]
                        utm_coords = [transformer.transform(pt[0], pt[1]) for pt in raw_coords]
                        poly = ShapelyPolygon(utm_coords)

                        dsm_crop, dsm_affine = raster_mask(dsm_src, [poly], crop=True)
                        dsm_matrix = dsm_crop[0]
                        nodata = dsm_src.nodata or -9999
                        valid = (dsm_matrix != nodata) & (~np.isnan(dsm_matrix)) & (dsm_matrix > -100)

                        if not np.any(valid):
                            st.warning("Selected boundary contains no valid elevation cells.")
                        else:
                            dx = abs(dsm_affine[0])
                            dy = abs(dsm_affine[4])
                            cell_area = dx * dy

                            # Baseline Elevation Derivation
                            if dtm_local:
                                with rasterio.open(dtm_local) as dtm_src:
                                    dtm_crop, _ = raster_mask(dtm_src, [poly], crop=True)
                                    dtm_mat = dtm_crop[0]
                                    base_surface = np.where((dtm_mat != (dtm_src.nodata or -9999)) & (~np.isnan(dtm_mat)), dtm_mat, np.nan)
                            else:
                                if "Excavation" in calc_target:
                                    # Pit Cut Mode: Baseline plane is the top natural ground rim
                                    rim_elev = np.nanpercentile(dsm_matrix[valid], 95)
                                    base_surface = np.full_like(dsm_matrix, rim_elev)
                                else:
                                    # Heap Fill Mode: Baseline plane is the lowest bottom floor
                                    floor_elev = np.nanpercentile(dsm_matrix[valid], 5)
                                    base_surface = np.full_like(dsm_matrix, floor_elev)

                            diff = dsm_matrix - base_surface
                            cut_cells = valid & (diff < 0)
                            fill_cells = valid & (diff > 0)

                            vol_cut = float(np.abs(np.nansum(diff[cut_cells])) * cell_area)
                            vol_fill = float(np.nansum(diff[fill_cells]) * cell_area)
                            footprint = float(np.count_nonzero(valid) * cell_area)

                            target_vol = vol_cut if "Excavation" in calc_target else vol_fill
                            density = 2.65
                            tonnage = target_vol * density

                            st.metric("Extracted Volume (Cut)" if "Excavation" in calc_target else "Stockpile Volume (Fill)", f"{target_vol:,.2f} m³")
                            st.metric("Estimated Solid Rock Tonnage", f"{tonnage:,.2f} T")
                            st.metric("Bench Footprint Area", f"{footprint:,.2f} m²")

                            st.session_state.last_volume_res = {
                                "volume": target_vol,
                                "tonnage": tonnage,
                                "footprint": footprint,
                                "cut": vol_cut,
                                "fill": vol_fill
                            }
                except Exception as ex:
                    st.error(f"Computation error: {ex}")
        else:
            st.info("Use the Polygon/Rectangle tool on the map to delineate an excavation pit or stockpile.")

# ----------------- TAB 2: 3D MODEL & POINT CLOUD DECK -----------------
with tab_3d_viewer:
    st.markdown("## ☁️ Interactive 3D Model & Point Cloud Deck")
    st.caption("Inspect High-Resolution Photogrammetry Meshes (.obj + .mtl + .jpg) and LiDAR (.las / .laz)")

    if obj_name:
        st.success(f"Rendering 3D Textured Mesh: {obj_name}")
        html_code = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/MTLLoader.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js"></script>
            <style>
                body {{ margin: 0; overflow: hidden; background-color: #0b0e16; }}
                #viewport {{ width: 100vw; height: 600px; }}
            </style>
        </head>
        <body>
            <div id="viewport"></div>
            <script>
                const container = document.getElementById('viewport');
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x0b0e16);

                const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
                camera.position.set(100, 150, 200);

                const renderer = new THREE.WebGLRenderer({{ antialias: true }});
                renderer.setSize(container.clientWidth, container.clientHeight);
                renderer.outputEncoding = THREE.sRGBEncoding;
                container.appendChild(renderer.domElement);

                const controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;

                scene.add(new THREE.AmbientLight(0xffffff, 0.8));
                const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
                dirLight.position.set(100, 200, 100);
                scene.add(dirLight);

                const objLoader = new THREE.OBJLoader();
                objLoader.load("app/static/{obj_name}", (object) => {{
                    const box = new THREE.Box3().setFromObject(object);
                    const center = box.getCenter(new THREE.Vector3());
                    object.position.sub(center);
                    scene.add(object);
                }});

                function animate() {{
                    requestAnimationFrame(animate);
                    controls.update();
                    renderer.render(scene, camera);
                }}
                animate();
            </script>
        </body>
        </html>
        """
        components.html(html_code, height=620)

    elif laz_local and HAS_LASPY:
        st.success(f"Loaded Drone Point Cloud: {os.path.basename(laz_local)}")
        try:
            las = laspy.read(laz_local)
            pts = las.points[::max(1, len(las.points) // 100000)]
            x, y, z = np.array(pts.x), np.array(pts.y), np.array(pts.z)
            cx, cy, cz = np.median(x), np.median(y), np.median(z)
            
            coords = np.empty(len(x) * 3, dtype=np.float32)
            coords[0::3] = x - cx
            coords[1::3] = z - cz
            coords[2::3] = -(y - cy)

            colors = np.empty(len(x) * 3, dtype=np.float32)
            z_norm = (z - np.min(z)) / (np.max(z) - np.min(z) + 1e-5)
            colors[0::3] = z_norm
            colors[1::3] = 0.8 * (1.0 - np.abs(z_norm - 0.5) * 2)
            colors[2::3] = 1.0 - z_norm

            pc_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
                <style>body {{ margin: 0; overflow: hidden; background-color: #0b0e16; }} #pc-view {{ width: 100vw; height: 600px; }}</style>
            </head>
            <body>
                <div id="pc-view"></div>
                <script>
                    const container = document.getElementById('pc-view');
                    const scene = new THREE.Scene();
                    scene.background = new THREE.Color(0x0b0e16);
                    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 5000);
                    camera.position.set(0, 100, 150);
                    const renderer = new THREE.WebGLRenderer({{ antialias: true }});
                    renderer.setSize(container.clientWidth, container.clientHeight);
                    container.appendChild(renderer.domElement);
                    const controls = new THREE.OrbitControls(camera, renderer.domElement);

                    const geom = new THREE.BufferGeometry();
                    geom.setAttribute('position', new THREE.Float32BufferAttribute({coords.tolist()}, 3));
                    geom.setAttribute('color', new THREE.Float32BufferAttribute({colors.tolist()}, 3));
                    const mat = new THREE.PointsMaterial({{ size: 1.8, vertexColors: true }});
                    scene.add(new THREE.Points(geom, mat));

                    function anim() {{ requestAnimationFrame(anim); controls.update(); renderer.render(scene, camera); }}
                    anim();
                </script>
            </body>
            </html>
            """
            components.html(pc_html, height=620)
        except Exception as e:
            st.error(f"Point cloud parsing error: {e}")
    else:
        st.info("Upload 3D assets on the sidebar (Section 5): select `3DModel.obj`, `3DModel.mtl`, and `3DModel.jpg` together, or choose a `.laz` / `.las` point cloud.")

# ----------------- TAB 3: DELIVERABLES & REPORTS -----------------
with tab_deliverables:
    st.markdown("## 📋 Turnkey IBM Rule 34A Deliverables")
    st.caption("Standardized submission dossier for Indian Bureau of Mines (IBM Rule 34A MCDR 2017)")

    if st.session_state.last_volume_res:
        vr = st.session_state.last_volume_res
        dossier = pd.DataFrame([{
            "Concession": site["name"],
            "Grid Reference": site["utm_zone"],
            "Excavated Volume (m3)": round(vr["volume"], 2),
            "Extracted Tonnage (Tonnes)": round(vr["tonnage"], 2),
            "Bench Footprint (m2)": round(vr["footprint"], 2),
            "Survey Date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }])
        st.dataframe(dossier, use_container_width=True)
        st.download_button(
            label="Download Certified CSV Volumetric Dossier",
            data=dossier.to_csv(index=False).encode('utf-8'),
            file_name=f"{site['id']}_volumetric_dossier.csv",
            mime="text/csv"
        )
    else:
        st.info("Execute a volumetric calculation in Tab 1 to generate the export dossier.")
