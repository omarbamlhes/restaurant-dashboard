import { WhatsAppService } from './whatsapp.service';

/** Minimal in-memory stand-in for the MessageLog table. */
function makePrismaStub() {
  const rows: any[] = [];
  return {
    rows,
    messageLog: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `log_${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id);
        Object.assign(row, data);
        return row;
      }),
    },
  };
}

describe('WhatsAppService (mock driver)', () => {
  const prevProvider = process.env.WHATSAPP_PROVIDER;
  const prevEnabled = process.env.WHATSAPP_ENABLED;

  beforeAll(() => {
    delete process.env.WHATSAPP_PROVIDER; // default → mock
    delete process.env.WHATSAPP_ENABLED; // default → enabled
  });
  afterAll(() => {
    if (prevProvider !== undefined) process.env.WHATSAPP_PROVIDER = prevProvider;
    if (prevEnabled !== undefined) process.env.WHATSAPP_ENABLED = prevEnabled;
  });

  it('records a SENT message for a valid Saudi phone', async () => {
    const prisma = makePrismaStub();
    const svc = new WhatsAppService(prisma as any);

    await svc.sendOrderReady({
      restaurantId: 'r1',
      orderId: 'o1',
      orderNumber: 'ORD-9',
      customerName: 'عمر',
      rawPhone: '0512345678',
      restaurantName: 'مطعم',
    });

    expect(prisma.rows).toHaveLength(1);
    const log = prisma.rows[0];
    expect(log.status).toBe('SENT');
    expect(log.event).toBe('ORDER_READY');
    expect(log.toPhone).toBe('+966512345678');
    expect(log.provider).toBe('mock');
    expect(log.providerId).toMatch(/^mock_/);
    expect(log.body).toContain('ORD-9');
  });

  it('records a SKIPPED message for an invalid phone and never throws', async () => {
    const prisma = makePrismaStub();
    const svc = new WhatsAppService(prisma as any);

    await expect(
      svc.sendReservationConfirmed({
        restaurantId: 'r1',
        reservationId: 'res1',
        rawPhone: '01234', // not a mobile
        restaurantName: 'مطعم',
        date: '2026-08-12',
        time: '20:00',
        partySize: 2,
      }),
    ).resolves.toBeUndefined();

    expect(prisma.rows).toHaveLength(1);
    expect(prisma.rows[0].status).toBe('SKIPPED');
    expect(prisma.rows[0].error).toMatch(/phone/);
  });

  it('skips delivery when the channel is disabled', async () => {
    process.env.WHATSAPP_ENABLED = 'false';
    try {
      const prisma = makePrismaStub();
      const svc = new WhatsAppService(prisma as any);
      await svc.sendOrderReady({
        restaurantId: 'r1',
        orderId: 'o1',
        orderNumber: 'ORD-1',
        rawPhone: '0512345678',
        restaurantName: 'مطعم',
      });
      expect(prisma.rows[0].status).toBe('SKIPPED');
      expect(prisma.rows[0].error).toMatch(/disabled/);
    } finally {
      delete process.env.WHATSAPP_ENABLED;
    }
  });
});
