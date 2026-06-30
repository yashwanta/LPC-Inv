@echo off
setlocal EnableExtensions

set "REPO_ROOT=%~dp0.."
cd /d "%REPO_ROOT%" || exit /b 1

set /p VERSION=<VERSION
if "%VERSION%"=="" (
  echo VERSION file is empty.
  exit /b 1
)

set "GOCACHE=%REPO_ROOT%\.gocache"
set "TEMP=%REPO_ROOT%\.tmp"
set "TMP=%REPO_ROOT%\.tmp"
if not exist "%TEMP%" mkdir "%TEMP%"
if not exist "%REPO_ROOT%\dist" mkdir "%REPO_ROOT%\dist"

pushd frontend || exit /b 1
call npm.cmd ci || exit /b 1
call npm.cmd run build || exit /b 1
popd

call wails build -skipbindings || exit /b 1

set "PACKAGE_DIR=%REPO_ROOT%\dist\SimpleTechBooks-%VERSION%-windows-amd64"
set "PACKAGE_ZIP=%REPO_ROOT%\dist\SimpleTechBooks-%VERSION%-windows-amd64.zip"
set "SETUP_EXE=%REPO_ROOT%\dist\SimpleTechBooks-Setup-%VERSION%.exe"

if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%" || exit /b 1
copy /y "%REPO_ROOT%\build\bin\SimpleTechBooks.exe" "%PACKAGE_DIR%\SimpleTechBooks.exe" || exit /b 1
copy /y "%REPO_ROOT%\README.md" "%PACKAGE_DIR%\README.md" || exit /b 1
copy /y "%REPO_ROOT%\VERSION" "%PACKAGE_DIR%\VERSION" || exit /b 1

if exist "%PACKAGE_ZIP%" del /f /q "%PACKAGE_ZIP%"
tar -a -c -f "%PACKAGE_ZIP%" -C "%PACKAGE_DIR%" . || exit /b 1

copy /y "%REPO_ROOT%\build\bin\SimpleTechBooks.exe" "%REPO_ROOT%\cmd\installer\payload\SimpleTechBooks.exe" || exit /b 1
go build -tags installer -ldflags "-s -w" -o "%SETUP_EXE%" ./cmd/installer || exit /b 1
del /f /q "%REPO_ROOT%\cmd\installer\payload\SimpleTechBooks.exe"

echo Created %PACKAGE_ZIP%
echo Created %SETUP_EXE%
endlocal
