# Windows Server 2019 Offline Deployment Guide

This guide describes how to deploy the application to an offline Windows Server 2019 environment using Native Windows Containers (Process Isolation).

## Prerequisites

### Online Machine (Development/Staging)
- Windows 10/11 or Windows Server.
- Docker Desktop (or Engine) **MUST be configured to use Windows Containers**.
    - *Right-click Docker tray icon -> Switch to Windows containers*.
- Access to the repository code.

### Offline Machine (Target Server)
- Windows Server 2019.
- Docker Enterprise/Engine installed.
- **Process Isolation** support (default on Server 2019).
- Firewall rule allowing port 80 (Frontend) and 3000 (Backend) if accessed externally.
- Firewall rule allowing TCP 1433 if connecting to a host MSSQL instance.

## Step 1: Build Images (Online)

On your machine with internet access:

1.  **IMPORTANT:** Switch Docker to **Windows Containers** mode.
2.  Open a command prompt in the project root.
3.  Run the build script:
    ```cmd
    build_images.bat
    ```
    This script will first verify that Docker is running in Windows mode. It will then pull the `mcr.microsoft.com/windows/servercore:ltsc2019` base image and build `credit-request-backend` and `credit-request-frontend`.
    *Note: The build process downloads Node.js v18.19.0 directly from nodejs.org, so internet access is required.*

## Step 2: Export Images (Online)

1.  Run the save script:
    ```cmd
    save_images.bat
    ```
    This creates two files:
    - `credit-request-backend.tar`
    - `credit-request-frontend.tar`

## Step 3: Transfer Files

Copy the following files to the offline server (e.g., via USB or local LAN):
- `credit-request-backend.tar`
- `credit-request-frontend.tar`
- `docker-compose.windows.yml`
- `load_images.bat`
- `start_app.bat`

## Step 4: Load Images (Offline Server)

On the offline Windows Server:

1.  Open PowerShell or Command Prompt.
2.  Navigate to the directory containing the transferred files.
3.  Run:
    ```cmd
    load_images.bat
    ```

## Step 5: Start the Application (Offline Server)

1.  Verify `docker-compose.windows.yml` configuration (e.g., Database connection string).
    - If using MSSQL on the host, ensure `DB_SERVER=host.docker.internal` is set.
2.  Run:
    ```cmd
    start_app.bat
    ```

The application should now be accessible at `http://localhost` (or the server's IP address).

## Notes

- **Database**: The configuration assumes you are connecting to an MSSQL instance on the host machine (`host.docker.internal`). Ensure TCP/IP is enabled in SQL Server Configuration Manager and the firewall permits port 1433.
- **Base Image**: The images are built on `mcr.microsoft.com/windows/servercore:ltsc2019`. This is strictly required for Windows Server 2019 process isolation.
- **Frontend Server**: The frontend uses a lightweight Node.js server (`static-server.js`) to serve files and proxy `/api` requests to the backend, replacing Nginx.
