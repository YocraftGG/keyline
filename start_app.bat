@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "BACKEND_PYTHON=%PROJECT_DIR%backend\venv\Scripts\python.exe"

if not exist "%BACKEND_PYTHON%" (
    echo Backend virtual environment not found at:
    echo %BACKEND_PYTHON%
    echo Create the backend venv and install backend\requirements.txt first.
    pause
    exit /b 1
)

echo Seeding sentence data...
"%BACKEND_PYTHON%" "%PROJECT_DIR%backend\app\seed_sentences.py"
if errorlevel 1 (
    echo Seeding failed. Check that MySQL is running and the project .env is configured.
    pause
    exit /b 1
)

echo Starting Keyline backend and frontend...
where npm >nul 2>nul
if errorlevel 1 (
    echo Node.js and npm are required for the React frontend.
    echo Install Node.js, then run "npm install" in the frontend folder.
    pause
    exit /b 1
)
if not exist "%PROJECT_DIR%frontend\node_modules" (
    echo Frontend packages are not installed yet.
    echo Run "npm install" in the frontend folder, then start the app again.
    pause
    exit /b 1
)
start "Keyline Backend" /D "%PROJECT_DIR%backend\app" "%BACKEND_PYTHON%" -m uvicorn main:app --reload
start "Keyline Frontend" /D "%PROJECT_DIR%frontend" cmd /k npm run dev -- --host 127.0.0.1

echo Frontend: http://127.0.0.1:5173
echo Backend:  http://127.0.0.1:8000
