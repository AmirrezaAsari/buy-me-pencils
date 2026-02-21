import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM ?? user ?? 'noreply@example.com';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass },
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
        },
      } as nodemailer.TransportOptions);
      this.logger.log('Mail service initialized with SMTP');
    } else {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). OTP emails will be logged only.',
      );
    }
  }

  async sendOtpEmail(to: string, code: string, purpose: 'signup' | 'forgot_password'): Promise<void> {
    const subject =
      purpose === 'signup'
        ? 'Your sign-up verification code'
        : 'Your password reset code';
    const text = `Your verification code is: ${code}. It expires in 10 minutes. Do not share it.`;
    const html = `
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>It expires in 10 minutes. Do not share it with anyone.</p>
    `;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? 'noreply@example.com',
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`OTP email sent to ${to} (${purpose})`);
    } else {
      this.logger.log(`[DEV] OTP for ${to} (${purpose}): ${code}`);
    }
  }
}
