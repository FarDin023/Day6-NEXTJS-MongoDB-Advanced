import { IsString, IsOptional, IsNotEmpty, Min, Max, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchUserDto {
  @ApiProperty({
    description: 'Search query string that will be used for full-text search',
    example: 'john developer',
    required: true
  })
  @IsNotEmpty({ message: 'Search query (q) is required' })
  @IsString({ message: 'Search query must be a string' })
  q: string;

  @ApiProperty({
    description: 'Fields to include in the response. Can be "basic", "admin", or a comma-separated list of field names',
    example: 'basic',
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => (
    value === 'admin' || value === 'basic' 
      ? value 
      : (typeof value === 'string' ? value.split(',').filter(Boolean) : value)
  ))
  fields?: 'basic' | 'admin' | string[];

  @ApiProperty({
    description: 'Maximum number of results to return (1-100)',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;
}
