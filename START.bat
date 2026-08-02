@echo off
REM ACT — start the whole platform in your browser.
REM Double-click this file.

cd /d "%~dp0frontend"

if not exist "node_modules\vite" (
  echo.
  echo Installing dependencies. This happens once and takes a few minutes.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Is Node.js installed?  https://nodejs.org
    pause
    exit /b 1
  )
)

echo.
echo ============================================================
echo   ACT is starting.
echo.
echo   Open:  http://localhost:3000
echo.
echo   /                 Landing site
echo   /taxi             Taxi  (Book Taxi lands here)
echo   /admin            Control Centre
echo   /taxi/cards       Printable street cards
echo.
echo   Press Ctrl+C in this window to stop.
echo ============================================================
echo.

call npm run dev
pause
