###############################################################################
# Lovora — 1-Click Local Development Startup (PowerShell)
#
# Usage:
#   .\dev.ps1
#
# Project layout:
#   /               → NestJS backend (package.json, src/, prisma/)
#   /mobile         → React Native Expo app
#   /docker-compose.yml → PostgreSQL + Redis
###############################################################################

$ErrorActionPreference = "Stop"

# ── Helpers ──────────────────────────────────────────────────────────────────
function Write-Step  { param([string]$msg) Write-Host "`n✔ $msg" -ForegroundColor Green }
function Write-Info  { param([string]$msg) Write-Host "  → $msg" -ForegroundColor Cyan }
function Write-Warn  { param([string]$msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Fail  { param([string]$msg) Write-Host "✖ $msg" -ForegroundColor Red; exit 1 }

$RootDir    = $PSScriptRoot
$BackendDir = $RootDir
$MobileDir  = Join-Path $RootDir "mobile"

###############################################################################
# 1. Pre-flight checks
###############################################################################
Write-Step "Checking prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker is not installed. Please install Docker Desktop: https://docs.docker.com/get-docker/"
}
Write-Info "Docker  ✓  ($(docker --version))"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js is not installed. Please install Node.js 18+: https://nodejs.org/"
}
Write-Info "Node.js ✓  ($(node --version))"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Fail "npm is not installed."
}
Write-Info "npm     ✓  ($(npm --version))"

# Ensure Docker daemon is running
try {
    docker info 2>$null | Out-Null
    Write-Info "Docker daemon is running"
} catch {
    Write-Fail "Docker daemon is not running. Please start Docker Desktop."
}

###############################################################################
# 2. Environment file
###############################################################################
Write-Step "Checking environment file..."

$envFile = Join-Path $BackendDir ".env"
$envExample = Join-Path $BackendDir ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Info "Created .env from .env.example"
    } else {
        Write-Fail "No .env or .env.example found. Please create one."
    }
} else {
    Write-Info ".env already exists"
}

###############################################################################
# 3. Start Docker services
###############################################################################
Write-Step "Starting Docker services (PostgreSQL + Redis)..."

docker compose -f (Join-Path $RootDir "docker-compose.yml") up -d --remove-orphans

Write-Info "Waiting for PostgreSQL to be healthy..."
$retries = 30
do {
    $ready = docker exec lovora_postgres pg_isready -U lovora_user -d lovora 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
    $retries--
    if ($retries -le 0) { Write-Fail "PostgreSQL did not become healthy in time." }
} while ($true)
Write-Info "PostgreSQL is healthy ✓"

Write-Info "Waiting for Redis to be healthy..."
$retries = 20
do {
    $pong = docker exec lovora_redis redis-cli ping 2>$null
    if ($pong -eq "PONG") { break }
    Start-Sleep -Seconds 1
    $retries--
    if ($retries -le 0) { Write-Fail "Redis did not become healthy in time." }
} while ($true)
Write-Info "Redis is healthy ✓"

###############################################################################
# 4. Backend setup
###############################################################################
Write-Step "Installing backend dependencies..."
Push-Location $BackendDir
npm install

Write-Step "Generating Prisma client..."
npx prisma generate

Write-Step "Pushing database schema..."
npx prisma db push --accept-data-loss
Write-Info "Database schema is in sync ✓"

###############################################################################
# 5. Start backend (background)
###############################################################################
Write-Step "Starting NestJS backend in background..."

$backendLog = Join-Path $RootDir ".backend.log"
$backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start:dev" `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $backendLog `
    -RedirectStandardError (Join-Path $RootDir ".backend-error.log") `
    -PassThru -WindowStyle Hidden

Write-Info "Backend PID: $($backendProcess.Id) (logs: .backend.log)"

Start-Sleep -Seconds 3
if ($backendProcess.HasExited) {
    Write-Warn "Backend process exited early. Check .backend.log"
    Get-Content $backendLog -Tail 20
    Write-Fail "Backend failed to start."
}
Write-Info "Backend is starting on http://localhost:3000"

Pop-Location

###############################################################################
# 6. Mobile setup
###############################################################################
Write-Step "Installing mobile dependencies..."
Push-Location $MobileDir

if (-not (Test-Path "package.json")) {
    Write-Info "No package.json found in /mobile. Initializing..."
    npm init -y | Out-Null
    npm install expo react react-native zustand axios socket.io-client expo-secure-store expo-clipboard
    npm install -D "@types/react" "@types/react-native" typescript
}

npm install

###############################################################################
# 7. Start Expo
###############################################################################
Write-Step "Starting Expo development server..."

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  🚀 Lovora development environment is ready!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend   → http://localhost:3000/api/v1" -ForegroundColor Cyan
Write-Host "  Postgres  → localhost:5432  (lovora_user / lovora_pass)" -ForegroundColor Cyan
Write-Host "  Redis     → localhost:6379" -ForegroundColor Cyan
Write-Host "  Expo      → Starting below..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop Expo. Backend runs separately (PID $($backendProcess.Id))." -ForegroundColor Yellow
Write-Host ""

try {
    npx expo start
} finally {
    Write-Step "Shutting down..."
    if (-not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Info "Backend stopped"
    }
    Write-Info "Docker services are still running. Run 'docker compose down' to stop them."
    Pop-Location
}
