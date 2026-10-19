import streamlit as st
import folium
from folium import plugins
from streamlit_folium import st_folium
import json
import base64
import numpy as np

# Page configuration
st.set_page_config(
    page_title="MINING_DRONE_OS v2.0 - Unified Web-GIS",
    page_icon="⛏️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling for Mining & Drone OS aesthetic
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'JetBrains Mono', monospace;
    }
    
    .stApp {
        background-color: #0b0f0c;
        color: #e8f0e8;
    }
    
    .css-1d391kg {
        background-color: #121914;
    }
    
    .metric-card {
        background-color: #141b16;
        border: 1px solid #233125;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 10px;
    }
    
    .telemetry-ticker {
        background-color: #070908;
        border: 1px solid #1a241c;
        padding: 6px 12px;
        font-size: 11px;
        color: #c6ff00;
        margin-bottom: 12px;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
    }
    
    .stButton>button {
        background-color: #c6ff00;
        color: #000000;
        font-weight: 700;
        border: none;
        border-radius: 4px;
    }
    
    .stButton>button:hover {
        background-color: #b0e600;
        color: #000000;
    }
</style>
""", unsafe_allow_html=True)

# Top Bar Telemetry Ticker
st.markdown("""
<div class="telemetry-ticker">
    <span>• LIVE SESSION · PIT 04 NORTH BENCH &nbsp;|&nbsp; SRC UAV-04 · 2.8 CM GSD</span>
    <span>EPSG:32646 (UTM 46N) &nbsp;|&nbsp; GOOGLE HYBRID SATELLITE: ACTIVE &nbsp;|&nbsp; 1GB CACHE BUFFER</span>
</div>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=400&q=80", caption="MINING_DRONE_OS v2.0")
    st.title("MINING_DRONE_OS")
    st.caption("Unified Web-GIS & Drone Operations for Mining")
    
    st.divider()
    
    # 1GB File Uploader
    st.subheader("📁 1GB Dataset Ingestion")
    uploaded_file = st.file_uploader(
        "Upload Orthomosaic / GeoTIFF / Shapefile",
        type=["tif", "tiff", "png", "jpg", "jpeg", "geojson", "kml", "dxf", "zip"],
        help="Upload Limit set to 1024 MB (1GB). Large rasters will be georeferenced to Google Hybrid Satellite."
    )
    
    # Mining Site Presets
    site_preset = st.selectbox(
        "Mining Survey Site",
        ["Pit 04 North Bench Quarry (UTM 46N)", "Cerro Verde Copper Pit (UTM 19S)", "Bingham Canyon Mine (UTM 12N)"]
    )
    
    # Coordinates mapping
    if "Pit 04" in site_preset:
        center_lat, center_lng = -23.864, -69.142
        default_bounds = [[-23.872, -69.155], [-23.856, -69.129]]
    elif "Cerro Verde" in site_preset:
        center_lat, center_lng = -16.536, -71.564
        default_bounds = [[-16.545, -71.575], [-16.527, -71.553]]
    else:
        center_lat, center_lng = 40.522, -112.151
        default_bounds = [[40.510, -112.165], [40.534, -112.137]]

    st.divider()
    
    # Module Mode Selector
    module_mode = st.radio(
        "Active Operational Module",
        ["Module 01: Split-Surface Viewer", "Module 02: Elevation & Contours", "Module 03: Live .shp Digitization"]
    )
    
    # Layer controls
    st.subheader("🗺️ Map & Layer Controls")
    show_google_hybrid = st.checkbox("Google Hybrid Satellite Base", value=True)
    show_ortho_overlay = st.checkbox("Georeferenced Drone Ortho", value=True)
    show_contours = st.checkbox("Elevation Contours (5m)", value=True)
    show_vectors = st.checkbox("Digitized Shapefile Vectors", value=True)
    
    ortho_opacity = st.slider("Orthomosaic Opacity", 0.0, 1.0, 0.85, 0.05)
    
    if "Module 01" in module_mode:
        split_pos = st.slider("Split Screen Divider", 0, 100, 50, 5)

# Main Folium Map
m = folium.Map(
    location=[center_lat, center_lng],
    zoom_start=15,
    max_zoom=21,
    tiles=None,
    control_scale=True
)

# 1. Google Hybrid Satellite Layer
if show_google_hybrid:
    folium.TileLayer(
        tiles="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        attr="Google Hybrid Satellite / Google Maps",
        name="Google Hybrid Satellite",
        max_zoom=21,
        overlay=False,
        control=True
    ).add_to(m)

# 2. Esri World Imagery fallback
folium.TileLayer(
    tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr="Esri World Imagery",
    name="Esri Satellite",
    max_zoom=19,
    overlay=False,
    control=True
).add_to(m)

