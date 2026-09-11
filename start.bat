@echo off
echo ====================================================================
echo   Starting UrbanPulse: Smart Traffic Management System
echo ====================================================================

REM Check if Python virtual environment exists
if exist "backend\.venv\Scripts\activate.bat" (
    start "UrbanPulse Backend [Port 8001]" cmd /k "cd backend && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
) else (
    start "UrbanPulse Backend [Port 8001]" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
)

REM Start Frontend
start "UrbanPulse Frontend [Port 5173]" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================================
echo   Services are running!
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8001
echo   - API Docs: http://localhost:8001/docs
echo ====================================================================
