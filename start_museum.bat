@echo off
set "PATH=C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\Python\Python312;%PATH%"
cd /d "%~dp0"

echo ==========================================================
echo   BAO TANG LICH SU 3D - MULTIPLAYER VIRTUAL MUSEUM
echo ==========================================================

if not exist "node_modules" (
    echo [1/2] Installing dependencies with npm...
    call "C:\Program Files\nodejs\npm.cmd" install
)

echo [2/2] Opening http://localhost:3000 ...
start "" "http://localhost:3000"

netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Server is already running on http://localhost:3000 !
    timeout /t 3 >nul
    exit /b 0
)

"C:\Program Files\nodejs\node.exe" server/index.js
pause
