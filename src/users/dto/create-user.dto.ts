import { IsString, IsEmail, IsOptional, IsInt, Min  } from "class-validator";
export class CreateUserDto {
  name: string;
  email: string;
  age: number;
}
