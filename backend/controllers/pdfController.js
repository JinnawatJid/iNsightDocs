const PdfPrinter = require('pdfmake');
const fs = require('fs');
const path = require('path');
const db = require('../db');

// Define fonts
const fonts = {
  Sarabun: {
    normal: path.join(__dirname, '../assets/fonts/Sarabun-Regular.ttf'),
    bold: path.join(__dirname, '../assets/fonts/Sarabun-Bold.ttf'),
    italics: path.join(__dirname, '../assets/fonts/Sarabun-Regular.ttf'), // Fallback
    bolditalics: path.join(__dirname, '../assets/fonts/Sarabun-Bold.ttf') // Fallback
  }
};

const printer = new PdfPrinter(fonts);

/**
 * Generate PDF Summary for a Credit Request
 */
const generateCreditRequestPDF = async (req, res) => {
  const { id } = req.params; // Transaction ID (e.g., AYCA2312/001)

  try {
    // 1. Fetch Credit Request Data
    // Join with Customers table using "No_" as the key
    // Map standard column names to readable aliases for easier JS usage where possible,
    // or access them directly via their specific names.
    const requestQuery = `
      SELECT
        cr.*,
        c."Name" as db_customer_name,
        c."No_" as db_customer_no,
        c."VAT Registration No_" as db_vat_registration_no,
        c."Address" as db_address,
        c."City" as db_district,
        c."County" as db_province,
        c."Post Code" as db_zipcode,
        c."Contact" as db_contact_person,
        c."Phone No_" as db_phone_no,
        c.contact_position,
        c.contact_phone_number,
        c.authorized_person,
        c.authorized_position,
        c.residence_map_code,
        c.residence_landmark,
        c.residence_note,
        c.store_map_code,
        c.store_landmark,
        c.store_note,
        c.billing_method,
        c.payment_method
      FROM CreditRequests cr
      JOIN Customers c ON cr.customer_no = c."No_"
      WHERE cr.tx_id = ?
    `;

    const requests = await db.query(requestQuery, [id]);

    if (!requests || requests.rows.length === 0) {
      return res.status(404).send('Credit Request not found');
    }

    const data = requests.rows[0];
    let snapshot = {};
    try {
      snapshot = JSON.parse(data.snapshot_data || '{}');
    } catch (e) {
      console.error('Error parsing snapshot data', e);
    }

    // Merge snapshot data (priority) with DB data (fallback)
    // The snapshot.customer usually has keys like: company_name, authorized_person, etc.
    const snapCust = snapshot.customer || {};

    const customerName = snapCust.company_name || snapCust.name || data.db_customer_name || '-';
    const customerNo = snapCust.id || data.db_customer_no || '-';
    const taxId = snapCust.tax_id || snapCust.vat_registration_no || data.db_vat_registration_no || '-';

    // Address Logic
    const address = snapCust.address || data.db_address || '';
    const subdistrict = snapCust.subdistrict || '';
    const district = snapCust.district || data.db_district || '';
    const province = snapCust.province || data.db_province || '';
    const zipcode = snapCust.zipcode || data.db_zipcode || '';

    const fullAddress = `${address} ${subdistrict} ${district} ${province} ${zipcode}`.trim();

    // Store Address Logic (Assume separate keys or fallback to same as residence if not distinct)
    // In current store structure, we have store_address, store_subdistrict, etc.
    // If not present, we assume same as residence or check 'store' specific columns if they exist.
    // For now, let's look for explicit store keys in snapshot
    const storeAddress = snapCust.store_address || '-';
    const storeSubdistrict = snapCust.store_subdistrict || '';
    const storeDistrict = snapCust.store_district || '';
    const storeProvince = snapCust.store_province || '';
    const storeZipcode = snapCust.store_zipcode || '';
    const fullStoreAddress = `${storeAddress} ${storeSubdistrict} ${storeDistrict} ${storeProvince} ${storeZipcode}`.trim();


    // Contact Logic
    const contactName = snapCust.contact_person || data.db_contact_person || '-';
    const contactPos = snapCust.contact_position || data.contact_position || '-';
    const contactPhone = snapCust.contact_phone_number || data.contact_phone_number || data.db_phone_no || '-';

    // Authorized Person Logic
    const authName = snapCust.authorized_person || data.authorized_person || '-';
    const authPos = snapCust.authorized_position || data.authorized_position || '-';

    // Fetch Attachments to list them
    const attachmentsQuery = `SELECT * FROM CreditRequestAttachments WHERE tx_id = ?`;
    const attachmentsRes = await db.query(attachmentsQuery, [id]);
    const attachments = attachmentsRes.rows || [];

    // Helper to format currency
    const formatCurrency = (val) => {
      if (!val) return '0.00';
      return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Helper to format date
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // --- FALLBACK LOGIC FOR MISSING SNAPSHOT DATA ---
    let financial = snapshot.financial_summary || {};
    let scoreData = snapshot.credit_score || {};
    let requestType = data.request_type || 'เครดิตใหม่';

    // If financial data is empty, try to fetch from DB (Live Data Fallback)
    const hasFinancials = financial.stats || (financial.monthly_history && financial.monthly_history.length > 0);
    if (!hasFinancials) {
        console.log('PDF: Snapshot missing financials, attempting fallback to Live Data...');
        try {
            const accumQuery = `SELECT * FROM AY_ACCUM WHERE custcode = ? LIMIT 1`;
            const accumRes = await db.query(accumQuery, [customerNo]);
            if (accumRes.rows.length > 0) {
                const accum = accumRes.rows[0];
                // Simple reconstruction of 3-month history (assuming Jun, Jul, Aug as per current logic)
                // In a real scenario, this should be dynamic based on current month, but for now matching existing logic
                financial = {
                    monthly_history: [
                        { label: 'มิ.ย.', value: formatCurrency(accum.Jun) },
                        { label: 'ก.ค.', value: formatCurrency(accum.Jul) },
                        { label: 'ส.ค.', value: formatCurrency(accum.Aug) }
                    ],
                    stats: {
                        total_accum: parseFloat(accum.SecondAccum || 0),
                        avg_3_months: parseFloat(accum.SecondAccum || 0) / 3 // Approx
                    },
                    trend_status: accum.AccumTrend > 1 ? 'เติบโต' : 'ชะลอตัว' // Simple logic
                };
            }
        } catch (e) {
            console.error('PDF: Live Data Fetch Failed', e);
        }
    }

    // Prepare Financial Rows
    const monthlyHistory = financial.monthly_history || [];
    let monthlySalesRows = monthlyHistory.map(m => [
      { text: m.label, bold: true },
      { text: m.value, alignment: 'right' }
    ]);

    if (monthlySalesRows.length === 0 && financial.stats && financial.stats.avg_3_months) {
        monthlySalesRows.push([{text: 'เฉลี่ย 3 เดือน', bold: true}, {text: formatCurrency(financial.stats.avg_3_months), alignment: 'right'}]);
    }

    // Fallback if truly no data
    if (monthlySalesRows.length === 0) {
        monthlySalesRows.push([{text: 'ไม่มีข้อมูล', colSpan: 2, alignment: 'center'}]);
    }

    // Prepare Score Data
    const score = scoreData.total_score ? Math.round(scoreData.total_score) : '-';
    const grade = scoreData.grade || '-';
    // Determine Chance manually if missing
    let approvalChanceText = scoreData.approval_chance || '-';
    if (approvalChanceText === '-' && attachments.length > 0) {
         // Simple fallback logic if we have files but no score run
         const docCount = attachments.length;
         if (docCount >= 4) approvalChanceText = 'High';
         else if (docCount >= 2) approvalChanceText = 'Medium';
         else approvalChanceText = 'Low';
    }

    // Billing Info (Fallback to DB if snapshot missing)
    const billingMethod = snapCust.billing_method || data.billing_method || '-';
    const paymentMethod = snapCust.payment_method || data.payment_method || '-';
    const paymentTerm = data.request_credit_term || '-';

    // Logo Path
    const logoPath = path.join(__dirname, '../assets/logo.png');
    let logoImage = null;
    if (fs.existsSync(logoPath)) {
        logoImage = logoPath;
    }

    // Attachment Summary List
    const attachmentSummary = attachments.map((att, index) => {
        let typeLabel = att.file_type;
        // Map common types to Thai
        if (typeLabel === 'id_card') typeLabel = 'บัตรประชาชน';
        else if (typeLabel === 'home_registration') typeLabel = 'ทะเบียนบ้าน';
        else if (typeLabel === 'store_map') typeLabel = 'แผนที่ร้านค้า';
        else if (typeLabel === 'home_map') typeLabel = 'แผนที่บ้าน';
        else if (typeLabel === 'store_photo') typeLabel = 'รูปถ่ายร้านค้า';
        else if (typeLabel === 'bank_statement') typeLabel = 'Statement ธนาคาร';
        else if (typeLabel === 'credit_application_doc') typeLabel = 'ใบคำขอสินเชื่อ';

        return `${index + 1}. ${typeLabel} (${att.original_name})`;
    }).join('\n');


    // Build Document Definition
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: {
        font: 'Sarabun',
        fontSize: 10
      },
      content: [
        // --- HEADER ---
        {
            columns: [
                // Left: Logo (Bigger)
                logoImage ? {
                    image: logoImage,
                    width: 100, // Increased size
                    margin: [0, 0, 0, 0]
                } : { text: 'Company Logo', fontSize: 10, color: 'gray' },

                // Center: Title & Metadata
                {
                    stack: [
                        { text: 'สรุปคำขอสินเชื่อ', style: 'header', alignment: 'center' },
                        { text: `เลขที่คำขอ: ${data.tx_id}`, alignment: 'center', fontSize: 10, margin: [0, 5, 0, 0] },
                        { text: `วันที่: ${formatDate(data.created_at)}`, alignment: 'center', fontSize: 10 }
                    ],
                    width: '*',
                    alignment: 'center' // Ensure stack is centered
                },

                // Right: Request Type (Clean Text, No Blue Box)
                {
                    stack: [
                         { text: `ประเภท: ${requestType}`, alignment: 'right', bold: true, fontSize: 12, margin: [0, 10, 0, 0] },
                         { text: `สถานะ: ${data.status}`, alignment: 'right', fontSize: 10, margin: [0, 5, 0, 0], bold: true }
                    ],
                    width: 150
                }
            ],
            margin: [0, 0, 0, 20]
        },

        // --- SECTION 1: CUSTOMER PROFILE (Consolidated) ---
        { text: 'ข้อมูลลูกค้า', style: 'subheader' },
        {
          table: {
            widths: ['auto', '*'],
            body: [
              // Identity
              [{ text: 'ชื่อลูกค้า:', bold: true }, customerName],
              [{ text: 'รหัสลูกค้า:', bold: true }, customerNo],
              [{ text: 'เลขเสียภาษี:', bold: true }, taxId],
              // Addresses
              [{ text: 'ที่อยู่ (ตามภพ.20):', bold: true }, fullAddress],
              [{ text: 'ที่อยู่ร้านค้า/จัดส่ง:', bold: true }, fullStoreAddress !== '-' ? fullStoreAddress : 'เดียวกับที่อยู่บริษัท'],
              // Key Persons
              [{ text: 'ผู้มีอำนาจลงนาม:', bold: true }, `${authName} (${authPos})`],
              [{ text: 'ผู้ติดต่อ:', bold: true }, `${contactName} (${contactPos}) - ${contactPhone}`]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },

        // --- SECTION 2: FINANCIAL SUMMARY ---
        { text: 'สรุปข้อมูลทางการเงิน', style: 'subheader' },
        {
             columns: [
                 // Col 1: Monthly History
                 {
                     width: '50%',
                     table: {
                         widths: ['*', '*'],
                         body: [
                             [{ text: 'เดือน', bold: true, fillColor: '#f9f9f9' }, { text: 'ยอดขาย', bold: true, alignment: 'right', fillColor: '#f9f9f9' }],
                             ...monthlySalesRows
                         ]
                     },
                     layout: 'lightHorizontalLines'
                 },
                 // Col 2: Summary Stats
                 {
                     width: '50%',
                     margin: [20, 0, 0, 0],
                     table: {
                         widths: ['auto', '*'],
                         body: [
                             [{ text: 'ยอดขายสะสม:', bold: true }, { text: formatCurrency(financial.stats?.total_accum) + ' บาท', alignment: 'right' }],
                             [{ text: 'เฉลี่ยต่อเดือน:', bold: true }, { text: formatCurrency(financial.stats?.avg_3_months) + ' บาท', alignment: 'right' }],
                             [{ text: 'แนวโน้ม:', bold: true }, { text: financial.trend_status || '-', alignment: 'right' }]
                         ]
                     },
                     layout: 'noBorders'
                 }
             ],
             margin: [0, 0, 0, 20]
        },

        // --- SECTION 3: TRANSACTION DETAILS (Request + Billing) ---
        { text: 'รายละเอียดคำขอและเงื่อนไขการชำระเงิน', style: 'subheader' },
        {
            table: {
                widths: ['15%', '35%', '15%', '35%'],
                body: [
                     [
                        { text: 'วงเงินที่ขอ:', bold: true }, formatCurrency(data.request_amount) + ' บาท',
                        { text: 'Credit Term:', bold: true }, `${paymentTerm} วัน`
                     ],
                     [
                        { text: 'เหตุผล:', bold: true }, { text: data.request_reason || '-', colSpan: 3 }, {}
                     ],
                     [
                        { text: 'การวางบิล:', bold: true }, billingMethod,
                        { text: 'การชำระเงิน:', bold: true }, paymentMethod
                     ]
                ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
        },

        // --- SECTION 4: DOCUMENT LIST (Replaces Images) ---
        { text: 'เอกสารแนบ', style: 'subheader' },
        {
            text: attachmentSummary || 'ไม่มีเอกสารแนบ',
            fontSize: 10,
            margin: [0, 0, 0, 20]
        },

        // --- SECTION 5: RISK ANALYSIS (THE VERDICT) ---
        { text: 'การวิเคราะห์ความเสี่ยง', style: 'subheader' },
        {
            table: {
                widths: ['*', '*', '*', '*'],
                body: [
                    [
                        { text: 'Credit Score', style: 'tableHeader', alignment: 'center', fillColor: '#f0f0f0' },
                        { text: 'Grade', style: 'tableHeader', alignment: 'center', fillColor: '#f0f0f0' },
                        { text: 'Approval Chance', style: 'tableHeader', alignment: 'center', fillColor: '#f0f0f0' },
                        { text: 'Financial Trend', style: 'tableHeader', alignment: 'center', fillColor: '#f0f0f0' }
                    ],
                    [
                        { text: `${score} / 100`, alignment: 'center', fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
                        { text: grade, alignment: 'center', fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
                        { text: approvalChanceText, alignment: 'center', fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
                        { text: financial.trend_status || '-', alignment: 'center', fontSize: 10, margin: [0, 5, 0, 5] }
                    ]
                ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15]
        }
      ],
      styles: {
        header: {
          fontSize: 18, // Increased Title Size
          bold: true
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5],
          color: '#333333'
        },
        tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black'
        },
        label: {
          bold: true
        }
      }
    };

    // Create PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${data.tx_id}_summary.pdf"`);

    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF: ' + error.message);
  }
};

module.exports = {
  generateCreditRequestPDF
};
