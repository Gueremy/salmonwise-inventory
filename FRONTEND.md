# 🐟 FRONTEND.md — Sistema de Inventario 3D AXIOUS
# Stack: React 18 + TypeScript + Vite + React Three Fiber + TanStack Query
# Skills base: creative-design/3d-web-experience · development/senior-frontend
# Proyecto: Gueremy Barrientos · Bastián Riffo · Sebastián Bravo — INACAP 2026

---

## ⚡ INSTRUCCIÓN AL INICIAR SESIÓN

Al comenzar cualquier sesión, el agente DEBE:

```bash
# 1. Verificar estado real del frontend
ls src/lib/         # ¿existe apiClient.ts?
ls src/store/       # ¿existe authStore.ts?
ls src/hooks/       # ¿qué hooks existen?
grep -r "mock.ts" src/ --include="*.tsx" -l  # ¿qué archivos aún usan mock?
cat package.json | grep -E "axios|zustand|dexie|zxing|tanstack/react-table"
```

2. Reportar: **"Estás en Sprint SF-X. La próxima tarea es SF-X-Y: [descripción]"**
3. NO implementar sprints futuros hasta completar el actual
4. Si hay imports de `mock.ts` en archivos de producción → señalarlo primero
5. Nunca usar `any` en TypeScript — tipar todo correctamente
6. **Validación UX:** Antes de crear cualquier componente visual, revisar la sección
   "Principios de Diseño para Usuarios No Técnicos" de este documento

---

## Contexto del Proyecto

Sistema web de gestión de inventario con visualización 3D para **Skretting Chile Ltda.**,
empresa salmonera de la Región de Los Lagos.

- **Backend desplegado**: https://axious-backend.onrender.com (Render — pruebas)
- **Backend producción**: DigitalOcean (São Paulo) — cuando firme Skretting
- **Frontend deploy**: Vercel (Sprint SF6)
- **Repositorio**: https://github.com/Gueremy/salmonwise-inventory

### Equipo y roles en el frontend

| Persona | Área principal |
|---------|---------------|
| **Gueremy Barrientos** | Coordinación + hooks de datos críticos (auth, movimientos, sync) |
| **Bastián Riffo** | 3D (React Three Fiber), PWA, QR scanner, deploy Vercel |
| **Sebastián Bravo** | Páginas, componentes UI, diseño de experiencia de usuario, tablas, formularios, limpieza mock |

---

## 🎯 Usuarios del Sistema — Quiénes Son

> Esta sección es la más importante del documento. Cada decisión de diseño debe
> partir de aquí. Los usuarios NO son desarrolladores.

### Perfil Operario (Nivel 1)
- Trabaja en galpones, puede usar guantes o estar de pie.
- Usa el sistema para escanear QR y registrar movimientos de contenedores.
- Objetivo de inducción: **dominar el flujo principal en máximo 2 horas**.
- Dispositivo probable: tablet industrial o celular en soporte de pared.

### Perfil Administración / Gerencia (Nivel 2)
- Revisa KPIs, aprueba movimientos, genera reportes de trazabilidad.
- Usa el sistema desde escritorio o tablet.
- Objetivo de inducción: **dominar todas las funciones en máximo 8 horas**.

### Navegación por rol — qué ve cada usuario
```
super_admin   → Todo: sedes, galpones, usuarios, configuración, reportes
admin_sede    → Su sede: galpones, usuarios de su sede, reportes
jefe_bodega   → Dashboard, movimientos pendientes, alertas, reportes
operario      → Solo: escáner QR + formulario rápido (vista /operario)
gerencia      → Solo lectura: dashboard, reportes, comparativo sedes
```

---

## 🖼️ Principios de Diseño para Usuarios No Técnicos

> Estos principios NO son opcionales. Aplican a cada componente, cada formulario
> y cada mensaje del sistema.

### 1. Lenguaje Simple — Sin Jerga Técnica

| ❌ NO usar | ✅ Usar en cambio |
|-----------|-----------------|
| Submit | Guardar / Confirmar |
| Error 401 | Tu sesión venció. Inicia sesión nuevamente. |
| NULL / undefined | Sin información disponible |
| Fetch failed | No hay conexión. Revisa el Wi-Fi. |
| Toggle | Activar / Desactivar |
| Container ID | Código del contenedor |

### 2. Regla de los 3 Clics

Un usuario nunca debe dar más de 3 clics para llegar a su tarea principal.

- **Operario:** al iniciar sesión, la pantalla principal ya muestra el botón
  "Escanear QR" y "Nuevo Movimiento" con íconos grandes.
- **Administración:** el Dashboard muestra los KPIs más críticos sin navegar.

### 3. Tamaños Mínimos para Uso Industrial

> Los operarios pueden estar usando guantes de trabajo o estar en movimiento.

