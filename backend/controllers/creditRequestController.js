const db = require('../db');

exports.createCreditRequest = async (req, res) => {
  const { customer_no, customer_name } = req.body;

  if (!customer_name || !customer_no) {
    return res.status(400).json({ error: 'Customer name and Customer No (ID) are required' });
  }

  try {
    // Check for existing Draft or Pending request for this customer
    const existingSql = `
      SELECT * FROM CreditRequests 
      WHERE customer_no = ? AND status IN ('Draft', 'Pending')
      LIMIT 1
    `;
    const { rows } = await db.query(existingSql, [customer_no]);

    if (rows && rows.length > 0) {
      const existing = rows[0];
      return res.status(200).json({
        message: 'Existing credit request found',
        data: {
          id: existing.id,
          txId: existing.tx_id,
          status: existing.status,
          customer_name: existing.customer_name,
          customer_no: existing.customer_no
        }
      });
    }

    // Generate TxId: AYCA[YY][MM]/[RunningNumber]
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `AYCA${yy}${mm}/`; // Branch (AY) + Type (CA) + Year + Month + /

    // Find the latest running number for this month
    const latestSql = `
      SELECT tx_id FROM CreditRequests
      WHERE tx_id LIKE ?
      ORDER BY tx_id DESC
      LIMIT 1
    `;
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

    const txId = `${prefix}${runningNum.toString().padStart(3, '0')}`;
    const status = 'Draft';

    const result = await db.runAsync(
      'INSERT INTO CreditRequests (tx_id, customer_no, customer_name, status) VALUES (?, ?, ?, ?)',
      [txId, customer_no, customer_name, status]
    );

    res.status(201).json({
      message: 'Credit request created successfully',
      data: {
        id: result.id,
        txId,
        status,
        customer_name,
        customer_no
      }
    });
  } catch (error) {
    console.error('Error creating credit request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
