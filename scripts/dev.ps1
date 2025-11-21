param()

Write-Host "🚀 Starting Acquisition App in Development Mode"
Write-Host "================================================"

if (-not (Test-Path -Path ".env.development")) {
    Write-Error "❌ Error: .env.development file not found!`n   Please copy .env.development from the template and update with your Neon credentials."
    exit 1
}

# Check Docker
try {
    docker info > $null 2>&1
} catch {
    Write-Error "❌ Error: Docker is not running!`n   Please start Docker Desktop and try again."
    exit 1
}

# Create .neon_local directory
New-Item -ItemType Directory -Path ".neon_local" -Force | Out-Null

# Add to .gitignore if missing
if (-not (Select-String -Path ".gitignore" -Pattern "\.neon_local/" -Quiet -ErrorAction SilentlyContinue)) {
    Add-Content -Path ".gitignore" -Value ".neon_local/"
    Write-Host "✅ Added .neon_local/ to .gitignore"
}

Write-Host "📦 Building and starting development containers..."
Write-Host "📜 Applying latest schema with Drizzle..."
npm run db:migrate

Write-Host "⏳ Waiting for the database to be ready..."
docker compose exec neon-local psql -U neon -d neondb -c 'SELECT 1'

Write-Host "Starting dev compose..."
docker compose -f docker-compose.dev.yml up --build
Write-Host "🎉 Development environment started!"