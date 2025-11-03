import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 128)
  username: string;

  @IsString()
  @Length(3, 128)
  password: string;

  @IsOptional()
  @IsString()
  @Length(3, 128)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
