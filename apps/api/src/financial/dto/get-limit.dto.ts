import { IsEmail } from 'class-validator';

export class GetLimitDto {
  @IsEmail()
  email!: string;
}
