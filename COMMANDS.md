# Docker Commands Reference Card

## 🔧 Quick Reference

### Development Commands

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `make dev-up`      | Start development environment  |
| `make dev-up-d`    | Start in background (detached) |
| `make dev-down`    | Stop development environment   |
| `make dev-logs`    | View real-time logs            |
| `make dev-shell`   | Open shell in app container    |
| `make dev-migrate` | Run database migrations        |
| `make dev-restart` | Restart containers             |

### Production Commands

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `make prod-up`      | Start production environment   |
| `make prod-up-d`    | Start in background (detached) |
| `make prod-down`    | Stop production environment    |
| `make prod-logs`    | View real-time logs            |
| `make prod-shell`   | Open shell in app container    |
| `make prod-migrate` | Run database migrations        |
| `make prod-restart` | Restart containers             |

### Utility Commands

| Command      | Description                   |
| ------------ | ----------------------------- |
| `make help`  | Show all available commands   |
| `make check` | Validate Docker setup         |
| `make build` | Build Docker image            |
| `make clean` | Remove all containers/volumes |
| `make ps`    | Show running containers       |

## 📋 Without Make

If you don't have Make installed (or prefer Docker commands):

### Development

```bash
# Start
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# Stop
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Run migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Open shell
docker-compose -f docker-compose.dev.yml exec app sh
```

### Production

```bash
# Start
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# Open shell
docker-compose -f docker-compose.prod.yml exec app sh
```

## 🔍 Debugging Commands

```bash
# Check container status
docker ps

# Inspect specific container
docker inspect <container_name>

# View container resource usage
docker stats

# Access Neon Local logs
docker-compose -f docker-compose.dev.yml logs neon-local

# Test database connection from host
psql "postgres://neon:npg@localhost:5432/neondb?sslmode=require"

# Test database connection from container
docker-compose -f docker-compose.dev.yml exec app sh
# Then inside container:
apk add postgresql-client
psql "$DATABASE_URL"
```

## 🧹 Cleanup Commands

```bash
# Remove all containers and volumes
make clean

# Remove Docker images
make clean-images

# Remove ALL unused Docker resources
make prune

# Or manually:
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.prod.yml down -v
docker system prune -af --volumes
```

## 📦 Build Commands

```bash
# Build development image
docker-compose -f docker-compose.dev.yml build

# Build production image
docker-compose -f docker-compose.prod.yml build

# Build with no cache
docker-compose -f docker-compose.dev.yml build --no-cache

# Build specific service
docker-compose -f docker-compose.dev.yml build app
```

## 🎯 Most Common Workflows

### Start Fresh Development Session

```bash
make dev-up
# Wait for containers to start
make dev-migrate
# App now running at http://localhost:3000
```

### Debug Development Issues

```bash
make dev-logs        # Check logs
make dev-shell       # Open shell in container
make dev-down        # Stop everything
make build-dev       # Rebuild
make dev-up          # Start again
```

### Deploy to Production

```bash
# Build image
docker build -t acquisitions-app:latest .

# Tag for registry
docker tag acquisitions-app:latest your-registry/acquisitions-app:latest

# Push to registry
docker push your-registry/acquisitions-app:latest

# Deploy (depends on your platform)
# Kubernetes: kubectl apply -f deployment.yml
# Docker Swarm: docker stack deploy -c docker-compose.prod.yml app
# Cloud Run: gcloud run deploy...
```

## 🔐 Environment Setup Checklist

### Before Development

- [ ] Copy `.env.development` to `.env.development.local` (optional)
- [ ] Add `NEON_API_KEY` in `.env.development`
- [ ] Add `NEON_PROJECT_ID` in `.env.development`
- [ ] (Optional) Add `PARENT_BRANCH_ID` in `.env.development`
- [ ] Run `make dev-up`

### Before Production

- [ ] Get production DATABASE_URL from Neon Console
- [ ] Create `.env.production` (DON'T commit!)
- [ ] Add `DATABASE_URL` in `.env.production`
- [ ] Test build: `docker build -t acquisitions-app:latest .`
- [ ] Run migrations: `make prod-migrate`

## 💡 Pro Tips

1. **Use detached mode** for long-running sessions: `make dev-up-d`
2. **Check logs regularly** when debugging: `make dev-logs`
3. **Always run migrations** after pulling new code: `make dev-migrate`
4. **Clean up** old images/volumes periodically: `make clean`
5. **Test production build locally** before deploying: `make prod-up-d`

## 🆘 Troubleshooting Quick Fixes

| Problem                     | Solution                                                 |
| --------------------------- | -------------------------------------------------------- |
| Port already in use         | `docker ps` and stop conflicting container               |
| Neon Local won't start      | Check API key in `.env.development`                      |
| Database connection fails   | Verify `DATABASE_URL` format includes `?sslmode=require` |
| Changes not reflected       | Rebuild: `make build-dev`                                |
| Container exits immediately | Check logs: `make dev-logs`                              |
| Out of disk space           | Clean up: `make prune`                                   |
