const db = require('../db');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');

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
        const filePath = fileRecord.file_path;

        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.original_name)}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createCreditRequest = async (req, res) => {
  // When using multer, text fields are in req.body and files in req.files
  const { customer_no, customer_name, request_amount, request_reason, request_credit_term, snapshot_data, is_submit } = req.body;

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
    // Check for existing active request for this customer (Draft, Opened, Submitted, Reviewed, PendingSales, PendingFinance)
    // Canceled, Approved, Rejected, Closed are considered inactive/final for this check
    // We expanded the list of active statuses
    const activeStatuses = ['Draft', 'Opened', 'Submitted', 'Reviewed', 'PendingSales (ชั่วคราว)', 'PendingFinance (ชั่วคราว)'];
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

    if (rows && rows.length > 0) {
      const existing = rows[0];

      // EXISTING REQUEST FOUND
      txId = existing.tx_id;
      requestId = existing.id;

      // If is_submit is true, we update the data and possibly the status
      // We also handle "status" passed explicitly in the body for status transitions
      if (is_submit === 'true' || is_submit === true || req.body.status) {

        // If status is passed explicitly, use it. Otherwise, default logic:
        // Draft -> Opened (if submitted)
        // Opened -> Submitted (if submitted)
        // But the frontend should control the status now.

        // Use provided status or keep existing if not provided (just save)
        let newStatus = req.body.status || existing.status;

        // Fallback legacy logic: if submitting from Opened, go to Submitted?
        // No, let's strictly rely on frontend passing the correct status for transitions.
        // If simply "Saving Draft" (is_submit=false), we keep status.

        // Logic for "Draft" -> "Opened" is managed by frontend passing status='Opened'

        status = newStatus;

        await db.runAsync(
          'UPDATE CreditRequests SET request_amount = ?, request_reason = ?, request_credit_term = ?, snapshot_data = ?, status = ? WHERE id = ?',
          [request_amount, request_reason, request_credit_term, snapshot_data, status, requestId]
        );

        // Handle Comment insertion if provided
        if (req.body.comment && req.body.actor_role) {
             await db.runAsync(
                'INSERT INTO RequestComments (tx_id, actor_role, comment_text) VALUES (?, ?, ?)',
                [txId, req.body.actor_role, req.body.comment]
             );
        }

      } else {
        // Just return existing request without changes
        status = existing.status;
        responseSnapshot = existing.snapshot_data;
        responseAmount = existing.request_amount;
        responseReason = existing.request_reason;
        responseCreditTerm = existing.request_credit_term;
      }

    } else {
      // Create NEW Request
      // Generate TxId: AYCA[YY][MM]/[RunningNumber]
      const now = new Date();
      const year = now.getFullYear();
      const yy = year.toString().slice(-2);
      const mm = (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `AYCA${yy}${mm}/`;

      // Find the latest running number for this month
      let latestSql;
      if (db.dbType === 'mssql') {
        latestSql = `
          SELECT TOP 1 tx_id FROM CreditRequests
          WHERE tx_id LIKE ?
          ORDER BY tx_id DESC
        `;
      } else {
        latestSql = `
          SELECT tx_id FROM CreditRequests
          WHERE tx_id LIKE ?
          ORDER BY tx_id DESC
          LIMIT 1
        `;
      }
      const { rows: latestRows } = await db.query(latestSql, [`${prefix}%`]);

      let runningNum = 1;
      if (latestRows && latestRows.length > 0) {
        const lastTxId = latestRows[0].tx_id;
        const lastNumStr = lastTxId.split('/')[1];
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) {
          runningNum = lastNum + 1;
        }
      }

      if (runningNum > 999) {
        return res.status(500).json({ error: 'Transaction limit exceeded for this month (max 999)' });
      }

      txId = `${prefix}${runningNum.toString().padStart(3, '0')}`;

      // New requests start as Draft
      status = 'Draft';

      const result = await db.runAsync(
        'INSERT INTO CreditRequests (tx_id, customer_no, customer_name, status, request_amount, request_reason, request_credit_term, snapshot_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [txId, customer_no, customer_name, status, request_amount, request_reason, request_credit_term, snapshot_data]
      );
      requestId = result.id;
    }

    // Handle File Uploads
    if (req.files && req.files.length > 0) {
        const now = new Date();
        const year = now.getFullYear();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');

        const targetDir = path.join(__dirname, '../uploads', year.toString(), mm, txId);
        await fs.ensureDir(targetDir);

        for (const file of req.files) {
            const finalPath = path.join(targetDir, file.originalname);
            await fs.move(file.path, finalPath, { overwrite: true });

            await db.runAsync(
                'INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name) VALUES (?, ?, ?, ?)',
                [txId, file.fieldname, finalPath, file.originalname]
            );
        }
    }

    let responseData = {
        id: requestId,
        txId,
        status,
        customer_name,
        customer_no,
        // For Opened requests (existing or new), return what we have
        snapshot_data: responseSnapshot || snapshot_data,
        request_amount: responseAmount || request_amount,
        request_reason: responseReason || request_reason,
        request_credit_term: responseCreditTerm || request_credit_term
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
      SELECT id, tx_id, customer_no, customer_name, status, request_amount, created_at
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
    const activeStatuses = ['Draft', 'Opened', 'Submitted', 'Reviewed', 'PendingSales (ชั่วคราว)', 'PendingFinance (ชั่วคราว)'];
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
