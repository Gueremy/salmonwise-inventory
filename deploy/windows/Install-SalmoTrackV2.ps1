param(
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'SalmoTrack-v2'),
    [switch]$SkipAdmin
)

$ErrorActionPreference = 'Stop'
$BackendBranch = 'feat/backend-v2-complete'
$BackendCommit = '1a16a0594de196e760d238f3c2ae373135f99b3c'
$FrontendBranch = 'feat/frontend-v2-integration-fixes'

function Assert-Command($Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Falta $Name. Instálalo y vuelve a ejecutar este script."
    }
}

function Invoke-Checked($Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Program terminó con código $LASTEXITCODE"
    }
}

function Sync-Checkout($Url, $Branch, $Path) {
    if (-not (Test-Path $Path)) {
        Invoke-Checked -Program git -Arguments @('clone', '--single-branch', '--branch', $Branch, $Url, $Path)
        return
    }
    if (-not (Test-Path (Join-Path $Path '.git'))) {
        throw "La ruta ya existe y no es un repositorio Git: $Path"
    }
    $remote = (& git -C $Path remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $remote -ne $Url) {
        throw "El repositorio en $Path no tiene el origen esperado."
    }
    $changes = & git -C $Path status --porcelain
    if ($LASTEXITCODE -ne 0 -or $changes) {
        throw "Hay cambios locales en $Path. Se conservaron; resuélvelos antes de actualizar."
    }
    $current = (& git -C $Path branch --show-current).Trim()
    if ($current -ne $Branch) {
        throw "La rama en $Path es $current; se esperaba $Branch."
    }
    Invoke-Checked -Program git -Arguments @('-C', $Path, 'fetch', 'origin', $Branch)
    Invoke-Checked -Program git -Arguments @('-C', $Path, 'merge', '--ff-only', 'FETCH_HEAD')
}

function New-HexSecret([int]$Length) {
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

Assert-Command git
Assert-Command docker
& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop no está iniciado. Inícialo y vuelve a ejecutar este script.'
}

$BackendDir = Join-Path $InstallDir 'AXIOUS-v2-complete'
$FrontendDir = Join-Path $InstallDir 'salmonwise-inventory'
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Sync-Checkout 'https://github.com/Gueremy/AXIOUS.git' $BackendBranch $BackendDir
Sync-Checkout 'https://github.com/Gueremy/salmonwise-inventory.git' $FrontendBranch $FrontendDir
$actualBackendCommit = (& git -C $BackendDir rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $actualBackendCommit -ne $BackendCommit) {
    throw 'La rama backend cambió y debe revisarse su compatibilidad con este instalador.'
}

$EnvFile = Join-Path $InstallDir '.env'
if (-not (Test-Path $EnvFile)) {
    $contents = "SALMO_DB_PASSWORD=$(New-HexSecret 24)`nSALMO_SECRET_KEY=$(New-HexSecret 32)`n"
    [System.IO.File]::WriteAllText($EnvFile, $contents, [System.Text.UTF8Encoding]::new($false))
}

$Compose = Join-Path $FrontendDir 'deploy\windows\compose.yml'
$ComposeArgs = @('compose', '--env-file', $EnvFile, '-f', $Compose)
Invoke-Checked -Program docker -Arguments ($ComposeArgs + @('up', '-d', '--build'))

$ready = $false
for ($attempt = 0; $attempt -lt 45; $attempt++) {
    try {
        $api = Invoke-RestMethod -Uri 'http://localhost:8000/health' -TimeoutSec 3
        $web = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/health' -TimeoutSec 3
        if ($api.status -eq 'ok' -and $web.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 2 }
}
if (-not $ready) {
    Invoke-Checked -Program docker -Arguments ($ComposeArgs + @('ps'))
    throw 'Los servicios no respondieron en localhost:8000 y localhost:8080.'
}

if (-not $SkipAdmin) {
    $orgName = Read-Host 'Nombre de tu organización'
    $orgSlug = (Read-Host 'Código corto de organización (letras, números y guiones)').Trim().ToLowerInvariant()
    $adminName = Read-Host 'Nombre del administrador'
    $adminEmail = (Read-Host 'Correo del administrador').Trim().ToLowerInvariant()
    $secure = Read-Host 'Contraseña nueva (mínimo 12 caracteres)' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $previousOutputEncoding = $OutputEncoding
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        $payload = @{ email = $adminEmail; password = $plain; org_name = $orgName;
                      org_slug = $orgSlug; user_name = $adminName } | ConvertTo-Json -Compress
        $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
        $payload | & docker @ComposeArgs run -T --rm --no-deps api python -m scripts.bootstrap_v2_admin
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la cuenta administradora.' }
        $login = Invoke-RestMethod -Method Post -Uri 'http://localhost:8000/auth/login' -Body @{
            username = $adminEmail; password = $plain
        } -TimeoutSec 10
        $session = Invoke-RestMethod -Uri 'http://localhost:8000/api/v2/sesion' -Headers @{
            Authorization = "Bearer $($login.access_token)"
        } -TimeoutSec 10
        if ($session.organizacion.slug -ne $orgSlug) {
            throw 'La sesión no corresponde a la organización configurada.'
        }
    } finally {
        $OutputEncoding = $previousOutputEncoding
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $plain = $null
        $payload = $null
    }
}

Write-Host 'SalmoTrack v2 está disponible en http://localhost:8080'
Write-Host "Datos persistidos en el volumen Docker salmotrack-v2_salmo_db; configuración en $EnvFile"
