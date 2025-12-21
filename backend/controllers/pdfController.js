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

    // Build Document Definition
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: {
        font: 'Sarabun',
        fontSize: 12
      },
      content: [
        // --- PAGE 1: EXECUTIVE SUMMARY ---
        { text: 'สรุปคำขอสินเชื่อ (Credit Request Summary)', style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },

        // Section: Request Info
        {
          style: 'tableExample',
          table: {
            widths: ['*', '*'],
            body: [
              [{ text: 'เลขที่คำขอ (Request No.): ' + data.tx_id, bold: true }, { text: 'วันที่ (Date): ' + formatDate(data.created_at), alignment: 'right' }],
              [{ text: 'สถานะ (Status): ' + data.status, colSpan: 2 }, {}]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 10]
        },

        { text: '', margin: [0, 5] }, // Spacer

        // Section: Transaction Info
        { text: 'รายละเอียดการขอสินเชื่อ', style: 'subheader' },
        {
          table: {
            widths: ['auto', '*'],
            body: [
              [{ text: 'วงเงินที่ขอ (Amount):', bold: true }, formatCurrency(data.request_amount) + ' บาท'],
              [{ text: 'เหตุผล (Reason):', bold: true }, data.request_reason || '-']
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },

        // Section: Customer Info
        { text: 'ข้อมูลลูกค้า (Customer Information)', style: 'subheader' },
        {
          table: {
            widths: ['auto', '*'],
            body: [
              [{ text: 'รหัสลูกค้า (ID):', bold: true }, customerNo],
              [{ text: 'ชื่อลูกค้า/บริษัท (Name):', bold: true }, customerName],
              [{ text: 'เลขประจำตัวผู้เสียภาษี (Tax ID):', bold: true }, taxId],
              // [{ text: 'ประเภทธุรกิจ (Business Type):', bold: true }, customer.business_type || '-'], // Not available in current schema
              [{ text: 'ที่อยู่ (Address):', bold: true }, fullAddress],
              [{ text: 'โทรศัพท์ (Phone):', bold: true }, contactPhone]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        },

         // Section: Authorized Person
         { text: 'ผู้มีอำนาจลงนาม / ผู้ติดต่อ (Authorized / Contact)', style: 'subheader' },
         {
           table: {
             widths: ['auto', '*'],
             body: [
               [{ text: 'ผู้มีอำนาจลงนาม:', bold: true }, `${authName} (${authPos})`],
               [{ text: 'ผู้ติดต่อ:', bold: true }, `${contactName} (${contactPos})`]
             ]
           },
           layout: 'lightHorizontalLines',
           margin: [0, 0, 0, 20]
         }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true
        },
        subheader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5]
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
