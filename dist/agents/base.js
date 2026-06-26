export function getString(input, key, fallback = '') {
    const value = input[key];
    if (typeof value === 'string' && value.trim())
        return value.trim();
    if (typeof value === 'number')
        return String(value);
    return fallback;
}
export function getStringArray(input, key) {
    const value = input[key];
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item).trim()).filter(Boolean);
}
export function coerceRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
