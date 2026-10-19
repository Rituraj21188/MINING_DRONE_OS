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
import shapely.ops
from shapely.geometry import Polygon as ShapelyPolygon, MultiPolygon as ShapelyMultiPolygon
import geopandas as gpd

# Default Coordinate Reference System: WGS 84 / UTM Zone 46N (North-East India Mining Belt)
DEFAULT_CRS = CRS.from_epsg(32646)

# ----------------- PAGE CONFIGURATION -----------------
st.set_page_config(
    page_title="Mine Site Spatial Deck & Volumetrics",
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
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.85rem;
        color: #1e293b;
        margin-bottom: 14px;
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

# ----------------- GEOMETRY & CRS HELPER FUNCTIONS -----------------
def identify_and_enforce_crs(src):
    if src.crs and src.crs.is_valid:
        return src.crs
    left, bottom, right, top = src.bounds
    if -180.0 <= left <= 180.0 and -90.0 <= bottom <= 90.0 and abs(right - left) < 10.0:
        return CRS.from_epsg(4326)
    return DEFAULT_CRS

def flatten_to_2d(geom):
    """Strips Z coordinate from 3D shapefiles/KML to prevent Folium render drops."""
    if geom is None:
        return None
    return shapely.ops.transform(lambda x, y, *args: (x, y), geom)

def parse_vector_files(uploaded_file_list):
    """Extracts zipped or multi-part shapefiles/KML/GeoJSON into 2D GeoDataFrames."""
    if not uploaded_file_list:
        return {}
    
    temp_dir = tempfile.mkdtemp()
    for f in uploaded_file_list:
        file_path = os.path.join(temp_dir, f.name)
        with open(file_path, "wb") as out:
            out.write(f.read())
        if f.name.lower().endswith(".zip"):
            with zipfile.ZipFile(file_path, "r") as z:
                z.extractall(temp_dir)

    parsed_layers = {}
    valid_extensions = (".shp", ".geojson", ".kml")
    all_files = [os.path.join(temp_dir, fn) for fn in os.listdir(temp_dir) if fn.lower().endswith(valid_extensions)]

    for path in all_files:
        try:
            # Enable KML driver if needed
            if path.lower().endswith(".kml"):
                gpd.io.file.fiona.drvsupport.supported_drivers['KML'] = 'rw'
            gdf = gpd.read_file(path)
            if gdf.empty or gdf.geometry is None:
                continue

            if gdf.crs is None:
                gdf.set_crs(DEFAULT_CRS, inplace=True)

            gdf_wgs = gdf.to_crs(epsg=4326)
            gdf_wgs["geometry"] = gdf_wgs["geometry"].apply(flatten_to_2d)
            gdf_wgs = gdf_wgs[gdf_wgs.geometry.notnull() & ~gdf_wgs.geometry.is_empty]

            clean_name = os.path.splitext(os.path.basename(path))[0].replace("_", " ").title()
            parsed_layers[clean_name] = gdf_wgs
        except Exception as err:
            st.sidebar.warning(f"Could not load {os.path.basename(path)}: {err}")

    return parsed_layers

# ----------------- SIDEBAR CONTROLS -----------------
with st.sidebar:
    st.title("⛏️ Mine Spatial Deck")
    st.caption("UTM 46N (EPSG:32646) Photogrammetry & Volumetrics")
    st.markdown("---")

    st.subheader("1. Operation Mode")
    survey_mode = st.radio(
        "Measurement Target",
        ["Mine Pit / Quarry Face Excavation (Rock Cut)", "Stockpile / Mineral Dump (Heap Fill)"]
    )
    st.markdown("---")

    st.subheader("2. Elevation & Ortho Rasters")
    uploaded_ortho = st.file_uploader("1. Orthomosaic RGB (.tif / COG)", type=["tif", "tiff"])
    uploaded_dsm = st.file_uploader("2. DSM Elevation (.tif / COG)", type=["tif", "tiff"])
    uploaded_dtm = st.file_uploader("3. DTM Baseline (.tif / COG) [Optional]", type=["tif", "tiff"])
    st.markdown("---")

    st.subheader("3. Excavation / Stockpile Target Boundary")
    st.caption("Upload the target polygon (.kml, .shp in .zip, or .geojson) to compute its volume directly")
    uploaded_excavation = st.file_uploader(
        "Excavation Boundary Target",
        type=["kml", "shp", "shx", "dbf", "zip", "geojson"],
        accept_multiple_files=True
    )
    st.markdown("---")

    st.subheader("4. General Cadastral Overlays")
    st.caption("Upload Boundary Pillars, Mine Lease, Safety Zone (.shp in .zip, .kml)")
    uploaded_cadastral = st.file_uploader(
        "Boundary Pillars & Cadastral Layers",
        type=["shp", "shx", "dbf", "prj", "zip", "geojson", "kml"],
        accept_multiple_files=True
    )
    st.markdown("---")

    st.subheader("5. Material & Layer Density")
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

# Parse Vector Layers
excavation_layers = parse_vector_files(uploaded_excavation)
cadastral_layers = parse_vector_files(uploaded_cadastral)

# Extract Excavation Polygons for direct volume calculation
available_calc_polygons = {}
for lay_name, gdf in excavation_layers.items():
    for idx, geom in enumerate(gdf.geometry):
        if geom and geom.geom_type in ["Polygon", "MultiPolygon"]:
            available_calc_polygons[f"{lay_name} (Feature #{idx+1})"] = geom

# Also index any polygons from cadastral uploads as backup options
for lay_name, gdf in cadastral_layers.items():
    for idx, geom in enumerate(gdf.geometry):
        if geom and geom.geom_type in ["Polygon", "MultiPolygon"]:
            available_calc_polygons[f"{lay_name} (Feature #{idx+1})"] = geom

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

            # Mask out outer black borders/nodata to full transparency
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
    <div><strong>GRID:</strong> <span class="chip">{detected_crs_name}</span> &nbsp;|&nbsp; <strong>DATUM:</strong> WGS 84 / INDIA COMPLIANT</div>
    <div><strong>STATUS:</strong> {'RASTER CALIBRATED' if overlay_png_uri else 'WAITING FOR DATA'}</div>
</div>
""", unsafe_allow_html=True)

# ----------------- MAIN WORKSTATION -----------------
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

    # 1. Drone Orthomosaic Overlay
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

    # 2. Render Dedicated Excavation Target Boundary (Amber)
    for lay_name, gdf in excavation_layers.items():
        folium.GeoJson(
            gdf,
            name=f"Excavation Boundary: {lay_name}",
            style_function=lambda x: {
                'color': '#f59e0b',
                'weight': 3,
                'fillColor': '#fbbf24',
                'fillOpacity': 0.25
            },
            tooltip=folium.GeoJsonTooltip(fields=[gdf.columns[0]], aliases=["Target:"]) if len(gdf.columns) > 1 else None
        ).add_to(m)

    # 3. Render Cadastral Layers (Pillars as Points, Lease/Safety as Polygons)
    color_palette = ["#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"]
    color_idx = 0

    for lay_name, gdf in cadastral_layers.items():
        assigned_color = color_palette[color_idx % len(color_palette)]
        color_idx += 1
        geom_type = gdf.geometry.iloc[0].geom_type if len(gdf) > 0 else ""

        if "Point" in geom_type:
            # Boundary Pillars: Render distinct circle markers
            for _, row in gdf.iterrows():
                pt = row.geometry
                label = row.get("name", row.get("id", row.get("Pillar_No", "Pillar")))
                folium.CircleMarker(
                    location=[pt.y, pt.x],
                    radius=5,
                    color="#ef4444",
                    fill=True,
                    fill_color="#ef4444",
                    fill_opacity=0.9,
                    tooltip=f"Pillar: {label} ({pt.y:.5f}, {pt.x:.5f})"
                ).add_to(m)
        else:
            # Lease Boundaries / Safety Buffer Polygons
            folium.GeoJson(
                gdf,
                name=f"{lay_name} (.shp)",
                style_function=lambda x, col=assigned_color: {
                    'color': col,
                    'weight': 3 if "Line" in geom_type else 2.5,
                    'fillColor': col,
                    'fillOpacity': 0.15 if "Polygon" in geom_type else 0.0
                }
            ).add_to(m)

    # 4. Drawing Controls
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

    map_data = st_folium(m, width="100%", height=680, returned_objects=["last_active_drawing"])

with col_metrics:
    st.subheader("Volumetric Analytics")

    # Boundary Target Selection
    boundary_options = ["Manual Draw on Map"] + list(available_calc_polygons.keys())
    chosen_boundary_label = st.selectbox(
        "Calculation Boundary",
        boundary_options,
        index=1 if len(boundary_options) > 1 else 0
    )

    selected_polygon = None
    if chosen_boundary_label != "Manual Draw on Map":
        selected_polygon = available_calc_polygons[chosen_boundary_label]
        st.success(f"Using Boundary: {chosen_boundary_label}")
    else:
        active_drawing = map_data.get("last_active_drawing") if map_data else None
        if active_drawing and active_drawing.get("geometry"):
            raw_coords = active_drawing["geometry"]["coordinates"][0]
            selected_polygon = ShapelyPolygon(raw_coords)

    if not dsm_local:
        st.info("Upload your DSM (.tif) in the sidebar to calculate excavation or stockpile volumes.")
    elif selected_polygon is not None:
        with st.spinner("Calculating cut & fill volumes..."):
            try:
                with rasterio.open(dsm_local) as dsm_src:
                    actual_crs = identify_and_enforce_crs(dsm_src)
                    transformer = Transformer.from_crs("EPSG:4326", actual_crs, always_xy=True)

                    if selected_polygon.geom_type == "MultiPolygon":
                        poly_coords = list(selected_polygon.geoms[0].exterior.coords)
                    else:
                        poly_coords = list(selected_polygon.exterior.coords)

                    utm_coords = [transformer.transform(pt[0], pt[1]) for pt in poly_coords]
                    poly_utm = ShapelyPolygon(utm_coords)

                    dsm_crop, dsm_affine = raster_mask(dsm_src, [poly_utm], crop=True)
                    dsm_matrix = dsm_crop[0]
                    nodata = dsm_src.nodata or -9999
                    valid = (dsm_matrix != nodata) & (~np.isnan(dsm_matrix)) & (dsm_matrix > -100)

                    if not np.any(valid):
                        st.warning("Selected boundary contains no valid elevation data.")
                    else:
                        dx = abs(dsm_affine[0])
                        dy = abs(dsm_affine[4])
                        cell_area = dx * dy

                        # Baseline Elevation Derivation
                        if dtm_local:
                            with rasterio.open(dtm_local) as dtm_src:
                                dtm_crop, _ = raster_mask(dtm_src, [poly_utm], crop=True)
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

                        with st.expander("Engineering Parameters", expanded=True):
                            max_depth = float(np.nanmax(np.abs(diff[cut_cells]))) if np.any(cut_cells) else 0.0
                            avg_depth = float(np.nanmean(np.abs(diff[cut_cells]))) if np.any(cut_cells) else 0.0
                            st.write(f"**Max Bench Depth:** `{max_depth:.2f} m`")
                            st.write(f"**Average Excavation Depth:** `{avg_depth:.2f} m`")
                            st.write(f"**Peak Rim Elevation:** `{float(np.nanmax(dsm_matrix[valid])):.2f} m MSL`")
                            st.write(f"**Pit Floor Elevation:** `{float(np.nanmin(dsm_matrix[valid])):.2f} m MSL`")

                        dossier = pd.DataFrame([{
                            "Survey Target": survey_mode,
                            "Boundary Used": chosen_boundary_label,
                            "Material": selected_mineral,
                            "Bulk Density (T/m3)": density_val,
                            "Footprint Area (m2)": round(footprint, 2),
                            "Calculated Volume (m3)": round(target_vol, 2),
                            "Tonnage (Tonnes)": round(tonnage, 2),
                            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        }])
                        st.download_button(
                            label="Download Certified CSV Volumetric Report",
                            data=dossier.to_csv(index=False).encode('utf-8'),
                            file_name="excavation_volumetric_report.csv",
                            mime="text/csv"
                        )
            except Exception as ex:
                st.error(f"Computation error: {ex}")
    else:
        st.info("Select an uploaded excavation boundary or draw a polygon on the map.")
