import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';

const shiftMinutes = (start: Date, end: Date) =>
  Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  private async getBranchIds(restaurantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true },
    });
    return branches.map((b) => b.id);
  }

  async findAll(restaurantId: string, filters: {
    branchId?: string; role?: string; isActive?: string;
  }) {
    const { branchId, role, isActive } = filters;
    const branchIds = branchId ? [branchId] : await this.getBranchIds(restaurantId);

    const where: any = { branchId: { in: branchIds } };
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    return this.prisma.employee.findMany({
      where,
      include: { branch: { select: { nameAr: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const employee = await this.prisma.employee.findFirst({
      where: { id, branchId: { in: branchIds } },
      include: { branch: { select: { nameAr: true, name: true } }, shifts: { orderBy: { startTime: 'desc' }, take: 10 } },
    });
    if (!employee) throw new NotFoundException('الموظف غير موجود');
    return employee;
  }

  async create(restaurantId: string, dto: CreateEmployeeDto) {
    const branchIds = await this.getBranchIds(restaurantId);
    if (!branchIds.includes(dto.branchId)) {
      throw new NotFoundException('الفرع غير موجود');
    }

    return this.prisma.employee.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        phone: dto.phone,
        role: dto.role,
        salary: dto.salary,
        branchId: dto.branchId,
      },
      include: { branch: { select: { nameAr: true } } },
    });
  }

  async update(id: string, restaurantId: string, dto: UpdateEmployeeDto) {
    await this.findOne(id, restaurantId);
    return this.prisma.employee.update({
      where: { id },
      data: dto,
      include: { branch: { select: { nameAr: true } } },
    });
  }

  async remove(id: string, restaurantId: string) {
    await this.findOne(id, restaurantId);
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============ ATTENDANCE (check-in / check-out via Shift) ============

  private async assertEmployee(id: string, restaurantId: string) {
    const branchIds = await this.getBranchIds(restaurantId);
    const employee = await this.prisma.employee.findFirst({
      where: { id, branchId: { in: branchIds } },
    });
    if (!employee) throw new NotFoundException('الموظف غير موجود');
    return employee;
  }

  /** Open a shift for the employee (clock-in). Rejects a double check-in. */
  async checkIn(id: string, restaurantId: string, note?: string) {
    await this.assertEmployee(id, restaurantId);
    const open = await this.prisma.shift.findFirst({
      where: { employeeId: id, endTime: null },
    });
    if (open) throw new ConflictException('الموظف مسجّل حضوره بالفعل');

    return this.prisma.shift.create({
      data: { employeeId: id, startTime: new Date(), notes: note ?? null },
    });
  }

  /** Close the employee's open shift (clock-out). */
  async checkOut(id: string, restaurantId: string) {
    await this.assertEmployee(id, restaurantId);
    const open = await this.prisma.shift.findFirst({
      where: { employeeId: id, endTime: null },
      orderBy: { startTime: 'desc' },
    });
    if (!open) throw new BadRequestException('لا يوجد حضور مفتوح لتسجيل الانصراف');

    const endTime = new Date();
    const shift = await this.prisma.shift.update({
      where: { id: open.id },
      data: { endTime },
    });
    return { ...shift, minutes: shiftMinutes(open.startTime, endTime) };
  }

  /**
   * Attendance board for a given day (defaults to today): every active
   * employee with their current on-shift status and minutes worked today,
   * plus a log of the day's shifts.
   */
  async getAttendance(restaurantId: string, dateStr?: string) {
    const branchIds = await this.getBranchIds(restaurantId);

    const day = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [employees, shifts] = await Promise.all([
      this.prisma.employee.findMany({
        where: { branchId: { in: branchIds }, isActive: true },
        include: { branch: { select: { nameAr: true } } },
        orderBy: { nameAr: 'asc' },
      }),
      this.prisma.shift.findMany({
        where: {
          employee: { branchId: { in: branchIds } },
          // Shifts touching this day: started today, or still open from before.
          OR: [{ startTime: { gte: dayStart, lt: dayEnd } }, { endTime: null }],
        },
        include: { employee: { select: { id: true, nameAr: true, role: true } } },
        orderBy: { startTime: 'desc' },
      }),
    ]);

    const now = new Date();
    const board = employees.map((e) => {
      const empShifts = shifts.filter((s) => s.employeeId === e.id);
      const openShift = empShifts.find((s) => s.endTime === null) ?? null;
      const todayMinutes = empShifts.reduce((sum, s) => {
        const start = s.startTime < dayStart ? dayStart : s.startTime;
        const end = s.endTime ?? now;
        return sum + shiftMinutes(start, end);
      }, 0);
      return {
        id: e.id,
        nameAr: e.nameAr,
        role: e.role,
        branch: e.branch?.nameAr ?? null,
        onShift: !!openShift,
        currentShiftStart: openShift?.startTime ?? null,
        todayMinutes,
      };
    });

    const log = shifts.map((s) => ({
      id: s.id,
      employeeName: s.employee.nameAr,
      role: s.employee.role,
      startTime: s.startTime,
      endTime: s.endTime,
      minutes: shiftMinutes(s.startTime, s.endTime ?? now),
      open: s.endTime === null,
    }));

    return {
      date: dayStart.toISOString(),
      onShiftCount: board.filter((b) => b.onShift).length,
      totalActive: board.length,
      employees: board,
      log,
    };
  }
}
