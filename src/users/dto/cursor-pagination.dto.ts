import { IsOptional, IsString, IsNumber, IsPositive, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CursorPaginationDto {
  @IsOptional()
  @IsString()
  after?: string;  // ObjectId as string for the cursor

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  @Min(1)
  limit?: number = 20;  // Default limit is 20
}