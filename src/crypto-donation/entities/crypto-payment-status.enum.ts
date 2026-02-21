/**
 * Status of a crypto payment invoice.
 * - pending: Awaiting blockchain confirmation
 * - confirmed: Payment verified with sufficient confirmations
 * - expired: Payment window elapsed without confirmation
 */
export enum CryptoPaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
}
