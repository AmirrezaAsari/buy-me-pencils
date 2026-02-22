jest.mock('tronweb', () => ({
  __esModule: true,
  default: {
    isAddress: jest.fn((addr: string) => {
      if (!addr || typeof addr !== 'string') return false;
      const t = addr.trim();
      if (t.length !== 34) return false;
      return t.startsWith('T') && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(t);
    }),
  },
}));

import { isValidTronAddress } from './tron-address.util';

describe('tron-address.util', () => {
  it('returns false for empty or non-string', () => {
    expect(isValidTronAddress('')).toBe(false);
    expect(isValidTronAddress(null as any)).toBe(false);
    expect(isValidTronAddress(undefined as any)).toBe(false);
  });

  it('returns false for wrong length', () => {
    expect(isValidTronAddress('TShort')).toBe(false);
    expect(isValidTronAddress('T' + 'a'.repeat(32))).toBe(false); // 33 chars
    expect(isValidTronAddress('T' + 'a'.repeat(34))).toBe(false); // 35 chars
  });

  it('returns true for valid base58 TRON address (34 chars, mainnet)', () => {
    const validAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    expect(isValidTronAddress(validAddress)).toBe(true);
  });
});
