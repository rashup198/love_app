###############################################################################
# Lovora - Fast Dev Startup (Skip already-done steps)
###############################################################################

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$msg) Write-Host "`n[OK] $msg" -ForegroundColor Green }
function Write-Info { param([string]$msg) Write-Host "  -> $msg" -ForegroundColor Cyan }
function Write-Warn { param([string]$msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$msg) Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

$RootDir = $PSScriptRoot
$BackendDir = $RootDir
$MobileDir = Join-Path $RootDir "mobile"

###############################################################################
# Helpers
###############################################################################
function Get-PortProcess($port) {
    try { return Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue }
    catch { return $null }
}

function Kill-Port($port) {
    $connections = Get-PortProcess $port
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -ne 0) {
                try {
                    Write-Info "Killing process on port $port (PID $procId)"
                    Stop-Process -Id $procId -Force -ErrorAction Stop
                }
                catch {
                    Write-Warn "Could not kill PID $procId"
                }
            }
        }
    }
    else {
        Write-Info "Port $port is free"
    }
}

function Test-PortOpen($port) {
    return $null -ne (Get-PortProcess $port)
}

###############################################################################
# 1. Pre-flight checks
###############################################################################
Write-Step "Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Fail "Node.js is not installed." }
Write-Info ("Node.js OK (" + (node --version) + ")")

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Write-Fail "npm is not installed." }
Write-Info ("npm OK (" + (npm --version) + ")")

$hasDocker = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $dockerVer = docker version --format "{{.Server.Version}}" 2>$null
    $ErrorActionPreference = $oldEAP
    if ($dockerVer) {
        $hasDocker = $true
        Write-Info ("Docker OK (Server $dockerVer)")
    }
    else {
        Write-Warn "Docker installed but daemon not running."
    }
}
else {
    Write-Warn "Docker not found."
}

###############################################################################
# 2. Environment — skip if .env already exists
###############################################################################
Write-Step "Checking environment file..."
$envFile = Join-Path $BackendDir ".env"
$envExample = Join-Path $BackendDir ".env.example"

if (Test-Path $envFile) {
    Write-Info ".env already exists — skipping"
}
elseif (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Info "Created .env from .env.example"
}
else {
    Write-Fail ".env missing and no .env.example found"
}

###############################################################################
# 3. Database — skip if both ports are already listening
###############################################################################
Write-Step "Checking databases..."

$pgUp = Test-PortOpen 5432
$redisUp = Test-PortOpen 6379

if ($pgUp -and $redisUp) {
    Write-Info "PostgreSQL and Redis already running — skipping Docker"
}
elseif ($hasDocker) {
    Write-Info "Starting Docker services..."
    docker compose up -d --remove-orphans

    if (-not $pgUp) {
        Write-Info "Waiting for PostgreSQL..."
        for ($i = 0; $i -lt 30; $i++) {
            $pg = docker exec lovora_postgres pg_isready -U lovora_user -d lovora 2>$null
            if ($pg -match "accepting connections") { break }
            Start-Sleep 1
        }
    }

    if (-not $redisUp) {
        Write-Info "Waiting for Redis..."
        for ($i = 0; $i -lt 20; $i++) {
            $pong = docker exec lovora_redis redis-cli ping 2>$null
            if ($pong -match "PONG") { break }
            Start-Sleep 1
        }
    }
}
else {
    Write-Fail "No database available (ports 5432/6379 not open and Docker unavailable)"
}

###############################################################################
# 4. Backend deps — skip if node_modules already exists
###############################################################################
Push-Location $BackendDir

$backendModules = Join-Path $BackendDir "node_modules"
if (Test-Path $backendModules) {
    Write-Step "Backend node_modules exists — skipping npm install"
}
else {
    Write-Step "Installing backend dependencies..."
    npm install
}

###############################################################################
# 5. Prisma — skip generate/push if client already exists and schema unchanged
###############################################################################
Write-Step "Checking Prisma..."

$prismaClient = Join-Path $BackendDir "node_modules\.prisma\client\index.js"
$schemaPath = Join-Path $BackendDir "prisma\schema.prisma"
$prismaStamp = Join-Path $BackendDir ".prisma-stamp"

$needsPrisma = $true
if ((Test-Path $prismaClient) -and (Test-Path $prismaStamp) -and (Test-Path $schemaPath)) {
    $stampTime = (Get-Item $prismaStamp).LastWriteTime
    $schemaTime = (Get-Item $schemaPath).LastWriteTime
    if ($schemaTime -le $stampTime) {
        Write-Info "Schema unchanged since last run — skipping prisma generate/db push"
        $needsPrisma = $false
    }
}

if ($needsPrisma) {
    Write-Info "Running prisma generate and db push..."
    npx prisma generate
    npx prisma db push --accept-data-loss
    # Update stamp so next run skips this
    Set-Content $prismaStamp (Get-Date -Format "o")
}

###############################################################################
# 6. Start backend
###############################################################################
Write-Step "Starting backend..."

Kill-Port 3000

$backendLog = Join-Path $RootDir ".backend.log"
$backendErr = Join-Path $RootDir ".backend-error.log"
try { Set-Content $backendLog "" } catch {}
try { Set-Content $backendErr "" } catch {}

$backendProcess = Start-Process cmd.exe `
    -ArgumentList "/c", "npm run start:dev > `"$backendLog`" 2> `"$backendErr`"" `
    -WorkingDirectory $BackendDir `
    -PassThru -WindowStyle Hidden

Write-Info ("Backend PID: " + $backendProcess.Id)
Start-Sleep 6
if ($backendProcess.HasExited) { Write-Fail "Backend crashed. Check .backend-error.log" }

Pop-Location

###############################################################################
# 7. Mobile deps — skip if node_modules already exists
###############################################################################
Push-Location $MobileDir

$mobileModules = Join-Path $MobileDir "node_modules"
if (Test-Path $mobileModules) {
    Write-Step "Mobile node_modules exists — skipping npm install"
}
else {
    Write-Step "Installing mobile dependencies..."
    if (-not (Test-Path "package.json")) {
        npm init -y | Out-Null
        npm install expo react react-native zustand axios socket.io-client expo-secure-store
    }
    npm install
}

###############################################################################
# 8. Start Expo
###############################################################################
Write-Step "Starting Expo..."

Write-Host "`n=== Lovora Ready ===" -ForegroundColor Green
Write-Host "Backend -> http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop"

try {
    npx expo start
}
finally {
    Write-Step "Shutting down..."
    if (-not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
    }
    Pop-Location
}