```
Botones de acción principal : min 56 × 56 px
Botones secundarios         : min 44 × 44 px
Texto base (cuerpo)         : mínimo 16px  (ideal 18px en tablet)
Texto de etiquetas          : mínimo 14px
Iconos táctiles             : mínimo 28 × 28 px con área de toque de 44px
```

### 4. Feedback Inmediato — El Usuario Siempre Sabe Qué Pasó

Después de cada acción, mostrar resultado en menos de 300ms (visual) y
menos de 2 segundos (dato real). Usar Sonner para toasts:

```typescript
// ✅ Correcto — mensaje en español simple
toast.success('Movimiento registrado correctamente.');
toast.error('No se pudo guardar. Revisa tu conexión a internet.');
toast.loading('Guardando movimiento...');
toast.warning('Este contenedor lleva más de 30 días sin movimiento.');

// ❌ Incorrecto — mensaje técnico
toast.error('POST /movimientos/ returned 500');
toast.error('Network request failed: ERR_CONNECTION_REFUSED');
```

### 5. Estados de Carga con Esqueletos (Skeleton)

Nunca dejar una pantalla en blanco o con un spinner genérico.
Usar `<Skeleton>` de Shadcn que imite la forma exacta del componente real.

```typescript
if (isLoading) return <MovimientosSkeleton rows={5} />;
if (isError)   return <ErrorCard mensaje="No se pudieron cargar los movimientos." />;
```

### 6. Formularios Paso a Paso (Wizard)

Para flujos complejos (registrar movimiento, crear sede), dividir en pasos numerados.
Nunca mostrar todos los campos a la vez si son más de 5.

```
Paso 1 de 3 → Seleccionar contenedor
Paso 2 de 3 → Ingresar destino y cantidad
Paso 3 de 3 → Confirmar y guardar
```

### 7. Confirmación antes de Acciones Destructivas

```typescript
<Dialog>
  <DialogTitle>¿Confirmar aprobación?</DialogTitle>
  <DialogDescription>
    Estás aprobando el movimiento de 240 kg de alimento desde Galpón 3 al Galpón 7.
    Esta acción no se puede deshacer.
  </DialogDescription>
  <Button variant="destructive">Sí, aprobar movimiento</Button>
  <Button variant="outline">Cancelar</Button>
</Dialog>
```

---

## 🎨 Paleta de Colores — Sistema Completo

> Paleta diseñada para entornos industriales: alto contraste sin usar negro puro.
> Todos los valores son tokens CSS que deben definirse en `src/styles/tokens.css`.

### Filosofía de Color

La paleta usa un azul oceánico profundo como base institucional (alusivo al
sector salmonero), combinado con acentos cálidos para acciones y estados claros
para el fondo. Sin negro puro — el texto más oscuro es `--color-ink`.

```css
/* ============================================================
   AXIOUS — Design Tokens
   src/styles/tokens.css
   ============================================================ */

:root {

  /* --- Base --- */
  --color-background   : #F4F7F9;   /* Fondo principal — gris azulado muy suave */
  --color-surface      : #FFFFFF;   /* Tarjetas, modales, sidebars              */
  --color-surface-alt  : #EBF0F5;   /* Fondo de filas alternas en tablas        */
  --color-border       : #D0DCE8;   /* Bordes de inputs, tarjetas, divisores    */

  /* --- Texto (sin negro puro) --- */
  --color-ink          : #1E3A4C;   /* Texto principal — azul muy oscuro        */
  --color-ink-secondary: #4A6477;   /* Texto secundario, etiquetas              */
  --color-ink-muted    : #7A9AB0;   /* Texto deshabilitado, hints               */

  /* --- Primario — Azul Oceánico --- */
  --color-primary-50   : #E8F2F9;
  --color-primary-100  : #C6DFF0;
  --color-primary-200  : #8BBFDF;
  --color-primary-400  : #3E8FBF;
  --color-primary-600  : #1A6B99;   /* Color principal — botones, links activos */
  --color-primary-800  : #0F4A6E;   /* Hover, estados activos                   */
  --color-primary-900  : #082F47;   /* Sidebar, header oscuro                   */

  /* --- Estados de Contenedor (sistema 5 colores) --- */
  --color-status-disponible       : #15803D;
  --color-status-disponible-bg    : #DCFCE7;
  --color-status-medio            : #B45309;
  --color-status-medio-bg         : #FEF3C7;
  --color-status-critico          : #DC2626;
  --color-status-critico-bg       : #FEE2E2;
  --color-status-mantenimiento    : #4B5563;
  --color-status-mantenimiento-bg : #F3F4F6;
  --color-status-cuarentena       : #7C3AED;
  --color-status-cuarentena-bg    : #EDE9FE;

  /* --- Alertas por Severidad --- */
  --color-alerta-critica          : #DC2626;
  --color-alerta-critica-bg       : #FEE2E2;
  --color-alerta-aviso            : #D97706;
  --color-alerta-aviso-bg         : #FEF3C7;
  --color-alerta-informativa      : #1A6B99;
  --color-alerta-informativa-bg   : #E8F2F9;

  /* --- Acción / CTA --- */
  --color-action-primary  : #1A6B99;
  --color-action-success  : #15803D;
  --color-action-danger   : #DC2626;
  --color-action-warning  : #D97706;

  /* --- Sombras --- */
  --shadow-card   : 0 1px 3px rgba(30, 58, 76, 0.10), 0 1px 2px rgba(30, 58, 76, 0.06);
  --shadow-modal  : 0 10px 25px rgba(30, 58, 76, 0.18);
  --shadow-button : 0 2px 4px rgba(26, 107, 153, 0.24);
}
```

