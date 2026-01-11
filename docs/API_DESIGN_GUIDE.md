# API Design Guide: Customer Credit Data Exchange

## 1. Introduction
This document outlines the design for the **Customer Credit Data API**, which allows external internal systems (specifically the Sales Department) to read active credit limits and terms from the Credit Request System.

## 2. What is OpenAPI?
You asked for a summary of the **OpenAPI Standard** (formerly known as Swagger).

*   **The Contract:** OpenAPI is a standardized format (usually written in YAML or JSON) that describes your API's capabilities. It's like a blueprint or a contract that says: *"If you send X to this URL, I promise to return Y."*
*   **Language Agnostic:** It doesn't matter if your backend is Node.js and the consumer is Python, Java, or SAP. The OpenAPI spec is the common language they both understand.
*   **Documentation & Testing:** The biggest benefit is that tools like **Swagger UI** can read this file and automatically generate a beautiful, interactive website where developers can try out the API endpoints directly in the browser without writing any code.
*   **Code Generation:** Advanced usage allows you to automatically generate client libraries (SDKs) for other teams based on this file.

## 3. API Design Decisions

### 3.1 Authentication: API Key
**Decision:** We are using **API Key Authentication** (Header: `X-API-KEY`).

**Reasoning:**
*   **Simplicity:** Since the consumers are on the same internal corporate network ("Native Bundle" / Intranet), setting up complex OAuth2 servers is unnecessary overhead and complicates the "Offline" deployment.
*   **Security:** An API Key provides a sufficient layer of security to prevent accidental access. We can rotate this key if needed.
*   **Industry Standard:** For server-to-server communication within a trusted network, API Keys are the standard "lightweight" approach.

### 3.2 Source of Truth Logic
**Decision:** The API does not just read the `Customers` table. Instead, it queries the **most recent transaction** in the `CreditRequests` table where `status = 'Approved'`.

**Why?**
*   The `Customers` table might contain static master data, but the `CreditRequests` table contains the actual *history of approvals*.
*   By fetching the latest *Approved* request, we ensure the Sales Department always gets the verified, legally binding credit limit that was signed off by the Manager/Committee.

### 3.3 Data Structure
The API returns the credit terms separately as requested:
*   `term_gs`: General Sales Term
*   `term_ae`: AE Product Term
*   `term_yc`: YC Product Term

This granular breakdown allows the Sales System to apply the correct payment rules per product line automatically.

## 4. Future Roadmap (AY_ACCUM)
In the next phase, you mentioned replacing the manual `AY_ACCUM` table with data fetched from other systems.
*   This API design focuses on **Reading** (Outbound).
*   For the future **Writing/Ingesting** (Inbound) of financial data, we will likely design a separate endpoint (e.g., `POST /api/financial-data/ingest`) or a background job, but that is out of scope for this specific document.

## 5. How to Use
1.  **Sales Developer:** Reads the `docs/openapi.yaml` file or views the Swagger UI (implementation pending).
2.  **Request:** They send a `GET` request to `http://your-server/api/external/credit-status/01016AY` with the header `X-API-KEY: your-secret-key`.
3.  **Response:** They receive a JSON object with the limit and terms.

---
*Created by Jules for the Credit Request System Project.*
