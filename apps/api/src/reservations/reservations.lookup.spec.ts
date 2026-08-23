import { NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

/**
 * Focused tests for reservation code lookup — the input can be a scanned QR
 * payload (JSON), a full reservation id, or the short 6-char code. Verifies the
 * right Prisma `where` is built and tenant scoping is applied.
 */
describe('ReservationsService.lookup', () => {
  let service: ReservationsService;
  let prisma: any;

  const RID = 'rest_1';
  const found = { id: 'res_abc', customerName: 'x' };

  beforeEach(() => {
    prisma = {
      branch: { findMany: jest.fn().mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]) },
      reservation: { findFirst: jest.fn().mockResolvedValue(found) },
    };
    service = new ReservationsService(prisma, {} as any, {} as any);
  });

  it('rejects an empty code', async () => {
    await expect(service.lookup(RID, '  ')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes the query to the restaurant branches', async () => {
    await service.lookup(RID, 'ABC123');
    const where = prisma.reservation.findFirst.mock.calls[0][0].where;
    expect(where.branchId).toEqual({ in: ['b1', 'b2'] });
  });

  it('matches a short code by case-insensitive suffix', async () => {
    await service.lookup(RID, 'ER90WK');
    const where = prisma.reservation.findFirst.mock.calls[0][0].where;
    expect(where.id).toEqual({ endsWith: 'er90wk' });
  });

  it('matches a full cuid exactly', async () => {
    const fullId = 'cms1jyhgx0003hp82dgbmai73';
    await service.lookup(RID, fullId);
    const where = prisma.reservation.findFirst.mock.calls[0][0].where;
    expect(where.id).toBe(fullId);
  });

  it('extracts the id from a scanned QR JSON payload', async () => {
    const fullId = 'cms1jyhgx0003hp82dgbmai73';
    await service.lookup(RID, JSON.stringify({ t: 'reservation', id: fullId }));
    const where = prisma.reservation.findFirst.mock.calls[0][0].where;
    expect(where.id).toBe(fullId);
  });

  it('throws when no reservation matches', async () => {
    prisma.reservation.findFirst.mockResolvedValue(null);
    await expect(service.lookup(RID, 'ZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
  });
});
