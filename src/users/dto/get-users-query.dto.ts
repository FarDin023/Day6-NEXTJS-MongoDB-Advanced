import { IsOptional, IsString, Matches, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ALLOWED_FIELDS } from '../../constants/field-whitelist';

export class GetUsersQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (value === 'basic' || value === 'admin') return value;
    return value.split(',').filter(Boolean);
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      // Validate custom fields
      const invalidFields = value.filter(field => !ALLOWED_FIELDS.includes(field));
      if (invalidFields.length) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
      }
    }
    return value;
  })
  fields?: 'basic' | 'admin' | string[];
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    return value;
  })
  ageIn?: number[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    return value;
  })
  ageNin?: number[];

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9^$.*+?()[\]{}|\\-]+$/, {
    message: 'nameRegex must be a valid regular expression pattern',
  })
  nameRegex?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasPhone?: boolean;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeDeleted?: boolean;
}