# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Development (Local with Neon Local)

1. **Configure your Neon credentials** in `.env.development`:
   ```bash
   NEON_API_KEY=your_api_key
   NEON_PROJECT_ID=your_project_id
   PARENT_BRANCH_ID=your_branch_id  # optional
   ```

2. **Start the development environment**:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

3. **Access your app** at http://localhost:3000

### Production (Neon Cloud)

1. **Add your production DATABASE_URL** to `.env.production`:
   ```bash
   DATABASE_URL=postgres://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
   ```

2. **Start the production environment**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Your app is running** at http://localhost:3000

## 📝 Important Notes

- **Development**: Uses Neon Local proxy with ephemeral branches
- **Production**: Connects directly to Neon Cloud
- Both environments are fully Dockerized
- Environment variables control which database to use

For detailed instructions, see [DOCKER_README.md](./DOCKER_README.md)
