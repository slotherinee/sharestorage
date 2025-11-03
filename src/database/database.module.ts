import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { typeOrmAsyncConfig } from '../config/db';

@Global()
@Module({
  imports: [TypeOrmModule.forRootAsync(typeOrmAsyncConfig)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
