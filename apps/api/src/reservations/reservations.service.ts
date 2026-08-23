import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto/create-reservation.dto';
import { WhatsAppService } from '../messaging/whatsapp.service';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private ordersGateway: OrdersGateway,
    private whatsapp: WhatsAppService,
  ) {}

  async findAll(restaurantId: string, filters: { branchId?: string; date?: string; status?: string }) {
    const branchIds = filters.branchId
      ? [filters.branchId]
      : (await this.prisma.branch.findMany({ where: { restaurantId }, select: { id: true } })).map(b => b.id);

    const where: any = { branchId: { in: branchIds } };

    if (filters.date) {
      where.date = new Date(filters.date);
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.reservation.findMany({
      where,
      include: {
        table: { select: { number: true, nameAr: true, capacity: true } },
        branch: { select: { nameAr: true } },
        customer: { select: { id: true, name: true, phone: true, totalOrders: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  }

  async getStats(restaurantId: string, branchId?: string) {
    const branchIds = branchId
      ? [branchId]
      : (await this.prisma.branch.findMany({ where: { restaurantId }, select: { id: true } })).map(b => b.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayReservations, upcoming, totalThisMonth, statusCounts] = await Promise.all([
      this.prisma.reservation.count({
        where: { branchId: { in: branchIds }, date: today, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      }),
      this.prisma.reservation.count({
        where: { branchId: { in: branchIds }, date: { gt: today }, status: { in: ['PENDING', 'CONFIRMED'] } },
      }),
      this.prisma.reservation.count({
        where: {
          branchId: { in: branchIds },
          date: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        },
      }),
      this.prisma.reservation.groupBy({
        by: ['status'],
        where: { branchId: { in: branchIds }, date: { gte: today } },
        _count: true,
      }),
    ]);

    return { todayReservations, upcoming, totalThisMonth, statusCounts };
  }

  async create(restaurantId: string, dto: CreateReservationDto) {
    // Verify branch belongs to restaurant
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, restaurantId },
    });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    // Verify table belongs to branch
    const table = await this.prisma.table.findFirst({
      where: { id: dto.tableId, branchId: dto.branchId },
    });
    if (!table) throw new NotFoundException('الطاولة غير موجودة');

    // Check party size fits table
    if (dto.partySize > table.capacity) {
      throw new ConflictException(`الطاولة تتسع لـ ${table.capacity} أشخاص فقط`);
    }

    // Check for conflicting reservations on same table/date/time
    const endTime = dto.endTime || this.addHours(dto.time, 2);
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        tableId: dto.tableId,
        date: new Date(dto.date),
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        OR: [
          { time: { lte: dto.time }, endTime: { gt: dto.time } },
          { time: { lt: endTime }, endTime: { gte: endTime } },
          { time: { gte: dto.time }, endTime: { lte: endTime } },
        ],
      },
    });

    if (conflict) {
      throw new ConflictException('الطاولة محجوزة في هذا الوقت');
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        tableId: dto.tableId,
        branchId: dto.branchId,
        customerId: dto.customerId || null,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        partySize: dto.partySize,
        date: new Date(dto.date),
        time: dto.time,
        endTime: endTime,
        notes: dto.notes,
        status: 'CONFIRMED',
      },
      include: {
        table: { select: { number: true, nameAr: true } },
        branch: { select: { nameAr: true } },
      },
    });

    // Mark table as reserved if reservation is today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resDate = new Date(dto.date);
    if (resDate.getTime() === today.getTime()) {
      await this.prisma.table.update({
        where: { id: dto.tableId },
        data: { status: 'RESERVED' },
      });
    }

    // Real-time notification
    this.ordersGateway.emitNewReservation(restaurantId, reservation);

    return reservation;
  }

  async lookup(restaurantId: string, code: string) {
    const raw = (code || '').trim();
    if (!raw) throw new NotFoundException('لم يتم العثور على حجز بهذا الرمز');

    // Accept either the scanned QR payload (JSON with the full id), the full id,
    // or the short 6-char code shown to the customer (last chars of the cuid).
    let value = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'string') value = parsed.id;
    } catch {
      // not JSON — use as-is
    }

    const branchIds = (
      await this.prisma.branch.findMany({ where: { restaurantId }, select: { id: true } })
    ).map(b => b.id);

    const where: any = { branchId: { in: branchIds } };
    if (value.length >= 20) {
      where.id = value;
    } else {
      where.id = { endsWith: value.toLowerCase() };
    }

    const reservation = await this.prisma.reservation.findFirst({
      where,
      include: {
        table: { select: { number: true, nameAr: true, capacity: true } },
        branch: { select: { nameAr: true } },
        customer: { select: { id: true, name: true, phone: true, totalOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!reservation) throw new NotFoundException('لم يتم العثور على حجز بهذا الرمز');
    return reservation;
  }

  async updateStatus(id: string, restaurantId: string, dto: UpdateReservationStatusDto) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id },
      include: { branch: { select: { restaurantId: true } } },
    });
    if (!reservation || reservation.branch.restaurantId !== restaurantId) {
      throw new NotFoundException('الحجز غير موجود');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: dto.status as any },
      include: {
        table: { select: { number: true, nameAr: true } },
        branch: { select: { nameAr: true, restaurant: { select: { nameAr: true } } } },
      },
    });

    // Notify the customer on WhatsApp when their reservation is confirmed.
    if (dto.status === 'CONFIRMED' && updated.customerPhone) {
      await this.whatsapp.sendReservationConfirmed({
        restaurantId,
        reservationId: updated.id,
        customerName: updated.customerName,
        rawPhone: updated.customerPhone,
        restaurantName: updated.branch?.restaurant?.nameAr || 'مطعمنا',
        date: updated.date.toISOString().slice(0, 10),
        time: updated.time,
        partySize: updated.partySize,
      });
    }

    // Update table status based on reservation status
    if (dto.status === 'SEATED') {
      await this.prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'OCCUPIED' },
      });
    } else if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(dto.status)) {
      // Check if there are other active reservations for this table today
      const otherActive = await this.prisma.reservation.count({
        where: {
          tableId: reservation.tableId,
          date: reservation.date,
          id: { not: id },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });
      if (otherActive === 0) {
        await this.prisma.table.update({
          where: { id: reservation.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    this.ordersGateway.emitReservationUpdated(restaurantId, updated);

    return updated;
  }

  async getAvailableTables(restaurantId: string, branchId: string, date: string, time: string, partySize: number) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
    });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    const endTime = this.addHours(time, 2);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reqDate = new Date(date);
    const isToday = reqDate.getTime() === today.getTime();

    // Get all tables for the branch that fit the party
    const tables = await this.prisma.table.findMany({
      where: { branchId, capacity: { gte: partySize } },
      orderBy: { number: 'asc' },
    });

    // Get reservations that conflict with the requested time
    const conflicts = await this.prisma.reservation.findMany({
      where: {
        branchId,
        date: new Date(date),
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        OR: [
          { time: { lte: time }, endTime: { gt: time } },
          { time: { lt: endTime }, endTime: { gte: endTime } },
          { time: { gte: time }, endTime: { lte: endTime } },
        ],
      },
      select: { tableId: true },
    });

    const conflictTableIds = new Set(conflicts.map(c => c.tableId));

    return tables.map(table => ({
      ...table,
      available: !conflictTableIds.has(table.id) && !(isToday && table.status === 'OCCUPIED'),
    }));
  }

  // ===== PUBLIC endpoints (no auth) =====

  async getPublicRestaurant(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, nameAr: true, logo: true, phone: true },
    });
    if (!restaurant) throw new NotFoundException('المطعم غير موجود');

    const branches = await this.prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true, name: true, nameAr: true, address: true, city: true },
      orderBy: { isMain: 'desc' },
    });

    return { restaurant, branches };
  }

  async getPublicAvailableTables(branchId: string, date: string, time: string, partySize: number) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    const endTime = this.addHours(time, 2);

    // Only get tables that are AVAILABLE or RESERVED (not OCCUPIED)
    // For future dates, OCCUPIED tables might be free, so only exclude for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reqDate = new Date(date);
    const isToday = reqDate.getTime() === today.getTime();

    const tableWhere: any = { branchId, capacity: { gte: partySize } };
    if (isToday) {
      tableWhere.status = { not: 'OCCUPIED' };
    }

    const tables = await this.prisma.table.findMany({
      where: tableWhere,
      select: { id: true, number: true, nameAr: true, capacity: true, status: true },
      orderBy: { number: 'asc' },
    });

    const conflicts = await this.prisma.reservation.findMany({
      where: {
        branchId, date: new Date(date),
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        OR: [
          { time: { lte: time }, endTime: { gt: time } },
          { time: { lt: endTime }, endTime: { gte: endTime } },
          { time: { gte: time }, endTime: { lte: endTime } },
        ],
      },
      select: { tableId: true },
    });

    const conflictIds = new Set(conflicts.map(c => c.tableId));
    return tables.filter(t => !conflictIds.has(t.id)).map(({ status, ...rest }) => rest);
  }

  async createPublic(branchId: string, dto: { tableId: string; customerName: string; customerPhone: string; partySize: number; date: string; time: string; notes?: string }) {
    const branch = await this.prisma.branch.findFirst({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    const table = await this.prisma.table.findFirst({ where: { id: dto.tableId, branchId } });
    if (!table) throw new NotFoundException('الطاولة غير موجودة');
    if (table.status === 'OCCUPIED') throw new ConflictException('الطاولة مشغولة حالياً، اختر طاولة أخرى');
    if (dto.partySize > table.capacity) throw new ConflictException(`الطاولة تتسع لـ ${table.capacity} أشخاص فقط`);

    const endTime = this.addHours(dto.time, 2);
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        tableId: dto.tableId, date: new Date(dto.date),
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        OR: [
          { time: { lte: dto.time }, endTime: { gt: dto.time } },
          { time: { lt: endTime }, endTime: { gte: endTime } },
          { time: { gte: dto.time }, endTime: { lte: endTime } },
        ],
      },
    });
    if (conflict) throw new ConflictException('الطاولة محجوزة في هذا الوقت');

    // Link to existing customer by phone
    const customer = await this.prisma.customer.findFirst({
      where: { restaurantId: branch.restaurantId, phone: dto.customerPhone },
    });

    const reservation = await this.prisma.reservation.create({
      data: {
        tableId: dto.tableId, branchId,
        customerId: customer?.id || null,
        customerName: dto.customerName, customerPhone: dto.customerPhone,
        partySize: dto.partySize, date: new Date(dto.date),
        time: dto.time, endTime, notes: dto.notes,
        status: 'PENDING',
      },
      include: {
        table: { select: { number: true, nameAr: true } },
        branch: { select: { nameAr: true } },
      },
    });

    // Real-time notification to dashboard
    this.ordersGateway.emitNewReservation(branch.restaurantId, reservation);

    return reservation;
  }

  private addHours(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const newH = Math.min(h + hours, 23);
    return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
