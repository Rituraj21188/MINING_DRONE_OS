@echo off
title MINING_DRONE_OS v2.5 - Streamlit Edition
color 0B

echo =====================================================================
echo  MINING_DRONE_OS v2.5 - Streamlit Unified Web-GIS Platform
echo  Open-Pit Mining Topography, Split Surfaces, Volumetrics ^& Exports
echo =====================================================================
echo.

cd /d "%~dp0"

echo [INFO] Starting Streamlit App on http://localhost:8501 ...
echo [INFO] Press Ctrl+C in this terminal window to stop the application.
echo.

"C:\Program Files\QGIS 3.40.7\bin\python-qgis-ltr.bat" -m streamlit run app_streamlit.py --server.port 8501 --server.maxUploadSize 1024 --browser.gatherUsageStats false

pause
