import { IsString, IsOptional } from 'class-validator';

export class DeleteUserDto {
  @IsString()
  @IsOptional()
  deletedBy?: string;

  @IsString()
  @IsOptional()
  deleteReason?: string;
}