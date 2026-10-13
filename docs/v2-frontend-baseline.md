# Baseline Frontend — SalmoTrack v2

**Fecha de ejecución:** 13 de Octubre de 2026  
**Rama:** `feat/frontend-v2`  
**Commit base:** `b8e1b0c` (origin/main)  
**Node:** v22.17.1 | **NPM:** 10.9.2  

---

## 1. Estado de la Suite de Comandos

| Comando | Estado | Observaciones |
| :--- | :--- | :--- |
| `npm install` | ✅ **Exitoso** | 556 paquetes añadidos y auditados. |
| `npm run build` | ✅ **Exitoso** | Compilación Vite completada sin errores (`dist/` generado). |
| `npm run test` | ✅ **Exitoso** | 2/2 tests pasando (`src/test/login.test.tsx`). |
| `npm run lint` | ⚠️ **4 errores / 12 warnings** | 2 errores de interfaces vacías en UI shadcn (`command.tsx`, `textarea.tsx`), 1 error `any` en `Dashboard.tsx`, 1 error `require()` en `tailwind.config.ts`. |

---

## 2. Inventario de Dependencias Críticas

- **Core:** `react` 18.3.1, `react-dom` 18.3.1, `vite` 5.4.19, `typescript` 5.8.3
- **3D:** `three` 0.160.0, `@types/three` 0.184.0 (diferencia de versión a alinear), `@react-three/fiber` 8.18.0, `@react-three/drei` 9.122.0
- **Routing & Query:** `react-router-dom` 6.30.1, `@tanstack/react-query` 5.83.0
- **UI & Charts:** `tailwindcss` 3.4.17, Radix UI primitives, `recharts` 2.13.3, `lucide-react` 0.462.0

---

## 3. Catálogo de Referencias al Dominio Antiguo

### Dominio y Entidades
- `ApiSede`, `ApiGalpon`, `ApiContainer`, `ApiProducto` en `src/lib/api.ts`
- `InventorySede`, `InventoryGalpon`, `InventoryContainerView` en `src/lib/inventory.ts`
- Vistas `Sedes.tsx`, `SedeDetalle.tsx`, `GalponDetalle.tsx`
- Componentes 3D `SedeScene.tsx`, `GalponScene.tsx`

### Reglas y Umbrales Hardcodeados
- Umbrales de semáforo fijos: $< 41\%$ (disponible), $41-79\%$ (medio), $\ge 80\%$ (crítico) en `src/lib/inventory.ts#L62` y `SedeScene.tsx`.
- Colores fijos: `#22C55E`, `#EAB308`, `#EF4444`, `#9CA3AF`, `#8B5CF6`.

### Conceptos Salmoneros en el Núcleo
- `Skretting`, `SERNAPESCA`, `SAG`, `receta_retenida`, `autorizacion_sag` en:
  - `src/components/MovimientoForm.tsx`
  - `src/pages/Login.tsx`
  - `src/pages/Reportes.tsx`
  - `src/components/three/SedeScene.tsx` (casco pontón / embarcación)

### Mocks y Datos Estáticos Detectados
- `src/data/mock.ts`: archivo de mock datasets legacy (desacoplado de vistas pero presente en repositorio).
- `src/pages/Gerencia.tsx`: `lineData` (30 días sintéticos), `radarData` (métricas ficticias), `top5` (lista hardcodeada de productos).

### Variables de Entorno Utilizadas
- `VITE_API_BASE_URL` (por defecto `http://localhost:8000` en `src/lib/api.ts`).
