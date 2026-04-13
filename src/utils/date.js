/**
 * Utility functions for date formatting.
 * Consolidates duplicate logic from various components.
 */

/**
 * Normalizes a date string to explicitly UTC if no timezone is provided,
 * preventing local timezone offset issues.
 * @param {string} dateString
 * @returns {string} Normalized date string
 */
const normalizeDateString = (dateString) => {
    if (!dateString) return '';
    let normalizedDateString = dateString;

    if (typeof normalizedDateString === 'string') {
        if (!normalizedDateString.includes('T')) {
            normalizedDateString = normalizedDateString.replace(' ', 'T');
        }
        if (!normalizedDateString.endsWith('Z')) {
            normalizedDateString += 'Z';
        }
    }
    return normalizedDateString;
};

/**
 * Formats a date string into 'DD/MM/YYYY HH:mm น.' using Thai locale (Gregorian year).
 * @param {string} dateString
 * @returns {string} Formatted date string
 */
export const formatDateTime = (dateString) => {
    if (!dateString) return '';

    const normalizedDateString = normalizeDateString(dateString);
    const dateObj = new Date(normalizedDateString);
    if (isNaN(dateObj.getTime())) return dateString;

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes} น.`;
};

/**
 * Formats a date string into 'DD/MM/YYYY' using Thai locale (Gregorian year).
 * @param {string|Date} dateObjOrString
 * @returns {string} Formatted date string
 */
export const formatDateString = (dateObjOrString) => {
    if (!dateObjOrString) return '-';

    let dateObj;
    if (dateObjOrString instanceof Date) {
        dateObj = dateObjOrString;
    } else {
        const normalizedDateString = normalizeDateString(dateObjOrString);
        dateObj = new Date(normalizedDateString);
    }

    if (isNaN(dateObj.getTime())) return dateObjOrString;

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * Formats a date string using toLocaleDateString with short month names (e.g. '14 เม.ย. 2566')
 * Useful for timelines and document lists.
 * @param {string} dateString
 * @returns {string}
 */
export const formatDateLocale = (dateString) => {
    if (!dateString) return '';

    const normalizedDateString = normalizeDateString(dateString);
    const date = new Date(normalizedDateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
