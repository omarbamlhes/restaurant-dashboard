import { IsString, IsNumber, IsOptional, IsInt } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  descriptionAr?: string;

  @IsOptional() @IsString()
  image?: string;

  @IsNumber()
  price: number;

  @IsOptional() @IsNumber()
  cost?: number;

  @IsOptional() @IsInt()
  preparationTime?: number;

  @IsString()
  categoryId: string;
}

export class UpdateMenuItemDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() descriptionAr?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsInt() preparationTime?: number;
  @IsOptional() @IsString() categoryId?: string;
}

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional() @IsInt()
  sortOrder?: number;
}
