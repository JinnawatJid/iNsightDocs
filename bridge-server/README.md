# DBD Bridge Server

This application acts as a local bridge for the Credit Management System to access DBD DataWarehouse in air-gapped environments.

## Purpose

The main Credit System server may be hosted in an environment without internet access (Air-Gapped). To allow users to still "Auto Import" data from the DBD website, this small application runs on the user's local machine (which has internet access).

The web application connects to this local server (`localhost:4343`), which performs the scraping and file downloading, then passes the data back to the browser.

## Installation

1.  Ensure you have **Node.js** installed on your machine.
2.  Download or clone this `bridge-server` folder.
3.  Open a terminal/command prompt in this folder.
4.  Run `npm install` to install dependencies.

## Usage

1.  Start the server by running:
    ```bash
    npm start
    ```
2.  The server will start on port **4343**.
3.  Open the Credit Management System in your browser.
4.  Go to the "Statement" tab and click "Auto Download". The system will automatically detect this bridge and use it.

## Troubleshooting

-   **Port Conflict:** Ensure port 4343 is not used by another application.
-   **Firewall:** Ensure your local firewall allows connections to localhost:4343 (usually allowed by default).
