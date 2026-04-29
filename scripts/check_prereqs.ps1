<#
.SYNOPSIS
    Environment and Prerequisites Check Script for Application Server
.DESCRIPTION
    This script verifies if the current server environment meets all the necessary
    prerequisites (Runtime, Storage, Configuration, Network, Permissions) to run the application.
    It is intended to be used by IT Operations during server migration or initial setup.
#>

$ErrorActionPreference = "Stop"

# Define Thresholds
$MinDiskSpaceGB = 50
$DbPort = 1433

# Helper function for console output
function Write-Result {
    param(
        [string]$TestName,
        [bool]$IsPass,
        [string]$Message
    )
    if ($IsPass) {
        Write-Host "[PASS] $TestName" -ForegroundColor Green
        if ($Message) { Write-Host "       $Message" -ForegroundColor DarkGreen }
    } else {
        Write-Host "[FAIL] $TestName" -ForegroundColor Red
        if ($Message) { Write-Host "       $Message" -ForegroundColor DarkRed }
    }
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   System Assessment & Prerequisites Check" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$AllPassed = $true
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition

# ---------------------------------------------------------
# 1. Check for Runtime (node.exe)
# ---------------------------------------------------------
$NodePath = Join-Path $ScriptPath "node.exe"
if (Test-Path $NodePath) {
    Write-Result "Standalone Runtime" $true "Found node.exe at $NodePath"
} else {
    # If the script is placed inside a 'scripts' folder, check the parent directory
    $ParentNodePath = Join-Path (Split-Path $ScriptPath -Parent) "node.exe"
    if (Test-Path $ParentNodePath) {
        Write-Result "Standalone Runtime" $true "Found node.exe at parent directory"
    } else {
        Write-Result "Standalone Runtime" $false "Missing node.exe! Please ensure it is copied along with the release."
        $AllPassed = $false
    }
}

# ---------------------------------------------------------
# 2. Check for Configuration (.env)
# ---------------------------------------------------------
$EnvPath = Join-Path $ScriptPath ".env"
$DbServer = $null

if (-Not (Test-Path $EnvPath)) {
    $EnvPath = Join-Path (Split-Path $ScriptPath -Parent) ".env"
}

if (Test-Path $EnvPath) {
    Write-Result "Configuration File" $true "Found .env file."

    # Extract DB_SERVER safely
    $envContent = Get-Content $EnvPath
    foreach ($line in $envContent) {
        if ($line -match "^\s*DB_SERVER\s*=\s*(.*)$") {
            $DbServer = $matches[1].Trim("'", '"')
            break
        }
    }
} else {
    Write-Result "Configuration File" $false "Missing .env file! System cannot start without configuration."
    $AllPassed = $false
}

# ---------------------------------------------------------
# 3. Check for Storage (Disk Space)
# ---------------------------------------------------------
$DriveLetter = (Get-Item $ScriptPath).Root
$DiskInfo = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq $DriveLetter.TrimEnd('\') }

if ($DiskInfo) {
    $FreeSpaceGB = [math]::Round($DiskInfo.FreeSpace / 1GB, 2)
    if ($FreeSpaceGB -ge $MinDiskSpaceGB) {
        Write-Result "Storage Space" $true "Available space: ${FreeSpaceGB}GB (Requirement: >= ${MinDiskSpaceGB}GB)"
    } else {
        Write-Result "Storage Space" $false "Available space: ${FreeSpaceGB}GB (Requirement: >= ${MinDiskSpaceGB}GB)"
        $AllPassed = $false
    }
} else {
    Write-Host "[WARN] Storage Space: Could not determine free space for drive $DriveLetter" -ForegroundColor Yellow
}

# ---------------------------------------------------------
# 4. Check for Uploads Directory Permissions
# ---------------------------------------------------------
$UploadsPath = Join-Path $ScriptPath "uploads"
if (-Not (Test-Path $UploadsPath)) {
    $UploadsPath = Join-Path (Split-Path $ScriptPath -Parent) "uploads"
}

if (-Not (Test-Path $UploadsPath)) {
    Write-Result "Uploads Directory" $false "Missing uploads/ directory! Please ensure it is migrated."
    $AllPassed = $false
} else {
    try {
        $TestFile = Join-Path $UploadsPath ".write_test.tmp"
        [IO.File]::WriteAllText($TestFile, "test")
        Remove-Item $TestFile
        Write-Result "Uploads Permissions" $true "Directory exists and has Write permissions."
    } catch {
        Write-Result "Uploads Permissions" $false "No Write permissions to the uploads/ directory. Check Folder Security."
        $AllPassed = $false
    }
}

# ---------------------------------------------------------
# 5. Check Network Connectivity to Database
# ---------------------------------------------------------
if ($DbServer) {
    try {
        $TcpClient = New-Object System.Net.Sockets.TcpClient
        $ConnectTask = $TcpClient.ConnectAsync($DbServer, $DbPort)
        $IsConnected = $ConnectTask.Wait(2000) # 2 seconds timeout

        if ($IsConnected -and $TcpClient.Connected) {
            Write-Result "Database Network" $true "Successfully connected to $DbServer on Port $DbPort."
        } else {
            Write-Result "Database Network" $false "Connection timed out to $DbServer on Port $DbPort. Check Outbound Firewall."
            $AllPassed = $false
        }
        $TcpClient.Close()
    } catch {
        Write-Result "Database Network" $false "Failed to resolve or connect to $DbServer on Port $DbPort. Error: $($_.Exception.Message)"
        $AllPassed = $false
    }
} else {
    Write-Result "Database Network" $false "Could not extract DB_SERVER from .env. Skipping network test."
    $AllPassed = $false
}

Write-Host ""
if ($AllPassed) {
    Write-Host ">>> RESULT: ALL CHECKS PASSED. SYSTEM IS READY. <<<" -ForegroundColor Green
} else {
    Write-Host ">>> RESULT: SOME CHECKS FAILED. PLEASE REVIEW LOGS ABOVE. <<<" -ForegroundColor Red
}
Write-Host "==================================================" -ForegroundColor Cyan
