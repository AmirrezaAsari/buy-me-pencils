import { Injectable, Logger } from '@nestjs/common';

// --- Nodemailer / SMTP (replaced by Unosend API) ---
// import * as nodemailer from 'nodemailer';
// import type { Transporter } from 'nodemailer';

const UNOSEND_API_URL = 'https://www.unosend.co/api/v1/emails';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | null;
  private readonly from: string;

  constructor() {
    this.apiKey = process.env.UNOSEND_API_KEY ?? null;
    this.from =
      process.env.MAIL_FROM ?? process.env.UNOSEND_FROM ?? 'noreply@buymeapencil.ir';

    if (this.apiKey) {
      this.logger.log('Mail service initialized with Unosend API');
    } else {
      this.logger.warn(
        'Unosend not configured (UNOSEND_API_KEY). OTP emails will be logged only.',
      );
    }

    // --- SMTP / Nodemailer (replaced by Unosend) ---
    // const host = process.env.SMTP_HOST;
    // const port = Number(process.env.SMTP_PORT) || 587;
    // const user = process.env.SMTP_USER;
    // const pass = process.env.SMTP_PASS;
    // if (host && user && pass) {
    //   this.transporter = nodemailer.createTransport({
    //     host,
    //     port,
    //     secure: false,
    //     auth: { user, pass },
    //     family: 4,
    //     connectionTimeout: 10000,
    //     greetingTimeout: 10000,
    //     socketTimeout: 10000,
    //   } as nodemailer.TransportOptions);
    //   this.logger.log('Mail service initialized with SMTP');
    // } else {
    //   this.logger.warn(
    //     'SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). OTP emails will be logged only.',
    //   );
    // }
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: 'signup' | 'forgot_password',
  ): Promise<void> {
    const subject =
      purpose === 'signup'
        ? 'Your sign-up verification code'
        : 'Your password reset code';
    const text = `Your verification code is: ${code}. It expires in 10 minutes. Do not share it.`;
    const html = `
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>It expires in 10 minutes. Do not share it with anyone.</p>
    `;

    if (this.apiKey) {
      const res = await fetch(UNOSEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          subject,
          html,
          text,
          priority: 'high',
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        this.logger.error(
          `Unosend API error ${res.status} for ${to}: ${errBody}`,
        );
        throw new Error(`Failed to send email: ${res.status}`);
      }
      this.logger.log(`OTP email sent to ${to} (${purpose})`);
    } else {
      this.logger.log(`[DEV] OTP for ${to} (${purpose}): ${code}`);
    }
  }
}
