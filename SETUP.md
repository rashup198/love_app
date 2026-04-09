# Lovora - Local Development Setup

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| **Docker Desktop** | Latest | [docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Comes with Node.js |

> Make sure Docker Desktop is **running** before starting.

---

## Project Structure

```
love_app/
├── src/                  <- NestJS backend source
├── prisma/               <- Prisma schema
├── mobile/
│   └── src/              <- React Native (Expo) app
├── docker-compose.yml    <- PostgreSQL + Redis containers
├── .env                  <- Backend environment variables
├── .env.example          <- Template for .env
├── dev.ps1               <- 1-click setup (Windows PowerShell)
├── dev.sh                <- 1-click setup (Linux/Mac/WSL)
└── package.json          <- Backend dependencies
```

---

## Quick Start (1-Click)

### Windows (PowerShell)

```powershell
.\dev.ps1
```

### Linux / Mac / WSL

```bash
chmod +x dev.sh
./dev.sh
```

The script will:
1. Check that Docker, Node.js, and npm are installed
2. Create `.env` from `.env.example` if missing
3. Start PostgreSQL + Redis via Docker
4. Wait for databases to be healthy
5. Install backend dependencies
6. Generate Prisma client and push schema
7. Start the NestJS backend in the background
8. Install mobile dependencies
9. Start the Expo dev server

---

## Manual Setup (Step-by-Step)

### Step 1: Start Databases

```powershell
docker compose up -d
```

Verify they are running:

```powershell
docker ps
```

You should see `lovora_postgres` (port 5432) and `lovora_redis` (port 6379).

### Step 2: Configure Environment

If you don't have a `.env` file yet:

```powershell
Copy-Item .env.example .env
```

The defaults already match `docker-compose.yml` so no edits needed for local dev.

### Step 3: Install Backend Dependencies

```powershell
npm install
```

### Step 4: Setup Database Schema

```powershell
npx prisma generate
npx prisma db push
```

### Step 5: Start the Backend

```powershell
npm run start:dev
```

API available at: **http://localhost:3000/api/v1**

### Step 6: Start Mobile (New Terminal)

```powershell
cd mobile
npm install
npx expo start
```

Then press:
- `a` to open Android emulator
- `i` to open iOS simulator (Mac only)
- `w` to open in web browser
- Scan QR code with Expo Go app

---

## Service Endpoints

| Service | URL | Credentials |
|---------|-----|-------------|
| **API** | http://localhost:3000/api/v1 | JWT auth |
| **WebSocket** | ws://localhost:3000/ws | JWT auth |
| **PostgreSQL** | localhost:5432 | `lovora_user` / `lovora_pass` |
| **Redis** | localhost:6379 | no password |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://lovora_user:lovora_pass@localhost:5432/lovora` | Postgres connection |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | `dev-jwt-secret...` | Access token key |
| `JWT_REFRESH_SECRET` | `dev-jwt-refresh...` | Refresh token key |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | `30d` | Refresh token TTL |
| `PORT` | `3000` | Server port |

---

## Useful Commands

### Database

```powershell
npx prisma studio              # Visual DB browser
npx prisma db push              # Push schema changes
npx prisma migrate dev --name x # Create migration
npx prisma migrate reset        # Reset DB (drops data!)
npx prisma generate             # Regenerate client
```

### Docker

```powershell
docker compose up -d            # Start services
docker compose down             # Stop services (keeps data)
docker compose down -v          # Stop + delete all data
docker compose logs -f postgres # View Postgres logs
docker compose logs -f redis    # View Redis logs
docker compose restart postgres # Restart a service
```

---

## Common Issues

### Docker daemon not running

Start Docker Desktop from the Windows start menu. Wait for it to finish loading, then retry.

### Port 5432 or 6379 already in use

Something else is using the port. Either stop it or change the port in `docker-compose.yml`:

```powershell
netstat -ano | findstr :5432
taskkill /PID <PID> /F
```

### "Can't reach database server" (P1001)

```powershell
docker ps                       # Are containers running?
docker compose up -d            # Start them if not
```

### Port 3000 already in use

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma schema errors after pulling code

```powershell
npx prisma generate
npx prisma db push --accept-data-loss
```

---

## Clean Slate

```powershell
docker compose down -v
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force mobile\node_modules -ErrorAction SilentlyContinue
npm install
docker compose up -d
npx prisma generate
npx prisma db push
npm run start:dev
```
