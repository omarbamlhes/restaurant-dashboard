import { IsString, IsInt, IsOptional, Min, Max, Matches } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  tableId: string;

  @IsString()
  branchId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsInt()
  @Min(1)
  @Max(20)
  partySize: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD' })
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'الوقت يجب أن يكون بصيغة HH:MM' })
  time: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateReservationStatusDto {
  @IsString()
  status: 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}
