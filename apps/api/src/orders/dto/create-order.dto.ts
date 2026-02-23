import { IsString, IsEnum, IsOptional, IsNumber, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, OrderStatus } from '@prisma/client';

class OrderItemDto {
  @IsString()
  menuItemId: string;

  @IsInt()
  quantity: number;

  @IsOptional() @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  type: OrderType;

  @IsString()
  branchId: string;

  @IsOptional() @IsNumber()
  discount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
