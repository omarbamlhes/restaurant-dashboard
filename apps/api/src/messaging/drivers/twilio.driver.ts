import { Logger } from '@nestjs/common';
import axios from 'axios';
import { MessageDriver, SendResult } from '../messaging.types';

/**
 * Twilio WhatsApp driver. Enabled by setting:
 *   WHATSAPP_PROVIDER=twilio
 *   TWILIO_ACCOUNT_SID=<sid>
 *   TWILIO_AUTH_TOKEN=<token>
 *   TWILIO_WHATSAPP_FROM=+14155238886     (your Twilio WhatsApp sender)
 */
export class TwilioDriver implements MessageDriver {
  readonly name = 'twilio';
  private readonly logger = new Logger('WhatsApp(twilio)');
  private readonly sid = process.env.TWILIO_ACCOUNT_SID;
  private readonly token = process.env.TWILIO_AUTH_TOKEN;
  private readonly from = process.env.TWILIO_WHATSAPP_FROM;

  async send(toE164: string, body: string): Promise<SendResult> {
    if (!this.sid || !this.token || !this.from) {
      throw new Error('Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM)');
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`;
    const form = new URLSearchParams({
      From: `whatsapp:${this.from}`,
      To: `whatsapp:${toE164}`,
      Body: body,
    });
    const res = await axios.post(url, form.toString(), {
      auth: { username: this.sid, password: this.token },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });
    return { providerId: res.data?.sid };
  }
}
