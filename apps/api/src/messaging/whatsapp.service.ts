import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageDriver } from './messaging.types';
import { MockDriver } from './drivers/mock.driver';
import { MetaDriver } from './drivers/meta.driver';
import { TwilioDriver } from './drivers/twilio.driver';
import { normalizeSaudiPhone } from './phone.util';
import {
  buildOrderReadyMessage,
  buildReservationConfirmedMessage,
  MessageEvent,
} from './message-templates';

interface DispatchInput {
  restaurantId: string;
  event: MessageEvent;
  rawPhone: string | null | undefined;
  body: string;
  orderId?: string;
  reservationId?: string;
}

/**
 * Outbound customer WhatsApp channel. Provider-agnostic: the concrete driver is
 * chosen once from WHATSAPP_PROVIDER (mock | meta | twilio, default mock).
 * Every attempt is persisted to MessageLog and failures never propagate — a
 * message problem must not roll back an order or a reservation.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly driver: MessageDriver;
  private readonly enabled: boolean;

  constructor(private prisma: PrismaService) {
    this.enabled = process.env.WHATSAPP_ENABLED !== 'false';
    this.driver = this.pickDriver(process.env.WHATSAPP_PROVIDER);
    this.logger.log(`WhatsApp channel ready — driver=${this.driver.name}, enabled=${this.enabled}`);
  }

  private pickDriver(provider?: string): MessageDriver {
    switch ((provider || 'mock').toLowerCase()) {
      case 'meta':
        return new MetaDriver();
      case 'twilio':
        return new TwilioDriver();
      default:
        return new MockDriver();
    }
  }

  async sendOrderReady(input: {
    restaurantId: string;
    orderId: string;
    orderNumber: string;
    customerName?: string | null;
    rawPhone: string | null | undefined;
    restaurantName: string;
  }): Promise<void> {
    const body = buildOrderReadyMessage({
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      restaurantName: input.restaurantName,
    });
    await this.dispatch({
      restaurantId: input.restaurantId,
      event: 'ORDER_READY',
      rawPhone: input.rawPhone,
      body,
      orderId: input.orderId,
    });
  }

  async sendReservationConfirmed(input: {
    restaurantId: string;
    reservationId: string;
    customerName?: string | null;
    rawPhone: string | null | undefined;
    restaurantName: string;
    date: string;
    time: string;
    partySize?: number | null;
  }): Promise<void> {
    const body = buildReservationConfirmedMessage({
      customerName: input.customerName,
      restaurantName: input.restaurantName,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
    });
    await this.dispatch({
      restaurantId: input.restaurantId,
      event: 'RESERVATION_CONFIRMED',
      rawPhone: input.rawPhone,
      body,
      reservationId: input.reservationId,
    });
  }

  /** Core pipeline: normalise → persist → deliver → record outcome. Never throws. */
  private async dispatch(input: DispatchInput): Promise<void> {
    try {
      const toPhone = normalizeSaudiPhone(input.rawPhone);

      if (!toPhone || !this.enabled) {
        await this.prisma.messageLog.create({
          data: {
            restaurantId: input.restaurantId,
            event: input.event,
            toPhone: toPhone ?? String(input.rawPhone ?? ''),
            body: input.body,
            provider: this.driver.name,
            status: 'SKIPPED',
            error: !toPhone ? 'invalid or missing phone' : 'channel disabled',
            orderId: input.orderId,
            reservationId: input.reservationId,
          },
        });
        return;
      }

      const log = await this.prisma.messageLog.create({
        data: {
          restaurantId: input.restaurantId,
          event: input.event,
          toPhone,
          body: input.body,
          provider: this.driver.name,
          status: 'PENDING',
          orderId: input.orderId,
          reservationId: input.reservationId,
        },
      });

      try {
        const result = await this.driver.send(toPhone, input.body);
        await this.prisma.messageLog.update({
          where: { id: log.id },
          data: { status: 'SENT', providerId: result.providerId ?? null },
        });
      } catch (err: any) {
        this.logger.warn(`WhatsApp send failed (${input.event}): ${err?.message}`);
        await this.prisma.messageLog.update({
          where: { id: log.id },
          data: { status: 'FAILED', error: String(err?.message ?? err).slice(0, 500) },
        });
      }
    } catch (err: any) {
      // Persistence itself failed — log and swallow so the caller's flow is safe.
      this.logger.error(`WhatsApp dispatch error: ${err?.message}`);
    }
  }

  /** Recent outbound messages for a restaurant (newest first). */
  async listForRestaurant(restaurantId: string, limit = 50) {
    return this.prisma.messageLog.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }
}
