# Plan de cierre conjunto SalmoTrack v2

**Estado inicial (14 de octubre de 2026):** backend ~95 %, frontend ~65 %. Son estimaciones de avance funcional respecto de los planes, no porcentajes de cobertura de pruebas. El backend pasó 150 pruebas rápidas; el frontend pasó 11 pruebas, compilación, TypeScript y lint sin errores. Las 5 pruebas PostgreSQL documentadas se ejecutaron antes de la novena alerta y deben repetirse con el cierre final.

**Meta:** backend ~98 % y frontend ~95 %, con un recorrido operativo verificable de extremo a extremo. El porcentaje restante corresponde a conectores de terceros y despliegue/ensayo con datos reales, que dependen de accesos e infraestructura externos.

## Avance ejecutado del cierre

- Gerencia usa agregados reales; se eliminaron tendencias y gráficas sintéticas.
- CSV/XLSX tienen vista previa del servidor y perfiles de mapeo guardables/seleccionables.
- Exportaciones superiores a 10 000 filas descargan todas las páginas en ZIP. Pendiente una instantánea consistente bajo escrituras concurrentes y ensayo de memoria con volumen real.
- Outbox transaccional para webhooks de movimientos e importación; rollback y deduplicación validados en PostgreSQL.
- Migraciones verificadas, 151 pruebas backend, 7 PostgreSQL y 17 frontend; TypeScript, lint sin errores y build pasan.
- Smoke de ingreso y ocho pantallas pasa a 1440 y 390 px, sin errores JavaScript/API; script reproducible en `scripts/smoke-integration.py`.
- El flujo de navegador real cubre entrada online, cola offline tras recarga, sincronización, lote mixto aceptado/rechazado, QR manual y sesión expirada. Axe-core pasó nueve estados de pantalla WCAG 2.1 A/AA sin infracciones.
- La navegación móvil usa un menú en el encabezado; el smoke de 390 px comprobó navegación y ausencia de desborde horizontal.
- PostgreSQL valida un mismo UUID y una regla de alerta bajo solicitudes simultáneas. Carga local: 100 lecturas de dos rutas con 10 concurrentes, sin fallos (p95 238,2 y 53,1 ms).

**El plan completo aún no está cerrado.** Quedan aprobación multietapa y traslado probados de punta a punta en navegador, QR con cámara en dispositivos reales, aislamiento visual entre cuentas, contraste de paletas reales, carga representativa de producción, migración/rollback con datos autorizados y conectores reales. Los porcentajes meta no se acreditan sólo con el smoke.

## Fase 0 — Fijar la versión conjunta

- Conservar el trabajo original sin modificar de `/workspace/AXIOUS`. Backend de cierre: `feat/backend-v2-complete` en copia separada; frontend de cierre: `feat/frontend-v2-integration-fixes`.
- Confirmar los HEAD remotos antes de integrar y registrar la pareja de commits backend/frontend que debe desplegarse junta. Generar una matriz breve de rutas usadas por la interfaz contra OpenAPI v2.
- Mantener un archivo de configuración de ejemplo con URL API, CORS, módulos y variables obligatorias, sin secretos.

**Salida:** dos ramas limpias, contrato versionado y guía para levantar ambos servicios con la misma configuración.

## Fase 1 — Recorrido real con ambos servicios (prioridad máxima)

- Levantar PostgreSQL desechable, aplicar todas las migraciones Alembic desde cero y crear dos organizaciones de prueba con roles, sitios, ítems, lotes y tipos de movimiento.
- Probar desde navegador: ingreso y permisos; inventario 2D/3D; entrada, salida, traslado y aprobación multietapa; desconexión, cola y reintento; rechazo y resolución de la novena alerta; importación CSV/XLSX, conciliación y exportación.
- Automatizar el recorrido crítico con pruebas E2E y corregir cualquier divergencia de contrato detectada. Verificar aislamiento por organización y por sitio también en la interfaz.

**Salida:** recorrido E2E repetible, sin datos simulados en los flujos críticos ni errores de consola/red; fallos corregidos en el repositorio responsable.

## Fase 2 — Cierre funcional del frontend

- Sustituir la evolución de ocupación calculada artificialmente, el radar derivado de alertas y la tendencia fija `+12 %` de Gerencia por métricas históricas reales del backend; mostrar “sin datos” cuando no exista historial.
- Completar importación: perfiles de mapeo guardables/seleccionables, vista previa real de XLSX y lectura CSV consistente con archivos entrecomillados. Conservar validación y mensajes de error del servidor.
- Completar exportaciones grandes con descarga paginada o proceso asíncrono, evitando el límite actual de una página de 10 000 registros.
- Revisar la personalización por organización (nombre, textos, paleta y módulos), navegación móvil, accesibilidad y escaneo QR en navegadores/dispositivos reales; conservar el ingreso manual donde no exista `BarcodeDetector`.
- Verificar offline tras cierre/reapertura del navegador, cambio de cuenta, token caducado y lotes parcialmente aceptados/rechazados.

**Salida:** las pantallas principales presentan datos verificables de la organización y completan los flujos del plan frontend, con pruebas de los casos de error y uso móvil.

## Fase 3 — Robustez y operación del backend

- Repetir suite PostgreSQL tras la novena alerta y validar migraciones con `alembic check`. Añadir regresiones de concurrencia para reintentos del mismo UUID y reglas de alerta creadas simultáneamente.
- Cerrar la ventana de pérdida del webhook: persistir evento/entrega en la misma transacción del movimiento mediante outbox, y probar caída entre commit y despacho, reintentos y deduplicación.
- Ensayar migración y rollback sobre copia autorizada de datos, revisar índices/tiempos de consulta con volumen representativo, configuración de secretos, CORS y observabilidad.
- Probar un conector ERP/WMS o un destino webhook real sólo cuando exista un sistema de prueba y credenciales autorizadas; mantener contratos y simuladores para los demás conectores.

**Salida:** datos y eventos resistentes a concurrencia y fallos de proceso, migración ensayada y operación documentada.

## Fase 4 — Criterios de salida y push

1. Backend: pruebas rápidas y PostgreSQL en verde, migraciones sin diferencias, API/OpenAPI actualizado y revisión de seguridad multi-tenant.
2. Frontend: tests, TypeScript, lint y build en verde; recorrido E2E de la fase 1 en verde en escritorio y móvil; ninguna métrica presentada como real si es estimada.
3. Hacer revisión cruzada de los dos commits finales y registrar las versiones compatibles en la guía de integración.
4. **Después** publicar las ramas de cierre en GitHub y abrir revisiones enlazadas: `feat/backend-v2-complete` en `Gueremy/AXIOUS` y `feat/frontend-v2-integration-fixes` en `Gueremy/salmonwise-inventory`. Confirmar el destino remoto antes de cada push: la copia backend apunta actualmente a un repositorio local como `origin`. No sobrescribir `feat/backend-v2`, `main` ni el directorio original de AXIOUS, ni usar force push.

El backend publicado previamente (`feat/backend-v2`) contiene la base, pero los cambios de cierre y la novena alerta siguen en `feat/backend-v2-complete`. El frontend de cierre también sigue local. Por ello el push final comprende **dos ramas**, aunque una base backend ya estuviera publicada.
