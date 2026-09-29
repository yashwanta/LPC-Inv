@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-tax-2026-09-29.ps1"
echo.
echo Logs: fix-tax.log and release-local.log in the project folder.
pause
