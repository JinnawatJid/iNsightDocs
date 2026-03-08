const getMockFinancialData = (customerNo) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth() + 1;

  // Generate last 6 months + current month
  const monthly = [];
  let total = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(currentYear, currentMonthIdx - 1 - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    // Random amount between 100,000 and 1,000,000 for realistic data, 0 for current month if it's new
    let amount = Math.floor(Math.random() * 900000) + 100000;
    if (i === 0) amount = Math.floor(amount / 3); // current month usually has less since it's ongoing
    monthly.push({ month: monthStr, amount });
    total += amount;
  }

  return {
    customer: customerNo,
    anchor_date: now.toISOString().split('T')[0],
    months: 6,
    monthly: monthly,
    total: total
  };
};

const getMockCategoryData = (customerNo) => {
  return {
    data: [
      { category: "A", total_amount: 1500000 },
      { category: "G", total_amount: 850000 },
      { category: "Y", total_amount: 450000 },
      { category: "C", total_amount: 200000 },
      { category: "E", total_amount: 50000 },
      { category: "S", total_amount: 15000 }
    ]
  };
};

const getMockLatePaymentData = (customerNo) => {
  const now = new Date();
  const generateDate = (daysAgo) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  return {
    data: [
      {
        "Document No_": "INV-001",
        "Posting_Date": generateDate(150),
        "Invoice_Date": generateDate(150),
        "Due_Date": generateDate(120),
        "Cleared Date": generateDate(115),
        "Check Date": generateDate(115),
        "Effective_Payment_Date": generateDate(115),
        "Late_Days": 5,
        "Payment_Method": "เช็ค",
        "Amount": 150000
      },
      {
        "Document No_": "INV-002",
        "Posting_Date": generateDate(100),
        "Invoice_Date": generateDate(100),
        "Due_Date": generateDate(70),
        "Cleared Date": generateDate(70),
        "Check Date": "",
        "Effective_Payment_Date": generateDate(70),
        "Late_Days": 0,
        "Payment_Method": "เงินสด/โอน",
        "Amount": 250000
      },
      {
        "Document No_": "INV-003",
        "Posting_Date": generateDate(60),
        "Invoice_Date": generateDate(60),
        "Due_Date": generateDate(30),
        "Cleared Date": generateDate(20),
        "Check Date": generateDate(22),
        "Effective_Payment_Date": generateDate(20),
        "Late_Days": 10,
        "Payment_Method": "เช็ค",
        "Amount": 500000
      },
      {
        "Document No_": "INV-004",
        "Posting_Date": generateDate(20),
        "Invoice_Date": generateDate(20),
        "Due_Date": generateDate(-10), // future due
        "Cleared Date": "1753-01-01", // not cleared
        "Check Date": "",
        "Effective_Payment_Date": "",
        "Late_Days": 0,
        "Payment_Method": "",
        "Amount": 100000
      }
    ]
  };
};

module.exports = {
  getMockFinancialData,
  getMockCategoryData,
  getMockLatePaymentData
};
