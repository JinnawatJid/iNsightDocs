# Data Operations Scripts

This guide documents standalone Node.js utility scripts designed to perform safe, manual database and data operations without requiring code redeployments or server restarts. These scripts are typically run via the command line interface (CLI) on the backend server.

## 1. Clean Duplicate Attachments (`scripts/clean-duplicates.cjs`)

### Context
A previous bug in the save/draft process occasionally caused identical file attachment records to be inserted into the `CreditRequestAttachments` database table. While the core bug was fixed, legacy requests still retained these duplicate records, causing them to render multiple times in the frontend UI (e.g., in the "เอกสารแนบ" sections).

### Purpose
The `clean-duplicates.cjs` script provides a safe, interactive method to clean up these specific legacy duplicates for a given transaction ID (`tx_id`).

Crucially, **it only performs "soft deletes" (`is_deleted = 1`) on the database records.** It explicitly avoids using `fs.unlinkSync` to delete physical files. This is because duplicate database records often point to the exact same physical file path on the server; deleting the physical file for a duplicate record would inadvertently break the legitimate, kept record.

### How it Works

1. **Initialization**: Connects to the database (using `db.initialize()` for MSSQL).
2. **Querying**: Fetches all active (not deleted) attachments for the provided `txId`.
3. **Grouping & Identification**:
   * For standard single-upload fields (e.g., `company_profile_doc`): It groups by `file_type` only. If multiple records exist for one type, it's a duplicate.
   * For multi-upload fields (e.g., `other_general:รูปถ่ายหน้างาน`): It groups by both `file_type` AND `original_name`. Because these fields legitimately allow multiple different files, it only considers them duplicates if the exact same file name was uploaded multiple times to the same category.
4. **Sorting**: It identifies the "newest" file by ordering `id DESC` and keeps `files[0]`.
5. **Interactive Confirmation**: It prints a summary of records to keep and records to delete, and pauses to prompt the user to type `YES`.
6. **Execution**: Soft-deletes the older duplicate records.

### Usage

Run the script from the project root using Node.js.

```bash
node scripts/clean-duplicates.cjs
```
The script will prompt you to enter the Transaction ID.

Alternatively, provide the Transaction ID directly as an argument:
```bash
node scripts/clean-duplicates.cjs "00TRCA2603/02"
```

### Safety Precautions
* **Physical Files**: The script does not touch physical files. If you need to recover disk space later, a separate deep-cleanup script that checks reference counts would be required.
* **Environment**: The script loads `.env` variables using `dotenv` to ensure it connects to the same database as the backend server.
* **ES Modules**: The script uses the `.cjs` extension to force CommonJS parsing. This is required because the `package.json` specifies `"type": "module"`, but the internal `backend/db.js` wrapper utilizes CommonJS `require()`.