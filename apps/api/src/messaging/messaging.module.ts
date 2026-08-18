import { Global, Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { MessagingController } from './messaging.controller';

/**
 * Cross-cutting outbound customer messaging. Global so orders/reservations can
 * inject WhatsAppService without importing this module explicitly.
 */
@Global()
@Module({
  controllers: [MessagingController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class MessagingModule {}
