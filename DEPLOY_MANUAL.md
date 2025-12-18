# Manual Offline Deployment Guide (No Docker)

This guide describes how to deploy the application to an offline Windows Server 2019 environment using a self-contained "Native Bundle" approach. This avoids Docker complexity and works on any Windows machine.

## Prerequisites

### Online Machine (Development)
- Windows 10/11.
- Node.js installed (for building the frontend).
- Internet access.

### Offline Machine (Target Server)
- Windows Server 2019 (or any Windows version).
- MSSQL Database access.
- **No Docker required.**
- **No Node.js installation required** (it is bundled).

---

## Step 1: Create the Release Bundle (Online)

On your development machine:

1.  Open a command prompt in the project root.
2.  Run:
    ```cmd
    create_release.bat
    ```
    This script will:
    - Download a standalone Node.js binary (approx 30MB).
    - Run `npm run build` to compile the Vue frontend.
    - Copy the backend code and install production dependencies.
    - Create a folder named `release`.

## Step 2: Transfer to Server

1.  Copy the entire `release` folder to your offline server (e.g., via USB or VPN).
2.  (Optional) Rename the folder to something like `CreditRequestApp`.

## Step 3: Configure and Run (Offline Server)

On the server:

1.  Open the folder.
2.  (Optional) **Edit `start_server.bat`**:
    - If you need to change the port (default is **3000**), change `set PORT=3000`.
    - If you have multiple apps (e.g., your friend's Flask app), just pick a different port (e.g., 3001) for this app.
    - You can also set DB credentials here if not using a system-wide `.env` file.
3.  Double-click `start_server.bat`.

The application will start. You should see:
```
Server is running on http://localhost:3000
Serving frontend from: ...\dist
```

## Step 4: Accessing the App

- **Local:** Open Browser -> `http://localhost:3000`
- **LAN/VPN:** Open Browser -> `http://<SERVER_IP_ADDRESS>:3000`
  *(Ensure Windows Firewall allows traffic on Port 3000)*
