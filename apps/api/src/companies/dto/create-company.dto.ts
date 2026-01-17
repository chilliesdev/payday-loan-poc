import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  emailDomain!: string;

  @IsInt()
  @Min(1)
  @Max(28)
  paydayDay!: number;
}
