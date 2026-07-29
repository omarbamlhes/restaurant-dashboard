import { IsInt, IsOptional, IsString } from 'class-validator';

export class RedeemPointsDto {
  @IsInt()
  points: number;

  @IsOptional() @IsString()
  note?: string;
}

export class AdjustPointsDto {
  @IsInt()
  points: number; // positive to grant, negative to deduct

  @IsOptional() @IsString()
  note?: string;
}
