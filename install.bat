@echo off
echo ========================================
echo QueueCTL Installation Script
echo ========================================
echo.

REM Check if Bun is installed
where bun >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Bun is not installed
    echo Install Bun from: https://bun.sh
    exit /b 1
)

echo Installing dependencies...
call bun install

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install dependencies
    exit /b 1
)

echo Dependencies installed
echo.

echo Linking CLI globally...
call bun link

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to link CLI
    exit /b 1
)

echo CLI linked globally
echo.

echo ========================================
echo QueueCTL is ready to use!
echo ========================================
echo.
echo Try running:
echo   queuectl --help
echo   queuectl status
echo.
pause
