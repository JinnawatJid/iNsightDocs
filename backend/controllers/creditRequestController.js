const logger = require('../utils/logger');
const db = require('../db');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');

let projectRoot = path.resolve(__dirname, '../../../../');
if (!fs.existsSync(path.join(projectRoot, 'customers'))) {
    projectRoot = path.resolve(__dirname, '../../');
}
const defaultUploadPath = path.join(projectRoot, 'uploads');

const UPLOAD_BASE = process.env.UPLOAD_PATH
    ? path.resolve(process.cwd(), process.env.UPLOAD_PATH)
    : defaultUploadPath;

exports.getCreditRequestDetail = async (req, res) => {
    const id = decodeURIComponent(req.params.id); // tx_id

    try {
        let sql;
        if (db.dbType === 'mssql') {
            sql = 'SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?';
        } else {
            sql = 'SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1';
        }

        const { rows } = await db.query(sql, [id]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Credit request not found' });
        }

        const request = rows[0];

        // Fetch Attachments
        const attachmentsSql = 'SELECT * FROM CreditRequestAttachments WHERE tx_id = ?';
        const { rows: attachments } = await db.query(attachmentsSql, [id]);

        // Fetch Comments
        const commentsSql = 'SELECT * FROM RequestComments WHERE tx_id = ? ORDER BY created_at ASC';
        const { rows: comments } = await db.query(commentsSql, [id]);

        // Parse snapshot data if string
        let snapshotData = request.snapshot_data;
        if (typeof snapshotData === 'string') {
            try {
                snapshotData = JSON.parse(snapshotData);
            } catch (e) {
                logger.error('Error parsing snapshot JSON:', e);
                snapshotData = {};
            }
        }

        const responseData = {
            id: request.id,
            txId: request.tx_id,
            status: request.status,
            customer_no: request.customer_no,
            customer_name: request.customer_name,
            request_amount: request.request_amount,
            request_reason: request.request_reason,
            request_credit_term: request.request_credit_term,
            term_gs: request.term_gs,
            term_ae: request.term_ae,
            term_yc: request.term_yc,
            request_type: request.request_type,
            created_at: request.created_at,
            updated_at: request.updated_at,
            snapshot_data: snapshotData,
            attachments: attachments || [],
            comments: comments || []
        };

        res.status(200).json({ data: responseData });

    } catch (error) {
        logger.error('Error fetching credit request detail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteAdditionalDocument = async (req, res) => {
    const { id, fileId } = req.params;
    const actor_role = req.body.actor_role;
    const username = req.user ? (req.user.empname || req.user.username) : 'System';

    try {
        // Get file details to delete it physically and add to audit log
        const fileSql = `SELECT file_path, original_name, file_type FROM CreditRequestAttachments WHERE id = ? AND tx_id = ?`;
        const { rows: files } = await db.query(fileSql, [fileId, id]);

        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = files[0];
        const fullPath = path.resolve(__dirname, '..', file.file_path);

        // Delete from database
        const deleteSql = `DELETE FROM CreditRequestAttachments WHERE id = ?`;
        await db.runAsync(deleteSql, [fileId]);

        // Try to delete physically
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (fsError) {
            logger.error(`Failed to delete file physically: ${fullPath}`, fsError);
            // We continue even if physical delete fails, database is primary source of truth
        }

        // Add audit comment
        const comment = `เอกสาร ${file.original_name} (${file.file_type || 'เอกสารเพิ่มเติม'}) ถูกลบโดย ${username}`;
        let commentSql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))`;
        let commentParams = [id, actor_role || 'System', comment];

        if (db.dbType === 'mssql') {
             commentSql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, created_at) VALUES (?, ?, ?, GETDATE())`;
        }

        await db.runAsync(commentSql, commentParams);

        logger.info(`Deleted file ${fileId} from request ${id}`);

        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.downloadCreditRequestFile = async (req, res) => {
    const id = decodeURIComponent(req.params.id); // tx_id
    const { fileId } = req.params; // attachment ID

    try {
        let sql;
        if (db.dbType === 'mssql') {
            sql = 'SELECT TOP 1 * FROM CreditRequestAttachments WHERE id = ? AND tx_id = ?';
        } else {
            sql = 'SELECT * FROM CreditRequestAttachments WHERE id = ? AND tx_id = ? LIMIT 1';
        }

        const { rows } = await db.query(sql, [fileId, id]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const fileRecord = rows[0];
        let filePath = fileRecord.file_path;

        // Handle relative paths (new format) vs absolute paths (legacy format)
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(UPLOAD_BASE, filePath);
        }

        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);

        // Use the actual physical file name for downloads instead of the short original name
        const physicalFilename = path.basename(filePath);
        // Use filename*=UTF-8''... for better browser support of non-ASCII characters
        const encodedFilename = encodeURIComponent(physicalFilename);

        // Check if the client requested inline viewing (e.g. for native PDF/Image preview in browser)
        const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
        res.setHeader('Content-Disposition', `${disposition}; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        logger.error('Error downloading file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createCreditRequest = async (req, res) => {
  // When using multer, text fields are in req.body and files in req.files
  const {
    tx_id,
    customer_no,
    customer_name,
    request_amount,
    request_reason,
    request_credit_term,
    term_gs,
    term_ae,
    term_yc,
    request_type,
    snapshot_data,
    is_submit
  } = req.body;

  logger.info('createCreditRequest Body:', { tx_id, customer_no, request_amount, term_gs, term_ae, term_yc, request_type, is_submit, status: req.body.status });

  if (!customer_name || !customer_no) {
    return res.status(400).json({ error: 'Customer name and Customer No (ID) are required' });
  }

  // Determine who uploaded the file
  let uploadedBy = null;
  if (req.user && req.user.empname) {
      uploadedBy = req.user.empname;
  } else if (req.user && req.user.username) {
      uploadedBy = req.user.username;
  } else if (req.body.actor_role) {
      uploadedBy = req.body.actor_role;
  }

  // Parse snapshot_data if it's a string
  let parsedSnapshot = snapshot_data;
  if (typeof parsedSnapshot === 'string') {
    try {
        parsedSnapshot = JSON.parse(parsedSnapshot);
    } catch (e) {
        logger.error('Error parsing snapshot data:', e);
        parsedSnapshot = {};
    }
  }

  try {
    // Check for existing active request for this customer
    // Legacy statuses: Submitted, Reviewed
    // New statuses: RegionalSubmitted, SalesSubmitted, Reviewed
    const activeStatuses = ['Draft', 'Opened', 'RegionalSubmitted', 'SalesSubmitted', 'Reviewed', 'Submitted'];
    const statusPlaceholders = activeStatuses.map(() => '?').join(',');

    let existingSql;
    if (db.dbType === 'mssql') {
      existingSql = `
        SELECT TOP 1 * FROM CreditRequests
        WHERE customer_no = ? AND status IN (${statusPlaceholders})
      `;
    } else {
      existingSql = `
        SELECT * FROM CreditRequests
        WHERE customer_no = ? AND status IN (${statusPlaceholders})
        LIMIT 1
      `;
    }
    const { rows } = await db.query(existingSql, [customer_no, ...activeStatuses]);

    let txId;
    let requestId;
    let status;
    let responseSnapshot = null;
    let responseAmount = null;
    let responseReason = null;
    let responseCreditTerm = null;
    let responseTermGS = null;
    let responseTermAE = null;
    let responseTermYC = null;
    let responseRequestType = null;

    if (rows && rows.length > 0) {
      const existing = rows[0];

      // CONCURRENCY CHECK
      // If the client provided a tx_id (meaning they think they are updating a specific request)
      // and it does not match the active request's tx_id (e.g. they submitted a Draft that is now Opened with a real ID),
      // or if they are trying to create/submit without a tx_id but an active non-Draft request already exists.
      const clientTxIdMismatch = tx_id && tx_id !== existing.tx_id;
      const existingNotDraft = existing.status !== 'Draft';

      // If client submits a request, but the existing request in DB is no longer a Draft,
      // AND it's a new submission attempt (either no tx_id, or they are trying to transition it),
      // it means someone else already submitted it.
      // We check if the client is trying to transition to 'Opened' (which indicates initial submission)
      // or if they are simply doing a saveDraft (which will have no req.body.status but is_submit will be false).
      const isSubmittingNewRequest = is_submit === 'true' && (!req.body.status || req.body.status === 'Opened');

      if (clientTxIdMismatch || (isSubmittingNewRequest && existingNotDraft)) {
          logger.warn(`Concurrency conflict detected for customer ${customer_no}. Client tx_id: ${tx_id}, Active tx_id: ${existing.tx_id}, Active status: ${existing.status}`);
          return res.status(409).json({ error: 'มีคำขอเครดิตที่กำลังดำเนินการอยู่สำหรับลูกค้ารายนี้ โปรดรีเฟรชหน้าจอ' });
      }

      // EXISTING REQUEST FOUND
      txId = existing.tx_id;
      requestId = existing.id;
      status = existing.status;

      // If is_submit is true, we update the data and possibly the status
      // We also handle "status" passed explicitly in the body for status transitions
      if (is_submit === 'true' || is_submit === true || req.body.status) {

        let newStatus = req.body.status || existing.status;

        // --- TxID Generation Logic (Draft -> Opened) ---
        // If we are transitioning from Draft to Opened, we must generate the real ID
        if (existing.status === 'Draft' && newStatus === 'Opened' && !existing.tx_id.includes('-R')) {
            const now = new Date();
            const year = now.getFullYear();
            const yy = year.toString().slice(-2);
            const mm = (now.getMonth() + 1).toString().padStart(2, '0');

            // Extract branchCode from JWT payload (req.user is set by authMiddleware)
            const branchCode = req.user?.branchCode || 'XX';
            const prefix = `${branchCode}CA${yy}${mm}/`;

            // Find the latest running number
            let latestSql;
            if (db.dbType === 'mssql') {
                latestSql = `SELECT TOP 1 tx_id FROM CreditRequests WHERE tx_id LIKE ? ORDER BY tx_id DESC`;
            } else {
                latestSql = `SELECT tx_id FROM CreditRequests WHERE tx_id LIKE ? ORDER BY tx_id DESC LIMIT 1`;
            }
            const { rows: latestRows } = await db.query(latestSql, [`${prefix}%`]);

            let runningNum = 1;
            if (latestRows && latestRows.length > 0) {
                const lastTxId = latestRows[0].tx_id;
                const lastNumStr = lastTxId.split('/')[1];
                const lastNum = parseInt(lastNumStr, 10);
                if (!isNaN(lastNum)) runningNum = lastNum + 1;
            }

            if (runningNum > 999) return res.status(500).json({ error: 'Transaction limit exceeded for this month' });

            const newRealTxId = `${prefix}${runningNum.toString().padStart(3, '0')}`;
            const oldTxId = txId;
            const oldRequestId = requestId;

            logger.info(`Finalizing Draft ${oldTxId} to ${newRealTxId}`);

            // 1. Rename Folder
            // Determine old and new directory paths based on customer code
            const cleanOldTxId = oldTxId.replace(/\//g, '_');
            const cleanNewTxId = newRealTxId.replace(/\//g, '_');

            const oldDir = path.join(UPLOAD_BASE, existing.customer_no, cleanOldTxId);
            const newDir = path.join(UPLOAD_BASE, existing.customer_no, cleanNewTxId);

            if (await fs.pathExists(oldDir)) {
                // Ensure parent of newDir exists
                await fs.ensureDir(path.dirname(newDir));
                await fs.move(oldDir, newDir);
            }

            // 2. Clone Parent Record with New ID (to satisfy FK constraints in MSSQL)
            // We insert a new record, move children, then delete the old record.
            const insertSql = `INSERT INTO CreditRequests (
                tx_id, customer_no, customer_name, status,
                request_amount, request_reason, request_credit_term,
                term_gs, term_ae, term_yc, request_type, snapshot_data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const insertResult = await db.runAsync(insertSql, [
                newRealTxId,
                existing.customer_no,
                existing.customer_name,
                existing.status,
                request_amount !== undefined ? request_amount : existing.request_amount,
                request_reason !== undefined ? request_reason : existing.request_reason,
                request_credit_term !== undefined ? request_credit_term : existing.request_credit_term,
                term_gs !== undefined ? term_gs : existing.term_gs,
                term_ae !== undefined ? term_ae : existing.term_ae,
                term_yc !== undefined ? term_yc : existing.term_yc,
                request_type !== undefined ? request_type : existing.request_type,
                snapshot_data !== undefined ? snapshot_data : existing.snapshot_data,
                existing.created_at
            ]);

            const newRequestId = insertResult.id;

            // 3. Update DB Attachments Paths (Move Children)
            // Path format: customer_no/TXID/file.ext
            const cleanOldTxIdUpdate = oldTxId.replace(/\//g, '_');
            const cleanNewTxIdUpdate = newRealTxId.replace(/\//g, '_');
            const oldPathSegment = `${cleanOldTxIdUpdate}/`;
            const newPathSegment = `${cleanNewTxIdUpdate}/`;

            await db.runAsync(
                `UPDATE CreditRequestAttachments SET tx_id = ?, file_path = REPLACE(file_path, ?, ?) WHERE tx_id = ?`,
                [newRealTxId, oldPathSegment, newPathSegment, oldTxId]
            );

            // 4. Update Comments (Move Children)
            await db.runAsync(`UPDATE RequestComments SET tx_id = ? WHERE tx_id = ?`, [newRealTxId, oldTxId]);

            // 5. Delete Old Parent Record
            await db.runAsync('DELETE FROM CreditRequests WHERE id = ?', [oldRequestId]);

            // 6. Update Variables for subsequent logic
            txId = newRealTxId;
            requestId = newRequestId;
        }

        status = newStatus;

        // Update Query (including tx_id in case it changed)
        const updatedAt = new Date().toISOString();
        await db.runAsync(
          'UPDATE CreditRequests SET tx_id = ?, request_amount = ?, request_reason = ?, request_credit_term = ?, term_gs = ?, term_ae = ?, term_yc = ?, request_type = ?, snapshot_data = ?, status = ?, updated_at = ? WHERE id = ?',
          [txId, request_amount, request_reason, request_credit_term, term_gs, term_ae, term_yc, request_type, snapshot_data, status, updatedAt, requestId]
        );

        // Handle Comment insertion
        if (req.body.comment && req.body.actor_role) {
             await db.runAsync(
                'INSERT INTO RequestComments (tx_id, actor_role, comment_text) VALUES (?, ?, ?)',
                [txId, req.body.actor_role, req.body.comment]
             );
        }

      } else {
        // Just return existing request
        responseSnapshot = existing.snapshot_data;
        responseAmount = existing.request_amount;
        responseReason = existing.request_reason;
        responseCreditTerm = existing.request_credit_term;
        responseTermGS = existing.term_gs;
        responseTermAE = existing.term_ae;
        responseTermYC = existing.term_yc;
        responseRequestType = existing.request_type;
      }

    } else {
      // Create NEW Request (DRAFT)
      // Generate Temporary TxId: TMP-[Timestamp]
      const now = new Date();
      txId = `TMP-${now.getTime()}`;

      status = 'Draft';

      const result = await db.runAsync(
        'INSERT INTO CreditRequests (tx_id, customer_no, customer_name, status, request_amount, request_reason, request_credit_term, term_gs, term_ae, term_yc, request_type, snapshot_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [txId, customer_no, customer_name, status, request_amount, request_reason, request_credit_term, term_gs, term_ae, term_yc, request_type, snapshot_data]
      );
      requestId = result.id;
    }

    // Handle File Uploads
    // --- HANDLE NO FINANCIAL DATA MARKER ---
    const activeCustomerNo = customer_no || existing?.customer_no;

    // Extract date calculation variables to be used by both blocks
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    if (activeCustomerNo && parsedSnapshot?.transaction_data?.noFinancialData === true) {
        try {
            const dateFolder = `${yyyy}${mm}${dd}`;

            const customerDir = path.join(projectRoot, 'customers', activeCustomerNo, dateFolder);
            await fs.ensureDir(customerDir);

            const markerPath = path.join(customerDir, 'DBD_NoFinancialData.txt');
            await fs.outputFile(markerPath, 'No financial statements submitted by customer.');
            logger.info(`[Financial Sync] Created no financial data marker at ${markerPath}`);
        } catch (markerErr) {
            logger.error(`[Financial Sync] Error creating no financial data marker:`, markerErr);
        }
    }

    if (req.files && req.files.length > 0) {
        // Construct relative path components based on customer code and transaction ID
        const activeCustomerNo = customer_no || existing?.customer_no;
        if (!activeCustomerNo) {
             throw new Error("Customer Number is required to save uploaded files.");
        }

        const cleanTxId = txId.replace(/\//g, '_');
        const relativeDir = path.join(activeCustomerNo, cleanTxId);
        const targetDir = path.join(UPLOAD_BASE, relativeDir);
        await fs.ensureDir(targetDir);

        for (const file of req.files) {
            // Fix for Thai characters in fieldname (similar to originalname fix in upload.js)
            // Browser sends UTF-8, but it might be interpreted as Latin-1 by the parser
            try {
                // Only attempt to fix if the string contains only Latin-1 characters (Mojibake usually fits in Latin-1)
                // If it already contains characters > 255 (e.g. Thai), it is likely already correct/decoded.
                if (!/[^\u0000-\u00ff]/.test(file.fieldname)) {
                    file.fieldname = Buffer.from(file.fieldname, 'latin1').toString('utf8');
                }
            } catch (e) {
                logger.error('Error fixing encoding for fieldname:', file.fieldname, e);
            }

            // Generate secure contextual file name: [Customer_No]_[Original_Name_Without_Ext]_[YYYYMMDD_HHMMSS]_[Milliseconds].[Ext]
            const parsedName = path.parse(file.originalname);
            const originalNameWithoutExt = parsedName.name;
            const ext = parsedName.ext;

            // Format timestamp (YYYYMMDD_HHMMSS_SSS)
            const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}_${ms}`;

            // Replace spaces with underscores and remove any problematic characters from the original name (optional but good practice)
            // But we'll mostly leave it alone to preserve the original as requested, just appending the rest.
            const safeOriginalName = originalNameWithoutExt.replace(/[\/:*?"<>|]/g, '_');

            const secureFileName = `${customer_no}_${safeOriginalName}_${timestamp}${ext}`;

            const finalPath = path.join(targetDir, secureFileName);
            await fs.move(file.path, finalPath, { overwrite: true });

            // Store relative path in DB (e.g., 00001AY/TXID/file.pdf)
            // Use path.relative to get the relative path from UPLOAD_BASE
            // and normalize slashes to forward slashes for cross-platform compatibility
            const relativeFilePath = path.relative(UPLOAD_BASE, finalPath).split(path.sep).join('/');

            await db.runAsync(
                'INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name, uploaded_by) VALUES (?, ?, ?, ?, ?)',
                [txId, file.fieldname, relativeFilePath, file.originalname, uploadedBy]
            );

            // --- SYNC TO FINANCIAL CACHE (customers/YYYYMMDD) ---
            const financialFields = {
                'company_profile_doc': 'DBD_Profile.pdf',
                'balance_sheet_doc': 'DBD_BalanceSheet.xlsx',
                'profit_loss_doc': 'DBD_IncomeStatement.xlsx',
                'financial_ratios_doc': 'DBD_FinancialRatios.xlsx'
            };

            if (financialFields[file.fieldname]) {
                try {
                    // Determine Date Folder (YYYYMMDD)
                    const dateFolder = `${yyyy}${mm}${dd}`;
                    const customerDir = path.join(projectRoot, 'customers', activeCustomerNo, dateFolder);
                    await fs.ensureDir(customerDir);

                    const cachedFileName = financialFields[file.fieldname];
                    const cachedFilePath = path.join(customerDir, cachedFileName);

                    // Copy file to financial cache
                    await fs.copy(finalPath, cachedFilePath, { overwrite: true });
                    logger.info(`[Financial Sync] Copied ${file.fieldname} to ${cachedFilePath}`);
                } catch (syncErr) {
                    logger.error(`[Financial Sync] Error copying ${file.fieldname} to financial cache:`, syncErr);
                }
            }
        }
    }

    // Fetch attachments to return in response (essential for auto-resume flow)
    let attachments = [];
    if (txId) {
         const attSql = 'SELECT * FROM CreditRequestAttachments WHERE tx_id = ?';
         const { rows } = await db.query(attSql, [txId]);
         attachments = rows || [];
    }

    let responseData = {
        id: requestId,
        txId,
        status,
        customer_name,
        customer_no,
        attachments,
        // For Opened requests (existing or new), return what we have
        snapshot_data: responseSnapshot || snapshot_data,
        request_amount: responseAmount || request_amount,
        request_reason: responseReason || request_reason,
        request_credit_term: responseCreditTerm || request_credit_term,
        term_gs: responseTermGS !== null ? responseTermGS : term_gs,
        term_ae: responseTermAE !== null ? responseTermAE : term_ae,
        term_yc: responseTermYC !== null ? responseTermYC : term_yc,
        request_type: responseRequestType || request_type
    };

    res.status(201).json({
      message: status === 'Submitted' ? 'Credit request submitted successfully' : 'Credit request initialized/retrieved',
      data: responseData
    });

  } catch (error) {
    logger.error('Error processing credit request:', error);
    if (req.files) {
        req.files.forEach(f => fs.remove(f.path).catch(() => {}));
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCreditRequests = async (req, res) => {
  const { status, search } = req.query;

  try {
    let sql = `
      SELECT id, tx_id, customer_no, customer_name, status, request_amount, request_type, created_at
      FROM CreditRequests
    `;
    const params = [];
    const conditions = [];

    if (status) {
      // Split status by comma if multiple statuses are provided (e.g. ?status=Submitted,Reviewed)
      const statusList = status.split(',').map(s => s.trim());
      if (statusList.length > 0) {
        const placeholders = statusList.map(() => '?').join(',');
        conditions.push(`status IN (${placeholders})`);
        params.push(...statusList);
      }
    }

    if (search) {
      conditions.push(`customer_name LIKE ?`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY created_at DESC`;

    const { rows } = await db.query(sql, params);

    res.status(200).json({
      data: rows
    });

  } catch (error) {
    logger.error('Error fetching credit requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.cancelCreditRequest = async (req, res) => {
  const id = decodeURIComponent(req.params.id);

  try {
    // Check if request exists
    let requestSql;
    if (db.dbType === 'mssql') {
      requestSql = 'SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?';
    } else {
      requestSql = 'SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1';
    }
    const { rows } = await db.query(requestSql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Credit request not found' });
    }

    // Allow cancel for any active status
    const activeStatuses = ['Draft', 'Opened', 'RegionalSubmitted', 'SalesSubmitted', 'Reviewed', 'Submitted'];
    const request = rows[0];

    if (!activeStatuses.includes(request.status)) {
        return res.status(400).json({ error: 'Cannot cancel request in current status' });
    }

    await db.runAsync(
      'UPDATE CreditRequests SET status = ? WHERE tx_id = ?',
      ['Canceled', id]
    );

    res.status(200).json({ message: 'Credit request canceled successfully' });

  } catch (error) {
    logger.error('Error canceling credit request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getComments = async (req, res) => {
    const id = decodeURIComponent(req.params.id); // tx_id
    try {
        let sql = `SELECT * FROM RequestComments WHERE tx_id = ? ORDER BY created_at ASC`;
        const { rows } = await db.query(sql, [id]);
        res.status(200).json({ data: rows });
    } catch (error) {
        logger.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.reviseRequest = async (req, res) => {
    const id = decodeURIComponent(req.params.id); // tx_id
    logger.info(`Revise Request called for tx_id: ${id}`);
    try {
        // 1. Fetch the existing rejected request
        let requestSql;
        if (db.dbType === 'mssql') {
            requestSql = 'SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?';
        } else {
            requestSql = 'SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1';
        }
        const { rows } = await db.query(requestSql, [id]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Credit request not found' });
        }

        const oldRequest = rows[0];

        // 2. Verify it's rejected
        if (oldRequest.status !== 'Rejected') {
            return res.status(400).json({ error: 'Only rejected requests can be revised.' });
        }

        // 3. Generate new revision ID
        let baseId = id;
        let revisionNumber = 1;

        const match = id.match(/(.*?)-R(\d+)$/);
        if (match) {
            baseId = match[1];
            revisionNumber = parseInt(match[2], 10) + 1;
        }

        const newTxId = `${baseId}-R${revisionNumber}`;
        logger.info(`Creating revision: ${newTxId} from ${id}`);

        // Check if this revision already exists (safety check)
        let checkRevisionSql;
        if (db.dbType === 'mssql') {
            checkRevisionSql = 'SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?';
        } else {
            checkRevisionSql = 'SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1';
        }
        const { rows: existingRevision } = await db.query(checkRevisionSql, [newTxId]);

        if (existingRevision && existingRevision.length > 0) {
            return res.status(400).json({ error: `Revision ${newTxId} already exists.` });
        }

        // 4. Duplicate the request record (exclude approval flags, comments, set status to Draft)
        let snapshotDataObj = {};
        if (oldRequest.snapshot_data) {
            try {
                snapshotDataObj = typeof oldRequest.snapshot_data === 'string' ? JSON.parse(oldRequest.snapshot_data) : oldRequest.snapshot_data;

                // Clear out approval comments from snapshot data if they exist
                if (snapshotDataObj.review_comment) snapshotDataObj.review_comment = '';
                if (snapshotDataObj.regional_review_comment) snapshotDataObj.regional_review_comment = '';
                if (snapshotDataObj.sales_review_comment) snapshotDataObj.sales_review_comment = '';
            } catch (e) {
                logger.error('Error parsing old snapshot data for revision', e);
            }
        }

        // Convert back to string for db storage
        const newSnapshotData = JSON.stringify(snapshotDataObj);

        let insertSql;
        let insertParams;

        if (db.dbType === 'mssql') {
           insertSql = `
                INSERT INTO CreditRequests (
                    customer_no, customer_name, tx_id, status, request_amount,
                    request_reason, request_credit_term, term_gs, term_ae, term_yc,
                    request_type, snapshot_data
                )
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            insertParams = [
                oldRequest.customer_no,
                oldRequest.customer_name,
                newTxId,
                oldRequest.request_amount,
                oldRequest.request_reason,
                oldRequest.request_credit_term,
                oldRequest.term_gs,
                oldRequest.term_ae,
                oldRequest.term_yc,
                oldRequest.request_type,
                newSnapshotData
            ];
        } else {
            insertSql = `
                INSERT INTO CreditRequests (
                    customer_no, customer_name, tx_id, status, request_amount,
                    request_reason, request_credit_term, term_gs, term_ae, term_yc,
                    request_type, snapshot_data
                )
                VALUES (?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            insertParams = [
                oldRequest.customer_no,
                oldRequest.customer_name,
                newTxId,
                oldRequest.request_amount,
                oldRequest.request_reason,
                oldRequest.request_credit_term,
                oldRequest.term_gs,
                oldRequest.term_ae,
                oldRequest.term_yc,
                oldRequest.request_type,
                newSnapshotData
            ];
        }

        const insertResult = await db.query(insertSql, insertParams);

        // 5. Copy physical files
        const cleanOldId = id.replace(/\//g, '_');
        const cleanNewId = newTxId.replace(/\//g, '_');
        const oldDirPath = path.join(UPLOAD_BASE, oldRequest.customer_no, cleanOldId);
        const newDirPath = path.join(UPLOAD_BASE, oldRequest.customer_no, cleanNewId);

        if (await fs.pathExists(oldDirPath)) {
             await fs.copy(oldDirPath, newDirPath);
             logger.info(`Copied files from ${oldDirPath} to ${newDirPath}`);

             // After copying physical files, copy the DB attachment records for the new revision
             // with updated relative paths.
             const oldAttSql = 'SELECT * FROM CreditRequestAttachments WHERE tx_id = ?';
             const { rows: oldAttachments } = await db.query(oldAttSql, [id]);

             if (oldAttachments && oldAttachments.length > 0) {
                 for (const att of oldAttachments) {
                     // Path format: customer_no/oldTxId/file.ext
                     const oldPathSegment = `${cleanOldId}/`;
                     const newPathSegment = `${cleanNewId}/`;
                     const newRelativePath = att.file_path.replace(oldPathSegment, newPathSegment);

                     await db.runAsync(
                         'INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name, uploaded_by) VALUES (?, ?, ?, ?, ?)',
                         [newTxId, att.file_type, newRelativePath, att.original_name, att.uploaded_by || null]
                     );
                 }
             }
        } else {
             logger.info(`No files found to copy at ${oldDirPath}`);
        }

        res.status(200).json({
            message: 'Request revised successfully',
            newTxId: newTxId
        });

    } catch (error) {
        logger.error('Error revising credit request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.uploadAdditionalDocument = async (req, res) => {
    const txId = decodeURIComponent(req.params.id);
    const { documentType, documentDescription } = req.body;

    logger.info(`Uploading additional document for TX ID: ${txId}`, { documentType, documentDescription });

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No file provided.' });
    }

    const file = req.files[0];

    // Resolve user identity
    let uploadedBy = null;
    if (req.user) {
        uploadedBy = req.user.empname || req.user.username;
    } else if (req.body.actor_role) {
        uploadedBy = req.body.actor_role;
    }

    try {
        // Fetch the request to verify it exists and get customer info for folder structure
        let reqSql = `SELECT customer_no, created_at FROM CreditRequests WHERE tx_id = ?`;
        const { rows: reqResult } = await db.query(reqSql, [txId]);

        if (!reqResult || reqResult.length === 0) {
            return res.status(404).json({ error: 'Credit request not found.' });
        }

        const requestData = reqResult[0];
        const customerNo = requestData.customer_no;

        // Create the physical folder structure matching existing uploads
        const creationDate = new Date(requestData.created_at);
        const yyyymmdd = `${creationDate.getFullYear()}${String(creationDate.getMonth() + 1).padStart(2, '0')}${String(creationDate.getDate()).padStart(2, '0')}`;

        const customerDir = path.join(defaultUploadPath, customerNo, yyyymmdd);
        if (!fs.existsSync(customerDir)) {
            fs.mkdirSync(customerDir, { recursive: true });
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}_${String(now.getMilliseconds()).padStart(3, '0')}`;

        const ext = path.extname(file.originalname).toLowerCase();

        // Allowed extensions map (similar to the frontend restriction)
        const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'];
        if (!allowedExtensions.includes(ext)) {
             return res.status(400).json({ error: 'Invalid file type.' });
        }

        const safeOriginalName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9ก-๙]/g, '_');
        const physicalFileName = `${customerNo}_${safeOriginalName}_${dateStr}${ext}`;
        const newPhysicalPath = path.join(customerDir, physicalFileName);

        // Move the file from temp storage to final destination
        fs.renameSync(file.path, newPhysicalPath);

        // Prepare the logical path to store in DB (relative to base dir)
        const relativeFilePath = path.join('customers', customerNo, yyyymmdd, physicalFileName).replace(/\\/g, '/');

        // Define file type as additional document, include document type if available
        let fileType = 'additional_doc';
        if (documentType) {
             fileType = `additional_doc:${documentType}`;
        }

        const insertSql = 'INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name, uploaded_by) VALUES (?, ?, ?, ?, ?)';
        const insertParams = [txId, fileType, relativeFilePath, file.originalname, uploadedBy];

        const result = await db.runAsync(insertSql, insertParams);

        let newId = result.insertId;
        if (db.dbType === 'mssql') {
            // Retrieve identity from last insert
            const { rows: identQuery } = await db.query('SELECT @@IDENTITY AS insertId');
            if (identQuery && identQuery.length > 0) {
               newId = identQuery[0].insertId;
            }
        }

        // Also log the description if provided
        if (documentDescription) {
            let commentSql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))`;
            if (db.dbType === 'mssql') {
                 commentSql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, created_at) VALUES (?, ?, ?, GETDATE())`;
            }
            await db.runAsync(commentSql, [txId, 'System', `Additional Document Uploaded (${file.originalname}): ${documentDescription}`]);
        }

        logger.info(`Successfully uploaded additional document for ${txId}. File ID: ${newId}`);

        res.status(200).json({
            message: 'Additional document uploaded successfully',
            file: {
                id: newId,
                file_type: fileType,
                original_name: file.originalname,
                uploaded_by: uploadedBy
            }
        });

    } catch (error) {
        logger.error(`Error uploading additional document for TX ID: ${txId}`, error);
        res.status(500).json({ error: 'Internal server error while uploading document.' });
    }
};

exports.addComment = async (req, res) => {
    const id = decodeURIComponent(req.params.id); // tx_id
    const { comment, actor_role } = req.body;

    // Resolve user identity
    const username = req.user ? (req.user.empname || req.user.username) : 'System';

    try {
        let sql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))`;
        let params = [id, actor_role || 'System', comment];

        if (db.dbType === 'mssql') {
             sql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, created_at) VALUES (?, ?, ?, GETDATE())`;
        }

        await db.query(sql, params);

        logger.info(`Added system comment to ${id}: ${comment}`);

        res.status(201).json({ message: 'Comment added successfully' });
    } catch (error) {
        logger.error('Error adding comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
