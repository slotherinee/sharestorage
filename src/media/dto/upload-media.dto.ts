import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UploadMediaDto {
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  title?: string;
}
