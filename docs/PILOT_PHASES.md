# SalmoTrack v3 — lista de cierre del piloto

Actualizado: 15-11-2026. `[x]` significa comprobado con la evidencia indicada; `[ ]` sigue abierto. [Resultados del piloto HTTPS](PILOT_QA_2026-11-14.md). Los PR de [frontend](https://github.com/Gueremy/salmonwise-inventory/pull/2) y [backend](https://github.com/Gueremy/AXIOUS/pull/2) siguen en borrador.

## Fase 1 — Bloqueos del PR (cierre técnico comprobado)

- [x] Corregir ocupación, rutas por permiso, regreso entre cuentas y problemas móviles; hay pruebas unitarias y recorridos de navegador.
- [x] Ejecutar los tres scripts de integración con datos sintéticos y los recorridos de navegador originales.
- [x] Auditar dependencias. El frontend pasó de cinco a dos avisos moderados de producción tras una actualización compatible; ninguno alto o crítico. El backend actualizó `dnspython`, sustituyó `python-jose` por PyJWT y actualizó pytest. La auditoría completa de Python terminó sin avisos conocidos.
- [x] Revisar las dos alertas restantes de React Router 6. La de SSR no aplica porque esta app usa `BrowserRouter` sin SSR; la de redirección requiere una ruta aportada por un atacante y el destino tras login rechaza barras invertidas y caracteres de control. Sigue siendo una dependencia señalada: actualizar a React Router 7 tras el piloto y repetir pruebas. [Aviso SSR](https://github.com/advisories/GHSA-337j-9hxr-rhxg) · [aviso de redirección](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6).
- [x] Confirmar CI de los cambios de código: [frontend `a9e1e23`](https://github.com/Gueremy/salmonwise-inventory/actions/runs/43678457488) y [backend `0055c5e`](https://github.com/Gueremy/AXIOUS/actions/runs/43678715070), ambas aprobadas.

## Fase 2 — Seguridad y datos offline

- [x] Preparar cabeceras de seguridad en el blueprint del backend.
- [x] Implementar revocación de renovación al salir con conexión y límites de recuperación de contraseña.
- [x] Reemplazar la biblioteca JWT vulnerable. Se comprobó que PyJWT acepta tokens HS256 emitidos por la biblioteca anterior y que los tokens nuevos siguen siendo legibles; arranque y CI backend aprobados.
- [x] Borrar el paquete offline al salir cuando la cuenta no tiene movimientos sin resolver; conservar los pendientes aislados por cuenta. Pruebas locales y de navegador aprobadas.
- [ ] Comprobar las cabeceras en el servicio estático de la vista previa de Render.
- [ ] Probar en una tablet compartida el cierre de sesión y cambio de cuenta con y sin cola pendiente.

## Fase 3 — Vista previa HTTPS

- [x] Vista previa HTTPS y backend v3 con organización y cuentas de QA.
- [x] Login y QR de prueba P0129 con cámara nativa y lector de la app en teléfono.
- [ ] Verificar un respaldo reciente y restaurable de la base Render.
- [x] Preparar etiquetas QR con el dominio del origen autorizado: el backend usa la vista previa al descargar desde ella y conserva `FRONTEND_URL` en los demás casos. Prueba automatizada y CI aprobadas.
- [ ] Descargar una etiqueta QR oficial nueva desde la vista previa y comprobar en un teléfono que vuelve a la vista previa. Requiere desplegar el backend y permitir ese origen en `CORS_ORIGINS` del servicio Render.
- [ ] Verificar las tres cabeceras HTTPS después de que se configuren en `salmotrack-v3-prueba`.

## Fase 4 — Pruebas integrales

- [x] Probar en HTTPS operaria del pontón, jefa de bodega, administración de sede y gerencia, incluidas rutas restringidas.
- [x] Confirmar que la entrada de P0129 queda pendiente y cambia el stock solo tras la aprobación de la jefa.
- [x] Probar QR válido, ajeno e inexistente y descargas PDF/Excel.
- [x] Probar offline con datos sintéticos en PC y emulación Android: 72 horas simuladas, dos pestañas sin duplicados, aislamiento entre cuentas y QR manual.
- [x] Simular una actualización real del trabajador de la PWA con un movimiento pendiente: la cola sobrevivió en PC y emulación Android. Se corrigió un aviso que quedaba tapado por notificaciones en móvil.
- [ ] Descargar y revisar CSV con acentos y filtros en la vista previa una vez desplegado el botón del PR.
- [ ] Probar 72 horas reales, sincronización y actualización de PWA con cola pendiente en tablet física.
- [ ] Completar operaciones, conciliación ERP, editor, alertas, administración, privacidad y reportes del guion con dispositivo y evidencia por caso.

## Fase 5 — Terreno y publicación

- [ ] Medir ≥30 FPS en una zona de 1.000 ubicaciones en tablet Android económica y PC con gráfica integrada; ajustar calidad y repetir si no cumple.
- [ ] Validar tipos de carga, altura, selección táctil y categorías con operarios.
- [ ] Corregir hallazgos, revisar los PR, fusionar a `v3` y comprobar el despliegue.

## Fase 6 — Simplificación posterior

- [ ] Unificar vocabulario y acceso a API; retirar duplicados después de verificar su uso.
- [ ] Mejorar QR masivos y carga inicial; evaluar cookies `httpOnly` y retiro de rutas antiguas del backend.
- [ ] Migrar React Router 6, Vite y Vitest a versiones mayores en una revisión separada; la auditoría completa del frontend aún señala herramientas de desarrollo. Mantenerlas fuera del servidor de producción y repetir el guion tras la migración.

Las fases 2 a 4 avanzan en paralelo mientras se espera la configuración de Render. Ninguna fase se declara cerrada solo por una prueba local: los criterios de piloto en equipos reales siguen pendientes.
