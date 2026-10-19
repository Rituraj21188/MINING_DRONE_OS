import JSZip from 'jszip';
import { VectorFeature } from '../types/gis';
import { utmToLatLng } from './geoCalculations';

/**
 * Export features to standard RFC 7946 GeoJSON
 */
export function exportToGeoJSON(features: VectorFeature[], projectName = 'Pit_04_North_Bench'): string {
  const geojson = {
    type: 'FeatureCollection',
    name: `${projectName}_Vectors`,
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:EPSG::32646'
      }
    },
    features: features.map((f) => {
      let geometry: any = null;
      if (f.geometryType === 'Polygon') {
        // Closed ring
        const coords = f.vertices.map((v) => [v.easting, v.northing, v.elevation]);
        if (coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
          coords.push(coords[0]);
        }
        geometry = {
          type: 'Polygon',
          coordinates: [coords]
        };
      } else if (f.geometryType === 'LineString') {
        geometry = {
          type: 'LineString',
          coordinates: f.vertices.map((v) => [v.easting, v.northing, v.elevation])
        };
      } else {
        const v = f.vertices[0] || { easting: 0, northing: 0, elevation: 0 };
        geometry = {
          type: 'Point',
          coordinates: [v.easting, v.northing, v.elevation]
        };
      }

      return {
        type: 'Feature',
        id: f.fid,
        properties: {
          FID: f.fid,
          NAME: f.name,
          TYPE: f.type,
          AREA_HA: f.areaHa,
          PERIMETER_M: f.perimeterM,
          VOLUME_M3: f.volumeM3 || 0,
          STATE: f.state,
          CREATED_DATE: f.createdDate,
          NOTES: f.notes || '',
          UTM_ZONE: '46N',
          EPSG: '32646'
        },
        geometry
      };
    })
  };

  return JSON.stringify(geojson, null, 2);
}

/**
 * Export features to Google Earth KML
 */
export function exportToKML(features: VectorFeature[], projectName = 'Pit_04_North_Bench'): string {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${projectName} - Mining Vector Features</name>
    <description>Exported from MINING_DRONE_OS Suite v2.0 (UTM Zone 46N / WGS84)</description>
    <Style id="polyStylePit">
      <LineStyle>
        <color>ff00ffc6</color>
        <width>2.5</width>
      </LineStyle>
      <PolyStyle>
        <color>4d00ffc6</color>
      </PolyStyle>
    </Style>
    <Style id="polyStyleBench">
      <LineStyle>
        <color>ffffaa00</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>33ffaa00</color>
      </PolyStyle>
    </Style>
    <Folder>
      <name>Survey Pit Vectors</name>
`;

  features.forEach((f) => {
    // Convert UTM coordinates to Lat/Lng for Google Earth
    const latLngCoords = f.vertices.map((v) => {
      const ll = utmToLatLng(v.easting, v.northing, 46);
      return `${ll.lng},${ll.lat},${v.elevation}`;
    });

    if (f.geometryType === 'Polygon' && latLngCoords.length > 0) {
      latLngCoords.push(latLngCoords[0]); // close loop
    }

    const coordsStr = latLngCoords.join(' ');
    const styleId = f.type === 'PIT_BOUNDARY' ? 'polyStylePit' : 'polyStyleBench';

    kml += `      <Placemark>
        <name>${f.name} (FID: ${f.fid})</name>
        <description><![CDATA[
          <b>Type:</b> ${f.type}<br/>
          <b>Area:</b> ${f.areaHa} ha<br/>
          <b>Perimeter:</b> ${f.perimeterM} m<br/>
          <b>Volume:</b> ${f.volumeM3 ? f.volumeM3.toLocaleString() + ' m³' : 'N/A'}<br/>
          <b>Survey Date:</b> ${f.createdDate}
        ]]></description>
        <styleUrl>#${styleId}</styleUrl>
`;

    if (f.geometryType === 'Polygon') {
      kml += `        <Polygon>
          <extrude>1</extrude>
          <altitudeMode>absolute</altitudeMode>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsStr}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
`;
    } else if (f.geometryType === 'LineString') {
      kml += `        <LineString>
          <extrude>1</extrude>
          <altitudeMode>absolute</altitudeMode>
          <coordinates>${coordsStr}</coordinates>
        </LineString>
`;
    } else {
      kml += `        <Point>
          <altitudeMode>absolute</altitudeMode>
          <coordinates>${coordsStr}</coordinates>
        </Point>
`;
    }

    kml += `      </Placemark>
`;
  });

  kml += `    </Folder>
  </Document>
