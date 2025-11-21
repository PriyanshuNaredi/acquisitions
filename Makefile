.PHONY: help dev-up dev-down dev-logs dev-shell prod-up prod-down prod-logs prod-shell build clean

# Colors for output
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}'

## Development commands
dev-up: ## Start development environment with Neon Local
	docker-compose -f docker-compose.dev.yml up

dev-up-d: ## Start development environment in detached mode
	docker-compose -f docker-compose.dev.yml up -d

dev-down: ## Stop development environment
	docker-compose -f docker-compose.dev.yml down

dev-logs: ## View development logs
	docker-compose -f docker-compose.dev.yml logs -f

dev-shell: ## Open shell in development app container
	docker-compose -f docker-compose.dev.yml exec app sh

dev-db-shell: ## Connect to Neon Local database
	docker-compose -f docker-compose.dev.yml exec neon-local psql -U neon -d neondb

dev-migrate: ## Run database migrations in development
	docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

dev-generate: ## Generate database migrations in development
	docker-compose -f docker-compose.dev.yml exec app npm run db:generate

dev-studio: ## Open Drizzle Studio in development
	docker-compose -f docker-compose.dev.yml exec app npm run db:studio

dev-restart: ## Restart development environment
	docker-compose -f docker-compose.dev.yml restart

## Production commands
prod-up: ## Start production environment
	docker-compose -f docker-compose.prod.yml up

prod-up-d: ## Start production environment in detached mode
	docker-compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production environment
	docker-compose -f docker-compose.prod.yml down

prod-logs: ## View production logs
	docker-compose -f docker-compose.prod.yml logs -f

prod-shell: ## Open shell in production app container
	docker-compose -f docker-compose.prod.yml exec app sh

prod-migrate: ## Run database migrations in production
	docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

prod-restart: ## Restart production environment
	docker-compose -f docker-compose.prod.yml restart

## Build commands
build: ## Build Docker image
	docker build -t acquisitions-app:latest .

build-dev: ## Build development image
	docker-compose -f docker-compose.dev.yml build

build-prod: ## Build production image
	docker-compose -f docker-compose.prod.yml build

## Cleanup commands
clean: ## Remove all containers, images, and volumes
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.prod.yml down -v

clean-images: ## Remove Docker images
	docker rmi acquisitions-app:latest || true
	docker rmi neondatabase/neon_local:latest || true

prune: ## Remove all unused Docker resources
	docker system prune -af --volumes

## Utility commands
ps: ## Show running containers
	docker-compose -f docker-compose.dev.yml ps
	docker-compose -f docker-compose.prod.yml ps

check: ## Validate setup
	@bash scripts/check-setup.sh
