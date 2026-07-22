import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateKitchenStationDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateKitchenStationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
