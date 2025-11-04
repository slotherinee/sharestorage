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
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.MINIO_REGION ?? 'us-east-1',
    accessKey: process.env.MINIO_ROOT_USER ?? 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
    bucket: process.env.MINIO_BUCKET ?? 'media',
    publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT ?? null,
  },
});
