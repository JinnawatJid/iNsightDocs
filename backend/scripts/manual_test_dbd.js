// Script to manually test DBD PDF Extraction logic
// Run with: node backend/scripts/manual_test_dbd.js [path/to/pdf]

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path = require('path');
const db = require('../db');
const { extractAndProcessDBDData } = require('../controllers/externalController');

const main = async () => {
    // 1. Initialize Database (required because extraction updates DB)
    console.log('Initializing Database...');
    await db.initialize();

    // 2. Determine PDF Path
    let pdfPath = process.argv[2];
    if (!pdfPath) {
        // Default to test file if exists
        pdfPath = path.join(__dirname, '../test_dbd.pdf');
        console.log(`No file argument provided. Using default: ${pdfPath}`);
    } else {
        pdfPath = path.resolve(pdfPath);
    }

    // 3. Run Extraction
    console.log(`\n--- Starting Extraction Test on: ${pdfPath} ---\n`);

    // Use dummy taxId/companyName just for the function signature
    // The extraction logic relies on the PDF content, but updates DB based on these.
    // We can use a taxID that matches a row in DB if we want to test the UPDATE.
    // Or just check the return value.
    const mockTaxId = '1234567890123';
    const mockName = 'Test Extraction Company';

    const result = await extractAndProcessDBDData(pdfPath, mockTaxId, mockName);

    console.log('\n--- Extraction Result ---');
    console.log(result);

    console.log('\n--- Done ---');
    process.exit(0);
};

main().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