### Uso de Colores por Componente

```typescript
// Botón primario
className="bg-[--color-primary-600] hover:bg-[--color-primary-800] text-white"

// Badge de estado container
className="bg-[--color-status-disponible-bg] text-[--color-status-disponible]"

// Badge de alerta
className="bg-[--color-alerta-critica-bg] text-[--color-alerta-critica]"

// Texto de cuerpo
className="text-[--color-ink] text-base"

// Texto secundario
className="text-[--color-ink-secondary] text-sm"
```

### Estados del Container — Colores 3D (React Three Fiber)

```typescript
const ESTADO_COLOR: Record<string, string> = {
  disponible:    '#15803D',  // verde
  medio:         '#B45309',  // amarillo-naranja
  critico:       '#DC2626',  // rojo
  mantenimiento: '#4B5563',  // gris
  cuarentena:    '#7C3AED',  // morado
};
```

---

## 📊 Estado Actual — Mayo 2026

```
FRONTEND GLOBAL: 42% completado
Última actualización: 2026-05-14 — Sprint SF1 COMPLETADO

✅ SF1 COMPLETADO (sesiones 1-4):
   src/lib/apiClient.ts            ✅ axios + interceptores JWT + auto-refresh 401
   src/store/authStore.ts          ✅ Zustand persist, tipado completo
   Login.tsx                       ✅ POST /auth/login → GET /auth/me → navegar por rol
   src/components/PrivateRoute.tsx ✅ guarda rutas por isAuthenticated + rol
   App.tsx                         ✅ rutas por rol con PrivateRoute
   src/hooks/useAuth.ts            ✅ logout real + navigateByRol
   src/context/RoleContext.tsx     ✅ lee de authStore, sin mock
   Header.tsx                      ✅ usuario real, logout real, sin mock
   Sidebar.tsx                     ✅ filtra items por rol real, sin mock
   AppLayout.tsx                   ✅ usa authStore, sin useRole
   src/types/index.ts              ✅ tipos de dominio centralizados
   Operario.tsx                    ✅ usa authStore, eliminado role-switcher mock
   axios@1.7 + zustand@4.5         ✅ instalados

✅ EXISTE Y FUNCIONA (pre-SF1):
   React Router v6 con todas las rutas definidas
   GalponScene.tsx — 3D con hover/select animado (datos mock)
   SedeScene.tsx — visualización 3D de sede (datos mock)
   MovimientoForm.tsx — UI sin submit real
   Shadcn/ui — todos los componentes instalados
   TanStack Query v5 configurado
   Recharts configurado
   Zod instalado

⚠️ EXISTE PERO ES MOCK (reemplazar por orden de sprint):
   Dashboard.tsx        → KPIs hardcodeados       ← SF2
   Alertas.tsx          → datos hardcodeados       ← SF2
   Sedes.tsx            → datos hardcodeados       ← SF3
   SedeDetalle.tsx      → datos hardcodeados       ← SF3
   GalponDetalle.tsx    → datos hardcodeados       ← SF3
   Gerencia.tsx         → datos hardcodeados       ← SF6
   MovimientoForm.tsx   → sin submit real          ← SF4

❌ NO EXISTE (crear por orden de sprint):
   src/hooks/useDashboard.ts       ← SF2
   src/hooks/useWebSocket.ts       ← SF2
   src/hooks/useAlertas.ts         ← SF2
   src/hooks/useSedes.ts           ← SF3
   src/hooks/useGalpones.ts        ← SF3
   src/hooks/useContainers.ts      ← SF3
   src/hooks/useMovimientos.ts     ← SF4
   src/lib/db.ts (Dexie)           ← SF5
   src/hooks/useSync.ts            ← SF5
   src/hooks/useOnlineStatus.ts    ← SF5
   src/hooks/useReportes.ts        ← SF6

❌ DEPENDENCIAS NO INSTALADAS:
   @zxing/browser        → instalar en SF4
   @tanstack/react-table → instalar en SF4
   dexie                 → instalar en SF5
   vite-plugin-pwa       → instalar en SF5

⏸ PAUSA RECOMENDADA (antes de SF2):
   Probar login real contra https://axious-backend.onrender.com
   Verificar navegación por rol (operario/gerencia/admin/jefe_bodega)
   Verificar logout y redirect a /
```