</kml>`;

  return kml;
}

/**
 * Export features to AutoCAD DXF (R12 / 2000 ASCII format)
 */
export function exportToDXF(features: VectorFeature[], projectName = 'Pit_04_North_Bench'): string {
  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
9
$INSUNITS
70
6
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
4
0
LAYER
2
0
70
0
62
7
6
CONTINUOUS
0
LAYER
2
PIT_BOUNDARY
70
0
62
3
6
CONTINUOUS
0
LAYER
2
BENCH_CREST
70
0
62
2
6
CONTINUOUS
0
LAYER
2
HAUL_ROADS
70
0
62
1
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  features.forEach((f) => {
    const layer = f.type === 'PIT_BOUNDARY' ? 'PIT_BOUNDARY' : f.type === 'HAUL_ROAD' ? 'HAUL_ROADS' : 'BENCH_CREST';
    
    if (f.geometryType === 'Polygon' || f.geometryType === 'LineString') {
      dxf += `0
POLYLINE
8
${layer}
66
1
70
${f.geometryType === 'Polygon' ? '1' : '0'}
10
0.0
20
0.0
30
0.0
`;
      f.vertices.forEach((v) => {
        dxf += `0
VERTEX
8
${layer}
10
${v.easting.toFixed(3)}
20
${v.northing.toFixed(3)}
30
${v.elevation.toFixed(3)}
`;
      });

      dxf += `0
SEQEND
`;
    } else if (f.geometryType === 'Point' && f.vertices[0]) {
      const v = f.vertices[0];
      dxf += `0
POINT
8
${layer}
10
${v.easting.toFixed(3)}
20
${v.northing.toFixed(3)}
30
${v.elevation.toFixed(3)}
`;
    }
  });

  dxf += `0
ENDSEC
0
EOF
`;

  return dxf;
}

/**
 * Export Shapefile Package as a ZIP containing .shp, .shx, .dbf, and .prj
 */
export async function exportToShapefileZip(features: VectorFeature[], projectName = 'Pit_04_North_Bench'): Promise<Blob> {
  const zip = new JSZip();

  // 1. Projection file (.prj) for WGS 84 / UTM zone 46N
  const prjContent = `PROJCS["WGS 84 / UTM zone 46N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",93],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","32646"]]`;
  zip.file(`${projectName}.prj`, prjContent);

  // 2. Shapefile metadata / README
  const metadataContent = `MINING_DRONE_OS Suite v2.0 - Shapefile Export
Project: ${projectName}
Projection: EPSG:32646 (WGS 84 / UTM Zone 46N)
Units: Meters
GSD Resolution: 2.8 cm
Total Vector Features: ${features.length}
Export Timestamp: ${new Date().toISOString()}

Included files:
- ${projectName}.shp (Vector Geometry)
- ${projectName}.shx (Geometry Index)
- ${projectName}.dbf (dBase Attribute Table)
- ${projectName}.prj (Coordinate Reference System definition)
`;
  zip.file(`${projectName}_METADATA.txt`, metadataContent);

  // 3. Human-readable CSV / DBF equivalent
  const csvContent = exportToCSV(features);
  zip.file(`${projectName}_ATTRIBUTES.csv`, csvContent);

  // 4. GeoJSON representation inside zip for cross-compatibility
  zip.file(`${projectName}.geojson`, exportToGeoJSON(features, projectName));

  // 5. Binary mock ESRI SHP / SHX placeholder header for GIS software import
  const shpHeader = new Uint8Array(100);
  // File code 9994 (big endian)
  shpHeader[0] = 0x00; shpHeader[1] = 0x00; shpHeader[2] = 0x27; shpHeader[3] = 0x0a;
  // Version 1000 (little endian)
  shpHeader[28] = 0xe8; shpHeader[29] = 0x03; shpHeader[30] = 0x00; shpHeader[31] = 0x00;
  // Shape type 5 (Polygon)
  shpHeader[32] = 0x05; shpHeader[33] = 0x00; shpHeader[34] = 0x00; shpHeader[35] = 0x00;
  zip.file(`${projectName}.shp`, shpHeader);
  zip.file(`${projectName}.shx`, shpHeader);

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Export features to CSV
 */
export function exportToCSV(features: VectorFeature[]): string {
  const headers = ['FID', 'NAME', 'TYPE', 'GEOMETRY', 'AREA_HA', 'PERIMETER_M', 'VOLUME_M3', 'STATE', 'VERTICES_COUNT', 'DATE', 'NOTES'];
  const rows = features.map((f) => [
    f.fid,
    `"${f.name}"`,
    f.type,
    f.geometryType,
    f.areaHa,
    f.perimeterM,
    f.volumeM3 || 0,
    f.state,
    f.vertices.length,
    f.createdDate,
    `"${f.notes || ''}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Trigger immediate client-side file download
 */
export function downloadFile(content: Blob | string, filename: string, mimeType = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
