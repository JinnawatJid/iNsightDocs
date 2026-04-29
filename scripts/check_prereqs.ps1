<#
.SYNOPSIS
    Environment and Prerequisites Check Script for Application Server
.DESCRIPTION
    This script verifies if the current server environment meets all the necessary
    prerequisites (Runtime, Storage, Configuration, Network, Permissions) to run the application.
    It is designed to be executed from the root of the "release" directory.
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

# Determine the actual release root assuming this script is at release/check_prereqs.ps1
# But if it's placed in scripts/ we should adjust.
# Given the user's screenshot, `check_prereqs.ps1` and `Run_Prereqs_Check.bat` are located at the ROOT of `release/`.
$ReleaseRoot = $ScriptPath

# ---------------------------------------------------------
# 1. Check for Runtime (node/node.exe)
# ---------------------------------------------------------
$NodePath = Join-Path $ReleaseRoot "node\node.exe"
if (Test-Path $NodePath) {
    Write-Result "Standalone Runtime" $true "Found node.exe at node\node.exe"
} else {
    Write-Result "Standalone Runtime" $false "Missing node.exe! Looked in: node\node.exe. Ensure it is copied with the release."
    $AllPassed = $false
}

# ---------------------------------------------------------
# 2. Check for Configuration (backend/.env)
# ---------------------------------------------------------
$EnvPath = Join-Path $ReleaseRoot "backend\.env"
$DbServer = $null
$LogDirRelative = $null

if (Test-Path $EnvPath) {
    Write-Result "Configuration File" $true "Found .env file in backend/."
    
    # Extract config values safely
    $envContent = Get-Content $EnvPath
    foreach ($line in $envContent) {
        if ($line -match "^\s*DB_SERVER\s*=\s*(.*)$") {
            $DbServer = $matches[1].Trim("'", '"')
        }
        if ($line -match "^\s*UPLOAD_PATH\s*=\s*(.*)$") {
            $UploadPathRelative = $matches[1].Trim("'", '"')
        }
        if ($line -match "^\s*LOG_DIR\s*=\s*(.*)$") {
            $LogDirRelative = $matches[1].Trim("'", '"')
        }
    }
} else {
    Write-Result "Configuration File" $false "Missing .env file in backend/! System cannot start."
    $AllPassed = $false
}

# ---------------------------------------------------------
# 3. Check for Storage (Disk Space)
# ---------------------------------------------------------
try {
    $RootPath = [System.IO.Path]::GetPathRoot($ReleaseRoot)
    $DriveLetter = $RootPath.Replace('\', '')
    $DiskInfo = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq $DriveLetter }

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
} catch {
    Write-Host "[WARN] Storage Space check failed due to OS restrictions. Skipped." -ForegroundColor Yellow
}

# ---------------------------------------------------------
# 4. Check Directory Permissions (Uploads & Logs based on .env)
# ---------------------------------------------------------
function Test-DirPermissions {
    param([string]$RelativePath, [string]$DirLabel)
    
    if (-Not $RelativePath) {
        Write-Result "$DirLabel Directory" $false "Path not defined in .env."
        $global:AllPassed = $false
        return
    }

    # The backend runs from release/backend/, so relative paths in .env are relative to backend/
    $BackendDir = Join-Path $ReleaseRoot "backend"
    
    # Resolve the absolute path
    $CombinedPath = Join-Path $BackendDir $RelativePath
    $AbsPath = [System.IO.Path]::GetFullPath($CombinedPath)

    if (-Not (Test-Path $AbsPath)) {
        Write-Host "[WARN] $DirLabel Directory ($AbsPath) does not exist. Trying to create it..." -ForegroundColor Yellow
        try {
            New-Item -ItemType Directory -Path $AbsPath -Force | Out-Null
            Write-Result "$DirLabel Directory" $true "Successfully created $AbsPath."
        } catch {
            Write-Result "$DirLabel Directory" $false "Missing directory and no permission to create it at $AbsPath."
            $global:AllPassed = $false
            return
        }
    }

    try {
        $TestFile = Join-Path $AbsPath ".write_test.tmp"
        [IO.File]::WriteAllText($TestFile, "test")
        Remove-Item $TestFile
        Write-Result "$DirLabel Permissions" $true "Directory $AbsPath has Write permissions."
    } catch {
        Write-Result "$DirLabel Permissions" $false "No Write permissions at $AbsPath. Check Folder Security."
        $global:AllPassed = $false
    }
}

# Hardcoded checks for specific directories relative to backend/
Test-DirPermissions "../../customers" "Customers"
Test-DirPermissions "../../uploads" "Uploads"


if ($LogDirRelative) {
    Test-DirPermissions $LogDirRelative "Logs"
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
