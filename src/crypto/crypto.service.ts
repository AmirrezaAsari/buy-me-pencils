import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/** AES-256-GCM encryption key length in bytes */
const KEY_LENGTH = 32;
/** IV length for GCM */
const IV_LENGTH = 16;
/** Auth tag length for GCM */
const AUTH_TAG_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * AES-256-GCM encryption utility for sensitive data (e.g. private keys).
 * Uses ENV secret (ENCRYPTION_SECRET) to derive key.
 */
@Injectable()
export class CryptoService {
  private readonly encryptionSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('ENCRYPTION_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'ENCRYPTION_SECRET must be set and at least 32 characters for AES-256',
      );
    }
    this.encryptionSecret = secret;
  }

  /**
   * Derive a 256-bit key from the secret using PBKDF2.
   */
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.encryptionSecret,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256',
    );
  }

  /**
   * Encrypt plaintext using AES-256-GCM.
   * Output format: salt (32) + iv (16) + authTag (16) + ciphertext
   */
  encrypt(plaintext: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
  }

  /**
   * Decrypt ciphertext produced by encrypt().
   */
  decrypt(ciphertextBase64: string): string {
    const combined = Buffer.from(ciphertextBase64, 'base64');
    if (combined.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid ciphertext: too short');
    }

    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    const key = this.deriveKey(salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  }

  /**
   * Constant-time buffer comparison.
   */
  static secureCompareBuffers(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
