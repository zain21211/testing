@echo off
title Ahmad International - Startup
echo ============================================
echo  Ahmad International SMS - Starting Services
echo ============================================

REM ── 1. Kill any existing node processes on our ports ──────────────────────────
echo [1/3] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4173 " ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul

REM ── 2. Start Backend ──────────────────────────────────────────────────────────
echo [2/3] Starting backend (port 3001)...
start "SMS Backend" /MIN cmd /k "cd /d D:\ahmadinternational-sms-main\backend && node main.js"
timeout /t 8 >nul

REM ── 3. Start Frontend Preview ─────────────────────────────────────────────────
echo [3/3] Starting frontend preview (port 4173)...
start "SMS Frontend" /MIN cmd /k "cd /d D:\ahmadinternational-sms-main\frontend && npm run preview"
timeout /t 5 >nul

echo.
echo ✅ All services started!
echo    Backend:  http://100.122.80.93:3001
echo    Frontend: http://100.122.80.93:4173
echo    Public:   https://ahmadinternational.shop
echo.
echo Cloudflare tunnel is managed as a Windows service (auto-starts with Windows).
echo.
pause