---

## 🔧 Stack Tecnológico

```
Framework    : React 18.3.1 + TypeScript 5.8.3
Build        : Vite 5.4.19
Router       : React Router DOM 6.30.1
Estado global: Zustand 4.5.0             (instalar SF1)
HTTP         : Axios 1.7.0               (instalar SF1)
Server state : TanStack Query v5.83.0    ✅
3D           : React Three Fiber 8.18.0 + @react-three/drei 9.122.0 + three.js 0.160.0 ✅
Gráficos     : Recharts 2.13.3           ✅
UI           : Shadcn/ui + Radix UI + Tailwind CSS 3.4.17 ✅
Forms        : React Hook Form 7.61.1 + Zod 3.25.76 ✅
Notificac.   : Sonner 1.7.4              ✅
QR           : @zxing/browser 0.1.4      (instalar SF4)
Tablas       : @tanstack/react-table 8.21.0 (instalar SF4)
Offline      : Dexie 4.0.1               (instalar SF5)
PWA          : vite-plugin-pwa 0.21.0    (instalar SF5)
Deploy       : Vercel                    (SF6)

⚠️ VERSIONES FIJAS — NO actualizar sin revisar compatibilidad:
   three.js: 0.160.0 (no subir a 0.163+ sin probar con R3F)
   @react-three/drei: 9.122.0 (debe coincidir con three.js)
   recharts: 2.13.3 (API estable para este proyecto)
```

---

## 🔌 ENDPOINTS DEL BACKEND — Referencia Completa

**Base URL desarrollo**: `https://axious-backend.onrender.com`
**Base URL producción**: configurar en `VITE_API_URL`
**WebSocket**: `wss://axious-backend.onrender.com/ws/alertas/{id_sede}?token={JWT}`

### AUTH `/auth`
```
POST /auth/login
     Body: { email: string, password: string }
     Response: { access_token, refresh_token, token_type: "bearer" }

POST /auth/refresh
     Body: { refresh_token: string }
     Response: { access_token, refresh_token }

GET  /auth/me
     Response: { id, nombre, email, rol, codigo_empleado, id_sede, sede_nombre }

POST /auth/logout          → 204 No Content
POST /auth/forgot-password → Body: { email }
POST /auth/reset-password  → Body: { token, new_password }
```

### SEDES `/sedes`
```
GET  /sedes/              Query: ?skip=0&limit=20
GET  /sedes/{id}          Response: Sede con galpones incluidos
POST /sedes/              Solo super_admin
PATCH /sedes/{id}
DELETE /sedes/{id}        Soft delete
```

### GALPONES `/galpones`
```
GET  /galpones/           Query: ?id_sede=UUID&skip=0&limit=20
GET  /galpones/{id}
POST /galpones/
PATCH /galpones/{id}
```

### CONTAINERS `/containers`
```
GET  /containers/         Query: ?id_galpon=UUID&estado=disponible&skip=0&limit=50
GET  /containers/{id}
POST /containers/
PATCH /containers/{id}/estado
     Body: { estado: "disponible"|"medio"|"critico"|"mantenimiento"|"cuarentena" }
GET  /containers/{id}/qr
     Response: { qr_base64: string, codigo: string }
GET  /containers/{id}/info-publica   (sin auth — para escaneo QR)
```

### PRODUCTOS `/productos`
```
GET  /productos/          Query: ?categoria=alimento&skip=0&limit=20
POST /productos/
PATCH /productos/{id}
POST /productos/importar  (CSV masivo)
```

### USUARIOS `/usuarios`
```
GET  /usuarios/           Query: ?id_sede=UUID&rol=operario
PATCH /usuarios/{id}      Body: { rol?, activo? }
POST /usuarios/{id}/asignar-galpones
     Body: { galpon_ids: UUID[] }
```

