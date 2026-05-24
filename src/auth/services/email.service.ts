import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = this.config.getOrThrow<string>('RESEND_FROM_EMAIL');
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: 'login' | 'reset',
  ): Promise<void> {
    const subject =
      purpose === 'login'
        ? 'Votre code de connexion BiblioTech'
        : 'Réinitialisation de mot de passe BiblioTech';

    const html =
      purpose === 'login'
        ? `<p>Votre code de connexion BiblioTech est : <strong>${code}</strong></p><p>Valide 10 minutes.</p>`
        : `<p>Votre code de réinitialisation est : <strong>${code}</strong></p><p>Valide 10 minutes.</p>`;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Échec envoi email à ${to}: ${error.message}`);
      throw new Error('Envoi email impossible');
    }
  }
}
