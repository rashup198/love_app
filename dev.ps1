###############################################################################
# Lovora - Robust Local Development Startup Script
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
    try {
        return Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    }
    catch {
        return $null
    }
}

function Kill-Port($port) {
    $connections = Get-PortProcess $port
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -ne 0) {
                try {
                    Write-Info ("Killing process on port $port (PID $procId)")
                    Stop-Process -Id $procId -Force -ErrorAction Stop
                }
                catch {
                    Write-Warn ("Could not kill PID $procId")
                }
            }
        }
    }
    else {
        Write-Info "Port $port is free"
    }
}

###############################################################################
# 1. Pre-flight checks
###############################################################################
Write-Step "Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js is not installed."
}
Write-Info ("Node.js OK (" + (node --version) + ")")

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Fail "npm is not installed."
}
Write-Info ("npm OK (" + (npm --version) + ")")

$hasDocker = $false
if (Get-Command docker -ErrorAction SilentlyContinue) {
    # Turn off Stop action temporarily to avoid script crash when docker daemon is not running
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $dockerVer = docker version --format "{{.Server.Version}}" 2>$null
    $ErrorActionPreference = $oldEAP
    
    if ($dockerVer) {
        $hasDocker = $true
        Write-Info ("Docker OK (Server " + $dockerVer + ")")
    }
    else {
        Write-Warn "Docker installed but daemon not running."
    }
}
else {
    Write-Warn "Docker not found."
}

###############################################################################
# 2. Environment
###############################################################################
Write-Step "Checking environment file..."

$envFile = Join-Path $BackendDir ".env"
$envExample = Join-Path $BackendDir ".env.example"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Info "Created .env file"
    }
    else {
        Write-Fail ".env missing"
    }
}

###############################################################################
# 3. Database setup
###############################################################################
Write-Step "Setting up databases..."

$pgPortBusy = Get-PortProcess 5432
$redisPortBusy = Get-PortProcess 6379

if ($pgPortBusy -and $redisPortBusy) {
    Write-Info "Using local PostgreSQL and Redis"
}
elseif ($hasDocker) {
    Write-Info "Starting Docker services..."
    docker compose up -d --remove-orphans

    Write-Info "Waiting for PostgreSQL..."
    for ($i = 0; $i -lt 30; $i++) {
        $pg = docker exec lovora_postgres pg_isready -U lovora_user -d lovora 2>$null
        if ($pg -match "accepting connections") { break }
        Start-Sleep 1
    }

    Write-Info "Waiting for Redis..."
    for ($i = 0; $i -lt 20; $i++) {
        $pong = docker exec lovora_redis redis-cli ping 2>$null
        if ($pong -match "PONG") { break }
        Start-Sleep 1
    }
}
else {
    Write-Fail "No database available"
}

###############################################################################
# 4. Backend setup
###############################################################################
Write-Step "Installing backend dependencies..."
Push-Location $BackendDir
npm install

Write-Step "Prisma setup..."
npx prisma generate
npx prisma db push --accept-data-loss

###############################################################################
# 5. Backend start
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
if ($backendProcess.HasExited) {
    Write-Fail "Backend crashed. Check logs."
}

Pop-Location

###############################################################################
# 6. Mobile setup
###############################################################################
Write-Step "Installing mobile dependencies..."
Push-Location $MobileDir

if (-not (Test-Path "package.json")) {
    npm init -y | Out-Null
    npm install expo react react-native zustand axios socket.io-client expo-secure-store
}

npm install

###############################################################################
# 7. Start Expo
###############################################################################
Write-Step "Starting Expo..."

Write-Host "`n=== Lovora Ready ===" -ForegroundColor Green
Write-Host "Backend -> http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop"

try {
    npx expo start --clear
}
finally {
    Write-Step "Shutting down..."
    if (-not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
    }
    Pop-Location
}