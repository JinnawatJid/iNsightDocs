/**
 * Formats a request type string based on the configuration setting.
 * Combines "เครดิตเพิ่ม", "เปลี่ยนแปลงระยะเวลาเครดิต", and "เปลี่ยนแปลงเงื่อนไขการชำระเงิน"
 * into a single label "เปลี่ยนแปลงเงื่อนไขเครดิต" if combining is enabled.
 *
 * @param {string} requestType - A comma-separated string of request types
 * @param {boolean} combineEnabled - Whether combining is enabled in the configuration
 * @returns {string} - The formatted request type string
 */
export const formatRequestType = (requestType, combineEnabled) => {
    if (!requestType) return '';

    if (!combineEnabled) {
        return requestType;
    }

    const combinableTypes = [
        'เครดิตเพิ่ม',
        'เปลี่ยนแปลงระยะเวลาเครดิต',
        'เปลี่ยนแปลงเงื่อนไขการชำระเงิน'
    ];

    const types = requestType.split(',').map(t => t.trim());

    let hasCombinableType = false;
    const remainingTypes = [];

    for (const type of types) {
        if (combinableTypes.includes(type)) {
            hasCombinableType = true;
        } else {
            remainingTypes.push(type);
        }
    }

    if (hasCombinableType) {
        remainingTypes.push('เปลี่ยนแปลงเงื่อนไขเครดิต');
    }

    // Join back, maintaining any other types like "เครดิตใหม่" or "เครดิตโครงการ" if they exist somehow
    return remainingTypes.join(',');
};