### MOVIMIENTOS `/movimientos`
```
POST /movimientos/
     → Para tipo="entrada_proveedor" OBLIGATORIO:
       numero_lote, fecha_vencimiento, nombre_proveedor,
       num_guia_despacho, registro_sanitario, temperatura_almacen
     → Para productos veterinarios agregar:
       num_receta_retenida, num_autorizacion_sag

PATCH /movimientos/{id}/aprobar
      Solo jefe_bodega — no puede aprobar sus propios movimientos

PATCH /movimientos/{id}/rechazar
      Body: { motivo: string }  ← obligatorio

GET  /movimientos/pendientes
     Query: ?id_sede=UUID&skip=0&limit=20

GET  /movimientos/fefo
     Query: ?id_producto=UUID&id_sede=UUID
     Response: containers ordenados por fecha_vencimiento ASC

GET  /movimientos/trazabilidad
     Query: ?numero_lote=string
     Response: historial completo — usa codigo_empleado, NUNCA rut

GET  /movimientos/ruta-picking
     Query: ?containers=id1,id2,id3&punto_inicio=A1

POST /movimientos/sync
     Body: { movimientos: MovimientoOffline[], id_sede: UUID }
     Response: { resultados: [{ uuid_local, accion, motivo? }] }
```

### ALERTAS `/alertas`
```
GET  /alertas/activas     Query: ?id_sede=UUID
GET  /alertas/historial   Query: ?id_sede=UUID&skip=0&limit=20
PATCH /alertas/{id}/revisar
PATCH /alertas/{id}/resolver

Tipos de alerta:
  capacidad_critica | vencimiento_7_dias | vencimiento_30_dias |
  stock_minimo | movimiento_fuera_horario | discrepancia_inventario |
  sin_movimiento_30_dias | cuarentena_activa

WS /ws/alertas/{id_sede}?token={JWT}
   Mensajes: { tipo: "nueva_alerta", alerta: Alerta }
```

### DASHBOARD `/dashboard`
```
GET /dashboard/kpis
    Query: ?id_sede=UUID
    Response: {
      ocupacion_global: float,
      alertas_activas: int,
      movimientos_hoy: int,
      proximo_vencimiento: int | null
    }

GET /dashboard/ocupacion-por-galpon
    Query: ?id_sede=UUID
    Response: [{ name, ocupacion_pct, ocup, estado }]
    ← listo para Recharts BarChart

GET /dashboard/evolucion
    Query: ?id_sede=UUID&dias=30
    Response: [{ fecha, movimientos, entradas, salidas }]
    ← listo para Recharts LineChart
```

### REPORTES `/reportes`
```
GET /reportes/movimientos/pdf     → application/pdf (descargar con blob)
GET /reportes/movimientos/excel   → application/vnd.openxmlformats
GET /reportes/sernapesca          → application/pdf (formato normativa)

Query params (todos): ?id_sede=UUID&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
```

---

## 📋 SPRINTS PENDIENTES — Orden Obligatorio

---

### SF1 — Auth Real + API Client + Zustand
**Semana 1: 18–25 Mayo | Instalar: `npm install axios@^1.7.0 zustand@^4.5.0`**

#### SF1-1 — src/lib/apiClient.ts (Gueremy)
```typescript
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://axious-backend.onrender.com',
  headers: { 'Content-Type': 'application/json' },
});

// Agrega token JWT en cada request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh en 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(error.config);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

#### SF1-2 — src/store/authStore.ts (Gueremy)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin_sede' | 'jefe_bodega' | 'operario' | 'gerencia';
  codigo_empleado: string;
  id_sede: string | null;
  sede_nombre: string | null;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      usuario: null, token: null, refreshToken: null, isAuthenticated: false,
      setTokens: (token, refreshToken) =>
        set({ token, refreshToken, isAuthenticated: true }),
      setUsuario: (usuario) => set({ usuario }),
      logout: () =>
        set({ usuario: null, token: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'axious-auth' }
  )
);
```

#### SF1-3 — Reescribir Login.tsx (Gueremy)
```typescript
// POST /auth/login → setTokens() → GET /auth/me → setUsuario() → navegar
// Error sin revelar si es email o contraseña incorrectos
// Tras 5 intentos mostrar: "Cuenta bloqueada temporalmente. Intenta en 5 minutos."
// Botón mínimo 56px, texto "Iniciar sesión" (no "Submit" ni "Login")
```

#### SF1-4 — src/components/PrivateRoute.tsx (Bastián)
```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const PrivateRoute = ({ roles }: { roles?: string[] }) => {
  const { isAuthenticated, usuario } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (roles && usuario && !roles.includes(usuario.rol))
    return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
```

#### SF1-8 — Header + Sidebar con usuario real (Sebastián)
```typescript
// Nombre y rol del usuario desde useAuthStore().usuario
// Botón logout: apiClient.post('/auth/logout') + authStore.logout()
// Avatar con iniciales del nombre real
// Texto del rol en español: "Jefe de Bodega", no "jefe_bodega"
```

#### SF1-9 — Limpiar mock.ts (Sebastián)
```bash
grep -r "from.*mock" src/ --include="*.tsx" --include="*.ts" -l
# Eliminar imports de datos → mantener SOLO interfaces/types
# Mover types a src/types/index.ts
```

