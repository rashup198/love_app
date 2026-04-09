

#!/usr/bin/env bash
###############################################################################
# Lovora - 1-Click Local Development Startup
#
# Usage:  chmod +x dev.sh && ./dev.sh
#
# Spins up Docker (Postgres + Redis), installs deps, starts backend + Expo.
###############################################################################

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo -e "\n${GREEN}[OK] $1${NC}"; }
info() { echo -e "${CYAN}  -> $1${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
fail() { echo -e "${RED}[FAIL] $1${NC}"; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR"
MOBILE_DIR="$ROOT_DIR/mobile"

###############################################################################
# 1. Pre-flight checks
###############################################################################
step "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Get it from https://docs.docker.com/get-docker/"
info "Docker  OK  ($(docker --version | head -1))"

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Get it from https://nodejs.org/"
info "Node.js OK  ($(node --version))"

command -v npm >/dev/null 2>&1 || fail "npm is not installed."
info "npm     OK  ($(npm --version))"

docker info >/dev/null 2>&1 || fail "Docker daemon is not running. Please start Docker Desktop."
info "Docker daemon is running"

###############################################################################
# 2. Environment file
###############################################################################
step "Checking environment file..."

if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.example" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    info "Created .env from .env.example"
  else
    fail "No .env or .env.example found."
  fi
else
  info ".env already exists"
fi

###############################################################################
# 3. Start Docker services
###############################################################################
step "Starting Docker services (PostgreSQL + Redis)..."

docker compose -f "$ROOT_DIR/docker-compose.yml" up -d --remove-orphans

info "Waiting for PostgreSQL to be healthy..."
RETRIES=30
until docker exec lovora_postgres pg_isready -U lovora_user -d lovora >/dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then fail "PostgreSQL did not become healthy in time."; fi
  sleep 1
done
info "PostgreSQL is healthy"

info "Waiting for Redis to be healthy..."
RETRIES=20
until docker exec lovora_redis redis-cli ping 2>/dev/null | grep -q PONG; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then fail "Redis did not become healthy in time."; fi
  sleep 1
done
info "Redis is healthy"

###############################################################################
# 4. Backend setup
###############################################################################
step "Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install

step "Generating Prisma client..."
npx prisma generate

step "Pushing database schema..."
npx prisma db push --accept-data-loss
info "Database schema is in sync"

###############################################################################
# 5. Start backend (background)
###############################################################################
step "Starting NestJS backend in background..."

BACKEND_LOG="$ROOT_DIR/.backend.log"
npm run start:dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
info "Backend PID: $BACKEND_PID (logs: .backend.log)"

sleep 3
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  warn "Backend process exited early. Check .backend.log:"
  tail -20 "$BACKEND_LOG"
  fail "Backend failed to start."
fi
info "Backend is starting on http://localhost:3000"

###############################################################################
# 6. Mobile setup
###############################################################################
step "Installing mobile dependencies..."
cd "$MOBILE_DIR"

if [ ! -f "package.json" ]; then
  info "No package.json found in /mobile. Initializing..."
  npm init -y >/dev/null 2>&1
  npm install expo react react-native zustand axios socket.io-client expo-secure-store expo-clipboard
  npm install -D @types/react @types/react-native typescript
fi

npm install

###############################################################################
# 7. Start Expo
###############################################################################
step "Starting Expo development server..."
echo ""
echo -e "${GREEN}===============================================================${NC}"
echo -e "${GREEN}  Lovora development environment is ready!${NC}"
echo -e "${GREEN}===============================================================${NC}"
echo ""
echo -e "  ${CYAN}Backend${NC}   -> http://localhost:3000/api/v1"
echo -e "  ${CYAN}Postgres${NC}  -> localhost:5432  (lovora_user / lovora_pass)"
echo -e "  ${CYAN}Redis${NC}     -> localhost:6379"
echo -e "  ${CYAN}Expo${NC}      -> Starting below..."
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

cleanup() {
  echo ""
  step "Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  info "Backend stopped"
  info "Docker services still running. Run 'docker compose down' to stop them."
}
trap cleanup EXIT INT TERM

npx expo start
