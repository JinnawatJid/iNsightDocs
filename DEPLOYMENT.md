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
    *   `.env.example` (renamed to `.env` on target)

---

## Part 2: Configuration (.env)

Create a file named `.env` in the same folder as `docker-compose.yml`. You can copy `.env.example` and rename it.

**Since your Database is on the SAME server:**

Use `host.docker.internal` as the Server address. This is a special DNS name that lets the container talk to the Windows Host.

```ini
# Database Configuration
DB_TYPE=mssql
DB_SERVER=host.docker.internal
DB_NAME=MyDatabaseName
DB_USER=sa
DB_PASSWORD=MySecurePassword
```

### Critical Step: Windows Firewall & MSSQL Configuration
By default, Windows might block the container from reaching MSSQL.
1.  **Enable TCP/IP**: Open "Sql Server Configuration Manager" -> SQL Server Network Configuration -> Protocols -> Enable **TCP/IP**. Restart the SQL Server service.
2.  **Allow Port 1433**: Ensure Windows Firewall has an Inbound Rule allowing TCP port **1433**.
3.  **Authentication**: Ensure SQL Server is set to "SQL Server and Windows Authentication mode" (Mixed Mode), as Docker connects via username/password (`sa`), not Windows Auth.

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
    *   **Backend:** Internal only.

## Troubleshooting

*   **Database Connection Failed:**
    *   Check `.env` credentials.
    *   **Check Firewall:** The most common issue. Temporarily turn off Windows Firewall to test. If it works, add an allow rule for port 1433.
    *   **Ping Test:** `docker-compose exec backend ping host.docker.internal`