---

### SF2 — Dashboard + Alertas + WebSocket
**Semana 2: 26 Mayo – 1 Junio | Requiere: SF1 Done**

#### SF2-1 — src/hooks/useDashboard.ts (Bastián)
```typescript
// staleTime: 30_000 (30 segundos)
// GET /dashboard/kpis?id_sede=X
// GET /dashboard/ocupacion-por-galpon?id_sede=X  ← para Recharts BarChart
// GET /dashboard/evolucion?id_sede=X&dias=30     ← para Recharts LineChart
```

#### SF2-5 — src/hooks/useWebSocket.ts (Bastián)
```typescript
// wss://axious-backend.onrender.com/ws/alertas/{idSede}?token={JWT}
// Al recibir alerta → invalidar query ['alertas', 'activas'] + toast.warning()
// Reconexión con exponential backoff (1s → 2s → 4s → máx 30s)
// Cleanup en return del useEffect: ws.close()
// Solo conectar si isAuthenticated === true
```

#### SF2-8 — src/pages/Inventario.tsx (Sebastián)
```typescript
// Reemplazar Stub — resumen de ocupación por sede
// Cards por sede con % ocupación y badge de alertas activas
// Datos desde useSedes() + datos de KPIs por sede
// Aplicar tokens CSS de color según estado
```

#### SF2-9 — Componentes de alerta (Sebastián)
```typescript
// AlertaBadge: chip con color desde tokens CSS
//   critica      → --color-alerta-critica-bg / --color-alerta-critica
//   aviso        → --color-alerta-aviso-bg / --color-alerta-aviso
//   informativa  → --color-alerta-informativa-bg / --color-alerta-informativa
// AlertaHistorial: lista con timestamp en formato "hace 2 horas"
```

---

### SF3 — Sedes + Galpones + 3D Conectado
**Semana 3: 2–8 Junio | Requiere: SF1 Done**

#### SF3-5 — Actualizar GalponScene.tsx (Bastián)
```typescript
// Grid dinámico: galpon.filas × galpon.columnas (no hardcodeado)
// Usar posicion_fila y posicion_col reales del backend
// Colores desde ESTADO_COLOR (tokens del dominio, no hexadecimales sueltos)
// InstancedMesh si hay más de 50 containers (performance 60fps)
// Lazy load: const GalponScene = lazy(() => import('./GalponScene'))

const ESTADO_COLOR: Record<string, string> = {
  disponible:    'var(--color-status-disponible)',
  medio:         'var(--color-status-medio)',
  critico:       'var(--color-status-critico)',
  mantenimiento: 'var(--color-status-mantenimiento)',
  cuarentena:    'var(--color-status-cuarentena)',
};
```

#### SF3-8 — ContainerInfoPanel.tsx (Sebastián)
```typescript
// Panel lateral al seleccionar container en 3D
// Mostrar: código, estado (badge con color), producto, lote, vencimiento
// Barra de progreso de ocupación: ocupacion_actual / capacidad_max
// Color de la barra según estado del container (tokens CSS)
// Botón "Registrar movimiento" → abre MovimientoForm prellenado
// Texto de vencimiento en lenguaje humano: "Vence en 12 días" (no "2026-06-03")
```

#### SF3-9 — StatusLegend actualizado (Sebastián)
```typescript
// Leyenda con conteos REALES del backend agrupados por estado
// ● Disponible (N)  ● Medio (N)  ● Crítico (N)  ● Mantenimiento (N)  ● Cuarentena (N)
// Colores desde tokens CSS, no hexadecimales inline
```

---

### SF4 — Movimientos + FEFO + QR
**Semana 4: 9–15 Junio | Requiere: SF3 Done**

```bash
npm install @zxing/browser@^0.1.4
npm install @tanstack/react-table@^8.21.0
```

#### SF4-3 — Reescribir MovimientoForm.tsx — Wizard 3 pasos (Gueremy)
```typescript
// Paso 1: Seleccionar container (QR o manual) + mostrar FEFO
// Paso 2: Tipo de movimiento + cantidad + campos SERNAPESCA condicionales
// Paso 3: Confirmación con resumen legible antes de enviar

// Schema Zod base:
const baseSchema = z.object({
  id_container: z.string().uuid('Selecciona un contenedor'),
  id_producto: z.string().uuid('Selecciona un producto'),
  tipo: z.enum(['entrada_proveedor', 'salida_produccion', 'traslado_interno']),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  observaciones: z.string().max(500).trim().optional(),
});

// Schema SERNAPESCA (condicional si tipo === 'entrada_proveedor'):
const entradaSchema = baseSchema.extend({
  numero_lote: z.string().min(1, 'Requerido por SERNAPESCA').max(50).trim().toUpperCase(),
  fecha_vencimiento: z.string().min(1, 'Requerido por SERNAPESCA'),
  nombre_proveedor: z.string().min(1, 'Requerido'),
  num_guia_despacho: z.string().min(1, 'Requerido'),
  registro_sanitario: z.string().min(1, 'Requerido'),
  temperatura_almacen: z.number(),
});
```

