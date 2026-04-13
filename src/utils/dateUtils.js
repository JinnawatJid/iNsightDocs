export const formatDateString = (dateString) => {
    let normalizedDateString = dateString;
    if (typeof normalizedDateString === 'string') {
        const UTC_ROLLOUT_DATE = new Date('2026-04-13T00:00:00Z').getTime();
        if (!normalizedDateString.includes('T')) {
            normalizedDateString = normalizedDateString.replace(' ', 'T');
        }
        let isLegacy = false;
        if (!normalizedDateString.match(/[+-]\d{2}:?\d{2}$/)) {
            const tempTime = new Date(normalizedDateString).getTime();
            if (tempTime < UTC_ROLLOUT_DATE) {
                isLegacy = true;
            }
        }
        if (isLegacy) {
            if (normalizedDateString.endsWith('Z')) {
                normalizedDateString = normalizedDateString.slice(0, -1);
            }
        } else {
            if (!normalizedDateString.endsWith('Z') && !normalizedDateString.match(/[+-]\d{2}:?\d{2}$/)) {
                normalizedDateString += 'Z';
            }
        }
    }
    return new Date(normalizedDateString);
};
