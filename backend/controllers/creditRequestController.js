const db = require('../db');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');

const UPLOAD_BASE = process.env.UPLOAD_PATH
    ? path.resolve(process.cwd(), process.env.UPLOAD_PATH)
    : path.join(__dirname, '../uploads');

exports.getCreditRequestDetail = async (req, res) => {
    const { id } = req.params; // tx_id

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
                console.error('Error parsing snapshot JSON:', e);
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
        console.error('Error fetching credit request detail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.downloadCreditRequestFile = async (req, res) => {
    const { id, fileId } = req.params; // id = tx_id, fileId = attachment ID

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
        // Use filename*=UTF-8''... for better browser support of non-ASCII characters
        const encodedFilename = encodeURIComponent(fileRecord.original_name);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createCreditRequest = async (req, res) => {
  // When using multer, text fields are in req.body and files in req.files
  const {
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

  console.log('createCreditRequest Body:', { customer_no, request_amount, term_gs, term_ae, term_yc, request_type, is_submit, status: req.body.status });

  if (!customer_name || !customer_no) {
    return res.status(400).json({ error: 'Customer name and Customer No (ID) are required' });
  }

  // Parse snapshot_data if it's a string
  let parsedSnapshot = snapshot_data;
  if (typeof parsedSnapshot === 'string') {
    try {
        parsedSnapshot = JSON.parse(parsedSnapshot);
    } catch (e) {
        console.error('Error parsing snapshot data:', e);
        parsedSnapshot = {};
    }
  }

  try {
    // Check for existing active request for this customer
    // Legacy statuses: Submitted, Reviewed, PendingSales (ชั่วคราว), PendingFinance (ชั่วคราว)
    // New statuses: RegionalSubmitted, SalesSubmitted, Reviewed
    const activeStatuses = ['Draft', 'Opened', 'RegionalSubmitted', 'SalesSubmitted', 'Reviewed', 'PendingSales (ชั่วคราว)', 'PendingFinance (ชั่วคราว)', 'Submitted'];
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
        if (existing.status === 'Draft' && newStatus === 'Opened') {
            const now = new Date();
            const year = now.getFullYear();
            const yy = year.toString().slice(-2);
            const mm = (now.getMonth() + 1).toString().padStart(2, '0');
            const prefix = `AYCA${yy}${mm}/`;

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

            console.log(`Finalizing Draft ${oldTxId} to ${newRealTxId}`);

            // 1. Rename Folder
            // Determine old directory path (might be from a previous month)
            let oldDir = null;
            // Check if any attachments exist to get the exact path
            let attSql;
            if (db.dbType === 'mssql') {
                 attSql = 'SELECT TOP 1 file_path FROM CreditRequestAttachments WHERE tx_id = ?';
            } else {
                 attSql = 'SELECT file_path FROM CreditRequestAttachments WHERE tx_id = ? LIMIT 1';
            }
            const { rows: attRows } = await db.query(attSql, [oldTxId]);

            if (attRows && attRows.length > 0) {
                 // DB stores path as YYYY/MM/ID/filename.ext (Forward slashes)
                 const parts = attRows[0].file_path.split('/');
                 parts.pop(); // remove filename
                 // Join with OS separator for local FS operations
                 const relativeOldDir = parts.join(path.sep);
                 oldDir = path.join(UPLOAD_BASE, relativeOldDir);
            } else {
                 // Fallback: Use created_at of the draft
                 const createdDate = new Date(existing.created_at);
                 const cYear = createdDate.getFullYear();
                 const cMm = (createdDate.getMonth() + 1).toString().padStart(2, '0');
                 oldDir = path.join(UPLOAD_BASE, cYear.toString(), cMm, oldTxId);
            }

            const newDir = path.join(UPLOAD_BASE, year.toString(), mm, newRealTxId);

            if (oldDir && await fs.pathExists(oldDir)) {
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
                newRealTxId, existing.customer_no, existing.customer_name, existing.status,
                existing.request_amount, existing.request_reason, existing.request_credit_term,
                existing.term_gs, existing.term_ae, existing.term_yc, existing.request_type,
                existing.snapshot_data, existing.created_at
            ]);

            const newRequestId = insertResult.id;

            // 3. Update DB Attachments Paths (Move Children)
            // Path format: YYYY/MM/TXID/file.ext
            const oldPathSegment = `${oldTxId}/`;
            const newPathSegment = `${newRealTxId}/`;

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
        await db.runAsync(
          'UPDATE CreditRequests SET tx_id = ?, request_amount = ?, request_reason = ?, request_credit_term = ?, term_gs = ?, term_ae = ?, term_yc = ?, request_type = ?, snapshot_data = ?, status = ? WHERE id = ?',
          [txId, request_amount, request_reason, request_credit_term, term_gs, term_ae, term_yc, request_type, snapshot_data, status, requestId]
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
    if (req.files && req.files.length > 0) {
        const now = new Date();
        const year = now.getFullYear();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');

        // Construct relative path components
        const relativeDir = path.join(year.toString(), mm, txId);
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
                console.error('Error fixing encoding for fieldname:', file.fieldname, e);
            }

            const finalPath = path.join(targetDir, file.originalname);
            await fs.move(file.path, finalPath, { overwrite: true });

            // Store relative path in DB (e.g., 2023/10/TXID/file.pdf)
            // Use path.relative to get the relative path from UPLOAD_BASE
            // and normalize slashes to forward slashes for cross-platform compatibility
            const relativeFilePath = path.relative(UPLOAD_BASE, finalPath).split(path.sep).join('/');

            await db.runAsync(
                'INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name) VALUES (?, ?, ?, ?)',
                [txId, file.fieldname, relativeFilePath, file.originalname]
            );
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
    console.error('Error processing credit request:', error);
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
    console.error('Error fetching credit requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.cancelCreditRequest = async (req, res) => {
  const { id } = req.params;

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
    const activeStatuses = ['Draft', 'Opened', 'RegionalSubmitted', 'SalesSubmitted', 'Reviewed', 'PendingSales (ชั่วคราว)', 'PendingFinance (ชั่วคราว)', 'Submitted'];
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
    console.error('Error canceling credit request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getComments = async (req, res) => {
    const { id } = req.params; // tx_id
    try {
        let sql = `SELECT * FROM RequestComments WHERE tx_id = ? ORDER BY created_at ASC`;
        const { rows } = await db.query(sql, [id]);
        res.status(200).json({ data: rows });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