#### SF4-5 — QrScanner.tsx (Bastián)
```typescript
import { BrowserQRCodeReader } from '@zxing/browser';
// Preview de cámara con overlay de guía visual
// Al escanear → GET /containers/{id}/info-publica → autocompleta form
// Manejo de permisos: mensaje claro "Necesitamos acceso a la cámara" (no error técnico)
// Botón de cierre siempre visible y de min 56px
```

#### SF4-7 — Movimientos.tsx con @tanstack/react-table (Sebastián)
```typescript
// Columnas: fecha, tipo (en español), producto, lote, cantidad, container, estado, acciones
// Texto de tipos: "Entrada de proveedor" no "entrada_proveedor"
// Filtros: tipo, estado, fecha desde/hasta
// Paginación server-side (skip/limit al backend)
// Row actions visibles solo si el rol lo permite
```

#### SF4-8 — TrazabilidadBusqueda.tsx (Sebastián)
```typescript
// Input con debounce 500ms + placeholder "Número de lote (ej: LOT-2026-001)"
// Línea de tiempo visual del lote: entrada → traslados → salida
// Texto en español: "Ingresado por EMP-0042 el 3 de enero 2026"
// ⚠️ NUNCA mostrar RUT — solo codigo_empleado
```

---

### SF5 — Offline PWA + Dexie.js
**Semana 5: 16–22 Junio | Requiere: SF4 Done — sprint más complejo**

```bash
npm install dexie@^4.0.1
npm install -D vite-plugin-pwa@^0.21.0
```

#### SF5-1 — vite.config.ts + PWA Manifest (Bastián)
```typescript
// name: 'AXIOUS Inventario'
// short_name: 'AXIOUS'
// theme_color: '#0F4A6E'   ← --color-primary-900
// background_color: '#F4F7F9' ← --color-background
// display: 'standalone'
// start_url: '/dashboard'
```

#### SF5-2 — src/lib/db.ts (Bastián)
```typescript
import Dexie, { Table } from 'dexie';

interface MovimientoOffline {
  uuid_local: string;
  payload: object;
  sincronizado: boolean;
  created_at: number;
  intentos: number;
}

class AxiousDB extends Dexie {
  movimientos_offline!: Table<MovimientoOffline>;
  constructor() {
    super('axious_db');
    this.version(1).stores({
      movimientos_offline: 'uuid_local, sincronizado, created_at',
    });
  }
}
export const db = new AxiousDB();
```

#### SF5-6 — OfflineBanner.tsx (Sebastián)
```typescript
// Banner fijo en parte superior cuando offline
// Fondo: --color-alerta-aviso-bg, texto: --color-alerta-aviso
// "Sin conexión — trabajando sin internet (X movimientos pendientes de guardar)"
// Botón "Sincronizar ahora" (visible al recuperar conexión)
// Desaparece automáticamente 3s después de sincronizar
```

#### SF5-7 — SyncStatus.tsx en Header (Sebastián)
```typescript
// Indicador pequeño junto al nombre del usuario:
// 🟢 "Sincronizado"      → todo OK, color --color-action-success
// 🟡 "X pendientes"      → hay movimientos en Dexie
// 🔄 "Sincronizando..."  → en proceso
// 🔴 "Sin conexión"      → offline, color --color-action-danger
```

---

### SF6 — Reportes + Usuarios + Deploy Vercel
**Semana 6: 23–29 Junio | Requiere: SF5 Done**

#### SF6-1 — src/hooks/useReportes.ts (Gueremy)
```typescript
const descargarReporte = async (tipo: 'pdf' | 'excel' | 'sernapesca', params) => {
  const response = await apiClient.get(`/reportes/movimientos/${tipo}`, {
    params,
    responseType: 'blob',  // CRÍTICO para archivos binarios
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-${tipo}-${params.desde}-${params.hasta}.${tipo === 'excel' ? 'xlsx' : 'pdf'}`;
  a.click();
  URL.revokeObjectURL(url);
};
```

#### SF6-4 — src/pages/Usuarios.tsx (Sebastián)
```typescript
// Tabla @tanstack/react-table
// Columnas: nombre, email, rol (en español), sede, activo, acciones
// Acción cambiar rol: dropdown con opciones en español ("Operario", "Jefe de Bodega")
// Acción asignar galpones: modal con lista de galpones de su sede
// Solo visible para super_admin y admin_sede (PrivateRoute roles)
```

#### SF6-5 — src/pages/Configuracion.tsx (Sebastián)
```typescript
// Cambio de contraseña con validación Zod: mínimo 8 chars, 1 mayúscula, 1 número
// Perfil: nombre, email, rol en español, sede (solo lectura)
// Toggle de tema claro/oscuro
// Texto del botón: "Guardar cambios" (no "Submit")
```

#### SF6-7 — Limpieza build producción (Bastián)
```bash
npm uninstall lovable-tagger
grep -r "from.*mock" src/ --include="*.tsx" --include="*.ts"
# Solo debe quedar en src/types/
npm run build
# Expected: 0 errors
```

#### SF6-8 — Deploy Vercel (Bastián)
```bash
# Variables en Vercel:
VITE_API_URL=https://axious-backend.onrender.com

