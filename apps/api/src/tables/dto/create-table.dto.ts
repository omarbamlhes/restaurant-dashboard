import { IsString, IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { TableStatus } from '@prisma/client';

export class CreateTableDto {
  @IsInt()
  @Min(1)
  number: number;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  nameAr?: string;

  @IsOptional() @IsInt() @Min(1)
  capacity?: number;

  @IsString()
  branchId: string;
}

export class UpdateTableDto {
  @IsOptional() @IsInt() @Min(1)
  number?: number;

  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  nameAr?: string;

  @IsOptional() @IsInt() @Min(1)
  capacity?: number;
}

export class UpdateTableStatusDto {
  @IsEnum(TableStatus)
  status: TableStatus;
}
