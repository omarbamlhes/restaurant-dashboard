import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { InventoryAction } from '@prisma/client';

export class CreateIngredientDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsString()
  unit: string;

  @IsNumber()
  costPerUnit: number;

  @IsOptional() @IsNumber()
  currentStock?: number;

  @IsOptional() @IsNumber()
  minStock?: number;
}

export class UpdateIngredientDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  nameAr?: string;

  @IsOptional() @IsString()
  unit?: string;

  @IsOptional() @IsNumber()
  costPerUnit?: number;

  @IsOptional() @IsNumber()
  minStock?: number;
}

export class CreateInventoryLogDto {
  @IsEnum(InventoryAction)
  type: InventoryAction;

  @IsNumber()
  quantity: number;

  @IsString()
  branchId: string;

  @IsOptional() @IsString()
  note?: string;
}
