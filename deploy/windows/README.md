# Instalación local de SalmoTrack v2 en Windows

Requisitos: Windows 10/11, Git y Docker Desktop con WSL 2 iniciado. La instalación usa una carpeta nueva en `%LOCALAPPDATA%\SalmoTrack-v2`; no cambia el proyecto existente de OneDrive. La base de datos queda en un volumen Docker persistente.

Desde PowerShell, en una copia de la rama `feat/frontend-v2-integration-fixes`:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\Install-SalmoTrackV2.ps1
```

El script obtiene `feat/backend-v2-complete` y `feat/frontend-v2-integration-fixes`, crea claves locales aleatorias, construye los servicios, aplica las migraciones y solicita los datos de la primera organización y cuenta administradora. Verifica `/health`, el ingreso y `/api/v2/sesion`. Abre `http://localhost:8080` en el PC. Usa `-SkipAdmin` para repetir una instalación existente sin solicitar la cuenta.

Para actualizar, ejecuta de nuevo el mismo script. Sólo avanza ramas limpias por fast-forward y conserva el volumen. Antes de actualizar una instalación con datos propios, realiza un respaldo:

```powershell
$base = Join-Path $env:LOCALAPPDATA 'SalmoTrack-v2'
$compose = Join-Path $base 'salmonwise-inventory\deploy\windows\compose.yml'
$cid = docker compose --env-file (Join-Path $base '.env') -f $compose ps -q db
docker exec $cid pg_dump -U salmo -d salmotrack -Fc -f /tmp/salmotrack-backup.dump
docker cp "${cid}:/tmp/salmotrack-backup.dump" (Join-Path $base 'salmotrack-backup.dump')
docker exec $cid rm /tmp/salmotrack-backup.dump
```

Esta instalación crea una base nueva. La migración de datos de la versión anterior requiere revisar un respaldo autorizado y mapear el esquema de v1 a v2. El frontend se compila para `http://localhost:8000`; si se accede desde otro equipo, habrá que configurar la URL pública de la API y CORS para ese origen.

Los servicios se publican sólo en `127.0.0.1`. La revisión `npm audit --omit=dev` del 20 de octubre de 2026 reportó avisos de dependencias pendientes de actualización; no expongas esta instalación directamente a Internet sin esa revisión y TLS.
