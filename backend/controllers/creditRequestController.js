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

    // Generate random TxId (e.g., AY + 6 digits)
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const txId = `AY${randomNum}`;
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
