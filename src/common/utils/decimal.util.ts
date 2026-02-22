/** Scale for USDT (6 decimals) */
const SCALE = 6;
const MULTIPLIER = 10 ** SCALE;

/**
 * Safe decimal math for balance/amounts to avoid float precision issues.
 * All amounts are treated as USDT (6 decimal places).
 */

function toScaledInt(value: string | number): number {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n * MULTIPLIER);
}

function fromScaledInt(value: number): string {
  const int = Math.floor(value);
  return (int / MULTIPLIER).toFixed(SCALE);
}

/**
 * Compare two decimal amounts.
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareDecimal(a: string | number, b: string | number): -1 | 0 | 1 {
  const x = toScaledInt(a);
  const y = toScaledInt(b);
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
}

/**
 * Subtract b from a (a - b). Returns result as fixed 6-decimal string.
 */
export function subtractDecimal(a: string | number, b: string | number): string {
  return fromScaledInt(toScaledInt(a) - toScaledInt(b));
}

/**
 * Add two decimal amounts. Returns result as fixed 6-decimal string.
 */
export function addDecimal(a: string | number, b: string | number): string {
  return fromScaledInt(toScaledInt(a) + toScaledInt(b));
}

/**
 * Check that balance >= amount (both as decimal strings or numbers).
 */
export function isBalanceSufficient(balance: string | number, amount: string | number): boolean {
  return compareDecimal(balance, amount) >= 0;
}
