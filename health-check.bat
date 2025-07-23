@echo off
echo === EscaShop Deployment Health Check ===
echo.

echo Checking Backend API...
curl -s http://localhost:5000/health && echo [SUCCESS] Backend API is healthy || echo [ERROR] Backend API not responding
echo.

echo Checking Frontend...
curl -s -I http://localhost:3000 | findstr "200 OK" && echo [SUCCESS] Frontend is healthy || echo [ERROR] Frontend not responding
echo.

echo Checking Build Files...
if exist "backend\dist\index.js" (
    echo [SUCCESS] Backend build exists
) else (
    echo [ERROR] Backend build not found
)

if exist "frontend\build\index.html" (
    echo [SUCCESS] Frontend build exists
) else (
    echo [ERROR] Frontend build not found
)

echo.
echo === Health Check Complete ===
