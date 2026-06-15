import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { Resend } from 'resend';

type EmailProvider = 'smtp' | 'resend' | 'console';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;
  private readonly resend?: Resend;
  private readonly resendFrom?: string;
  private readonly smtp?: Transporter;
  private readonly smtpFrom?: string;

  constructor(private readonly config: ConfigService) {
    const configured = this.config
      .get<string>('EMAIL_PROVIDER')
      ?.trim()
      .toLowerCase();

    const smtpReady = this.isSmtpConfigured();
    const resendReady = this.isResendConfigured();

    if (configured === 'smtp' && smtpReady) {
      this.provider = 'smtp';
      this.smtp = this.createSmtpTransport();
      this.smtpFrom = this.buildSmtpFrom();
      this.logger.log(
        `E-mails OTP via SMTP (${this.config.get<string>('SMTP_HOST')})`,
      );
    } else if (configured === 'resend' && resendReady) {
      this.provider = 'resend';
      this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
      this.resendFrom = this.config.get<string>('RESEND_FROM_EMAIL')!;
    } else if (resendReady) {
      this.provider = 'resend';
      this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
      this.resendFrom = this.config.get<string>('RESEND_FROM_EMAIL')!;
    } else if (smtpReady) {
      this.provider = 'smtp';
      this.smtp = this.createSmtpTransport();
      this.smtpFrom = this.buildSmtpFrom();
      this.logger.log(
        `E-mails OTP via SMTP (${this.config.get<string>('SMTP_HOST')}) — EMAIL_PROVIDER non défini`,
      );
    } else {
      this.provider = 'console';
      this.logger.warn(
        'EMAIL_PROVIDER non configuré — les codes OTP sont journalisés en console (dev uniquement).',
      );
    }
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
        ? `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#2563EB;margin:0 0 16px">BiblioTech</h2>
  <p style="color:#374151;line-height:1.5">Votre code de connexion est :</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;margin:16px 0">${code}</p>
  <p style="color:#6B7280;font-size:14px">Valide 10 minutes. Ne partagez ce code avec personne.</p>
</div>`
        : `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#2563EB;margin:0 0 16px">Réinitialisation du mot de passe</h2>
  <p style="color:#374151;line-height:1.5">Utilisez ce code pour définir un nouveau mot de passe :</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;margin:16px 0">${code}</p>
  <p style="color:#6B7280;font-size:14px">Valide 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
</div>`;

    if (this.provider === 'console') {
      this.logger.warn(
        `[OTP ${purpose}] destinataire=${to} code=${code} (mode console — configurez SMTP ou Resend en production)`,
      );
      return;
    }

    try {
      if (this.provider === 'smtp' && this.smtp && this.smtpFrom) {
        await this.smtp.sendMail({
          from: this.smtpFrom,
          to,
          subject,
          html,
        });
        return;
      }

      if (this.provider === 'resend' && this.resend && this.resendFrom) {
        const { error } = await this.resend.emails.send({
          from: this.resendFrom,
          to,
          subject,
          html,
        });
        if (error) {
          throw new Error(error.message);
        }
        return;
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Échec envoi email à ${to}: ${detail}`);
      throw new ServiceUnavailableException(
        "Impossible d'envoyer l'e-mail pour le moment. Réessayez plus tard ou contactez le support.",
      );
    }

    throw new ServiceUnavailableException(
      "Service d'e-mail non configuré sur le serveur.",
    );
  }

  private isSmtpConfigured(): boolean {
    return Boolean(
      this.config.get<string>('SMTP_HOST')?.trim() &&
      this.config.get<string>('SMTP_USER')?.trim() &&
      this.config.get<string>('SMTP_PASSWORD')?.trim() &&
      this.config.get<string>('SMTP_FROM_EMAIL')?.trim(),
    );
  }

  private isResendConfigured(): boolean {
    const key = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from = this.config.get<string>('RESEND_FROM_EMAIL')?.trim();
    return Boolean(key && from && !key.startsWith('re_xxxx'));
  }

  private createSmtpTransport(): Transporter {
    return createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER')?.trim(),
        pass: this.stripEnvQuotes(this.config.get<string>('SMTP_PASSWORD')),
      },
    });
  }

  private buildSmtpFrom(): string | undefined {
    const fromName =
      this.config.get<string>('SMTP_FROM_NAME')?.trim() || 'BiblioTech';
    const fromEmail = this.config.get<string>('SMTP_FROM_EMAIL')?.trim();
    return fromEmail ? `${fromName} <${fromEmail}>` : fromEmail;
  }

  /** Retire les guillemets éventuels autour des valeurs .env. */
  private stripEnvQuotes(value?: string): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }
}
