import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(3, 128)
  username: string;

  @IsString()
  @Length(3, 128)
  password: string;
}
