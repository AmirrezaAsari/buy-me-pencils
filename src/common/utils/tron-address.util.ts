import TronWeb from 'tronweb';

/**
 * Validates a TRON address (base58, mainnet).
 * Must be 34 characters and pass TronWeb validation.
 */
export function isValidTronAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  if (trimmed.length !== 34) return false;
  // TronWeb validates base58 and checksum
  return TronWeb.utils.address.isAddress(trimmed);
}
