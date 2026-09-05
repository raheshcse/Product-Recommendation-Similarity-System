@echo off
REM ---------------------------------------------------------------
REM  Acme Retail - Product Recommendation Similarity System
REM  Starts the FastAPI backend and the Vite dev server together.
REM ---------------------------------------------------------------

echo.
echo Starting backend (http://127.0.0.1:8000) ...
start "Acme API" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --reload --port 8000"

timeout /t 6 /nobreak >nul

echo Starting frontend (http://localhost:5173) ...
start "Acme UI" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   UI   http://localhost:5173
echo   API  http://127.0.0.1:8000/docs
echo.
pause
