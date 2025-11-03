import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import configuration from '../config/config';

const config = configuration();

const options: DataSourceOptions = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  synchronize: false,
  migrationsTableName: 'migrations',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
};

export const appDataSource = new DataSource(options);

export default options;
