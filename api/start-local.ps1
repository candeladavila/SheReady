param([string]$BindAddress = '127.0.0.1')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath 'ollama.env.example' -Destination '.env'
}
docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    docker desktop start
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar Docker Desktop.' }
}
docker compose up -d --wait db
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar PostgreSQL.' }
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el entorno Python.' }
}
& ./.venv/Scripts/python.exe -m pip install -r requirements-local-audio.txt
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
& ./.venv/Scripts/python.exe -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron aplicar las migraciones.' }
Write-Host 'API: http://localhost:8000 | Documentación: http://localhost:8000/docs'
& ./.venv/Scripts/python.exe -m uvicorn main:app --host $BindAddress --port 8000
