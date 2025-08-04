@echo off
setlocal enabledelayedexpansion

echo Starting backend...
start /MIN cmd /c "npm run dev"

REM Wait a bit for backend to start
timeout /t 5 >nul

echo Starting Cloudflare tunnel...
start "" /B cmd /c "cloudflared tunnel --url http://localhost:3001 > tunnel_output.txt 2>&1"

REM Wait for tunnel to initialize and write output
timeout /t 10 >nul

echo Reading Cloudflare URL...

REM Initialize variable
set "CLOUDFLARE_URL="

REM Look for the first valid https://trycloudflare.com URL
for /f "tokens=*" %%A in ('findstr /i "trycloudflare.com" tunnel_output.txt') do (
    for %%B in (%%A) do (
        echo Found: %%B
        echo %%B | findstr /i "https://" >nul
        if !errorlevel! == 0 (
            set "CLOUDFLARE_URL=%%B"
            goto :done
        )
    )
)

:done

REM Clean unwanted characters if needed
set "CLOUDFLARE_URL=%CLOUDFLARE_URL:"=%"
set "CLOUDFLARE_URL=%CLOUDFLARE_URL:<=%"
set "CLOUDFLARE_URL=%CLOUDFLARE_URL:>=%"
set "CLOUDFLARE_URL=%CLOUDFLARE_URL:|=%"

REM Final echo
echo Final Tunnel URL: %CLOUDFLARE_URL%

REM Write to .env.local (overwrite if exists)
(
    echo VITE_API_URL=%CLOUDFLARE_URL%/api
) > .env

echo ✅ Tunnel URL saved to .env.local

echo Building frontend...
call npm run build

echo 🟢 Done.
