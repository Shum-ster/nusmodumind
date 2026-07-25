import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { SendEmailInput } from './email.types';

@Injectable()
export class ResendEmailService {
  private readonly client: Resend | null;
  private readonly from: string | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    this.from =
      this.configService.get<string>('RESEND_FROM_EMAIL')?.trim() || null;
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  isConfigured() {
    return this.client !== null && this.from !== null;
  }

  async send(input: SendEmailInput) {
    if (!this.client || !this.from) {
      throw new Error(
        'Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.',
      );
    }

    const { data, error } = await this.client.emails.send(
      {
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      },
      {
        idempotencyKey: input.idempotencyKey,
      },
    );

    if (error) {
      throw new Error(`Resend rejected the email: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error('Resend did not return an email ID.');
    }

    return data.id;
  }
}
