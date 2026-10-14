# Integración SalmoTrack v2: frontend y backend

Estas dos ramas locales forman una sola entrega funcional:

Backend compatible con esta entrega: `15cd776cd541a71ce03b752e7fe7c06c33893efc` en `feat/backend-v2-complete`. El commit frontend que contiene esta guía identifica la otra mitad de la entrega.

| Repositorio | Rama local | Punto de partida |
| --- | --- | --- |
| `Gueremy/salmonwise-inventory` | `feat/frontend-v2-integration-fixes` | `origin/feat/frontend-v2` (`df0f264`) |
| `Gueremy/AXIOUS` (copia de trabajo separada) | `feat/backend-v2-complete` | `origin/feat/backend-v2` (`214dfbb`) |

El frontend apunta al backend mediante `VITE_API_BASE_URL` (por defecto `http://localhost:8000`). Ambos cambios deben estar disponibles juntos: la pantalla de ingreso usa el nuevo `GET /api/v2/sesion` y la lista de solicitudes usa `GET /api/v2/movimientos/solicitudes?pendientes=true`.

## Contratos integrados

- Sesión: el backend entrega organización, permisos y módulos efectivos de la cuenta autenticada. La interfaz deja de construirlos desde valores locales.
- Movimientos: las altas crean solicitudes v2; aprobar y rechazar usan las rutas v2. Los tipos, ítems y lotes se consultan al servidor y se guardan para el uso offline.
- Offline: las operaciones se separan por organización y usuario, se envían en lotes de hasta 100 y conservan su UUID idempotente. Un fallo de red devuelve el lote a pendiente. Un rechazo de negocio se muestra con su motivo y no se reintenta automáticamente. La respuesta `pendiente` significa recibida por el servidor y pendiente de aprobación, no aplicada al stock.
- Importación y conciliación: CSV/XLSX se previsualizan mediante `/api/v2/importacion/previsualizar` con el parser del servidor. Los perfiles se guardan y seleccionan mediante `/api/v2/importacion/mapeos`. Conciliar recibe `file` y `mapeo_json` o `id_mapping_profile`.
- Gerencia: `/api/v2/dashboard/gerencia` entrega movimientos confirmados diarios de los últimos 15 días y los cinco ítems con más movimientos, con aislamiento por organización/sitio. La ocupación es actual, sin historial inventado.
- Exportación: los reportes operativos usan `/api/v2/exportaciones/{recurso}/{formato}`. Hasta 10 000 filas descargan un archivo; totales mayores descargan un ZIP con todas las páginas PDF/Excel. Un fallo intermedio o cambio de total cancela la descarga. La paginación no representa una instantánea: cambios que mantengan el total pueden alterar las filas; para exportaciones auditables debe ejecutarse sin escrituras concurrentes.
- Lectura QR: usa `BarcodeDetector` cuando el navegador lo admite y conserva entrada manual como alternativa.

## Verificación local

Desde el frontend: `npm run build`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` y `npm run test`. Desde el backend: `pytest -q tests` con variables de prueba. La revisión actual pasó 17 pruebas frontend, 151 backend y 7 PostgreSQL. Lint conserva diez advertencias de Fast Refresh en componentes UI, sin errores.

Se levantaron ambos servicios con PostgreSQL migrado desde cero. `scripts/smoke-integration.py` comprueba ingreso y ocho pantallas en escritorio (1440 px) y móvil (390 px), sin errores JavaScript ni respuestas API de error. Requiere Playwright, Chromium y una cuenta de QA con permisos, suministrada mediante `SALMO_QA_EMAIL`/`SALMO_QA_PASSWORD`. Este smoke verifica navegación y consultas.

`scripts/flow-integration.py` completa una entrada online, guarda un movimiento offline, comprueba la cola tras recargar, sincroniza, envía un lote mixto aceptado/rechazado, prueba ingreso manual del código QR y cierra la sesión al recibir un 401. Usa las mismas variables de cuenta QA y `SALMO_QA_LOCATION_CODE` si el código de ubicación difiere de `RACK-A-01`. `scripts/accessibility-audit.py` ejecuta axe-core para WCAG 2.1 A/AA sobre nueve estados de pantallas, incluidos diálogos y vistas de 390 px; el último resultado fue cero infracciones. La paleta de estados configurada por la organización se aplica a los componentes de inventario; etiquetas y textos genéricos ya no dependen de una empresa concreta.

Con `SALMO_QA_EXTENDED=1`, el mismo script registra una salida, aprueba sus dos etapas desde la lista de solicitudes, ejecuta un traslado y confirma que éste figura en el libro inmutable. Requiere preparar el destino y los tipos de QA con `python -m scripts.seed_browser_flow_qa` desde el backend, sobre la base `axious_v2_completion_test`; el seed rechaza otras bases.

En pantallas pequeñas, la navegación se abre desde el encabezado y deja el ancho completo al contenido; el smoke móvil recorre el menú y comprueba que la página no desborde horizontalmente.

Quedan la lectura con cámara en dispositivos físicos, contraste con paletas de clientes reales, aislamiento visual entre cuentas distintas, y pruebas de operación bajo despliegue y datos de producción. El smoke de carga backend en QA no acredita capacidad de producción.

## Configuración conjunta

Backend: copiar `backend/.env.example`, configurar las dos URLs PostgreSQL y un `SECRET_KEY` propio, ejecutar `alembic upgrade head` y `uvicorn app.main:app --port 8000`. Incluir la URL exacta del frontend en `CORS_ORIGINS` y mantener un worker mientras el scheduler esté integrado.

Frontend: copiar `.env.example`, establecer `VITE_API_BASE_URL` con esa API, instalar mediante `npm ci` y ejecutar `npm run dev`. La variable se incorpora al build; cambiarla requiere volver a compilar. Los módulos y permisos provienen de la sesión, no de variables del frontend.

## Entrega de eventos

Los webhooks de confirmación, aprobación de etapa, aprobación final, rechazo e importación finalizada se encolan dentro de la transacción del cambio correspondiente. El dispatcher puede retomarlos tras reiniciar y conserva deduplicación y reintentos. Las notificaciones internas del EventBus siguen dependiendo del proceso vivo; la garantía transaccional descrita corresponde a las entregas webhook.

## Novena alerta

La regla v2 `sincronizacion_offline_rechazada` se dispara cuando `/api/v2/movimientos/sync` rechaza un movimiento por una regla de negocio. El operario ve el motivo en su indicador local; la alerta de severidad `aviso` aparece en el panel de alertas de la organización y se asocia al sitio si la ubicación es válida. El backend evita duplicados usando organización y UUID local, respeta la desactivación de la regla y emite la notificación WebSocket del sitio. La pantalla de alertas refresca sus datos cada 15 segundos; los usuarios con permiso `movimiento:approve` pueden resolver la alerta desde allí. Una operación que nunca salió del dispositivo no puede generar por sí sola una alerta en el servidor; su antigüedad sólo puede advertirse localmente.
