#!/usr/bin/env pwsh
# Simple Health Check Script for EscaShop Deployment

Write-Host "=== EscaShop Deployment Health Check ===" -ForegroundColor Green

# Backend Health Check
Write-Host "`nChecking Backend API..." -ForegroundColor Cyan
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 10
    if ($backendResponse.StatusCode -eq 200) {
        $healthData = $backendResponse.Content | ConvertFrom-Json
        Write-Host "✅ Backend API is healthy" -ForegroundColor Green
        Write-Host "   Status: $($healthData.status)" -ForegroundColor Gray
        Write-Host "   Timestamp: $($healthData.timestamp)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Backend API not responding: $($_.Exception.Message)" -ForegroundColor Red
}

# Frontend Health Check
Write-Host "`nChecking Frontend..." -ForegroundColor Cyan
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend is healthy" -ForegroundColor Green
        Write-Host "   Content-Length: $($frontendResponse.RawContentLength) bytes" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Frontend not responding: $($_.Exception.Message)" -ForegroundColor Red
}

# Process Information
Write-Host "`nProcess Information:" -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "📊 Node.js processes:" -ForegroundColor Blue
    foreach ($proc in $nodeProcesses) {
        $memory = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        Write-Host "   PID: $($proc.Id), Memory: ${memory}MB" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ No Node.js processes found" -ForegroundColor Red
}

# Build Status Check
Write-Host "`nBuild Status:" -ForegroundColor Cyan
if (Test-Path "backend/dist/index.js") {
    Write-Host "✅ Backend build exists" -ForegroundColor Green
} else {
    Write-Host "❌ Backend build not found" -ForegroundColor Red
}

if (Test-Path "frontend/build/index.html") {
    Write-Host "✅ Frontend build exists" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build not found" -ForegroundColor Red
}

Write-Host "`n=== Health Check Complete ===" -ForegroundColor Green
