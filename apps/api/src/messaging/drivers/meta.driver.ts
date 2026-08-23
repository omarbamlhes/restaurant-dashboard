import { Logger } from '@nestjs/common';
import axios from 'axios';
import { MessageDriver, SendResult } from '../messaging.types';

/**
 * Meta WhatsApp Cloud API driver. Enabled by setting:
 *   WHATSAPP_PROVIDER=meta
 *   WHATSAPP_META_TOKEN=<permanent access token>
 *   WHATSAPP_META_PHONE_ID=<phone number id>
 *   WHATSAPP_META_API_VERSION=v21.0        (optional)
 *
 * Sends a plain text message. Business-initiated messages outside the 24-hour
 * customer service window require an approved template — swap `type: 'text'`
 * for `type: 'template'` once your templates are approved; the message-templates
 * module already mirrors the approved copy.
 */
export class MetaDriver implements MessageDriver {
  readonly name = 'meta';
  private readonly logger = new Logger('WhatsApp(meta)');
  private readonly token = process.env.WHATSAPP_META_TOKEN;
  private readonly phoneId = process.env.WHATSAPP_META_PHONE_ID;
  private readonly apiVersion = process.env.WHATSAPP_META_API_VERSION || 'v21.0';

  async send(toE164: string, body: string): Promise<SendResult> {
    if (!this.token || !this.phoneId) {
      throw new Error('Meta WhatsApp not configured (WHATSAPP_META_TOKEN / WHATSAPP_META_PHONE_ID)');
    }
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneId}/messages`;
    const res = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toE164.replace(/^\+/, ''), // Meta expects the number without '+'
        type: 'text',
        text: { preview_url: false, body },
      },
      { headers: { Authorization: `Bearer ${this.token}` }, timeout: 15000 },
    );
    const providerId = res.data?.messages?.[0]?.id;
    return { providerId };
  }
}
