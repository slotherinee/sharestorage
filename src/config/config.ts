export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
  },
  database: {
    host: process.env.DB_HOST ?? 'pgsql',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_DATABASE ?? 'pgsql',
    user: process.env.DB_USERNAME ?? 'pgsql',
    password: process.env.DB_PASSWORD ?? 'pgsql',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'jwt_secret_key',
    expiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN ?? '3600', 10),
  },
});
