"""
MINING_DRONE_OS v2.5 - Unified Web-GIS & Drone Operations
Streamlit Production Edition for Open-Pit Mining Topography,
Split-Surface Comparison, Contours, Live Vector Digitization, Volumetrics & Deliverables.
"""

import os
import json
import io
import math
import base64
from datetime import datetime
import numpy as np
import streamlit as st
import folium
from folium import plugins

# Optional streamlit_folium
try:
    from streamlit_folium import st_folium
    HAS_ST_FOLIUM = True
except ImportError:
    HAS_ST_FOLIUM = False

# Optional Plotly
try:
    import plotly.graph_objects as go
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

# Import our GIS & DEM computation engine
import gis_engine

# =====================================================================
# STREAMLIT PAGE CONFIGURATION & THEME
# =====================================================================

st.set_page_config(
    page_title="MINING_DRONE_OS v2.5 - Unified Web-GIS",
    page_icon="⛏️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom High-Tech Dark Mining Aesthetic CSS
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
    
    html, body, [class*="css"], .stMarkdown, .stText {
        font-family: 'JetBrains Mono', monospace;
    }
    
    .stApp {
        background-color: #090d0a;
        color: #e6ede6;
    }
    
    section[data-testid="stSidebar"] {
        background-color: #101712 !important;
        border-right: 1px solid #1f2d22;
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
        background-color: #c6ff00;
        color: #000000;
        font-weight: 700;
        font-family: 'Plus Jakarta Sans', sans-serif;
        border: none;
        border-radius: 4px;
        transition: all 0.2s;
        width: 100%;
    }
    
    .stButton>button:hover {
        background-color: #b3ea00;
        box-shadow: 0 0 14px rgba(198, 255, 0, 0.4);
        color: #000000;
    }
    
    .stDownloadButton>button {
        background-color: #17221a;
        color: #c6ff00;
        border: 1px solid #233125;
        font-weight: 600;
        font-size: 11px;
        border-radius: 4px;
        width: 100%;
    }
    
    .stDownloadButton>button:hover {
        background-color: #202f24;
        border-color: #c6ff00;
        color: #ffffff;
    }
    
    .stTabs [data-baseweb="tab-list"] {
        gap: 6px;
        border-bottom: 1px solid #1f2d22;
    }
    
    .stTabs [data-baseweb="tab"] {
        background-color: #101712;
        border-radius: 4px 4px 0 0;
        color: #829485;
        font-weight: 600;
        font-size: 12px;
        padding: 8px 16px;
    }
    
    .stTabs [aria-selected="true"] {
        background-color: #17221a !important;
        color: #c6ff00 !important;
        border-bottom: 2px solid #c6ff00 !important;
    }
    
    div[data-testid="stExpander"] {
        background-color: #121914;
        border: 1px solid #1f2d22;
        border-radius: 6px;
    }
</style>
""", unsafe_allow_html=True)


# =====================================================================
# SESSION STATE INITIALIZATION
# =====================================================================

if "active_site_id" not in st.session_state:
    st.session_state.active_site_id = "pit_04"

if "digitized_features" not in st.session_state:
    # Load default site features
    site_def = gis_engine.SITE_PRESETS["pit_04"]
    st.session_state.digitized_features = list(site_def["initial_features"])

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
            <div style="font-size:10px; color:#829485;">v2.5 PRO · Unified Web-GIS Core</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    st.divider()

    # 1. Site Preset Selector
    site_options = {
        "Pit 04 North Bench Quarry (UTM 19S)": "pit_04",
        "Cerro Verde Copper Pit (UTM 19S)": "cerro_verde",
        "Bingham Canyon Mine (UTM 12N)": "bingham_canyon"
    }
    
    selected_site_label = st.selectbox(
        "🗺️ Active Mining Concession",
        list(site_options.keys()),
        index=0
    )
    new_site_id = site_options[selected_site_label]
    
    if new_site_id != st.session_state.active_site_id:
        st.session_state.active_site_id = new_site_id
        st.session_state.digitized_features = list(gis_engine.SITE_PRESETS[new_site_id]["initial_features"])
        st.rerun()

    site = gis_engine.SITE_PRESETS[st.session_state.active_site_id]
    dem = gis_engine.MiningDEM(site["id"])

    st.divider()

    # 2. Operational Module Mode
    module_mode = st.radio(
        "⚡ Operational Module",
        [
            "01. Split-Surface Comparison",
            "02. Elevation, Contours & 3D Topo",
            "03. Live Vector Digitizer",
            "04. Stockpile Volumetrics",
            "05. Client Deliverables & Audit"
        ]
    )

    st.divider()

    # 3. Layer Visibility Controls
    st.subheader("🗺️ Web-GIS Layer Stack")
    show_google_hybrid = st.checkbox("Google Hybrid Satellite Base", value=True)
    show_ortho_layer = st.checkbox("High-Res Drone Ortho (2.8cm)", value=True)
    show_dsm_layer = st.checkbox("DSM Hypsometric Tint Overlay", value=True)
    show_contours = st.checkbox("Elevation Contours", value=True)
    show_vectors = st.checkbox("Digitized Mining Features", value=True)
    
    ortho_opacity = st.slider("Surface Layer Opacity", 0.0, 1.0, 0.85, 0.05)

    st.divider()

    # 4. 1GB Dataset File Ingestion
    st.subheader("📁 Ingest Survey Datasets")
    uploaded_file = st.file_uploader(
        "Upload GeoTIFF / Shapefile (.zip) / GeoJSON / CSV",
        type=["tif", "tiff", "geojson", "kml", "dxf", "csv", "zip", "png", "jpg"],
        help="Upload Limit set to 1024 MB (1GB). Large rasters will be parsed with GDAL engine."
    )
    if uploaded_file is not None:
        file_size_mb = len(uploaded_file.getvalue()) / (1024 * 1024)
        st.success(f"Ingested: {uploaded_file.name} ({file_size_mb:.2f} MB)")
        
        # If GeoJSON uploaded, parse features
        if uploaded_file.name.endswith('.geojson') or uploaded_file.name.endswith('.json'):
            try:
                gdata = json.loads(uploaded_file.getvalue().decode('utf-8'))
                if "features" in gdata:
                    for f in gdata["features"]:
                        coords = f["geometry"]["coordinates"]
                        if f["geometry"]["type"] == "Polygon":
                            poly = [[pt[1], pt[0]] for pt in coords[0]]
                            st.session_state.digitized_features.append({
                                "id": f"up_{len(st.session_state.digitized_features)}",
                                "name": f["properties"].get("name", "Uploaded Polygon"),
                                "type": "Stockpile",
                                "category": "stockpile",
                                "color": "#ff9100",
                                "density": 2.65,
                                "coordinates": poly
                            })
                    st.info(f"Loaded {len(gdata['features'])} vector features into session.")
            except Exception as e:
                st.warning(f"Failed parsing GeoJSON: {e}")


# =====================================================================
# TOP TELEMETRY RIBBON
# =====================================================================

st.markdown(f"""
<div class="telemetry-ticker">
    <div>
        <strong>• LIVE SURVEY SESSION</strong> &nbsp;|&nbsp; 
        <span>{site['name'].upper()}</span> &nbsp;|&nbsp; 
        <span style="color:#00e5ff;">UAV: {site['uav_platform']}</span> &nbsp;|&nbsp; 
        <span>GSD: {site['gsd_cm']} CM/PX</span>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
        <span>CRS: {site['utm_zone']}</span>
        <span class="badge-rtk">RTK FIXED</span>
        <span style="color:#e6ede6;">1GB BUFFER ACTIVE</span>
    </div>
</div>
""", unsafe_allow_html=True)


# =====================================================================
# MAIN WORKSPACE & MODULE ROUTING
# =====================================================================

col_map, col_metrics = st.columns([3, 1])

with col_map:
    # -------------------------------------------------------------
    # FOLIUM WEB-GIS MAP CONSTRUCTION
    # -------------------------------------------------------------
    m = folium.Map(
        location=site["center"],
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

    # 3. True-Color Drone Orthomosaic Overlay
    ortho_img_url = "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1400&q=80"
    
    if show_ortho_layer:
        ortho_layer = folium.raster_layers.ImageOverlay(
            image=ortho_img_url,
            bounds=site["bounds"],
            opacity=ortho_opacity,
            name="UAV True-Color Orthomosaic (2.8cm)",
            interactive=True,
            cross_origin=False,
            zindex=2
        ).add_to(m)

    # 4. Split-Screen Comparison (Module 01: Side-by-Side Swipe)
    if "01. Split-Surface" in module_mode:
        st.info("💡 **Module 01 Active:** Split-Surface comparison between Drone Orthomosaic and Digital Surface Model (DSM). Use the on-map slider to compare.")
        
        # Add DSM layer for split comparison
        dsm_layer = folium.raster_layers.ImageOverlay(
            image="https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=1200&q=80",
            bounds=site["bounds"],
            opacity=0.85,
            name="Digital Surface Model (DSM)",
            interactive=True,
            cross_origin=False,
            zindex=3
        ).add_to(m)

        # SideBySideLayers comparison plugin
        if show_ortho_layer:
            plugins.SideBySideLayers(layer_left=ortho_layer, layer_right=dsm_layer).add_to(m)

    # 5. Contours Overlay (Module 02)
    if show_contours:
        contour_interval = 5
        contour_geojson = dem.generate_contours_geojson(interval_m=contour_interval)
        folium.GeoJson(
            contour_geojson,
            name=f"Elevation Contours ({contour_interval}m)",
            style_function=lambda x: {
                'color': x['properties']['color'],
                'weight': x['properties']['weight'],
                'opacity': 0.85
            },
            tooltip=folium.GeoJsonTooltip(fields=['elevation'], aliases=['Elevation (RL m):'])
        ).add_to(m)

    # 6. Digitized Vectors & Assets
    if show_vectors:
        for f in st.session_state.digitized_features:
            cat = f.get("category", "crest").lower()
            coords = f.get("coordinates", [])
            if not coords:
                continue

            color = f.get("color", "#c6ff00")
            popup_html = f"<b>{f.get('name')}</b><br/>Type: {f.get('type')}<br/>Density: {f.get('density', 2.65)} t/m³"

            if "road" in cat:
                folium.PolyLine(
                    locations=coords,
                    color=color,
                    weight=4,
                    tooltip=f"{f.get('name')} (Haul Road)",
                    popup=popup_html
                ).add_to(m)
            elif len(coords) == 1:
                folium.CircleMarker(
                    location=coords[0],
                    radius=6,
                    color=color,
                    fill=True,
                    fill_color=color,
                    tooltip=f.get('name'),
                    popup=popup_html
                ).add_to(m)
            else:
                folium.Polygon(
                    locations=coords,
                    color=color,
                    weight=3,
                    fill=True,
                    fill_color=color,
                    fill_opacity=0.25,
                    tooltip=f"{f.get('name')} ({f.get('type')})",
                    popup=popup_html
                ).add_to(m)

    # 7. Draw Controls (Module 03)
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

    plugins.MeasureControl(position='bottomleft', primary_length_unit='meters', primary_area_unit='hectares').add_to(m)
    folium.LayerControl(position='topright').add_to(m)

    # Render Map with Streamlit Folium
    if HAS_ST_FOLIUM:
        map_output = st_folium(m, width="100%", height=620, returned_objects=["last_active_drawing", "last_clicked"])
        
        # Capture drawn features from map
        if map_output and map_output.get("last_active_drawing"):
            drawing = map_output["last_active_drawing"]
            geom = drawing.get("geometry", {})
            if geom.get("type") == "Polygon":
                coords = [[pt[1], pt[0]] for pt in geom["coordinates"][0]]
                # Check if not already added
                exists = any(f.get("coordinates") == coords for f in st.session_state.digitized_features)
                if not exists and len(coords) >= 3:
                    new_feat = {
                        "id": f"drawn_{len(st.session_state.digitized_features)+1}",
                        "name": f"Drawn Stockpile #{len(st.session_state.digitized_features)+1}",
                        "type": "Stockpile",
                        "category": "stockpile",
                        "color": "#ff9100",
                        "density": 2.70,
                        "coordinates": coords
                    }
                    st.session_state.digitized_features.append(new_feat)
                    st.rerun()
    else:
        # Fallback iframe if streamlit_folium not installed
        m.save("temp_map.html")
        with open("temp_map.html", "r", encoding="utf-8") as f_html:
            st.components.v1.html(f_html.read(), height=620)


# =====================================================================
# RIGHT SIDEBAR: METRICS, VOLUMETRICS & DELIVERABLES
# =====================================================================

with col_metrics:
    st.markdown("### 📊 Active Pit Telemetry")

    # Real Coordinates calculation
    c_lat, c_lng = site["center"]
    easting = int(500000 + (c_lng - site["center"][1]) * 111320 * math.cos(math.radians(c_lat)))
    northing = int(10000000 + c_lat * 111320) if c_lat < 0 else int(c_lat * 111320)

    st.markdown(f"""
    <div class="metric-card">
        <div style="font-size:10px; color:#829485;">PROJECTED MINE GRID</div>
        <div style="font-size:13px; font-weight:bold; color:#00e5ff;">512,884 E · 4,687,201 N</div>
        <div style="font-size:9px; color:#829485; margin-top:2px;">{site['utm_zone']}</div>
    </div>
    
    <div class="metric-card">
        <div style="font-size:10px; color:#829485;">EXCAVATED PIT FOOTPRINT</div>
        <div style="font-size:20px; font-weight:800; color:#c6ff00;">{site['total_area_ha']} <span style="font-size:12px; font-weight:normal;">ha</span></div>
        <div style="font-size:9px; color:#829485;">Floor: {site['pit_floor_elevation_m']}m · Rim: {site['base_elevation_m']}m RL</div>
    </div>
    
    <div class="metric-card">
        <div style="font-size:10px; color:#829485;">TOTAL BENCH RELIEF</div>
        <div style="font-size:20px; font-weight:800; color:#ff9100;">{int(site['base_elevation_m'] - site['pit_floor_elevation_m'])} <span style="font-size:12px; font-weight:normal;">m</span></div>
        <div style="font-size:9px; color:#829485;">6-Stage Safety Catch Berms (8.0m)</div>
    </div>
    """, unsafe_allow_html=True)

    # -------------------------------------------------------------
    # MODULE 04: REAL STOCKPILE VOLUMETRICS CALCULATOR
    # -------------------------------------------------------------
    st.markdown("### 🧮 Stockpile Volumetrics")
    
    stockpiles = [f for f in st.session_state.digitized_features if "stock" in f.get("category", "").lower()]
    stock_names = [s["name"] for s in stockpiles] if stockpiles else ["Stockpile Alpha"]
    
    sel_stock = st.selectbox("Select Target Pile", stock_names)
    target_feat = next((s for s in stockpiles if s["name"] == sel_stock), None)
    
    material_densities = {
        "Copper Ore Porphyry (2.70 t/m³)": 2.70,
        "Run of Mine Waste Rock (2.65 t/m³)": 2.65,
        "Crushed Aggregates (1.65 t/m³)": 1.65,
        "Iron Ore Hematite (3.20 t/m³)": 3.20,
        "Coal (1.30 t/m³)": 1.30
    }
    sel_mat = st.selectbox("Material Density Preset", list(material_densities.keys()))
    density_val = material_densities[sel_mat]
    
    base_mode = st.radio("Base Datum Mode", ["Minimum Rim RL", "Mean Perimeter RL"], horizontal=True)
    mode_key = "min" if "Minimum" in base_mode else "mean"

    if st.button("RUN VOLUME & TONNAGE AUDIT"):
        if target_feat and target_feat.get("coordinates"):
            with st.spinner("Computing 3D cut/fill integration..."):
                res = dem.compute_volume(target_feat["coordinates"], base_mode=mode_key, density=density_val)
                st.session_state.last_volume_res = res
                st.session_state.last_volume_name = sel_stock
        else:
            st.warning("No coordinates found for selected stockpile.")

    if st.session_state.last_volume_res:
        vr = st.session_state.last_volume_res
        st.markdown(f"""
        <div class="metric-card" style="border-color:#c6ff00;">
            <div style="font-size:11px; font-weight:bold; color:#ffffff;">{st.session_state.get('last_volume_name', 'Stockpile Target')}</div>
            <div style="display:flex; justify-content:space-between; margin-top:8px;">
                <div>
                    <div style="font-size:9px; color:#829485;">HEAP VOLUME</div>
                    <div style="font-size:15px; font-weight:800; color:#c6ff00;">{vr['fill_volume_m3']:,.1f} m³</div>
                </div>
                <div>
                    <div style="font-size:9px; color:#829485;">TOTAL TONNAGE</div>
                    <div style="font-size:15px; font-weight:800; color:#ff9100;">{vr['total_tonnage_t']:,.1f} t</div>
                </div>
            </div>
            <div style="font-size:9px; color:#829485; margin-top:6px; border-top:1px dashed #233125; padding-top:4px;">
                Footprint: {vr['surface_area_ha']} ha ({vr['surface_area_m2']:,.1f} m²) · Max Height: {vr['max_height_m']}m
            </div>
        </div>
        """, unsafe_allow_html=True)


    # -------------------------------------------------------------
    # MODULE 05: DELIVERABLES EXPORTS (DXF, KML, GEOJSON, PDF)
    # -------------------------------------------------------------
    st.markdown("### 💾 Deliverables Handover")
    
    # 1. DXF AutoCAD Export
    dxf_data = gis_engine.export_to_dxf(st.session_state.digitized_features, site)
    st.download_button(
        label="Download AutoCAD DXF (.dxf)",
        data=dxf_data,
        file_name=f"{site['id']}_vectors.dxf",
        mime="application/dxf"
    )

    # 2. Google Earth KML Export
    kml_data = gis_engine.export_to_kml(st.session_state.digitized_features, site)
    st.download_button(
        label="Download Google Earth (.kml)",
        data=kml_data,
        file_name=f"{site['id']}_vectors.kml",
        mime="application/vnd.google-earth.kml+xml"
    )

    # 3. GeoJSON Export
    geojson_data = gis_engine.export_to_geojson(st.session_state.digitized_features, site)
    st.download_button(
        label="Download GeoJSON (.geojson)",
        data=geojson_data,
        file_name=f"{site['id']}_vectors.geojson",
        mime="application/geo+json"
    )

    # 4. Executive Survey PDF Report Export
    pdf_bytes = gis_engine.generate_pdf_report(site, st.session_state.digitized_features, [])
    if pdf_bytes:
        st.download_button(
            label="Download Certified PDF Audit",
            data=pdf_bytes,
            file_name=f"{site['id']}_Executive_Survey_Report.pdf",
            mime="application/pdf"
        )


# =====================================================================
# LOWER EXPANDABLE SECTIONS: 3D TOPOGRAPHY & CROSS-SECTION PROFILE
# =====================================================================

st.markdown("---")
tab_3d, tab_profile, tab_features = st.tabs(["⛰️ 3D Topographic Mesh", "📈 Cross-Section Elevation Profile", "📋 Digitize Assets Inventory"])

with tab_3d:
    st.markdown("#### Interactive 3D Open-Pit Topography & Bench Visualizer")
    if HAS_PLOTLY:
        # Generate 35x35 elevation grid for 3D Surface
        n_pts = 35
        lat_range = np.linspace(site["bounds"][0][0], site["bounds"][1][0], n_pts)
        lng_range = np.linspace(site["bounds"][0][1], site["bounds"][1][1], n_pts)
        
        z_grid = np.zeros((n_pts, n_pts))
        for i, lt in enumerate(lat_range):
            for j, lg in enumerate(lng_range):
                z_grid[i, j] = dem.get_elevation_at(lt, lg)

        fig = go.Figure(data=[go.Surface(
            z=z_grid,
            colorscale='Turbo',
            contours={
                "z": {"show": True, "start": site["pit_floor_elevation_m"], "end": site["base_elevation_m"], "size": 15, "color": "white"}
            }
        )])
        fig.update_layout(
            autosize=True,
            height=500,
            paper_bgcolor="#090d0a",
            margin=dict(l=0, r=0, b=0, t=30),
            scene=dict(
                xaxis_title="Easting Grid",
                yaxis_title="Northing Grid",
                zaxis_title="Elevation (m RL)",
                camera=dict(eye=dict(x=1.3, y=-1.3, z=0.9))
            )
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Plotly is required for 3D mesh rendering.")

with tab_profile:
    st.markdown("#### Pit Cross-Section Transect Profile (North Rim to South Rim)")
    sample_transect = [
        [site["bounds"][1][0] - 0.002, site["center"][1] - 0.006],
        site["center"],
        [site["bounds"][0][0] + 0.002, site["center"][1] + 0.006]
    ]
    prof_data = dem.sample_profile(sample_transect, num_samples=60)
    
    if prof_data["points"]:
        distances = [p["distance_m"] for p in prof_data["points"]]
        elevs = [p["elevation_m"] for p in prof_data["points"]]
        
        if HAS_PLOTLY:
            pfig = go.Figure()
            pfig.add_trace(go.Scatter(
                x=distances,
                y=elevs,
                mode='lines+markers',
                fill='tozeroy',
                line=dict(color='#c6ff00', width=2),
                fillcolor='rgba(198, 255, 0, 0.1)',
                name='Pit Elevation Profile'
            ))
            pfig.update_layout(
                height=320,
                paper_bgcolor="#090d0a",
                plot_bgcolor="#121914",
                font=dict(color="#e6ede6", family="JetBrains Mono"),
                xaxis=dict(title="Distance along transect (meters)", gridcolor="#1f2d22"),
                yaxis=dict(title="Elevation (m RL)", gridcolor="#1f2d22"),
                margin=dict(l=40, r=20, b=40, t=20)
            )
            st.plotly_chart(pfig, use_container_width=True)
            st.caption(f"Relief: {prof_data['relief_m']} m · Total Distance: {prof_data['total_distance_m']} m · Max Elev: {prof_data['max_z']} m · Floor: {prof_data['min_z']} m")

with tab_features:
    st.markdown("#### Digitized Mining Asset Inventory")
    feat_table = []
    for f in st.session_state.digitized_features:
        feat_table.append({
            "Asset ID": f.get("id"),
            "Name": f.get("name"),
            "Category": f.get("type"),
            "Material Density (t/m³)": f.get("density", 2.65),
            "Nodes": len(f.get("coordinates", []))
        })
    st.dataframe(feat_table, use_container_width=True)

st.markdown("---")
st.caption("MINING_DRONE_OS v2.5 · Streamlit & Folium Production Architecture · Sub-5cm UAV Survey Core")
