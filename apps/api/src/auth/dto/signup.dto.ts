import { IsEmail } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;
}