# vercel.json:
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## 🔒 Seguridad en el Frontend

```typescript
// ❌ NUNCA mostrar RUT en ningún componente
// ✅ Usar codigo_empleado siempre

// ❌ NUNCA loggear tokens
console.log(token);  // PROHIBIDO en producción

// ✅ Protección de rutas por rol con TypeScript
{usuario?.rol === 'jefe_bodega' && (
  <Button onClick={aprobar}>Aprobar movimiento</Button>
)}

// ✅ Sanitizar inputs con Zod antes de enviar al backend
const schema = z.object({
  observaciones: z.string().max(500).trim().optional(),
  numero_lote: z.string().max(50).trim().toUpperCase(),
});
```

---

## ⚡ Performance y 3D

```typescript
// TanStack Query — staleTime por tipo de dato
queryClient.setQueryDefaults(['sedes'],      { staleTime: 15 * 60 * 1000 });
queryClient.setQueryDefaults(['containers'], { staleTime: 30_000 });
queryClient.setQueryDefaults(['alertas'],    { staleTime: 10_000 });

// Lazy loading de escenas 3D pesadas
const GalponScene = lazy(() => import('@/pages/GalponDetalle'));
const SedeScene   = lazy(() => import('@/pages/SedeDetalle'));

// InstancedMesh para +50 containers (mantener 60fps en tablets)
// Proyección mínima: solo 8 campos para el render 3D
```

---

## Variables de Entorno

```env
# .env.local (desarrollo)
VITE_API_URL=https://axious-backend.onrender.com

# .env.production (Vercel)
VITE_API_URL=https://axious-backend.onrender.com

# Producción real DigitalOcean (cuando Skretting firme)
VITE_API_URL=https://api.axious.cl

# WebSocket — reemplazar https por wss automáticamente:
const WS_URL = import.meta.env.VITE_API_URL.replace('https', 'wss');
```

---

## Errores Comunes — Evitar

```typescript
// ❌ Importar datos de mock.ts en producción
import { sedes } from '@/data/mock';

// ❌ Tipado any
const handleData = (data: any) => { ... };

// ❌ useEffect para fetching
useEffect(() => { fetch('/api/data').then(...) }, []);  // usar TanStack Query

// ❌ WebSocket sin cleanup → memory leak
useEffect(() => { const ws = new WebSocket(url); }, []);

// ❌ URLs hardcodeadas
axios.get('https://axious-backend.onrender.com/auth/me');  // usar apiClient

// ❌ Texto técnico al usuario
toast.error('POST /movimientos/ returned 500');

// ❌ Colores hexadecimales inline en componentes
style={{ color: '#DC2626' }}  // usar tokens CSS: text-[--color-status-critico]
```

---

## ✅ Checklist Antes de Cada Commit

**Experiencia de Usuario:**
- [ ] ¿Puede un operario nuevo entender esta pantalla sin explicación?
- [ ] ¿Los botones principales tienen al menos 56 × 56 px?
- [ ] ¿El texto base tiene al menos 16px?
- [ ] ¿Hay skeleton para cada estado de carga?
- [ ] ¿Los mensajes de error están en español simple, sin términos técnicos?
- [ ] ¿Las acciones destructivas tienen diálogo de confirmación?

**Código y Seguridad:**
- [ ] Sin imports de `mock.ts` en archivos de lógica real
- [ ] Sin `any` en TypeScript
- [ ] El RUT no aparece en ninguna pantalla
- [ ] Sin tokens ni datos sensibles en `console.log`
- [ ] Colores usando tokens CSS, no hexadecimales inline
- [ ] Issue movido a In Review

---

*FRONTEND.md — Actualizar al iniciar cada nuevo sprint*
*Última actualización: 2026-05-14 — Sprint SF1 COMPLETADO · SF2 siguiente*
*Backend: https://axious-backend.onrender.com*
*Skills: creative-design/3d-web-experience · development/senior-frontend*
