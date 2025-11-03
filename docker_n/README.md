# NestJS Docker Development Environment

A clean Docker setup for NestJS development with PostgreSQL.

## Prerequisites

- Docker
- Docker Compose

## Setup

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your preferred values

3. Start the services:
   ```bash
   docker-compose up -d
   ```

4. Access the Node.js container:
   ```bash
   docker-compose exec node bash
   ```

5. (Optional) Install global packages that might be useful for NestJS development (already included in Dockerfile, but you can run manually if needed):
   ```bash
   npm install -g @nestjs/cli
   ```

6. Initialize a new NestJS project (inside the container):
   ```bash
   nest new .
   ```

## Services

- **node**: Node.js 20 Alpine with NestJS CLI pre-installed
- **postgres**: PostgreSQL 15 Alpine with health checks

## Environment Variables

See `.env.example` for all available configuration options.

## Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Access Node.js container
docker-compose exec node bash

# Access PostgreSQL
docker-compose exec postgres psql -U $DB_USERNAME -d $DB_DATABASE
```

## Notes

- The parent directory is mounted to `/application` in the container
- PostgreSQL data is persisted in a named volume
- Services use a custom network for internal communication

