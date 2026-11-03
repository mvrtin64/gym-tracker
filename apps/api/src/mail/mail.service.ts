import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Manda mails con la API HTTP de Brevo (el plan gratuito de Render bloquea SMTP).
 * Sin BREVO_API_KEY (desarrollo y tests) no manda nada: escribe el mail en el log y lo guarda en `outbox`.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  /** Mails "enviados" sin Brevo; los tests leen de acá el código de verificación. */
  readonly outbox: Mail[] = [];

  async send(mail: Mail): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      this.outbox.push(mail);
      this.logger.warn(`Sin BREVO_API_KEY, no se manda. Para ${mail.to}: ${mail.subject}\n${mail.text}`);
      return;
    }
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.MAIL_FROM_NAME ?? 'Gym Tracker', email: process.env.MAIL_FROM },
        to: [{ email: mail.to }],
        subject: mail.subject,
        textContent: mail.text,
      }),
    }).catch((e: Error) => {
      this.logger.error(`Brevo no respondió: ${e.message}`);
      return null;
    });
    if (!res?.ok) {
      if (res) this.logger.error(`Brevo respondió ${res.status}: ${await res.text()}`);
      throw new ServiceUnavailableException('No pude mandar el mail. Probá de nuevo en un rato.');
    }
  }
}
