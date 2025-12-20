const db = require('../db');
const fs = require('fs-extra');
const path = require('path');

exports.createCreditRequest = async (req, res) => {
  // When using multer, text fields are in req.body and files in req.files
  const { customer_no, customer_name, request_amount, request_reason, snapshot_data, is_submit } = req.body;

  if (!customer_name || !customer_no) {
    return res.status(400).json({ error: 'Customer name and Customer No (ID) are required' });
  }

  try {
    // Check for existing active request for this customer (Opened, Submitted, Reviewed)
    let existingSql;
    if (db.dbType === 'mssql') {
      existingSql = `
        SELECT TOP 1 * FROM CreditRequests
        WHERE customer_no = ? AND status IN ('Opened', 'Submitted', 'Reviewed')
      `;
    } else {
      existingSql = `
        SELECT * FROM CreditRequests
        WHERE customer_no = ? AND status IN ('Opened', 'Submitted', 'Reviewed')
        LIMIT 1
      `;
    }
    const { rows } = await db.query(existingSql, [customer_no]);

    let txId;
    let requestId;
    let status;
    let responseSnapshot = null;
    let responseAmount = null;
    let responseReason = null;

    if (rows && rows.length > 0) {
      const existing = rows[0];

      // If status is 'Opened', we update it with new data ONLY if is_submit is true
      if (existing.status === 'Opened') {
        txId = existing.tx_id;
        requestId = existing.id;

        if (is_submit === 'true' || is_submit === true) {
            status = 'Submitted';
            await db.runAsync(
              'UPDATE CreditRequests SET request_amount = ?, request_reason = ?, snapshot_data = ?, status = ? WHERE id = ?',
              [request_amount, request_reason, snapshot_data, status, requestId]
            );
            // Will return the new data passed in body
        } else {
             // Just return existing Open request without changes
             status = 'Opened';
             responseSnapshot = existing.snapshot_data;
             responseAmount = existing.request_amount;
             responseReason = existing.request_reason;
        }

      } else {
        // If 'Submitted' or 'Reviewed', return existing.
        // We include snapshot_data so the frontend can populate the form for viewing.
         return res.status(200).json({
          message: 'Existing credit request found',
          data: {
            id: existing.id,
            txId: existing.tx_id,
            status: existing.status,
            customer_name: existing.customer_name,
            customer_no: existing.customer_no,
            request_amount: existing.request_amount,
            request_reason: existing.request_reason,
            snapshot_data: existing.snapshot_data
          }
        });
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

      // If submitting, set to Submitted, else Opened
      status = (is_submit === 'true' || is_submit === true) ? 'Submitted' : 'Opened';

      const result = await db.runAsync(
        'INSERT INTO CreditRequests (tx_id, customer_no, customer_name, status, request_amount, request_reason, snapshot_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [txId, customer_no, customer_name, status, request_amount, request_reason, snapshot_data]
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

    // Retrieve the existing data if it was an Opened request (which falls through here if not is_submit)
    // Actually, if it was Opened and we didn't update, we still want to return the data.
    // The logic above: if (existing.status === 'Opened') sets txId, requestId, status.
    // We should probably fetch the data to return it in the response for Opened requests too.
    // BUT, the `create` logic for Opened just sets local vars. It doesn't query the full row again.
    // However, if we found `existing`, we have `existing`.

    // Let's refine the response construction.
    let responseData = {
        id: requestId,
        txId,
        status,
        customer_name,
        customer_no,
        // For Opened requests (existing or new), return what we have
        snapshot_data: responseSnapshot || snapshot_data,
        request_amount: responseAmount || request_amount,
        request_reason: responseReason || request_reason
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
  const { status } = req.query;

  try {
    let sql = `
      SELECT id, tx_id, customer_no, customer_name, status, request_amount, created_at
      FROM CreditRequests
    `;
    const params = [];

    if (status) {
      // Split status by comma if multiple statuses are provided (e.g. ?status=Submitted,Reviewed)
      const statusList = status.split(',').map(s => s.trim());
      if (statusList.length > 0) {
        const placeholders = statusList.map(() => '?').join(',');
        sql += ` WHERE status IN (${placeholders})`;
        params.push(...statusList);
      }
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
