export function getPeriodTs(ts, period) {
    if (!ts) return null;
    const d = new Date(ts);
    if (period === 'week') {
        const year = d.getFullYear();
        const month = d.getMonth();
        const date = d.getDate();
        const week = Math.ceil(date / 7);
        // Map to the first day of that week interval (1, 8, 15, 22, 29)
        return new Date(year, month, (week - 1) * 7 + 1).getTime();
    }
    // Default day behavior: start of the day
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatPeriodString(ts, period) {
    if (!ts) return '';
    const dateObj = new Date(ts);

    if (period === 'week') {
        const month = dateObj.getMonth();
        const date = dateObj.getDate();
        const week = Math.ceil(date / 7);
        const monthNamesThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return `${monthNamesThai[month]} สัปดาห์ ${week}`;
    }

    // Default day behavior
    return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
}
