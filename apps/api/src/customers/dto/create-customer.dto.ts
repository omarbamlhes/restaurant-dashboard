import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  notes?: string;
}
