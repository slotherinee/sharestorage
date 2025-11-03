import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(3, 128)
  username: string;

  @IsString()
  @Length(3, 128)
  passwordHash: string;

  @IsOptional()
  @IsString()
  @Length(3, 128)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
