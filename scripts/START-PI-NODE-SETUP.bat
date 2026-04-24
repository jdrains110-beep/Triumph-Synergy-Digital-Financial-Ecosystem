@echo off
:: Pi Network Supernode Quick Setup
:: Double-click this file to configure your computer as a Pi Node
:: This will request Administrator privileges automatically

echo.
echo ========================================
echo  Pi Network Supernode Quick Setup
echo ========================================
echo.
echo This will configure your computer to run
echo as a Pi Network Supernode consistently.
echo.
echo Requesting Administrator privileges...
echo.

:: Check if already running as admin
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :RunSetup
) else (
    goto :RequestAdmin
)

:RequestAdmin
:: Request admin privileges and run the PowerShell script
powershell -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0setup-pi-supernode.ps1\"' -Verb RunAs"
exit /b

:RunSetup
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-pi-supernode.ps1"
pause
