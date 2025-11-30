const db = require('../db');

exports.createCreditRequest = async (req, res) => {
  const { customer_name } = req.body;

  if (!customer_name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  // Generate random TxId (e.g., AY + 6 digits)
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const txId = `AY${randomNum}`;
  const status = 'Draft';

  try {
    const result = await db.runAsync(
      'INSERT INTO CreditRequests (tx_id, customer_name, status) VALUES (?, ?, ?)',
      [txId, customer_name, status]
    );

    res.status(201).json({
      message: 'Credit request created successfully',
      data: {
        id: result.id,
        txId,
        status,
        customer_name
      }
    });
  } catch (error) {
    console.error('Error creating credit request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
