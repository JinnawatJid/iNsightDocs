import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function verifyManualUpload() {
    const customerId = '00001NR-2';
    const baseUrl = 'http://localhost:3000/api/financials';

    console.log('--- Verifying Manual Upload API ---');

    try {
        // 1. Test flagging "No Financial Data"
        console.log(`1. Testing "No Financial Data" flag for ${customerId}...`);
        const resFlag = await axios.post(`${baseUrl}/upload-local/${customerId}`, {
            no_financial_data: 'true'
        });
        console.log('Response:', resFlag.data);

        if (!resFlag.data.success) throw new Error('Flagging failed');

        // Verify directory and marker file
        let projectRoot = path.resolve(__dirname, '../../');
        const customerDir = path.join(projectRoot, 'customers', customerId);
        const subdirs = await fs.readdir(customerDir);
        const dateFolders = subdirs.filter(d => /^\d{8}$/.test(d)).sort().reverse();
        const latestPath = path.join(customerDir, dateFolders[0]);
        const markerExists = await fs.pathExists(path.join(latestPath, 'DBD_NoFinancialData.txt'));

        console.log('Marker exists:', markerExists);
        if (!markerExists) throw new Error('Marker file not found');

        // 2. Test Single Readiness Check (Direct)
        console.log('2. Testing Single Readiness Check...');
        const resSingle = await axios.get(`${baseUrl}/check-local/${customerId}`);
        console.log('Readiness Result:', resSingle.data);

        if (!resSingle.data.exists || !resSingle.data.isNoFinancialData) {
            throw new Error('Single Readiness check failed for flagged customer');
        }

        console.log('--- VERIFICATION SUCCESSFUL ---');

    } catch (error) {
        console.error('--- VERIFICATION FAILED ---');
        console.error(error.message);
        if (error.response) console.error(error.response.data);
        process.exit(1);
    }
}

verifyManualUpload();
