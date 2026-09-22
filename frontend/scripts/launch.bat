@echo off
echo ============================================
echo  Frontend + Backend Launcher (SePay)
echo ============================================
echo.

REM Check node
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    exit /b 1
)

REM Check ngrok
where ngrok >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] ngrok not found - SePay webhook won't work externally
    echo          Download: https://dashboard.ngrok.com/get-started/setup
    echo.
)

REM Start frontend in background
echo [INFO] Starting frontend (Vite) on port 5173...
start "frontend" /min cmd /c "cd /d \"%~dp0\" && npm run dev"

REM Wait for frontend
timeout /t 3 /nobreak >nul

REM Start ngrok if available (needed for SePay webhook on port 8080)
where ngrok >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Starting Ngrok for backend (port 8080)...
    start "ngrok" /min ngrok http 8080 --log=ngrok.log --log-level=info
    timeout /t 5 /nobreak >nul
    echo [INFO] Ngrok started - visit http://127.0.0.1:4040 for URL
    echo.
    echo Add this webhook URL on SePay dashboard:
    echo   %NGROK_URL%/api/webhook/sepay
    echo.
) else (
    echo [INFO] Skipping Ngrok - SePay webhook will NOT work externally
    echo          Use SePay test mode or start ngrok manually
    echo.
)

echo ============================================
echo  Frontend:  http://localhost:5173
echo  Backend:   http://localhost:8080
echo  Ngrok:     http://127.0.0.1:4040 (if started)
echo ============================================
echo.
echo Close with: taskkill /F /IM node.exe /IM ngrok.exe /IM vite.exe
pause
