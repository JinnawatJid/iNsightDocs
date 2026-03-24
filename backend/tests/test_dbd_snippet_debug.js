const logger = require('../utils/logger');

const snippet = "่งพิมพ์ :เวลา :04/02/2026\nประเภทนิติบุคคล :\nวันที่จดทะเบียนจัดตั้ง :\nสถานะนิติบุคคล :\nบริษัทจํากัด\n01/07/2554\nยังดําเนินกิจการอยู่\nเลขทะเบียนนิติบุคคล";

logger.info("Snippet:", JSON.stringify(snippet));

// Current Regex
const labelDateRegex = /\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19(?:\u0e08\u0e31\u0e14\u0e15\u0e31\u0e49\u0e07)?/;
const matchIndex = snippet.search(labelDateRegex);

logger.info("Match Index:", matchIndex);

if (matchIndex === -1) {
    logger.info("❌ Regex failed to match label.");

    // Let's find where the label actually is in the string manually to inspect chars
    const manualIndex = snippet.indexOf("วันที่จดทะเบียนจัดตั้ง");
    logger.info("Manual Index (using string literal):", manualIndex);

    if (manualIndex !== -1) {
        const target = snippet.substring(manualIndex, manualIndex + 22);
        logger.info("Target String:", target);
        logger.info("Char Codes:");
        for (let i = 0; i < target.length; i++) {
            logger.info(`${target[i]} : ${target.charCodeAt(i).toString(16)}`);
        }
    }
} else {
    logger.info("✅ Regex Matched!");
    const window = snippet.substring(matchIndex, matchIndex + 300);
    const dateMatch = window.match(/(\d{2}\/\d{2}\/\d{4})/);
    logger.info("Date Found:", dateMatch ? dateMatch[1] : "None");
}

// Strategy B: Find all dates
logger.info("\n--- Strategy B: Find All Dates ---");
const allDates = snippet.match(/(\d{2}\/\d{2}\/\d{4})/g);
logger.info("All Dates:", allDates);

// Logic:
// Date 1: 04/02/2026 (Likely print date, > 2568 or = current year)
// Date 2: 01/07/2554 (Registration)

if (allDates && allDates.length >= 2) {
    // Usually the registration date is the one that is NOT the print date (which is usually today)
    // Or we can pick the "Oldest" date?
    // Or the one closest to "บริษัทจํากัด"?
    logger.info("Potential Registration Date:", allDates[1]);
}
