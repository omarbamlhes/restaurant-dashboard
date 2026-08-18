import { Logger } from '@nestjs/common';
import { MessageDriver, SendResult } from '../messaging.types';

/**
 * Default driver. Delivers nothing to a real network — it logs the message and
 * returns a synthetic id so the whole flow (validation, persistence, status
 * transitions) is exercised and verifiable in development and tests without any
 * provider credentials.
 */
export class MockDriver implements MessageDriver {
  readonly name = 'mock';
  private readonly logger = new Logger('WhatsApp(mock)');

  async send(toE164: string, body: string): Promise<SendResult> {
    this.logger.log(`→ ${toE164}\n${body}`);
    return { providerId: `mock_${Date.now().toString(36)}` };
  }
}
