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
        c.store_note
      FROM CreditRequests cr
      JOIN Customers c ON cr.customer_no = c."No_"
      WHERE cr.tx_id = ?
    `;

    const requests = await db.query(requestQuery, [id]);

    if (!requests || requests.rows.length === 0) {
      // Fallback: If joined query fails (maybe customer deleted?), try fetching just credit request
      // But for now, let's assume consistency.
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
    const subdistrict = snapCust.subdistrict || ''; // Usually manual input, not always in DB mapped to this
    const district = snapCust.district || data.db_district || '';
    const province = snapCust.province || data.db_province || '';
    const zipcode = snapCust.zipcode || data.db_zipcode || '';

    const fullAddress = `${address} ${subdistrict} ${district} ${province} ${zipcode}`.trim();

    // Contact Logic
    const contactName = snapCust.contact_person || data.db_contact_person || '-';
    const contactPos = snapCust.contact_position || data.contact_position || '-';
    // Phone: Preference to manually entered contact phone, then DB contact phone, then general DB phone
    const contactPhone = snapCust.contact_phone_number || data.contact_phone_number || data.db_phone_no || '-';

    // Authorized Person Logic
    const authName = snapCust.authorized_person || data.authorized_person || '-';
    const authPos = snapCust.authorized_position || data.authorized_position || '-';

    // Fetch Attachments to find images
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

    // --- PREPARE DATA FOR NEW SECTIONS ---

    // Request Type
    const requestType = data.request_type || 'เครดิตใหม่';

    // Financial Analysis Data
    const financial = snapshot.financial_summary || {};
    const monthlyHistory = financial.monthly_history || [];
    const monthlySalesRows = monthlyHistory.map(m => [
      { text: m.label, bold: true },
      { text: m.value, alignment: 'right' }
    ]);

    // Fallback if no monthly history but we have stats
    if (monthlySalesRows.length === 0 && financial.stats && financial.stats.avg_3_months) {
        monthlySalesRows.push([{text: 'เฉลี่ย 3 เดือน', bold: true}, {text: formatCurrency(financial.stats.avg_3_months), alignment: 'right'}]);
    }

    // Credit Score & Grade
    const scoreData = snapshot.credit_score || {};
    const score = scoreData.total_score ? Math.round(scoreData.total_score) : '-';
    const grade = scoreData.grade || '-';
    const approvalChance = scoreData.approval_chance || '-'; // Maybe calculate if missing, but let's use what we have

    // Determine Chance manually if missing (logic from store)
    let approvalChanceText = 'Low';
    // Count attachments
    const docCount = attachments.length;
    // This is a rough estimation since we don't have the exact logic here easily without duplicating it.
    // Let's assume High if > 4, Medium > 2
    if (docCount >= 4) approvalChanceText = 'High';
    else if (docCount >= 2) approvalChanceText = 'Medium';

    // Billing Info
    // snapshot.customer usually contains these if they were saved in the form
    const billingMethod = snapCust.billing_method || '-';
    const paymentMethod = snapCust.payment_method || '-';
    const paymentTerm = data.request_credit_term || '-'; // Using the requested term

    // Logo Path
    const logoPath = path.join(__dirname, '../assets/logo.png');
    let logoImage = null;
    if (fs.existsSync(logoPath)) {
        logoImage = logoPath;
    }

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
                // Left: Logo
                logoImage ? {
                    image: logoImage,
                    width: 60,
                    margin: [0, 0, 0, 0]
                } : { text: 'Company Logo', fontSize: 10, color: 'gray' },

                // Center: Title & Metadata
                {
                    stack: [
                        { text: 'สรุปคำขอสินเชื่อ (Credit Request Summary)', style: 'header', alignment: 'center' },
                        { text: `เลขที่คำขอ: ${data.tx_id}`, alignment: 'center', fontSize: 10, margin: [0, 5, 0, 0] },
                        { text: `วันที่: ${formatDate(data.created_at)}`, alignment: 'center', fontSize: 10 }
                    ],
                    width: '*'
                },

                // Right: Request Type Badge
                {
                    stack: [
                         {
                             text: requestType,
                             color: 'white',
                             background: '#0056FF',
                             alignment: 'center',
                             bold: true,
                             fontSize: 12,
                             margin: [0, 10, 0, 0],
                             padding: 5
                         },
                         { text: `สถานะ: ${data.status}`, alignment: 'center', fontSize: 10, margin: [0, 5, 0, 0], bold: true }
                    ],
                    width: 120
                }
            ],
            margin: [0, 0, 0, 20]
        },

        // --- RISK ANALYSIS SECTION ---
        { text: 'การวิเคราะห์ความเสี่ยง (Risk Analysis)', style: 'subheader' },
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
        },

        // --- FINANCIAL SUMMARY ---
        { text: 'สรุปข้อมูลทางการเงิน (Financial Summary)', style: 'subheader' },
        {
             columns: [
                 // Col 1: Monthly History
                 {
                     width: '50%',
                     table: {
                         widths: ['*', '*'],
                         body: [
                             [{ text: 'เดือน (Month)', bold: true, fillColor: '#f9f9f9' }, { text: 'ยอดขาย (Sales)', bold: true, alignment: 'right', fillColor: '#f9f9f9' }],
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
                             [{ text: 'ยอดขายสะสม (Total):', bold: true }, { text: formatCurrency(financial.stats?.total_accum) + ' บาท', alignment: 'right' }],
                             [{ text: 'เฉลี่ยต่อเดือน (Avg):', bold: true }, { text: formatCurrency(financial.stats?.avg_3_months) + ' บาท', alignment: 'right' }],
                             [{ text: 'แนวโน้ม (Trend):', bold: true }, { text: financial.trend_status || '-', alignment: 'right' }]
                         ]
                     },
                     layout: 'noBorders'
                 }
             ],
             margin: [0, 0, 0, 20]
        },

        // --- BILLING & PAYMENT ---
        { text: 'เงื่อนไขการวางบิลและการชำระเงิน (Billing & Payment)', style: 'subheader' },
        {
            table: {
                widths: ['25%', '25%', '25%', '25%'],
                body: [
                     [
                        { text: 'วิธีการวางบิล:', bold: true }, billingMethod,
                        { text: 'วิธีการชำระเงิน:', bold: true }, paymentMethod
                     ],
                     [
                        { text: 'Credit Term (ขอ):', bold: true }, `${paymentTerm} วัน`,
                        { text: '', border: [false, false, false, false] }, ''
                     ]
                ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
        },

        // Section: Customer Info (Merged with Auth/Contact)
        { text: 'ข้อมูลลูกค้า', style: 'subheader' },
        {
          table: {
            widths: ['auto', '*'],
            body: [
              [{ text: 'รหัสลูกค้า:', bold: true }, customerNo],
              [{ text: 'ชื่อลูกค้า:', bold: true }, customerName],
              [{ text: 'เลขเสียภาษี:', bold: true }, taxId],
              [{ text: 'ที่อยู่:', bold: true }, fullAddress],
              // Merged Authorized Person
              [{ text: 'ผู้มีอำนาจ:', bold: true }, `${authName} (${authPos})`],
              // Merged Contact Person
              [{ text: 'ผู้ติดต่อ:', bold: true }, `${contactName} (${contactPos}) - ${contactPhone}`]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        }
      ],
      styles: {
        header: {
          fontSize: 16,
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

    // --- PAGE 2: IMAGES & MAPS ---
    const imageAttachments = attachments.filter(a =>
        ['.jpg', '.jpeg', '.png'].includes(path.extname(a.file_path).toLowerCase())
    );

    if (imageAttachments.length > 0) {
        docDefinition.content.push({ text: 'รูปภาพประกอบ (Attachments)', style: 'header', pageBreak: 'before', margin: [0, 20] });

        imageAttachments.forEach(att => {
            const imagePath = path.resolve(__dirname, '../../', att.file_path);
            if (fs.existsSync(imagePath)) {
                // Try to map file_type to a readable title
                let title = att.original_name;
                if (att.file_type === 'id_card') title = 'บัตรประชาชน';
                if (att.file_type === 'store_map') title = 'แผนที่ร้านค้า';
                if (att.file_type === 'home_map') title = 'แผนที่บ้าน';
                if (att.file_type === 'store_photo') title = 'รูปถ่ายร้านค้า';

                docDefinition.content.push({ text: title, style: 'subheader', margin: [0, 10] });
                docDefinition.content.push({
                    image: imagePath,
                    fit: [500, 300], // Constrain size
                    alignment: 'center',
                    margin: [0, 0, 0, 20]
                });
            }
        });
    }

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
