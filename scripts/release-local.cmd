@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0release-local.ps1"
echo.
echo Log saved to release-local.log in the project folder.
pause
