@echo off
setlocal
REM ============================================================
REM  GALEYR — start the platform in your browser.
REM  Double-click this file.
REM ============================================================
REM
REM  Two things this fixes over the previous version:
REM
REM  1. It used to do  cd "%~dp0frontend"  and start the OLD taxi
REM     project instead of the GALEYR app. The GALEYR app lives in
REM     THIS folder, not in frontend\.
REM
REM  2. The window used to vanish on failure, so an error was
REM     unreadable. Everything now also goes to start-log.txt in
REM     this folder, and the window never closes by itself.

cd /d "%~dp0"
set "LOG=%~dp0start-log.txt"

echo GALEYR start log - %DATE% %TIME% > "%LOG%"
echo Folder: %CD% >> "%LOG%"

echo.
echo   Starting GALEYR...
echo   A log is being written to start-log.txt
echo.

REM ---- Is Node installed and on PATH? --------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH. >> "%LOG%"
  echo.
  echo   PROBLEM: Node.js is not installed, or not on your PATH.
  echo   Install it from https://nodejs.org  then try again.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo Node: %%v >> "%LOG%"
for /f "delims=" %%v in ('npm -v 2^>nul') do echo npm:  %%v >> "%LOG%"

REM ---- Dependencies -------------------------------------------
if not exist "node_modules\vite\package.json" (
  echo.
  echo   Installing dependencies. This happens once and takes a few minutes.
  echo.
  echo Running npm install >> "%LOG%"
  call npm install >> "%LOG%" 2>&1
  if errorlevel 1 (
    echo.
    echo   PROBLEM: npm install failed. See start-log.txt for the reason.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo ============================================================
echo   GALEYR is starting.
echo.
echo   Open:  http://localhost:3000
echo.
echo   /                     Home
echo   /restaurants          All restaurants
echo   /delivery             Track, support, complaints
echo   /partners             Register your restaurant
echo   /couriers/apply       Become a courier
echo.
echo   /control              CONTROL CENTRE   (sign in)
echo   /control?s=admin      ADMIN            (staff code)
echo   /portal               Restaurant portal
echo.
echo   The browser opens by itself in about 10 seconds.
echo   Keep THIS WINDOW OPEN. Press Ctrl+C to stop.
echo ============================================================
echo.

REM Ten seconds, not six: Vite has to transform the whole app on a
REM cold start, and on a OneDrive-backed folder that is slower than
REM on a local disk. Opening the tab too early shows
REM "can't reach this page", which looks like a failure and is not.
start "" /b cmd /c "timeout /t 10 /nobreak >nul & start http://localhost:3000"

echo Starting vite >> "%LOG%"
call npm run dev

REM ---- Never close silently -----------------------------------
REM Reaching here means the server stopped, whether cleanly or by
REM crashing on startup. Either way the reason is on screen and in
REM the log, and the window stays up so it can be read.
echo.
echo ============================================================
echo   GALEYR has stopped.
echo   If that was unexpected, the reason is above, and also in
echo   start-log.txt in this folder.
echo ============================================================
echo.
pause
endlocal
