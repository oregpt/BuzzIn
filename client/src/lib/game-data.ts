export const CATEGORIES = [
  "HISTORY",
  "SCIENCE", 
  "SPORTS",
  "MOVIES",
  "GEOGRAPHY",
  "LITERATURE"
];

export const VALUES = [100, 200, 300, 400, 500];

export function formatCurrency(value: number): string {
  return `$${value}`;
}

export function formatTime(timestamp: number): string {
  const seconds = (timestamp / 1000).toFixed(2);
  return `${seconds}s`;
}
