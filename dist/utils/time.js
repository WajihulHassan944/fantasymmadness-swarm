export function now() {
    return new Date();
}
export function addMilliseconds(date, milliseconds) {
    return new Date(date.getTime() + milliseconds);
}
export function isoDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}
