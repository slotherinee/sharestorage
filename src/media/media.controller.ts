import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadMediaDto } from './dto/upload-media.dto';
import { MediaService } from './media.service';
import type { UploadedFile as UploadFileType } from './types/media.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const FIVE_GB = 5 * 1024 * 1024 * 1024;

@UseGuards(AuthGuard('jwt'))
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: FIVE_GB,
      },
    }),
  )
  async upload(
    @UploadedFile() file: UploadFileType | undefined,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.mediaService.uploadFromFile(user.id, file, dto);
  }

  @Get(':id')
  async getMedia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.getMediaWithUrl(id, user.id);
  }

  @Get()
  async listMedia(@CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.listUserMedia(user.id);
  }

  @Delete(':id')
  async deleteMedia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.deleteMedia(id, user.id);
  }

  @Delete()
  async deleteAllMedia(@CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.deleteAllMedia(user.id);
  }
}
