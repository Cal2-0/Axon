@echo off
echo ==============================================
echo        Starting AXON Security Platform
echo ==============================================
echo.

:: Get the directory where this .bat file lives
set "AXON_DIR=%~dp0"

echo [1/2] Starting Backend API Server...
start "AXON Backend" cmd /k "cd /d %AXON_DIR%backend && call venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8001"

:: Wait for backend to initialize
timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Dev Server...
start "AXON Frontend" cmd /k "cd /d %AXON_DIR%frontend && npm run dev"

echo.
echo ==============================================
echo   AXON is now running!
echo   Backend:  http://127.0.0.1:8001
echo   Frontend: http://localhost:5173
echo   API Docs: http://127.0.0.1:8001/docs
echo ==============================================
echo.
echo Close this window to continue. Backend and Frontend run in separate windows.
pause
