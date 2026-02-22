import {
  compareDecimal,
  subtractDecimal,
  addDecimal,
  isBalanceSufficient,
} from './decimal.util';

describe('decimal.util', () => {
  describe('compareDecimal', () => {
    it('returns -1 when a < b', () => {
      expect(compareDecimal(1, 2)).toBe(-1);
      expect(compareDecimal('1.000001', '1.000002')).toBe(-1);
    });
    it('returns 0 when a === b', () => {
      expect(compareDecimal(1, 1)).toBe(0);
      expect(compareDecimal('10.500000', 10.5)).toBe(0);
    });
    it('returns 1 when a > b', () => {
      expect(compareDecimal(2, 1)).toBe(1);
      expect(compareDecimal('2.000001', '2.000000')).toBe(1);
    });
  });

  describe('subtractDecimal', () => {
    it('subtracts and returns 6-decimal string', () => {
      expect(subtractDecimal(10, 3)).toBe('7.000000');
      expect(subtractDecimal('10.500000', '0.5')).toBe('10.000000');
    });
  });

  describe('addDecimal', () => {
    it('adds and returns 6-decimal string', () => {
      expect(addDecimal(1, 2)).toBe('3.000000');
      expect(addDecimal('1.500000', '0.5')).toBe('2.000000');
    });
  });

  describe('isBalanceSufficient', () => {
    it('returns true when balance >= amount', () => {
      expect(isBalanceSufficient(10, 5)).toBe(true);
      expect(isBalanceSufficient('10.000000', '10.000000')).toBe(true);
    });
    it('returns false when balance < amount', () => {
      expect(isBalanceSufficient(5, 10)).toBe(false);
      expect(isBalanceSufficient(1, 2)).toBe(false);
      expect(isBalanceSufficient('1.000000', '2.000000')).toBe(false);
    });
  });
});
