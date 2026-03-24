const logger = require('../utils/logger');

const parser = (text) => {
    const result = {
        idNumber: null,
        title: null,
        firstName: null,
        lastName: null,
        address: null,
        dateOfBirth: null,
        dateOfIssue: null,
        dateOfExpiry: null
    };

    // Helper: Normalize spaces
    const cleanText = text.replace(/\r\n/g, '\n');

    // 1. ID Number
    const idMatch = cleanText.match(/\b\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d\b/);
    if (idMatch) {
        result.idNumber = idMatch[0].replace(/[^0-9]/g, '');
    }

    // 2. Name
    // Order matters! Longest matches first to avoid partial matches (e.g. นาง vs นางสาว)
    const nameRegex = /(นางสาว|นาย|นาง|ด\.ช\.|ด\.ญ\.|Mr\.|Mrs\.|Ms\.)\s*([^\s]+)\s+([^\s]+)/;
    const nameMatch = cleanText.match(nameRegex);
    if (nameMatch) {
        result.title = nameMatch[1];
        result.firstName = nameMatch[2];
        result.lastName = nameMatch[3];
    }

    // 3. Address
    const addressMatch = cleanText.match(/(?:ที่อยู่|Address)[^:\d]*[:\s]\s*([\s\S]+?)(?=\n.*(?:วัน|Date|Issue|Expiry|Religion|ศาสนา)|$)/i);
    if (addressMatch) {
        let addr = addressMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        result.address = addr;
    }

    // 4. Dates
    const datePattern = "([0-9]{1,2}\\s+[\\S]+\\s+[0-9]{4})";

    // Date of Birth
    const dobRegex = new RegExp(`(?:เกิด|Birth)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const dobMatch = cleanText.match(dobRegex);
    if (dobMatch) {
        result.dateOfBirth = dobMatch[1];
    }

    // Date of Issue
    const issueRegex = new RegExp(`(?:วันออกบัตร|Issue)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const issueMatch = cleanText.match(issueRegex);
    if (issueMatch) {
        result.dateOfIssue = issueMatch[1];
    }

    // Date of Expiry
    const expiryRegex = new RegExp(`(?:วันหมดอายุ|Expiry)[^:\\d]*[:\\s]\\s*${datePattern}`, "i");
    const expiryMatch = cleanText.match(expiryRegex);
    if (expiryMatch) {
        result.dateOfExpiry = expiryMatch[1];
    }

    return result;
};

// --- Test Cases ---

const sample1 = `
Identification Number: 1 1005 00567 89 5
ชื่อ ตัวและชื่อสกุล : นาย สมชาย ใจดี
Name : Mr. Somchai Jaidee
เกิดวันที่ : 25 ก.พ. 2525
Date of Birth : 25 Feb. 1982
ที่อยู่ : 99/9 หมู่ที่ 2 ต.บางเขน
อ.เมืองนนทบุรี จ.นนทบุรี
วันออกบัตร : 15 ม.ค. 2564
วันหมดอายุ : 24 ก.พ. 2573
`;

const sample2 = `
<figure>
บัตรประจำตัวประชาชน Thai National ID Card
เลขประจำตัวประชาชน 3 6504 00293 81 2
ชื่อ นางสาว สวยงาม จริงใจ
เกิด 14 เม.ย. 2530
ที่อยู่ 123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110
วันออกบัตร 10 พ.ค. 2565
วันหมดอายุ 13 เม.ย. 2574
</figure>
`;

// Run Tests
logger.info("--- Sample 1 ---");
logger.info(parser(sample1));

logger.info("\n--- Sample 2 ---");
logger.info(parser(sample2));