# 3. Georeferenced Drone Orthomosaic Overlay
if show_ortho_overlay:
    ortho_img_url = "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80"
    
    if uploaded_file is not None and uploaded_file.type.startswith("image/"):
        bytes_data = uploaded_file.getvalue()
        base64_data = base64.b64encode(bytes_data).decode()
        ortho_img_url = f"data:{uploaded_file.type};base64,{base64_data}"
        st.success(f"Loaded uploaded orthomosaic: {uploaded_file.name} ({len(bytes_data)/1024/1024:.2f} MB)")

    folium.raster_layers.ImageOverlay(
        image=ortho_img_url,
        bounds=default_bounds,
        opacity=ortho_opacity,
        name="Uploaded Pit Orthomosaic",
        interactive=True,
        cross_origin=False,
        zindex=2
    ).add_to(m)

# 4. Vector Drawing Tools (Polygon, Polyline, Marker)
if show_vectors:
    draw_options = {
        'polyline': True,
        'polygon': True,
        'rectangle': True,
        'circle': False,
        'marker': True,
        'circlemarker': False
    }
    plugins.Draw(
        export=True,
        filename='mining_vectors.geojson',
        position='topleft',
        draw_options=draw_options
    ).add_to(m)

    # Initial Pit 04 Boundary Polygon
    pit_poly = [
        [center_lat + 0.004, center_lng - 0.006],
        [center_lat + 0.006, center_lng + 0.001],
        [center_lat + 0.003, center_lng + 0.007],
        [center_lat - 0.003, center_lng + 0.005],
        [center_lat - 0.005, center_lng - 0.002],
        [center_lat - 0.002, center_lng - 0.007]
    ]
    folium.Polygon(
        locations=pit_poly,
        color="#c6ff00",
        weight=3,
        fill=True,
        fill_color="#c6ff00",
        fill_opacity=0.2,
        tooltip="FID 012: Main Pit Perimeter (134.6 ha)",
        popup="<b>Feature:</b> PIT_BOUNDARY<br><b>Area:</b> 134.6 ha<br><b>UTM Zone:</b> 46N"
    ).add_to(m)

# 5. Measure & MiniMap Tools
plugins.MeasureControl(position='bottomleft', primary_length_unit='meters', primary_area_unit='hectares').add_to(m)
folium.LayerControl().add_to(m)

# Layout: Map on top, telemetry and attribute table on bottom
col_map, col_info = st.columns([3, 1])

with col_map:
    map_data = st_folium(m, width="100%", height=650)

with col_info:
    st.markdown("### 📊 Active Pit Telemetry")
    
    st.markdown("""
    <div class="metric-card">
        <div style="font-size:10px; color:#8e9f8f;">UTM COORDINATES</div>
        <div style="font-size:14px; font-weight:bold; color:#00e5ff;">512,884 E · 4,687,201 N</div>
        <div style="font-size:10px; color:#8e9f8f; margin-top:4px;">Zone 46N (EPSG:32646)</div>
    </div>
    <div class="metric-card">
        <div style="font-size:10px; color:#8e9f8f;">DIGITIZED PIT AREA</div>
        <div style="font-size:20px; font-weight:bold; color:#c6ff00;">134.6 <span style="font-size:12px;">ha</span></div>
        <div style="font-size:10px; color:#8e9f8f;">Perimeter: 2,840.4 m</div>
    </div>
    <div class="metric-card">
        <div style="font-size:10px; color:#8e9f8f;">STOCKPILE VOLUME CUT/FILL</div>
        <div style="font-size:20px; font-weight:bold; color:#ff9100;">4,850k <span style="font-size:12px;">m³</span></div>
        <div style="font-size:10px; color:#8e9f8f;">Max Elev: 1,842 m · Sump: 1,380 m</div>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("### 💾 Export Outputs")
    geojson_sample = json.dumps({"type": "FeatureCollection", "features": []}, indent=2)
    st.download_button(
        label="Download GeoJSON (.geojson)",
        data=geojson_sample,
        file_name="pit_04_vectors.geojson",
        mime="application/geo+json"
    )
    st.download_button(
        label="Download Google Earth (.kml)",
        data="<kml></kml>",
        file_name="pit_04_vectors.kml",
        mime="application/vnd.google-earth.kml+xml"
    )
    st.download_button(
        label="Download AutoCAD (.dxf)",
        data="0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n",
        file_name="pit_04_vectors.dxf",
        mime="application/dxf"
    )

st.markdown("---")
st.caption("MINING_DRONE_OS v2.0 · Streamlit & Leaflet Runtime · 1024MB Max Upload")
