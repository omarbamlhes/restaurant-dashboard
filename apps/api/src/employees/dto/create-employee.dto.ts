import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsString()
  role: string;

  @IsOptional() @IsNumber()
  salary?: number;

  @IsString()
  branchId: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  nameAr?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  role?: string;

  @IsOptional() @IsNumber()
  salary?: number;

  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
