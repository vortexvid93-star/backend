import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'bibliotech_user',
    password: process.env.DB_PASSWORD ?? 'bibliotech_password',
    database: process.env.DB_NAME ?? 'bibliotech_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: !isProd,
    migrations: ['dist/database/migrations/*.js'],
    migrationsRun: false,
    logging: !isProd,
  };
});
