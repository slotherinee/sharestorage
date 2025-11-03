import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get<string>('database.host', 'pgsql'),
    port: configService.get<number>('database.port', 5432),
    database: configService.get<string>('database.name', 'pgsql'),
    username: configService.get<string>('database.user', 'pgsql'),
    password: configService.get<string>('database.password', 'pgsql'),
    autoLoadEntities: true,
    synchronize: false,
    migrations: ['dist/database/migrations/*.js'],
    migrationsTableName: 'migrations',
    migrationsRun: true,
  }),
};
