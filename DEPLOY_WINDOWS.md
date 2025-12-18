# Windows Server 2019 Offline Source Deployment Guide

This guide describes how to deploy the application to an offline Windows Server 2019 environment by transferring the **source code** and building the images directly on the target server. This strategy is required because the development machine (Windows 11 Home) cannot build Windows Containers.

## Prerequisites

### Online Machine (Development)
- Windows 10/11 (Home/Pro/Enterprise).
- Internet access to download Node.js and the Base Docker Image.
- No special Docker mode required (just for downloading).

### Offline Machine (Target Server)
- Windows Server 2019.
- Docker Enterprise/Engine installed.
- **Windows Containers** mode enabled.
- **Process Isolation** support.

## Step 1: Download Dependencies (Online)

On your development machine:

1.  Open a command prompt in the project root.
2.  Run:
    ```cmd
    download_deps.bat
    ```
    This will:
    - Download `nodejs.zip` (v18.19.0).
    - Pull and save `mcr.microsoft.com/windows/servercore:ltsc2019` to `base-servercore.tar`.
    - Save these into the `offline_deps` folder.

## Step 2: Package Source Code (Online)

1.  Run:
    ```cmd
    package_source.bat
    ```
    This will create a folder named `deployment_package`. It contains:
    - The source code (excluding `node_modules`).
    - The downloaded `nodejs.zip`.
    - The `base-servercore.tar`.
    - Installation scripts.

## Step 3: Transfer to Offline Server

Copy the entire `deployment_package` folder to your offline Windows Server (e.g., via USB).

## Step 4: Install and Build (Offline Server)

On the offline Windows Server:

1.  Open PowerShell or Command Prompt.
2.  Navigate to the `deployment_package` folder.
3.  Run:
    ```cmd
    offline_install.bat
    ```
    This script will:
    - Load the `base-servercore.tar` image into Docker.
    - Copy `nodejs.zip` to the correct build locations.
    - Run `build_images.bat` to compile the frontend and backend containers using the local resources.

## Step 5: Start the Application

1.  Run:
    ```cmd
    start_app.bat
    ```
    This launches the application using Docker Compose.

The application should now be accessible at `http://localhost`.
