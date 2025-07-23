#!/usr/bin/env pwsh
# Deployment Monitoring Script for EscaShop
# This script monitors the health of backend and frontend services

Write-Host "=== EscaShop Deployment Monitor ===" -ForegroundColor Green
Write-Host "Monitoring deployment health checks..." -ForegroundColor Yellow

# Configuration
$BackendUrl = "http://localhost:5000"
$FrontendUrl = "http://localhost:3000"
$MonitorInterval = 10  # seconds
$MaxRetries = 5

function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$Url,
        [string]$ExpectedContent = $null
    )
    
    try {
        Write-Host "Checking $ServiceName at $Url..." -ForegroundColor Cyan
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $ServiceName is healthy (Status: $($response.StatusCode))" -ForegroundColor Green
            
            if ($ExpectedContent -and $response.Content -like "*$ExpectedContent*") {
                Write-Host "✅ Expected content found in response" -ForegroundColor Green
            }
            
            return $true
        } else {
            Write-Host "⚠️  $ServiceName returned status: $($response.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "❌ $ServiceName is not responding: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Get-ProcessInfo {
    param([string]$ProcessName)
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "📊 Found $($processes.Count) $ProcessName process(es):" -ForegroundColor Blue
        foreach ($proc in $processes) {
            $cpu = [math]::Round($proc.CPU, 2)
            $memory = [math]::Round($proc.WorkingSet64 / 1MB, 2)
            Write-Host "   PID: $($proc.Id), CPU: ${cpu}s, Memory: ${memory}MB" -ForegroundColor Gray
        }
        return $true
    } else {
        Write-Host "❌ No $ProcessName processes found" -ForegroundColor Red
        return $false
    }
}

function Test-DatabaseConnection {
    try {
        Write-Host "🗄️  Testing database connection..." -ForegroundColor Cyan
        
        # Check if we can connect to the backend API which connects to DB
        $healthResponse = Invoke-WebRequest -Uri "$BackendUrl/health" -TimeoutSec 5 -UseBasicParsing
        
        if ($healthResponse.StatusCode -eq 200) {
            $healthData = $healthResponse.Content | ConvertFrom-Json
            Write-Host "✅ Database connection via API is healthy" -ForegroundColor Green
            Write-Host "   Timestamp: $($healthData.timestamp)" -ForegroundColor Gray
            return $true
        }
        return $false
    }
    catch {
        Write-Host "❌ Database connection test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Show-ServiceSummary {
    Write-Host "`n=== Service Summary ===" -ForegroundColor Green
    
    # Backend Health Check
    $backendHealthy = Test-ServiceHealth -ServiceName "Backend API" -Url "$BackendUrl/health" -ExpectedContent "OK"
    
    # Frontend Health Check  
    $frontendHealthy = Test-ServiceHealth -ServiceName "Frontend" -Url "$FrontendUrl" -ExpectedContent "<!doctype html>"
    
    # Database Connection Test
    $dbHealthy = Test-DatabaseConnection
    
    # Process Information
    Write-Host "`n📈 Process Information:" -ForegroundColor Blue
    Get-ProcessInfo -ProcessName "node"
    Get-ProcessInfo -ProcessName "serve"
    
    # Overall Status
    Write-Host "`n🎯 Overall Status:" -ForegroundColor Green
    if ($backendHealthy -and $frontendHealthy -and $dbHealthy) {
        Write-Host "✅ All services are healthy and operational!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "⚠️  Some services need attention:" -ForegroundColor Yellow
        if (-not $backendHealthy) { Write-Host "   - Backend API issues detected" -ForegroundColor Red }
        if (-not $frontendHealthy) { Write-Host "   - Frontend issues detected" -ForegroundColor Red }
        if (-not $dbHealthy) { Write-Host "   - Database connection issues detected" -ForegroundColor Red }
        return $false
    }
}

function Start-ContinuousMonitoring {
    Write-Host "`n🔄 Starting continuous monitoring (Ctrl+C to stop)..." -ForegroundColor Yellow
    
    $iteration = 1
    do {
        Write-Host "`n--- Monitor Check #$iteration ($(Get-Date -Format 'HH:mm:ss')) ---" -ForegroundColor Magenta
        
        $allHealthy = Show-ServiceSummary
        
        if ($allHealthy) {
            Write-Host "✅ All systems operational" -ForegroundColor Green
        } else {
            Write-Host "⚠️  System issues detected - check logs" -ForegroundColor Yellow
        }
        
        Write-Host "Waiting $MonitorInterval seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds $MonitorInterval
        $iteration++
        
    } while ($true -eq $true)
}

# Main execution
try {
    # Initial health check
    Show-ServiceSummary
    
    # Ask user if they want continuous monitoring
    Write-Host "`nWould you like to start continuous monitoring? (y/n): " -ForegroundColor Yellow -NoNewline
    $response = $null
    
    # For automated deployment, skip user input and just do one check
    if ($env:AUTOMATED_DEPLOYMENT -eq "true") {
        Write-Host "Automated deployment mode - performing single health check" -ForegroundColor Green
    } else {
    
        if ($response -eq 'y' -or $response -eq 'Y') {
            Start-ContinuousMonitoring
        } else {
            Write-Host "Single health check completed." -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "❌ Monitoring script error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Monitoring Complete ===" -ForegroundColor Green
