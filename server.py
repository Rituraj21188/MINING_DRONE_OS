"""
MINING_DRONE_OS - High Performance Web-GIS Application Server
Multi-threaded HTTP server handling static asset delivery, REST APIs,
GDAL raster ingestion, elevation queries, cut/fill volumetrics, and GIS export dispatch.
"""

import sys
import os
import math
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
import traceback

import gis_engine

PORT = 8050
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""
    daemon_threads = True


class MiningDroneHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 1. API Status
        if path == "/api/status":
            self.send_json_response({
                "status": "online",
                "version": "2.5.0",
                "server": "MINING_DRONE_OS Unified Server",
                "gdal_available": gis_engine.HAS_GDAL,
                "pyproj_available": gis_engine.HAS_PYPROJ,
                "reportlab_available": gis_engine.HAS_REPORTLAB,
                "site_count": len(gis_engine.SITE_PRESETS)
            })
            return

        # 2. Site Presets
        elif path == "/api/sites":
            self.send_json_response({
                "sites": gis_engine.SITE_PRESETS
            })
            return

        # 3. Elevation Query
        elif path == "/api/elevation":
            site_id = query.get("site", ["pit_04"])[0]
            try:
                lat = float(query.get("lat", [0])[0])
                lng = float(query.get("lng", [0])[0])
                dem = gis_engine.MiningDEM(site_id)
                elev = dem.get_elevation_at(lat, lng)
                
                # Approximate UTM Coordinates
                utm_x = round(500000 + (lng - dem.c_lng) * 111320.0 * math.cos(math.radians(lat)), 1)
                utm_y = round(10000000 + (lat - 0) * 111320.0 if lat < 0 else lat * 111320.0, 1)

                self.send_json_response({
                    "site_id": site_id,
                    "lat": lat,
                    "lng": lng,
                    "elevation_m": elev,
                    "utm_easting": utm_x,
                    "utm_northing": utm_y
                })
            except Exception as e:
                self.send_error_response(f"Invalid elevation query parameters: {str(e)}")
            return

        # 4. Contours GeoJSON
        elif path == "/api/contours":
            site_id = query.get("site", ["pit_04"])[0]
            try:
                interval = int(query.get("interval", [5])[0])
            except:
                interval = 5
            dem = gis_engine.MiningDEM(site_id)
            geojson_data = dem.generate_contours_geojson(interval_m=interval)
            self.send_json_response(geojson_data)
            return

        # Default static file serving from public/
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length)
        except Exception as e:
            self.send_error_response(f"Failed to read post data: {str(e)}")
            return

        # Handle multipart file uploads (1GB datasets)
        if path == "/api/upload":
            self.handle_file_upload(post_body)
            return

        # Otherwise parse JSON payload
        try:
            payload = json.loads(post_body.decode('utf-8')) if post_body else {}
        except Exception as e:
            self.send_error_response(f"Malformed JSON: {str(e)}")
            return

        # 1. Elevation Profile
        if path == "/api/profile":
            site_id = payload.get("site", "pit_04")
            coords = payload.get("coordinates", [])
            dem = gis_engine.MiningDEM(site_id)
            result = dem.sample_profile(coords, num_samples=80)
            self.send_json_response(result)
            return

        # 2. Stockpile Volume Cut/Fill
        elif path == "/api/volume":
            site_id = payload.get("site", "pit_04")
            coords = payload.get("coordinates", [])
            base_mode = payload.get("base_mode", "min")
            custom_datum = payload.get("custom_datum", None)
            density = float(payload.get("density", 2.65))
            dem = gis_engine.MiningDEM(site_id)
            result = dem.compute_volume(coords, base_mode=base_mode, custom_datum=custom_datum, density=density)
            self.send_json_response(result)
            return

        # 3. Export DXF
        elif path == "/api/export/dxf":
            site_info = payload.get("site", gis_engine.SITE_PRESETS["pit_04"])
            features = payload.get("features", [])
            dxf_content = gis_engine.export_to_dxf(features, site_info)
            
            filename = f"{site_info.get('id', 'mine')}_survey_vectors.dxf"
            self.send_response(200)
            self.send_header('Content-Type', 'application/dxf')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', str(len(dxf_content.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(dxf_content.encode('utf-8'))
            return

        # 4. Export KML
        elif path == "/api/export/kml":
            site_info = payload.get("site", gis_engine.SITE_PRESETS["pit_04"])
            features = payload.get("features", [])
            kml_content = gis_engine.export_to_kml(features, site_info)
            
            filename = f"{site_info.get('id', 'mine')}_survey_vectors.kml"
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.google-earth.kml+xml')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', str(len(kml_content.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(kml_content.encode('utf-8'))
            return

        # 5. Export GeoJSON
        elif path == "/api/export/geojson":
            site_info = payload.get("site", gis_engine.SITE_PRESETS["pit_04"])
            features = payload.get("features", [])
            geojson_content = gis_engine.export_to_geojson(features, site_info)
            
            filename = f"{site_info.get('id', 'mine')}_survey_vectors.geojson"
            self.send_response(200)
            self.send_header('Content-Type', 'application/geo+json')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', str(len(geojson_content.encode('utf-8'))))
            self.end_headers()
            self.wfile.write(geojson_content.encode('utf-8'))
            return

        # 6. Export Client Survey PDF Report
        elif path == "/api/export/pdf_report":
            site_info = payload.get("site", gis_engine.SITE_PRESETS["pit_04"])
            features = payload.get("features", [])
            pdf_bytes = gis_engine.generate_pdf_report(site_info, features, [])
            
            if not pdf_bytes:
                self.send_error_response("PDF generation library is not configured.")
                return

            filename = f"{site_info.get('id', 'mine')}_Executive_Survey_Report.pdf"
            self.send_response(200)
            self.send_header('Content-Type', 'application/pdf')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', str(len(pdf_bytes)))
            self.end_headers()
            self.wfile.write(pdf_bytes)
            return

        else:
            self.send_error_response("Endpoint not found", code=404)

    def handle_file_upload(self, raw_data):
        """
        Parses uploaded file (GeoTIFF, GeoJSON, KML, CSV) and extracts geoinformation.
        """
        try:
            content_type = self.headers.get('Content-Type', '')
            if 'boundary=' not in content_type:
                # Direct binary or text
                filename = "uploaded_dataset.bin"
                file_bytes = raw_data
            else:
                boundary = content_type.split('boundary=')[1].strip().encode('utf-8')
                parts = raw_data.split(boundary)
                file_bytes = None
                filename = "uploaded_file"
                for part in parts:
                    if b'filename="' in part:
                        headers_part, body_part = part.split(b'\r\n\r\n', 1)
                        # Remove trailing \r\n--
                        body_part = body_part.rstrip(b'\r\n-')
                        # Extract filename
                        h_str = headers_part.decode('latin1')
                        fn_idx = h_str.find('filename="')
                        if fn_idx != -1:
                            fn_end = h_str.find('"', fn_idx + 10)
                            filename = h_str[fn_idx + 10:fn_end]
                        file_bytes = body_part
                        break

            if not file_bytes:
                self.send_error_response("No file data received.")
                return

            save_path = os.path.join(UPLOAD_DIR, filename)
            with open(save_path, "wb") as f:
                f.write(file_bytes)

            file_size_mb = round(len(file_bytes) / (1024 * 1024), 2)
            ext = os.path.splitext(filename)[1].lower()

            response_data = {
                "success": True,
                "filename": filename,
                "size_mb": file_size_mb,
                "extension": ext,
                "message": f"Successfully ingested {filename} ({file_size_mb} MB)"
            }

            # Check if GeoTIFF
            if ext in ['.tif', '.tiff'] and gis_engine.HAS_GDAL:
                try:
                    ds = gis_engine.gdal.Open(save_path)
                    if ds:
                        gt = ds.GetGeoTransform()
                        width = ds.RasterXSize
                        height = ds.RasterYSize
                        min_x = gt[0]
                        max_y = gt[3]
                        max_x = min_x + gt[1] * width
                        min_y = max_y + gt[5] * height
                        response_data["raster_meta"] = {
                            "width": width,
                            "height": height,
                            "bands": ds.RasterCount,
                            "bounds": [[min_y, min_x], [max_y, max_x]]
                        }
                        ds = None
                except Exception as ex:
                    response_data["gdal_warning"] = str(ex)

            # Check if GeoJSON
            elif ext in ['.geojson', '.json']:
                try:
                    geojson_obj = json.loads(file_bytes.decode('utf-8'))
                    response_data["geojson"] = geojson_obj
                except Exception as ex:
                    response_data["json_warning"] = str(ex)

            # Check if CSV (Borehole / GCP coordinates)
            elif ext == '.csv':
                try:
                    lines = file_bytes.decode('utf-8', errors='ignore').strip().split('\n')
                    pts = []
                    for line in lines[1:]:
                        parts = [p.strip() for p in line.split(',')]
                        if len(parts) >= 3:
                            pts.append({
                                "id": parts[0],
                                "east": float(parts[1]),
                                "north": float(parts[2]),
                                "elev": float(parts[3]) if len(parts) > 3 else 0.0
                            })
                    response_data["csv_points"] = pts[:100]
                    response_data["csv_total_points"] = len(pts)
                except Exception as ex:
                    response_data["csv_warning"] = str(ex)

            self.send_json_response(response_data)

        except Exception as e:
            traceback.print_exc()
            self.send_error_response(f"Upload processing failed: {str(e)}")

    def send_json_response(self, data, code=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_response(self, message, code=400):
        body = json.dumps({"error": message, "success": False}).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run_server():
    server_address = ('', PORT)
    httpd = ThreadedHTTPServer(server_address, MiningDroneHandler)
    print(f"=" * 60)
    print(f" MINING_DRONE_OS v2.5 - Unified Web-GIS Server")
    print(f" Active Port: http://localhost:{PORT}")
    print(f" GDAL Available: {gis_engine.HAS_GDAL}")
    print(f" ReportLab PDF: {gis_engine.HAS_REPORTLAB}")
    print(f" Web Root: {PUBLIC_DIR}")
    print(f"=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
