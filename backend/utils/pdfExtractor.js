const pdf = require('pdf-parse');

/**
 * Extract data from DBD Profile PDF (Buffer)
 * Returns: { yearsInBusiness, registeredCapital, registrationDate, success: boolean, debug: object }
 */
const extractDBDData = async (buffer) => {
    try {
        const data = await pdf(buffer);
        const text = data.text;

        const result = {
            success: true,
            yearsInBusiness: 0,
            registeredCapital: 0,
            registrationDate: null,
            companyName: null,
            directors: [],
            debug: {}
        };

        // --- 0. Company Name Extraction ---
        // Look for common corporate entity prefixes as the name often appears as a title at the top
        // or just sequentially before the first "ข้อมูล" or "เลขทะเบียนนิติบุคคล" label.
        // It's usually the very first prominent string.
        try {
            // First, try matching the exact label if it exists
            const nameRegexExact = /ชื่อนิติบุคคล\s*[:]\s*([^\n]+)/;
            const nameMatchExact = text.match(nameRegexExact);
            if (nameMatchExact) {
                result.companyName = nameMatchExact[1].trim();
                result.debug.nameStrategy = 'Exact Label';
            } else {
                // Heuristic: The company name is often near the top, typically containing keywords
                // like ห้างหุ้นส่วนจำกัด (Limited Partnership) or บริษัท (Company)
                const prefixRegex = /(?:ห้างหุ้นส่วนจำกัด|บริษัท|บ\.|หจก\.)\s+[^\n]+/;
                const prefixMatch = text.match(prefixRegex);
                if (prefixMatch) {
                    // Clean up trailing labels if they accidentally matched
                    let extractedName = prefixMatch[0].trim();
                    const endLabels = ["ข้อมูล", "เลขทะเบียน", "วันที่", "เอกสาร"];
                    for (const label of endLabels) {
                        const idx = extractedName.indexOf(label);
                        if (idx > 0) {
                            extractedName = extractedName.substring(0, idx).trim();
                        }
                    }
                    if (extractedName.length > 5) {
                        result.companyName = extractedName;
                        result.debug.nameStrategy = 'Prefix Scan';
                    }
                }
            }
        } catch (nameErr) {
            console.warn("Failed to extract name via pdfExtractor:", nameErr.message);
        }

        const currentYearBE = new Date().getFullYear() + 543;

        // --- 1. Registration Date Extraction ---
        // Label: วันที่จดทะเบียนจัดตั้ง (Date of Registration)
        // Regex for label (Unicode for "วันที่จดทะเบียนจัดตั้ง")
        const labelDateRegex = /\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19(?:\u0e08\u0e31\u0e14\u0e15\u0e31\u0e49\u0e07)?/;
        const dateMatchIndex = text.search(labelDateRegex);
        let dateFound = false;

        // Strategy A: Look near the label (Registration Date)
        if (dateMatchIndex !== -1) {
            // Take 300 chars window
            const searchWindow = text.substring(dateMatchIndex, dateMatchIndex + 300);
            // Look for dd/mm/yyyy pattern
            const datePattern = /(\d{2}\/\d{2}\/\d{4})/;
            const match = searchWindow.match(datePattern);
            if (match) {
                const dateStr = match[1];
                result.registrationDate = dateStr;
                const parts = dateStr.split('/');
                const yearBE = parseInt(parts[2]);
                result.yearsInBusiness = Math.max(0, currentYearBE - yearBE);
                dateFound = true;
                result.debug.dateStrategy = 'Label Window';
            }
        }

        // Strategy B: Fallback scan for dates (if label not found or date not near label)
        if (!dateFound) {
             const allDates = text.match(/(\d{2}\/\d{2}\/\d{4})/g);

             if (allDates && allDates.length > 0) {
                 // Filter valid past dates (<= current year)
                 const validDates = allDates.filter(d => {
                     const parts = d.split('/');
                     const y = parseInt(parts[2]);
                     return y <= currentYearBE;
                 });

                 // Heuristic: Pick the first valid historical date
                 // (likely not the print date if multiple exist, print date usually recent)
                 let chosenDate = null;
                 const historicalDates = validDates.filter(d => parseInt(d.split('/')[2]) < currentYearBE);

                 if (historicalDates.length > 0) {
                     chosenDate = historicalDates[0];
                 } else if (validDates.length > 0) {
                     chosenDate = validDates[0];
                 }

                 if (chosenDate) {
                    result.registrationDate = chosenDate;
                    const parts = chosenDate.split('/');
                    const yearBE = parseInt(parts[2]);
                    result.yearsInBusiness = Math.max(0, currentYearBE - yearBE);
                    dateFound = true;
                    result.debug.dateStrategy = 'Fallback Scan';
                 }
             }
        }

        // --- 2. Registered Capital Extraction ---
        // Label: ทุนจดทะเบียน (Registered Capital)
        // Regex for label (Unicode for "ทุนจดทะเบียน")
        const labelCapRegex = /\u0e17\u0e38\u0e19\u0e08\u0e14\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19/;
        const capMatchIndex = text.search(labelCapRegex);
        let capFound = false;

        if (capMatchIndex !== -1) {
             const searchWindow = text.substring(capMatchIndex, capMatchIndex + 300);
             // Look for number with commas or decimals (e.g., 1,000,000.00)
             // Pattern: Digits, comma, dot, 2 digits. (([\d,]+\.\d{2}))
             const capPattern = /([\d,]+\.\d{2})/;
             const match = searchWindow.match(capPattern);
             if (match) {
                 const rawCap = match[1].replace(/,/g, '');
                 result.registeredCapital = parseFloat(rawCap);
                 result.debug.capStrategy = 'Label Window';
                 capFound = true;
             }
        }

        // Strategy B for Capital (Fallback): Check for large number near "Capital" or just first large number?
        // Risky without label. Stick to label for now. If label found but number format different?
        // Maybe try without decimals?
        if (!capFound && capMatchIndex !== -1) {
             const searchWindow = text.substring(capMatchIndex, capMatchIndex + 300);
             // Look for just commas (1,000,000)
             const capPatternSimple = /([\d,]{2,})/;
             const match = searchWindow.match(capPatternSimple);
             if (match) {
                 const rawCap = match[1].replace(/,/g, '');
                 // Validate it's a number
                 const val = parseFloat(rawCap);
                 if (!isNaN(val) && val > 1000) { // Assume capital > 1000
                     result.registeredCapital = val;
                     result.debug.capStrategy = 'Label Window (Simple)';
                 }
             }
        }

        // --- 3. Directors Extraction ---
        // Look for "รายชื่อกรรมการ" or "กรรมการ" and extract subsequent names
        try {
            // Find the index of "รายชื่อกรรมการ" or "กรรมการ"
            const dirRegex = /(?:รายชื่อกรรมการ|กรรมการ)\s*[:]?\s*/;
            const dirMatch = text.match(dirRegex);

            if (dirMatch) {
                const dirIndex = dirMatch.index + dirMatch[0].length;
                // Look for the end of the directors section, often marked by "อำนาจกรรมการ", "ทุนจดทะเบียน", or other sections
                const endRegex = /(?:อำนาจกรรมการ|ข้อจำกัดอำนาจ|ที่ตั้ง|ทุนจดทะเบียน|วัตถุประสงค์)/;
                const endMatch = text.substring(dirIndex).match(endRegex);

                let dirSection = text.substring(dirIndex);
                if (endMatch) {
                    dirSection = text.substring(dirIndex, dirIndex + endMatch.index);
                }

                // Extract lines that look like names. Typically prefixed by a number e.g. "1. นาย..."
                // or just lines containing "นาย", "นาง", "นางสาว"
                const lines = dirSection.split('\n');
                const directors = [];

                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;

                    // Match pattern: optional number, followed by name prefix
                    const namePattern = /^(?:\d+\.\s*)?((?:นาย|นาง|นางสาว|พล\.|ดร\.|ม\.ร\.ว\.)[^\d]+)/;
                    const nameMatch = line.match(namePattern);

                    if (nameMatch) {
                        let name = nameMatch[1].trim();
                        // Clean trailing noise like " / " or extra spaces
                        name = name.replace(/[\/\|].*$/, '').trim();
                        if (name.length > 3 && !directors.includes(name)) {
                            directors.push(name);
                        }
                    }
                }

                if (directors.length > 0) {
                    result.directors = directors;
                    result.debug.dirStrategy = 'Prefix Scan';
                }
            }
        } catch (dirErr) {
            console.warn("Failed to extract directors via pdfExtractor:", dirErr.message);
        }

        return result;

    } catch (error) {
        console.error('PDF Extraction Error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { extractDBDData };
