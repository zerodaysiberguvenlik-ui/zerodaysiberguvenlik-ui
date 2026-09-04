@echo off
title Nur Koridoru - Baslatici
cd /d "%~dp0"
echo ======================================================
echo           NUR KORIDORU BASLATILIYOR...
echo ======================================================
echo.
echo Tarayici aciliyor: http://localhost:8080
echo.
start "" "http://localhost:8080"
python -m http.server 8080
pause
