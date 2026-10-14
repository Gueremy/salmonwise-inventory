# Integración SalmoTrack v2: frontend y backend

Estas dos ramas locales forman una sola entrega funcional:

| Repositorio | Rama local | Punto de partida |
| --- | --- | --- |
| `Gueremy/salmonwise-inventory` | `feat/frontend-v2-integration-fixes` | `origin/feat/frontend-v2` (`df0f264`) |
| `Gueremy/AXIOUS` (copia de trabajo separada) | `feat/backend-v2-complete` | `origin/feat/backend-v2` (`214dfbb`) |

El frontend apunta al backend mediante `VITE_API_BASE_URL` (por defecto `http://localhost:8000`). Ambos cambios deben estar disponibles juntos: la pantalla de ingreso usa el nuevo `GET /api/v2/sesion` y la lista de solicitudes usa `GET /api/v2/movimientos/solicitudes?pendientes=true`.

## Contratos integrados

- Sesión: el backend entrega organización, permisos y módulos efectivos de la cuenta autenticada. La interfaz deja de construirlos desde valores locales.
- Movimientos: las altas crean solicitudes v2; aprobar y rechazar usan las rutas v2. Los tipos, ítems y lotes se consultan al servidor y se guardan para el uso offline.
- Offline: las operaciones se separan por organización y usuario, se envían en lotes de hasta 100 y conservan su UUID idempotente. Un fallo de red devuelve el lote a pendiente. Un rechazo de negocio se muestra con su motivo y no se reintenta automáticamente. La respuesta `pendiente` significa recibida por el servidor y pendiente de aprobación, no aplicada al stock.
- Importación y conciliación: se envía `multipart/form-data` a `/api/v2/importacion/conciliar` con `file` y `mapeo_json`; las inconsistencias del job se consultan por su ID. Los KPIs e inconsistencias del panel se leen de las rutas v2 reales.
- Exportación: los reportes operativos usan `/api/v2/exportaciones/{recurso}/{formato}`. La interfaz avisa si el total supera el límite de una página de 10 000 registros, para no entregar un archivo truncado sin aviso.
- Lectura QR: usa `BarcodeDetector` cuando el navegador lo admite y conserva entrada manual como alternativa.

## Verificación local

Desde el frontend: `npm run build`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` y `npm run test`. Desde el backend: `pytest -q tests` con variables de prueba. La revisión actual pasó 11 pruebas frontend y 150 backend. Lint conserva diez advertencias de Fast Refresh en componentes UI, sin errores.

Falta una prueba de extremo a extremo con ambos servidores y una base migrada, especialmente para entrada/salida/traslado, aprobación multietapa, reintento offline real, importación CSV/XLSX, exportaciones y escaneo en dispositivos. La previsualización CSV del asistente es simple; el parser del backend realiza el procesamiento definitivo. El frontend aún no permite guardar perfiles de mapeo ni mostrar una vista previa Excel. La pantalla de gerencia conserva gráficas sintéticas y la adaptación visual completa a organizaciones genéricas sigue pendiente; por eso esta integración no acredita el plan frontend completo.

## Novena alerta

La regla v2 `sincronizacion_offline_rechazada` se dispara cuando `/api/v2/movimientos/sync` rechaza un movimiento por una regla de negocio. El operario ve el motivo en su indicador local; la alerta de severidad `aviso` aparece en el panel de alertas de la organización y se asocia al sitio si la ubicación es válida. El backend evita duplicados usando organización y UUID local, respeta la desactivación de la regla y emite la notificación WebSocket del sitio. La pantalla de alertas refresca sus datos cada 15 segundos; los usuarios con permiso `movimiento:approve` pueden resolver la alerta desde allí. Una operación que nunca salió del dispositivo no puede generar por sí sola una alerta en el servidor; su antigüedad sólo puede advertirse localmente.
