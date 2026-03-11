const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

async function debugLocalFolder() {
    console.log("==================================================");
    console.log("  JULES DBD DEBUG SCRIPT ");
    console.log("==================================================");

    // 1. Where are we looking?
    const customerNo = '10001CB';
    let projectRoot = path.resolve(__dirname, '../../');
    if (!fs.existsSync(path.join(projectRoot, 'customers'))) {
        projectRoot = path.resolve(__dirname, '');
    }

    // Explicitly target the folder you mentioned
    const hardcodedPath = `C:\\Users\\Jinna\\customers\\${customerNo}`;
    const dynamicPath = path.join(projectRoot, 'customers', customerNo);

    console.log("-> Checking Hardcoded Path: ", hardcodedPath);
    console.log("   Exists?", fs.existsSync(hardcodedPath));
    console.log("-> Checking Dynamic Path:   ", dynamicPath);
    console.log("   Exists?", fs.existsSync(dynamicPath));

    const customerRoot = fs.existsSync(hardcodedPath) ? hardcodedPath : (fs.existsSync(dynamicPath) ? dynamicPath : null);

    if (!customerRoot) {
        console.error("[FAILED] Could not find the customer folder in either location.");
        return;
    }

    // 2. What folders are inside?
    const subdirs = fs.readdirSync(customerRoot);
    console.log(`\n-> Contents of ${customerRoot}:`);
    console.log("  ", subdirs);

    const dateFolders = subdirs.filter(d => /^\d{8}$/.test(d)).sort().reverse();
    if (dateFolders.length === 0) {
        console.error("[FAILED] No 8-digit date folders found.");
        return;
    }

    const latestFolder = dateFolders[0];
    const latestPath = path.join(customerRoot, latestFolder);
    console.log(`\n-> Targeting latest folder: ${latestPath}`);

    // 3. What files are inside the latest folder?
    const files = fs.readdirSync(latestPath);
    console.log("-> Files found inside:");
    files.forEach(f => console.log("   -", f));

    // 4. Test exact file matches required by financialController.js
    console.log("\n-> Testing API exact file matches:");
    const requiredFiles = [
        'DBD_Profile.pdf',
        'DBD_BalanceSheet.xlsx',
        'DBD_IncomeStatement.xlsx',
        'DBD_FinancialRatios.xlsx'
    ];

    let allFound = true;
    for (const reqFile of requiredFiles) {
        const filePath = path.join(latestPath, reqFile);
        const exists = fs.existsSync(filePath);
        console.log(`   [${exists ? 'FOUND' : 'MISSING'}] ${reqFile}`);
        if (!exists) allFound = false;
    }

    if (!allFound) {
        console.log("\n   WARNING: Because some files are MISSING, the UI will currently show YELLOW for them.");
    }

    // 5. Test parsing the Excel files directly
    console.log("\n-> Testing XLSX Parsing (to see if Bad uncompressed size crashes data extraction):");
    const excelFilesToTest = [
        'DBD_BalanceSheet.xlsx',
        'DBD_IncomeStatement.xlsx',
        'DBD_FinancialRatios.xlsx'
    ];

    for (const excel of excelFilesToTest) {
        const filePath = path.join(latestPath, excel);
        if (fs.existsSync(filePath)) {
            console.log(`\n   Parsing ${excel}...`);
            try {
                const fileBuffer = fs.readFileSync(filePath);
                const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

                console.log(`     - SUCCESS! Extracted ${rawData.length} rows.`);
                if (rawData.length > 5) {
                    console.log(`     - Header Row Preview:`, rawData.slice(0, 5).map(r => r.join(' | ')));
                }
            } catch (err) {
                console.error(`     - PARSE ERROR: ${err.message}`);
            }
        }
    }
    console.log("\n==================================================");
}

debugLocalFolder();
