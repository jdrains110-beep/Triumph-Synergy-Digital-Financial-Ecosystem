@echo off
:: Pi Supernode Guardian - Background Service Launcher
:: Run this to start continuous monitoring of your Pi Node

echo.
echo ========================================
echo  Pi Supernode Guardian Service
echo ========================================
echo.
echo This will monitor your Pi Node 24/7 and:
echo  - Auto-restart if it stops
echo  - Auto-recover from sync issues
echo  - Log all activity
echo.
echo Press Ctrl+C to stop monitoring.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File "%~dp0supernode-guardian.ps1"

pause
