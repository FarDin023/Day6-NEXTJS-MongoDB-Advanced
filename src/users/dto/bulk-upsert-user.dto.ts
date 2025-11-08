import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BulkUpsertUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsNumber()
  @IsOptional()
  age?: number;
}

export class BulkUpsertUsersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpsertUserDto)
  users: BulkUpsertUserDto[];
}