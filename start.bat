@echo off
REM CodeSense AI - one-click local launcher (by Nitish Singh)
REM Starts backend (FastAPI :8000) and frontend (Vite :5173), then opens the browser.

cd /d "%~dp0"

if not exist "backend\.env" (
  echo [!] backend\.env missing. Copy backend\.env.example to backend\.env and set GEMINI_API_KEY.
  pause
  exit /b 1
)

start "CodeSense Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn main:app --port 8000"
start "CodeSense Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Waiting for servers to start...
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
echo.
echo   App:      http://localhost:5173
echo   API docs: http://localhost:8000/docs
echo.
echo Close the two server windows to stop.
