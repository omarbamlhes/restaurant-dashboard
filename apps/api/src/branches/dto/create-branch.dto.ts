import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateBranchDto {
  @IsString() name: string;
  @IsString() nameAr: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsBoolean() isMain?: boolean;
}
