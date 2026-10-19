@echo off
title MINING_DRONE_OS v2.5 - Unified Web-GIS Server
color 0A

echo =====================================================================
echo  MINING_DRONE_OS v2.5 - Unified Web-GIS ^& Drone Operations Core
echo  Open-Pit Mining Topography, Split Surfaces, Volumetrics ^& Exports
echo =====================================================================
echo.

cd /d "%~dp0"

REM Check for QGIS High-Performance Python with GDAL & ReportLab
if exist "C:\Program Files\QGIS 3.40.7\bin\python-qgis-ltr.bat" (
    echo [INFO] Detected QGIS Python 3.12 with GDAL, PyProj, Shapely and ReportLab!
    echo [INFO] Starting MINING_DRONE_OS Server on http://localhost:8050 ...
    start "" "http://localhost:8050"
    "C:\Program Files\QGIS 3.40.7\bin\python-qgis-ltr.bat" server.py
    goto end
)

REM Fallback to system python
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Starting MINING_DRONE_OS with system Python...
    start "" "http://localhost:8050"
    python server.py
    goto end
)

echo [ERROR] No suitable Python installation detected.
pause

:end
