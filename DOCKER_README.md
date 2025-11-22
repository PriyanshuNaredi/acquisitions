# Acquisitions App - Docker Setup with Neon Database

This guide explains how to run the application with Docker in both development and production environments using Neon Database.

## Architecture Overview

### Development Environment

- **Neon Local**: A Docker proxy that creates ephemeral database branches for development
- **Application**: Runs in a Docker container and connects to Neon Local
- **Benefits**: Fresh database branches for each session, no manual cleanup, matches production schema

### Production Environment

- **Neon Cloud**: Direct connection to your production Neon database
- **Application**: Runs in a Docker container with production configuration
- **Benefits**: Serverless Postgres, automatic scaling, point-in-time recovery

## Prerequisites

1. **Docker & Docker Compose** installed on your machine
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop)

2. **Neon Account** with a project created
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project
   - Note your Project ID, API Key, and Branch ID

3. **Neon API Key**
   - Navigate to [Account Settings → API Keys](https://console.neon.tech/app/settings/api-keys)
   - Create a new API key

## Development Setup (Local with Neon Local)

### Step 1: Configure Environment Variables

Copy the development environment template:

```bash
cp .env.development .env.development.local
```

Edit `.env.development.local` and add your Neon credentials:

```env
# Get these from https://console.neon.tech
NEON_API_KEY=your_actual_api_key_here
NEON_PROJECT_ID=your_actual_project_id_here
PARENT_BRANCH_ID=br_xxx_xxx  # Optional: your main branch ID

# Database will be available at this connection string
DATABASE_URL=postgres://neon:npg@neon-local:5432/neondb?sslmode=require
```

**Where to find these values:**

- **NEON_API_KEY**: Console → Account Settings → API Keys
- **NEON_PROJECT_ID**: Console → Project Settings → General
- **PARENT_BRANCH_ID**: Console → Branches (copy the ID of your main branch)

### Step 2: Start Development Environment

Start both the application and Neon Local proxy:

```bash
docker-compose -f docker-compose.dev.yml --env-file .env.development.local up
```

Or run in detached mode:

```bash
docker-compose -f docker-compose.dev.yml --env-file .env.development.local up -d
```

### Step 3: Verify Everything is Running

Check container status:

```bash
docker-compose -f docker-compose.dev.yml ps
```

View logs:

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Just the app
docker-compose -f docker-compose.dev.yml logs -f app

# Just Neon Local
docker-compose -f docker-compose.dev.yml logs -f neon-local
```

### Step 4: Access the Application

- **Application**: http://localhost:3000
- **Database**: `postgres://neon:npg@localhost:5432/neondb?sslmode=require`

### Step 5: Run Database Migrations

```bash
# Generate migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:generate

# Apply migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate
```

### Step 6: Stop Development Environment

```bash
docker-compose -f docker-compose.dev.yml down
```

**Note**: When the containers stop, the ephemeral database branch created by Neon Local is automatically deleted (if `DELETE_BRANCH=true`).

### Development Tips

#### Hot Reload During Development

The development compose file mounts your `src` directory as a volume. To enable hot reload, modify the Dockerfile or use:

```bash
docker-compose -f docker-compose.dev.yml exec app npm run dev
```

#### Persistent Branches Per Git Branch

To create a persistent branch tied to your Git branch, modify `docker-compose.dev.yml`:

```yaml
neon-local:
  environment:
    DELETE_BRANCH: false
  volumes:
    - ./.neon_local/:/tmp/.neon_local
    - ./.git/HEAD:/tmp/.git/HEAD:ro
```

Don't forget to add `.neon_local/` to your `.gitignore`.

#### Connect with Database GUI

You can connect tools like pgAdmin, DBeaver, or TablePlus to:

```
Host: localhost
Port: 5432
Database: neondb
User: neon
Password: npg
SSL: Require
```

## Production Setup (Neon Cloud)

### Step 1: Get Your Production Database URL

1. Go to your [Neon Console](https://console.neon.tech)
2. Select your project
3. Navigate to the **Dashboard** or **Connection Details**
4. Copy the connection string (it looks like):

```
postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### Step 2: Configure Production Environment

**IMPORTANT**: Never commit production credentials to Git!

Create `.env.production` (this file should be in `.gitignore`):

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### Step 3: Build Production Image

```bash
docker build -t acquisitions-app:latest .
```

### Step 4: Run Production Environment

Using docker-compose:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Or using docker directly:

```bash
docker run -d \
  --name acquisitions-app-prod \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="your_production_database_url" \
  acquisitions-app:latest
```

### Step 5: Run Production Migrations

```bash
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate
```

### Step 6: Monitor Production

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
docker-compose -f docker-compose.prod.yml ps
```

## Deployment Best Practices

### Environment Variables in Production

**Never hardcode secrets!** Inject them via:

#### Using Docker Secrets (Docker Swarm)

```yaml
services:
  app:
    secrets:
      - db_url
    environment:
      DATABASE_URL_FILE: /run/secrets/db_url
```

#### Using Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: neon-db-secret
type: Opaque
stringData:
  database-url: postgres://...
```

#### Using Cloud Providers

- **AWS**: AWS Secrets Manager / Parameter Store
- **GCP**: Secret Manager
- **Azure**: Key Vault
- **Heroku/Render/Railway**: Built-in environment variable management

### CI/CD Pipeline Example

#### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t acquisitions-app:${{ github.sha }} .

      - name: Push to registry
        run: |
          docker tag acquisitions-app:${{ github.sha }} your-registry/acquisitions-app:latest
          docker push your-registry/acquisitions-app:latest

      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          # Your deployment commands here
```

## Troubleshooting

### Development Issues

#### Neon Local won't start

```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs neon-local

# Common issues:
# - Invalid API key or Project ID
# - Branch ID doesn't exist
# - Network connectivity issues
```

#### Can't connect to database

```bash
# Test connection from app container
docker-compose -f docker-compose.dev.yml exec app sh
# Inside container:
apk add postgresql-client
psql "postgres://neon:npg@neon-local:5432/neondb?sslmode=require"
```

#### Port 5432 already in use

If you have local PostgreSQL running:

```bash
# Stop local PostgreSQL, or change port in docker-compose.dev.yml:
ports:
  - '5433:5432'  # Map to different host port
```

### Production Issues

#### Database connection timeout

- Verify your DATABASE_URL is correct
- Check Neon project isn't suspended (Free tier limitation)
- Ensure network allows outbound connections to Neon

#### SSL/TLS errors

Ensure your connection string includes `?sslmode=require`:

```
postgres://user:pass@host/db?sslmode=require
```

## File Structure

```
acquisitions/
├── docker-compose.dev.yml      # Development setup with Neon Local
├── docker-compose.prod.yml     # Production setup
├── Dockerfile                  # Application container image
├── .dockerignore              # Files to exclude from image
├── .env.development           # Development environment template
├── .env.production            # Production environment template
├── .gitignore                 # Add .env files here
├── src/                       # Application source code
└── drizzle/                   # Database migrations
```

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Neon Local Documentation](https://neon.tech/docs/local/neon-local)
- [Docker Documentation](https://docs.docker.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)

## Support

For issues related to:

- **Neon**: https://neon.tech/docs/introduction/support
- **Docker**: https://docs.docker.com/get-support/
- **This App**: Create an issue in the GitHub repository
