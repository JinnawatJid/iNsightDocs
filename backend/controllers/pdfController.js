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
        c.business_type,
        c.years_in_business,
        c.main_products,
        c.contact_department,
        c.contact_division,
        c.residence_map_code,
        c.residence_landmark,
        c.residence_note,
        c.residence_ownership,
        c.residence_ownership_other,
        c.store_map_code,
        c.store_landmark,
        c.store_note,
        c.store_ownership,
        c.store_ownership_other,
        c.billing_method,
        c.payment_method,
        c.payment_condition,
        c.payment_bank_name,
        c.payment_bank_branch,
        c.payment_account_no
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
    // Trim fallback
    const customerNoClean = customerNo.trim();

    const taxId = snapCust.tax_id || snapCust.vat_registration_no || data.db_vat_registration_no || '-';
    const businessType = snapCust.business_type || data.business_type || '-';
    const yearsInBusiness = snapCust.years_in_business || data.years_in_business || '-';

    // Helper to format currency
    const formatCurrency = (val) => {
      if (!val) return '0.00';
      return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // --- IDENTIFY CUSTOMER TYPE ---
    const corporateKeywords = ['บริษัท', 'จำกัด', 'หจก', 'Company', 'Limited', 'Ltd'];
    const isCompany = corporateKeywords.some(keyword => customerName.includes(keyword));

    // --- ADDRESS EXTRACTION LOGIC ---

    // 1. Main Business Address (Company Address or Store Address)
    // For Company: address keys (Company Address)
    // For Individual: store_ keys (Shop Address)

    // Define source keys based on type
    const mainKeys = isCompany ?
        { addr: 'address', sub: 'subdistrict', dist: 'district', prov: 'province', zip: 'zipcode' } :
        { addr: 'store_address', sub: 'store_subdistrict', dist: 'store_district', prov: 'store_province', zip: 'store_zipcode' };

    // Extract Main Address components
    // Logic update: For Individuals, if specific store_address is missing, fallback to main DB address
    // This allows "Store Address" to default to "Home Address" if not specified, matching "Same as..." logic.
    const mainAddressVal = snapCust[mainKeys.addr] || data.db_address || '';
    const mainSub = snapCust[mainKeys.sub] || '';
    const mainDist = snapCust[mainKeys.dist] || data.db_district || '';
    const mainProv = snapCust[mainKeys.prov] || data.db_province || '';
    const mainZip = snapCust[mainKeys.zip] || data.db_zipcode || '';

    const fullMainAddress = [mainAddressVal, mainSub, mainDist, mainProv, mainZip]
        .filter(part => part && part.trim() !== '')
        .join(' ');

    // 2. Residence Address (Authorized Person or Personal Residence)
    // For Company: residence_ keys (Authorized Person)
    // For Individual: address keys (Personal Residence)

    const resKeys = isCompany ?
        { addr: 'residence_address', sub: 'residence_subdistrict', dist: 'residence_district', prov: 'residence_province', zip: 'residence_zipcode' } :
        { addr: 'address', sub: 'subdistrict', dist: 'district', prov: 'province', zip: 'zipcode' };

    // Extract Residence Address components
    const resAddressVal = snapCust[resKeys.addr] || (!isCompany ? data.db_address : '') || '';
    const resSub = snapCust[resKeys.sub] || '';
    const resDist = snapCust[resKeys.dist] || (!isCompany ? data.db_district : '') || '';
    const resProv = snapCust[resKeys.prov] || (!isCompany ? data.db_province : '') || '';
    const resZip = snapCust[resKeys.zip] || (!isCompany ? data.db_zipcode : '') || '';

    const fullResidenceAddress = [resAddressVal, resSub, resDist, resProv, resZip]
        .filter(part => part && part.trim() !== '')
        .join(' ');


    // --- DISPLAY LOGIC ---

    // Field 1: Business Place
    // Label: "ที่อยู่บริษัท:" (Company) or "ที่อยู่ร้านค้า:" (Individual)
    const businessPlaceLabel = isCompany ? 'ที่อยู่บริษัท:' : 'ที่อยู่ร้านค้า:';
    // Value: fullMainAddress
    const businessPlaceValue = fullMainAddress || '-';

    // Field 2: Residence
    // Label: "ที่อยู่อาศัย:" (Fixed)
    const residenceLabel = 'ที่อยู่อาศัย:';
    // Value: Check equality
    let residenceValue = fullResidenceAddress;

    // Normalize for comparison
    const normMain = fullMainAddress.replace(/\s+/g, '').toLowerCase();
    const normRes = fullResidenceAddress.replace(/\s+/g, '').toLowerCase();

    // Condition: If effective addresses are same, show special text
    // Also if residence is empty but main is present, it might imply same address in some contexts,
    // but strict check is safer.
    if (normMain && normRes && normMain === normRes) {
        residenceValue = 'เดียวกับที่อยู่ร้านค้า/บริษัท';
    } else if (!residenceValue) {
        // If empty, standard fallback
        residenceValue = '-';
    }


    // --- OWNERSHIP LOGIC ---

    // Store Ownership (Corresponds to Business Place Row)
    const storeOwnership = snapCust.store_ownership || data.store_ownership || '-';
    const storeOwnershipOther = snapCust.store_ownership_other || data.store_ownership_other || '';
    let storeOwnDisplay = storeOwnership;
    if (storeOwnershipOther) {
        const numVal = parseFloat(storeOwnershipOther.replace(/,/g, ''));
        const displayVal = !isNaN(numVal) ? formatCurrency(numVal) + ' บาท' : storeOwnershipOther;
        storeOwnDisplay = `${storeOwnership} (${displayVal})`;
    }

    // Residence Ownership (Corresponds to Residence Row)
    const residenceOwnership = snapCust.residence_ownership || data.residence_ownership || '-';
    const residenceOwnershipOther = snapCust.residence_ownership_other || data.residence_ownership_other || '';
    let resOwnDisplay = residenceOwnership;
    if (residenceOwnershipOther) {
        const numVal = parseFloat(residenceOwnershipOther.replace(/,/g, ''));
        const displayVal = !isNaN(numVal) ? formatCurrency(numVal) + ' บาท' : residenceOwnershipOther;
        resOwnDisplay = `${residenceOwnership} (${displayVal})`;
    }


    // Contact Logic
    const contactName = snapCust.contact_person || data.db_contact_person || '-';
    const contactPos = snapCust.contact_position || data.contact_position || '-';
    const contactPhone = snapCust.contact_phone_number || data.contact_phone_number || data.db_phone_no || '-';

    // Authorized Person Logic
    const authName = snapCust.authorized_person || data.authorized_person || '-';

    // Fetch Attachments to list them
    const attachmentsQuery = `SELECT * FROM CreditRequestAttachments WHERE tx_id = ?`;
    const attachmentsRes = await db.query(attachmentsQuery, [id]);
    const attachments = attachmentsRes.rows || [];

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
            // Use cleaned customer number for better match
            const accumRes = await db.query(accumQuery, [customerNoClean]);
            if (accumRes.rows.length > 0) {
                const accum = accumRes.rows[0];
                // Simple reconstruction of 3-month history (assuming Jun, Jul, Aug as per current logic)
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
    let monthlyHistory = financial.monthly_history || [];

    // Filter history based on request type
    if (requestType === 'เครดิตใหม่') {
        monthlyHistory = monthlyHistory.slice(0, 3);
    } else if (requestType === 'ขอเครดิตเพิ่ม') {
        monthlyHistory = monthlyHistory.slice(0, 6);
    }

    let monthlySalesRows = monthlyHistory.map(m => [
      { text: m.label, bold: true },
      { text: m.value, alignment: 'right', margin: [20, 0, 0, 0], noWrap: true }
    ]);

    if (monthlySalesRows.length === 0 && financial.stats && financial.stats.avg_3_months) {
        monthlySalesRows.push([{text: 'เฉลี่ย 3 เดือน', bold: true}, {text: formatCurrency(financial.stats.avg_3_months), alignment: 'right', margin: [20, 0, 0, 0], noWrap: true}]);
    }

    // Fallback if truly no data
    if (monthlySalesRows.length === 0) {
        monthlySalesRows.push([{text: 'ไม่มีข้อมูล', colSpan: 2, alignment: 'center'}, {}]);
    }

    // Prepare Category Breakdown Rows
    const categoryBreakdown = financial.category_breakdown || [];
    let categoryRows = [];
    if (categoryBreakdown.length > 0) {
        const top3Categories = categoryBreakdown.slice(0, 3);
        categoryRows = top3Categories.map(cat => {
            const displayValue = cat.formattedValue || '-';
            const displayPercentage = (cat.percentage !== undefined && cat.percentage !== null) ? cat.percentage.toFixed(2) + '%' : '-';
            return [
                { text: cat.label, bold: true },
                { text: displayValue, alignment: 'right', margin: [20, 0, 0, 0], noWrap: true },
                { text: displayPercentage, alignment: 'right', margin: [10, 0, 0, 0], noWrap: true }
            ];
        });
    } else {
        categoryRows.push([{text: 'ไม่มีข้อมูล', colSpan: 3, alignment: 'center'}, {}, {}]);
    }

    // Prepare Score Data
    let score = scoreData.total_score ? Math.round(scoreData.total_score) : 'รอการประเมิน';
    let grade = scoreData.grade || '-';

    // Billing Info (Fallback to DB if snapshot missing)
    let billingMethod = snapCust.billing_method || data.billing_method || '-';
    // Translate Billing Method
    if (billingMethod.toLowerCase() === 'delivery') billingMethod = 'วางบิลพร้อมส่งของ';
    else if (billingMethod.toLowerCase() === 'mail') billingMethod = 'ทางไปรษณีย์';
    else if (billingMethod.toLowerCase() === 'messenger') billingMethod = 'วางบิลโดยแมสเซนเจอร์';

    const paymentMethod = snapCust.payment_method || data.payment_method || '-';
    const paymentCondition = snapCust.payment_condition || data.payment_condition || '-';

    // Bank Details
    const bankName = snapCust.payment_bank_name || data.payment_bank_name || '-';
    const bankBranch = snapCust.payment_bank_branch || data.payment_bank_branch || '-';
    const bankAccount = snapCust.payment_account_no || data.payment_account_no || '-';
    const bankDetails = (bankName !== '-' && bankAccount !== '-')
        ? `${bankName} สาขา ${bankBranch} เลขที่ ${bankAccount}`
        : '-';

    let paymentTerm = data.request_credit_term;
    if (!paymentTerm || paymentTerm === '-') {
        // Fallback to split terms
        const gs = data.term_gs || '0';
        const ae = data.term_ae || '0';
        const yc = data.term_yc || '0';
        if (gs !== '0' || ae !== '0' || yc !== '0') {
             paymentTerm = `G:${gs} S:${ae} Y:${yc}`;
        } else {
             paymentTerm = '-';
        }
    }

    // Logo Path
    const logoPath = path.join(__dirname, '../assets/logoReport.png');
    let logoImage = null;
    if (fs.existsSync(logoPath)) {
        logoImage = logoPath;
    }

    // Attachment Summary List - Focusing on Document Types
    const attachmentSummary = attachments.map((att, index) => {
        let typeLabel = att.file_type;
        // Map common types to Thai
        if (typeLabel === 'id_card') typeLabel = 'บัตรประชาชน';
        else if (typeLabel === 'home_registration') typeLabel = 'ทะเบียนบ้าน';
        else if (typeLabel === 'store_map') typeLabel = 'แผนที่ร้านค้า';
        else if (typeLabel === 'home_map') typeLabel = 'แผนที่บ้าน';
        else if (typeLabel === 'store_photo') typeLabel = 'รูปถ่ายร้านค้า';
        else if (typeLabel === 'home_photo') typeLabel = 'รูปถ่ายบ้านพักอาศัย';
        else if (typeLabel === 'bank_statement') typeLabel = 'Statement ธนาคาร';
        else if (typeLabel === 'commercial_registration') typeLabel = 'ทะเบียนพาณิชย์/ภพ.20';
        else if (typeLabel === 'credit_application_doc') typeLabel = 'ใบคำขอสินเชื่อ';
        else if (typeLabel === 'land_tax_doc') typeLabel = 'เอกสารเสียภาษีที่ดิน';

        // Keep original filename in parentheses if needed, or just type
        // User requested: "check completeness ... filename is not main point"
        // Pattern: "1. ภพ.20"
        return `${index + 1}. ${typeLabel}`;
    }).join('\n');


    // Build Document Definition
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 30], // Slightly reduced margins for more space
      defaultStyle: {
        font: 'Sarabun',
        fontSize: 10
      },
      content: [
        // --- HEADER ---
        {
            columns: [
                // Left: Logo (Fixed Width)
                logoImage ? {
                    image: logoImage,
                    width: 120,
                    margin: [0, 0, 0, 0]
                } : { text: 'LOGO', fontSize: 10, color: 'gray', width: 120 },

                // Center: Title & Metadata (Aligned Center relative to page)
                // Use absolute centering logic or just expanded width
                {
                    stack: [
                        { text: 'คำขอเครดิต', style: 'header', alignment: 'center' },
                        { text: `เลขที่คำขอ: ${data.tx_id}`, alignment: 'center', fontSize: 10, margin: [0, 5, 0, 0] },
                        { text: `วันที่: ${formatDate(data.created_at)}`, alignment: 'center', fontSize: 10 }
                    ],
                    width: '*', // Take available space
                    alignment: 'center'
                },

                // Right: Request Type & Status (Fixed Width equal to Left to balance center)
                {
                    stack: [
                         { text: `ประเภท: ${requestType}`, alignment: 'right', bold: true, fontSize: 12, margin: [0, 10, 0, 0] },
                         { text: `สถานะ: ${data.status}`, alignment: 'right', fontSize: 10, margin: [0, 5, 0, 0], bold: true }
                    ],
                    width: 120
                }
            ],
            margin: [0, 0, 0, 20]
        },

        // --- SECTION 1: CUSTOMER PROFILE (Consolidated) ---
        // Fields: General, Residence, Store
        { text: 'ข้อมูลลูกค้า', style: 'subheader' },
        {
          table: {
            widths: ['15%', '35%', '15%', '35%'],
            body: [
              // Row 1: General Identity
              [{ text: 'ชื่อลูกค้า:', bold: true }, { text: customerName, colSpan: 3 }, {}, {}],
              // Row 2: IDs
              [{ text: 'รหัสลูกค้า:', bold: true }, customerNo, { text: 'เลขเสียภาษี:', bold: true }, taxId],
              // Row 3: Business Info
              [{ text: 'ประเภทธุรกิจ:', bold: true }, businessType, { text: 'ดำเนินกิจการ:', bold: true }, `${yearsInBusiness} ปี`],
              // Row 4: Key Persons
              [{ text: 'ผู้มีอำนาจ:', bold: true }, authName, { text: 'ผู้ติดต่อ:', bold: true }, `${contactName} (${contactPhone})`]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15]
        },

        // --- SECTION 1.5: ADDRESS INFO (Split as requested) ---
        { text: 'สถานที่ประกอบการและที่อยู่อาศัย', style: 'subheader' },
        {
          table: {
            widths: ['15%', '85%'], // 2-Column layout for address
            body: [
               // Row 1: Business Place (Dynamic Label: Store/Company)
               [{ text: businessPlaceLabel, bold: true }, businessPlaceValue],
               [{ text: 'กรรมสิทธิ์:', bold: true }, storeOwnDisplay],
               // Row 2: Residence (Fixed Label)
               [{ text: residenceLabel, bold: true }, residenceValue],
               [{ text: 'กรรมสิทธิ์:', bold: true }, resOwnDisplay]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15]
        },

        // --- SECTION 2: FINANCIAL SUMMARY ---
        // 3-month sales history & summary stats
        { text: 'ประวัติการซื้อ', style: 'subheader' },
        {
             columns: [
                 // Col 1: Monthly History
                 {
                     width: 'auto',
                     table: {
                         widths: ['auto', 'auto'],
                         body: [
                             [{ text: 'เดือน', bold: true, fillColor: '#f9f9f9' }, { text: 'ยอดซื้อ', bold: true, alignment: 'right', fillColor: '#f9f9f9', margin: [20, 0, 0, 0] }],
                             ...monthlySalesRows
                         ]
                     },
                     layout: 'lightHorizontalLines'
                 },
                 // Col 2: Category Breakdown
                 {
                     width: 'auto',
                     margin: [40, 0, 0, 0],
                     table: {
                         widths: ['auto', 'auto', 'auto'],
                         body: [
                             [{ text: 'สินค้า', bold: true, fillColor: '#f9f9f9' }, { text: 'มูลค่า', bold: true, alignment: 'right', fillColor: '#f9f9f9', margin: [20, 0, 0, 0] }, { text: '%', bold: true, alignment: 'right', fillColor: '#f9f9f9', margin: [10, 0, 0, 0] }],
                             ...categoryRows
                         ]
                     },
                     layout: 'lightHorizontalLines'
                 },
                 // Col 3: Summary Stats
                 {
                     width: '*',
                     margin: [40, 0, 0, 0],
                     table: {
                         widths: ['auto', '*'],
                         body: [
                             [{ text: 'ยอดซื้อสะสม:', bold: true }, { text: (financial.total_purchase_3_months || formatCurrency(financial.stats?.total_accum) || '0.00') + ' บาท', alignment: 'right' }],
                             [{ text: 'เฉลี่ยต่อเดือน:', bold: true }, { text: (financial.avg_monthly || formatCurrency(financial.stats?.avg_3_months) || '0.00') + ' บาท', alignment: 'right' }],
                             [{ text: 'แนวโน้ม:', bold: true }, { text: financial.avg_monthly_trend || financial.trend_status || '-', alignment: 'right' }]
                         ]
                     },
                     layout: 'noBorders'
                 }
             ],
             margin: [0, 0, 0, 15]
        },

        // --- SECTION 3: TRANSACTION & BILLING (Grouped) ---
        { text: 'รายละเอียดคำขอและเงื่อนไขการชำระเงิน', style: 'subheader' },
        {
            table: {
                widths: ['15%', '35%', '20%', '30%'],
                body: [
                     // Credit Request
                     [
                        { text: 'วงเงินที่ขอ:', bold: true }, formatCurrency(data.request_amount) + ' บาท',
                        { text: 'ระยะเวลาเครดิต:', bold: true }, `${paymentTerm}`
                     ],
                     [
                        { text: 'เหตุผล:', bold: true }, { text: data.request_reason || '-', colSpan: 3 }, {}
                     ],
                     // Billing & Payment
                     [
                        { text: 'การวางบิล:', bold: true }, billingMethod,
                        { text: 'การชำระเงิน:', bold: true }, paymentMethod
                     ],
                     [
                        { text: 'เงื่อนไข:', bold: true }, paymentCondition,
                        { text: 'ธนาคาร:', bold: true }, bankDetails
                     ]
                ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15]
        },

        // --- SECTION 4: RISK ANALYSIS (Moved UP, before Attachments) ---
        { text: 'การวิเคราะห์ความเสี่ยง', style: 'subheader' },
        {
            table: {
                widths: ['*', '*'], // Only Score and Grade
                body: [
                    [
                        { text: 'Credit Score', style: 'tableHeader', alignment: 'center', fillColor: '#f0f0f0' },
                        { text: 'Grade', style: 'tableHeader', alignment: 'center', fillColor: '#f0f0f0' }
                    ],
                    [
                        { text: score === 'รอการประเมิน' ? score : `${score} / 100`, alignment: 'center', fontSize: 14, bold: true, margin: [0, 10, 0, 10] },
                        { text: grade, alignment: 'center', fontSize: 14, bold: true, margin: [0, 10, 0, 10] }
                    ]
                ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 15]
        },

        // --- SECTION 5: ATTACHMENTS (Removed as requested) ---
      ],
      styles: {
        header: {
          fontSize: 18,
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
