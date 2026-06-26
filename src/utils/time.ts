export function now(): Date {
  return new Date();
}

export function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

export function isoDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
