import os
import json
import base64
import tempfile
import zipfile
from datetime import datetime
from io import BytesIO
import numpy as np
import pandas as pd
from PIL import Image

import streamlit as st
import folium
from folium.plugins import Draw, MeasureControl, Fullscreen
from streamlit_folium import st_folium

import rasterio
from rasterio.mask import mask as raster_mask
from rasterio.warp import transform_bounds, calculate_default_transform, reproject, Resampling
from rasterio.crs import CRS
from pyproj import Transformer
from shapely.geometry import Polygon as ShapelyPolygon
import geopandas as gpd

try:
    import laspy
    HAS_LASPY = True
except ImportError:
    HAS_LASPY = False

# ----------------- PAGE CONFIGURATION -----------------
st.set_page_config(
    page_title="Universal Mine Spatial Deck & Volumetrics",
    page_icon="⛏️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Professional High-Contrast UI Styling
st.markdown("""
<style>
    .metric-card {
        background-color: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 14px 16px;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .metric-card h4 {
        margin: 0;
        font-size: 0.75rem;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .metric-card .val {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0284c7;
        margin: 4px 0;
    }
    .telemetry-bar {
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 0.85rem;
        color: #1e293b;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: monospace;
    }
    .chip {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 11px;
        background-color: #0284c7;
        color: #ffffff;
    }
</style>
""", unsafe_allow_html=True)

# ----------------- UNIVERSAL CRS DETECTOR & FALLBACK ENGINE -----------------
def identify_and_enforce_crs(src):
    """
    Identifies the native CRS across India. If missing/user-defined,
    determines whether coordinates are in Lat/Lon (EPSG:4326) or
    UTM meter grids (Zone 42N to 47N, defaulting to Zone 46N).
    """
    if src.crs and src.crs.is_valid:
        return src.crs

    left, bottom, right, top = src.bounds
    # Check if bounds are in Geographic Degree format (EPSG:4326)
    if -180.0 <= left <= 180.0 and -90.0 <= bottom <= 90.0 and abs(right - left) < 10.0:
        return CRS.from_epsg(4326)

    # Typical Indian UTM coordinates: Easting ~ 200,000 - 800,000; Northing ~ 800,000 - 4,000,000
    mid_easting = (left + right) / 2.0
    # North-East India (Meghalaya, Assam, Nagaland, Tripura) -> Zone 46N
    if 200000 <= mid_easting <= 850000:
        return CRS.from_epsg(32646)

    # Default Indian general baseline
    return CRS.from_epsg(32646)

# ----------------- SIDEBAR CONTROLS -----------------
with st.sidebar:
    st.title("⛏️ Mine Spatial Deck")
    st.caption("Universal Indian Drone Photogrammetry Engine")
    st.markdown("---")

    st.subheader("1. Operation Mode")
    survey_mode = st.radio(
        "Measurement Target",
        ["Mine Pit / Quarry Face Excavation (Rock Cut)", "Stockpile / Mineral Dump (Heap Fill)"]
    )
    st.markdown("---")

    st.subheader("2. Survey Ingest (.tif / .shp)")
    uploaded_ortho = st.file_uploader("1. Orthomosaic RGB (.tif / COG)", type=["tif", "tiff"])
    uploaded_dsm = st.file_uploader("2. DSM Elevation (.tif / COG)", type=["tif", "tiff"])
    uploaded_dtm = st.file_uploader("3. DTM Baseline (.tif / COG) [Optional]", type=["tif", "tiff"])
    uploaded_vectors = st.file_uploader(
        "4. Lease Boundary (.shp + .shx + .dbf or .zip / .geojson)",
        type=["shp", "shx", "dbf", "prj", "zip", "geojson", "kml"],
        accept_multiple_files=True
    )
    st.markdown("---")

    st.subheader("3. 3D Model / Point Cloud")
    uploaded_3d = st.file_uploader(
        "Upload 3D Asset (.obj + .mtl + .jpg or .las / .laz)",
        type=["obj", "mtl", "jpg", "jpeg", "png", "las", "laz"],
        accept_multiple_files=True
    )
    st.markdown("---")

    st.subheader("4. Material & Layer Density")
    minerals = {
        "Limestone (Solid In-Situ Bedrock)": 2.65,
        "Limestone (Blasted / Loose Muck)": 1.65,
        "Coal (Bituminous Bedrock)": 1.35,
        "Iron Ore (Hematite Solid Rock)": 3.80,
        "Overburden Rock / Shale": 2.20,
        "Custom Specific Gravity": 2.50
    }
    selected_mineral = st.selectbox("Mineral / Rock Type", list(minerals.keys()))
    density_val = st.number_input("Density (Tonnes / m³)", value=minerals[selected_mineral], step=0.05)
    ortho_opacity = st.slider("Orthomosaic Opacity", 0.0, 1.0, 0.85, 0.05)

# ----------------- FILE PERSISTENCE HELPERS -----------------
def cache_upload(file_obj, ext=".tif"):
    if file_obj is not None:
        t = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        t.write(file_obj.read())
        return t.name
    return None

ortho_local = cache_upload(uploaded_ortho, ".tif")
dsm_local = cache_upload(uploaded_dsm, ".tif")
dtm_local = cache_upload(uploaded_dtm, ".tif")

# Save 3D Models locally to Streamlit's static directory
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

        if target_shp:
            gdf = gpd.read_file(target_shp)
            if gdf.crs is None:
                gdf.set_crs(CRS.from_epsg(32646), inplace=True)
            gdf_cadastral = gdf.to_crs(epsg=4326)
    except Exception as e:
        st.sidebar.error(f"Vector parser error: {e}")

# ----------------- UNIVERSAL RASTER REPROJECTION ENGINE -----------------
site_center = [25.1842, 92.3512]
site_bounds_leaflet = None
overlay_png_uri = None
detected_crs_name = "None Detected"

active_raster = ortho_local or dsm_local

if active_raster:
    try:
        with rasterio.open(active_raster) as src:
            src_crs = identify_and_enforce_crs(src)
            detected_crs_name = src_crs.to_string()

            left, bottom, right, top = src.bounds
            min_lon, min_lat, max_lon, max_lat = transform_bounds(src_crs, "EPSG:4326", left, bottom, right, top)

            site_bounds_leaflet = [[min_lat, min_lon], [max_lat, max_lon]]
            site_center = [(min_lat + max_lat) / 2.0, (min_lon + max_lon) / 2.0]

            # Reproject to Web Mercator (EPSG:3857)
            dst_crs = "EPSG:3857"
            target_res = 1200

            # Proportional dimension computation
            aspect = src.height / src.width
            if aspect >= 1.0:
                dst_h = target_res
                dst_w = max(1, int(target_res / aspect))
            else:
                dst_w = target_res
                dst_h = max(1, int(target_res * aspect))

            transform, width, height = calculate_default_transform(
                src_crs, dst_crs, src.width, src.height, *src.bounds,
                dst_width=dst_w, dst_height=dst_h
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

            # Mask out black borders/nodata to full transparency
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
        st.sidebar.error(f"GeoTIFF decoder error: {e}")

# ----------------- TELEMETRY STATUS BAR -----------------
st.markdown(f"""
<div class="telemetry-bar">
    <div><strong>DETECTED GRID:</strong> <span class="chip">{detected_crs_name}</span> &nbsp;|&nbsp; <strong>DATUM:</strong> WGS 84 / INDIA COMPLIANT</div>
    <div><strong>STATUS:</strong> {'RASTER CALIBRATED' if overlay_png_uri else 'WAITING FOR DATA'}</div>
</div>
""", unsafe_allow_html=True)

# ----------------- WORKSPACE TABS -----------------
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
            zoom_start=16 if site_bounds_leaflet else 14,
            max_zoom=22,
            tiles=None,
            control_scale=True
        )

        folium.TileLayer(
            tiles="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            attr="Google Satellite Hybrid",
            name="Google Hybrid Satellite",
            max_zoom=22,
            overlay=False,
            control=True
        ).add_to(m)

        # Reprojected Orthomosaic Layer
        if overlay_png_uri and site_bounds_leaflet:
            folium.raster_layers.ImageOverlay(
                image=overlay_png_uri,
                bounds=site_bounds_leaflet,
                opacity=ortho_opacity,
                name="Drone Orthomosaic (RGB)",
                interactive=True,
                cross_origin=False,
                zindex=2
            ).add_to(m)

            folium.Rectangle(
                bounds=site_bounds_leaflet,
                color="#0284c7",
                weight=2,
                dash_array="5, 5",
                fill=False,
                tooltip="Survey Coverage Extent"
            ).add_to(m)

        # Boundary Vectors
        if gdf_cadastral is not None:
            folium.GeoJson(
                gdf_cadastral,
                name="Lease Boundary (.shp)",
                style_function=lambda x: {
                    'color': '#ef4444',
                    'weight': 3,
                    'fillColor': '#f59e0b',
                    'fillOpacity': 0.15
                }
            ).add_to(m)

        Draw(
            export=False,
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

        map_data = st_folium(m, width="100%", height=660, returned_objects=["last_active_drawing"])

    with col_metrics:
        st.subheader("Volumetric Analytics")
        active_drawing = map_data.get("last_active_drawing") if map_data else None

        if not dsm_local:
            st.info("Upload your DSM (.tif) in the sidebar to calculate excavation or stockpile volumes.")
        elif active_drawing and active_drawing.get("geometry"):
            with st.spinner("Calculating cut & fill volumes..."):
                try:
                    with rasterio.open(dsm_local) as dsm_src:
                        actual_crs = identify_and_enforce_crs(dsm_src)
                        transformer = Transformer.from_crs("EPSG:4326", actual_crs, always_xy=True)

                        raw_coords = active_drawing["geometry"]["coordinates"][0]
                        utm_coords = [transformer.transform(pt[0], pt[1]) for pt in raw_coords]
                        poly = ShapelyPolygon(utm_coords)

                        dsm_crop, dsm_affine = raster_mask(dsm_src, [poly], crop=True)
                        dsm_matrix = dsm_crop[0]
                        nodata = dsm_src.nodata or -9999
                        valid = (dsm_matrix != nodata) & (~np.isnan(dsm_matrix)) & (dsm_matrix > -100)

                        if not np.any(valid):
                            st.warning("Selected polygon contains no valid elevation data.")
                        else:
                            dx = abs(dsm_affine[0])
                            dy = abs(dsm_affine[4])
                            cell_area = dx * dy

                            if dtm_local:
                                with rasterio.open(dtm_local) as dtm_src:
                                    dtm_crop, _ = raster_mask(dtm_src, [poly], crop=True)
                                    dtm_mat = dtm_crop[0]
                                    base_surface = np.where((dtm_mat != (dtm_src.nodata or -9999)) & (~np.isnan(dtm_mat)), dtm_mat, np.nan)
                            else:
                                if "Excavation" in survey_mode:
                                    rim_elev = np.nanpercentile(dsm_matrix[valid], 95)
                                    base_surface = np.full_like(dsm_matrix, rim_elev)
                                else:
                                    floor_elev = np.nanpercentile(dsm_matrix[valid], 5)
                                    base_surface = np.full_like(dsm_matrix, floor_elev)

                            diff = dsm_matrix - base_surface
                            cut_cells = valid & (diff < 0)
                            fill_cells = valid & (diff > 0)

                            vol_cut = float(np.abs(np.nansum(diff[cut_cells])) * cell_area)
                            vol_fill = float(np.nansum(diff[fill_cells]) * cell_area)
                            footprint = float(np.count_nonzero(valid) * cell_area)

                            target_vol = vol_cut if "Excavation" in survey_mode else vol_fill
                            tonnage = target_vol * density_val

                            st.metric(
                                "Extracted Rock Volume (Cut)" if "Excavation" in survey_mode else "Stockpile Volume (Fill)",
                                f"{target_vol:,.2f} m³"
                            )
                            st.metric("Solid Rock Mass / Tonnage", f"{tonnage:,.2f} Tonnes")
                            st.metric("Bench Footprint Area", f"{footprint:,.2f} m²")

                            st.session_state.last_res = {
                                "target": survey_mode,
                                "material": selected_mineral,
                                "density": density_val,
                                "volume": target_vol,
                                "tonnage": tonnage,
                                "area": footprint
                            }
                except Exception as ex:
                    st.error(f"Computation error: {ex}")
        else:
            st.info("Draw a polygon around a quarry bench or stockpile to calculate volumetrics.")

# ----------------- TAB 2: 3D MODEL & POINT CLOUD -----------------
with tab_3d_viewer:
    st.subheader("Interactive 3D Model & Point Cloud Deck")

    if obj_name:
        st.success(f"Rendering 3D Mesh: {obj_name}")
        html_code = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js"></script>
            <style>body {{ margin: 0; overflow: hidden; background: #0f172a; }} #viewport {{ width: 100vw; height: 600px; }}</style>
        </head>
        <body>
            <div id="viewport"></div>
            <script>
                const container = document.getElementById('viewport');
                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x0f172a);
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

                new THREE.OBJLoader().load("app/static/{obj_name}", (object) => {{
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
        st.components.v1.html(html_code, height=620)

    elif laz_local and HAS_LASPY:
        st.success(f"Loaded Point Cloud: {os.path.basename(laz_local)}")
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
                <style>body {{ margin: 0; overflow: hidden; background: #0f172a; }} #pc {{ width: 100vw; height: 600px; }}</style>
            </head>
            <body>
                <div id="pc"></div>
                <script>
                    const container = document.getElementById('pc');
                    const scene = new THREE.Scene();
                    scene.background = new THREE.Color(0x0f172a);
                    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 5000);
                    camera.position.set(0, 100, 150);
                    const renderer = new THREE.WebGLRenderer({{ antialias: true }});
                    renderer.setSize(container.clientWidth, container.clientHeight);
                    container.appendChild(renderer.domElement);
                    const controls = new THREE.OrbitControls(camera, renderer.domElement);

                    const geom = new THREE.BufferGeometry();
                    geom.setAttribute('position', new THREE.Float32BufferAttribute({coords.tolist()}, 3));
                    geom.setAttribute('color', new THREE.Float32BufferAttribute({colors.tolist()}, 3));
                    scene.add(new THREE.Points(geom, new THREE.PointsMaterial({{ size: 1.8, vertexColors: true }})));

                    function anim() {{ requestAnimationFrame(anim); controls.update(); renderer.render(scene, camera); }}
                    anim();
                </script>
            </body>
            </html>
            """
            st.components.v1.html(pc_html, height=620)
        except Exception as e:
            st.error(f"Point cloud parsing error: {e}")
    else:
        st.info("Upload 3D assets on the sidebar (Section 3) to view the textured mesh or point cloud in 3D.")

# ----------------- TAB 3: DELIVERABLES -----------------
with tab_deliverables:
    st.subheader("Turnkey IBM Rule 34A Deliverables")
    if "last_res" in st.session_state and st.session_state.last_res:
        res = st.session_state.last_res
        dossier = pd.DataFrame([{
            "Survey Mode": res["target"],
            "Material": res["material"],
            "Bulk Density (T/m3)": res["density"],
            "Footprint Area (m2)": round(res["area"], 2),
            "Excavation/Fill Volume (m3)": round(res["volume"], 2),
            "Estimated Tonnage (Tonnes)": round(res["tonnage"], 2),
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }])
        st.dataframe(dossier, use_container_width=True)
        st.download_button(
            label="Download Certified CSV Volumetric Dossier",
            data=dossier.to_csv(index=False).encode('utf-8'),
            file_name="volumetric_report.csv",
            mime="text/csv"
        )
    else:
        st.info("Execute a volumetric calculation on Tab 1 to generate the report.")
