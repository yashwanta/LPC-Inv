@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tax-diagnostic.ps1"
timeout /t 3 >nul
