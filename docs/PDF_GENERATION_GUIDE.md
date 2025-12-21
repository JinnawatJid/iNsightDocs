# PDF Generation Guide

This document explains how the **Credit Request PDF Summary** is generated and provides instructions for developers on how to customize it (e.g., adding new fields or sections).

## Architecture

The PDF generation is handled **server-side** using the [pdfmake](http://pdfmake.org/) library. This approach was chosen to support offline deployment (no external API calls) and ensure consistent formatting across all client devices.

*   **Controller:** `backend/controllers/pdfController.js`
*   **Fonts:** `backend/assets/fonts/` (Sarabun Regular & Bold)
*   **Route:** `GET /api/credit-requests/:id/pdf`

## How it Works

1.  **Data Fetching:** The controller executes a SQL query to fetch the Credit Request details joined with the Customer table.
2.  **Snapshot Merging:** It merges this data with the JSON `snapshot_data` stored at the time of submission to ensure the PDF reflects the exact state of the request.
3.  **Layout Definition:** A `docDefinition` object is constructed. This object describes the PDF structure (text, columns, tables) using `pdfmake` syntax.
4.  **Generation:** The `pdfmake` printer generates the binary PDF stream and pipes it to the HTTP response.

---

## Developer Guide: How to Customize

### 1. Adding a New Field

To add a new data field (e.g., "Email" or "Branch Code") to an existing table:

**Step A: Ensure Data Availability**
Check the SQL query in `generateCreditRequestPDF` inside `backend/controllers/pdfController.js`. If the column isn't selected, add it.

```javascript
const requestQuery = `
  SELECT
    cr.*,
    c.email,  <-- Add this line
    c.customer_name, ...
  FROM ...
`;
```

**Step B: Update the Layout**
Locate the `docDefinition` object. Find the relevant section (e.g., "Customer Information" table). Append a new row to the `body` array.

```javascript
// Inside docDefinition.content ...
{
  table: {
    body: [
      // ... existing rows ...

      // New Row
      [{ text: 'อีเมล (Email):', bold: true }, customer.email || '-'],
    ]
  }
}
```

### 2. Adding a New Section

To add a completely new section (e.g., "Bank References"):

Add a new block to the `content` array in `docDefinition`.

```javascript
content: [
  // ... existing content ...

  // New Section Header
  { text: 'ข้อมูลธนาคาร (Bank References)', style: 'subheader' },

  // New Section Content (Table)
  {
    table: {
      widths: ['auto', '*'], // First col auto-width, second col fills rest
      body: [
        [{ text: 'ธนาคาร:', bold: true }, 'Kasikorn Bank'],
        [{ text: 'เลขบัญชี:', bold: true }, '123-4-56789-0']
      ]
    },
    layout: 'lightHorizontalLines', // Optional: Adds horizontal lines
    margin: [0, 0, 0, 20] // Bottom margin
  }
]
```

### 3. Styling

Styles are defined at the bottom of the `docDefinition` object.

```javascript
styles: {
  header: { fontSize: 18, bold: true },
  subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
  customStyle: { fontSize: 10, italics: true, color: 'gray' } // Define new styles here
}
```

Use them in your content: `{ text: 'Note', style: 'customStyle' }`.

### 4. Images

Images are automatically handled if they exist in the `CreditRequestAttachments` table. The code looks for files with extensions `.jpg`, `.jpeg`, or `.png` and appends them to the end of the document.

To change image sizing or layout, modify the loop in the `// --- PAGE 2: IMAGES & MAPS ---` section.

```javascript
{
    image: imagePath,
    fit: [500, 300], // [width, height] constraint
    alignment: 'center'
}
```

## Troubleshooting

*   **Font Errors:** If you see errors about fonts, ensure `backend/assets/fonts/Sarabun-Regular.ttf` and `Bold.ttf` exist and are valid font files.
*   **Layout Issues:** `pdfmake` tables can be tricky. Use `widths: ['*', '*']` for equal columns or `['auto', '*']` for label-value pairs.
