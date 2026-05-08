/**
 * Name Normalizer Utility
 *
 * Used to clean and standardize names for Blacklist matching.
 */

const THAI_TITLES = [
    'นาย', 'นาง', 'นางสาว', 'น.ส.', 'ด.ช.', 'ด.ญ.', 'คุณ',
    'พล.ต.', 'พล.อ.', 'พล.ท.', 'หม่อมหลวง', 'หม่อมราชวงศ์',
    'ดร.', 'ผศ.', 'รศ.', 'ศ.', 'อาจารย์',
    'ว่าที่ร้อยตรี', 'ว่าที่ร.ต.'
];

const ENGLISH_TITLES = [
    'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.', 'Rev.'
];

const BUSINESS_KEYWORDS = [
    'บริษัท', 'ห้างหุ้นส่วนจำกัด', 'หจก.', 'บจก.', 'จำกัด', 'มหาชน',
    'Company', 'Limited', 'Ltd.', 'Inc.', 'Corp.', 'Co.,'
];

/**
 * Strips titles and business prefixes/suffixes from a name.
 * @param {string} name
 * @returns {string} Normalized name (trimmed, single spaces)
 */
function normalizeName(name) {
    if (!name) return '';

    let cleanName = name.trim();

    // Remove Business Keywords (Global replace)
    BUSINESS_KEYWORDS.forEach(keyword => {
        // Use word boundary if possible, or just replace
        // Note: Thai doesn't have clear word boundaries, so direct replace is safer for known keywords
        cleanName = cleanName.split(keyword).join(' ');
    });

    // Remove Titles (Start of string usually)
    // We sort by length descending to match longer titles first (e.g. 'นางสาว' before 'นาง')
    const allTitles = [...THAI_TITLES, ...ENGLISH_TITLES].sort((a, b) => b.length - a.length);

    allTitles.forEach(title => {
        if (cleanName.startsWith(title)) {
            cleanName = cleanName.substring(title.length).trim();
        }
        // Also check with space (e.g. "นาย สมชาย")
        if (cleanName.startsWith(title + ' ')) {
            cleanName = cleanName.substring(title.length + 1).trim();
        }
    });

    // Replace multiple spaces with single space
    cleanName = cleanName.replace(/\s+/g, ' ').trim();

    return cleanName;
}

/**
 * Determines whether a customer name belongs to a juristic entity (Company)
 * by checking for Thai and English business entity keywords.
 * This is the canonical classification function used across the entire system.
 * @param {string} name - Customer name from NAV / database
 * @returns {boolean} true if Company, false if Individual
 */
function isCompanyByName(name) {
    if (!name || typeof name !== 'string') return false;
    return BUSINESS_KEYWORDS.some(keyword => name.includes(keyword));
}

/**
 * Extracts the last name from a normalized name.
 * @param {string} normalizedName
 * @returns {string|null} The last name, or null if single word
 */
function extractLastName(normalizedName) {
    if (!normalizedName) return null;
    const parts = normalizedName.split(' ');
    if (parts.length < 2) return null; // No last name

    const lastName = parts[parts.length - 1];

    // Safety check: Ignore if last name is too short (e.g. initial) or common noise
    if (lastName.length < 2) return null;

    return lastName;
}

module.exports = {
    normalizeName,
    extractLastName,
    isCompanyByName
};
