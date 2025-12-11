# Deployment Guide: Credit Request System

This guide explains how to deploy the Credit Request System using Docker. It is designed for an **offline (air-gapped)** environment running Windows Server 2019.

## Prerequisites

### On the Online Machine (Development/Build)
1.  **Docker Desktop** installed and running.
2.  **Git** (to clone the repository).

### On the Offline Server (Target)
1.  **Docker Enterprise** or **Docker Desktop** installed.
    *   *Important:* Ensure Docker is running in **Linux Containers** mode (default for Docker Desktop).
2.  **Docker Compose** (usually included with Docker Desktop).

---

## Part 1: Packaging (On Online Machine)

1.  Open the project folder.
2.  Double-click **`save_images.bat`**.
    *   This script will build the latest version of the code.
    *   It will create two files: `credit-request-backend.tar` and `credit-request-frontend.tar`.
3.  Prepare a USB drive or transfer folder with the following files:
    *   `credit-request-backend.tar`
    *   `credit-request-frontend.tar`
    *   `docker-compose.yml`
    *   `load_images.bat`
    *   `.env` (Create this file, see below)

---

## Part 2: Configuration (.env)

Create a file named `.env` in the same folder as `docker-compose.yml`. This file tells the backend how to connect to your MSSQL database.

**Example `.env` content:**

```ini
# Database Configuration
DB_TYPE=mssql
DB_SERVER=192.168.1.100  # IP address of your MSSQL Server
DB_NAME=MyDatabaseName
DB_USER=sa
DB_PASSWORD=MySecurePassword
```

### Important Network Note for Windows
If your MSSQL database is running on the **host machine** (the same Windows Server running Docker), you generally cannot use `localhost` or `127.0.0.1` inside the container.

Instead, use:
*   `DB_SERVER=host.docker.internal` (If using Docker Desktop)
*   OR use the **LAN IP address** of the server (e.g., `10.0.0.5`).

---

## Part 3: Deployment (On Offline Server)

1.  Copy the files from your USB drive to a folder on the server (e.g., `C:\Apps\CreditRequest`).
2.  Double-click **`load_images.bat`**.
    *   This will import the Docker images into the local Docker registry.
3.  Open PowerShell or Command Prompt in that folder.
4.  Run the application:
    ```powershell
    docker-compose up -d
    ```
5.  The system should now be running.
    *   **Frontend:** `http://localhost` (or the server's IP address).
    *   **Backend:** Internal only (but reachable at port 3000 if needed for debugging).

## Troubleshooting

*   **Database Connection Failed:**
    *   Check your `.env` file credentials.
    *   Ensure the firewall on the MSSQL Server port (default 1433) allows connections from the Docker subnet.
    *   Try pinging the DB IP from inside the container:
        `docker-compose exec backend ping <DB_IP>`
*   **"Image not found":**
    *   Re-run `load_images.bat` and ensure it completes successfully.
