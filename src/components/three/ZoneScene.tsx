import { SensitiveText } from "@/privacy/EvidenceMode";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { InstancedMesh } from "three";
import { LocateFixed } from "lucide-react";
import { resolveLocationVisualState } from "@/domain/location";
import { useRole } from "@/context/RoleContext";
import {
  buildZoneModel,
  CARGO_LABEL,
  LABEL_STRIP,
  MAX_STACK_HEIGHT,
  PAD_SIZE,
  type CargoKind,
  type ZoneCell,
  type ZoneLocationInput,
  type ZoneModel,
} from "./zoneLayout";
import {
  floorPlaneGeometry,
  modelGeometry,
  pointerGeometry,
  sharedCargoMaterial,
  sharedPadMaterial,
  sharedPickMaterial,
  unitBoxEdgesGeometry,
  unitBoxGeometry,
} from "./cargoModels";
import { createFloorLabelTexture, type FloorLabel } from "./floorLabels";
import { deviceQualityProfile, sceneDpr } from "./sceneQuality";
import {
  CAMERA_FOV,
  fitCamera,
  instanceCapacity,
  watchContextLoss,
  writeBoxInstances,
  writeFlatInstances,
  writeInstanceColors,
  type SceneBounds,
} from "./sceneSetup";
import { SCENE_BACKGROUND, SCENE_COLORS } from "./sceneColors";

export interface SceneLocation {
  id: string;
  codigo: string;
  estado?: string;
  ocupacion_actual?: number;
  ocupacionActual?: number;
  capacidad_maxima?: number;
  capacidadMax?: number;
  layout?: {
    x?: number;
    y?: number;
    z?: number;
    width?: number;
    height?: number;
    depth?: number;
    posicion_col?: number;
    posicion_fila?: number;
    [key: string]: unknown;
  };
  posicion_col?: number;
  posicion_fila?: number;
  posicionCol?: number;
  posicionFila?: number;
  layoutX?: number | null;
  layoutZ?: number | null;
  item_nombre?: string;
  producto?: string | null;
  categoria?: string | null;
  tipoProductoPermitido?: string;
  unidadMedida?: string;
  unidad_capacidad?: string;
  lote_principal?: string;
  lote?: string | null;
  atributos?: Record<string, unknown>;
}

interface Props {
  locations: SceneLocation[];
  selectedId: string | null;
  onSelect: (location: SceneLocation) => void;
  highlightedId?: string | null;
  /** Se llama si el contexto gráfico se pierde y no vuelve: conviene pasar a la vista 2D. */
  onUnavailable?: () => void;
}

const occupancyOf = (location: SceneLocation) => ({
  ocupacion_actual: Number(location.ocupacion_actual ?? location.ocupacionActual ?? 0),
  capacidad_maxima: Number(location.capacidad_maxima ?? location.capacidadMax ?? 100),
  estado: location.estado,
});

const itemNameOf = (location: SceneLocation) => location.item_nombre ?? location.producto ?? null;

function toLayoutInput(location: SceneLocation): ZoneLocationInput {
  const { ocupacion_actual, capacidad_maxima } = occupancyOf(location);
  const allowed = location.tipoProductoPermitido ?? location.atributos?.tipo_producto_permitido;
  return {
    id: location.id,
    codigo: location.codigo,
    ratio: capacidad_maxima > 0 ? ocupacion_actual / capacidad_maxima : 0,
    fila: location.posicionFila ?? location.posicion_fila ?? location.layout?.posicion_fila ?? null,
    col: location.posicionCol ?? location.posicion_col ?? location.layout?.posicion_col ?? null,
    x: location.layoutX ?? location.layout?.x ?? null,
    z: location.layoutZ ?? location.layout?.z ?? null,
    categoria: location.categoria ?? (typeof location.atributos?.categoria === "string" ? location.atributos.categoria : null),
    tipoProducto: allowed === undefined || allowed === null ? null : String(allowed),
    nombre: itemNameOf(location),
    unidad: location.unidadMedida ?? location.unidad_capacidad ?? null,
  };
}

// ---------------------------------------------------------------------------
// Piezas de la escena (dentro del Canvas)
// ---------------------------------------------------------------------------

/** Una sola malla instanciada para todas las cajas (o sacos, tambores...) de la zona. */
const BoxInstances = ({ geometryName, packed }: { geometryName: CargoKind; packed: Float32Array }) => {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const capacity = instanceCapacity(packed.length / 6);

  useLayoutEffect(() => {
    if (!ref.current) return;
    writeBoxInstances(ref.current, packed);
    invalidate();
  }, [packed, capacity, invalidate]);

  return <instancedMesh key={capacity} ref={ref} args={[modelGeometry(geometryName), sharedCargoMaterial(), capacity]} dispose={null} />;
};

const PalletInstances = ({ packed, simple }: { packed: Float32Array; simple: boolean }) => {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const capacity = instanceCapacity(packed.length / 2);

  useLayoutEffect(() => {
    if (!ref.current) return;
    writeFlatInstances(ref.current, packed);
    invalidate();
  }, [packed, capacity, simple, invalidate]);

  return (
    <instancedMesh
      key={`${capacity}-${simple}`}
      ref={ref}
      args={[modelGeometry(simple ? "palletSimple" : "pallet"), sharedCargoMaterial(), capacity]}
      dispose={null}
    />
  );
};

/** Baldosas de piso: una instancia por ubicación, pintada con su color de estado. */
const StatusPads = ({ cells, colors }: { cells: ZoneCell[]; colors: string[] }) => {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const capacity = instanceCapacity(cells.length);
  const packed = useMemo(() => {
    const values = new Float32Array(cells.length * 6);
    cells.forEach((cell, index) => values.set([cell.x, 0, cell.z, PAD_SIZE, 1, PAD_SIZE], index * 6));
    return values;
  }, [cells]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    writeBoxInstances(ref.current, packed);
    writeInstanceColors(ref.current, colors);
    invalidate();
  }, [packed, colors, capacity, invalidate]);

  return <instancedMesh key={capacity} ref={ref} args={[floorPlaneGeometry(), sharedPadMaterial(), capacity]} dispose={null} />;
};

/** Volúmenes invisibles para el puntero: uno por ubicación, no uno por unidad de carga. */
const PickVolumes = ({
  cells,
  onHover,
  onPick,
}: {
  cells: ZoneCell[];
  onHover: (index: number | null) => void;
  onPick: (index: number) => void;
}) => {
  const ref = useRef<InstancedMesh>(null);
  const capacity = instanceCapacity(cells.length);
  const packed = useMemo(() => {
    const values = new Float32Array(cells.length * 6);
    cells.forEach((cell, index) => values.set([cell.x, 0, cell.z, PAD_SIZE, Math.max(0.25, cell.height), PAD_SIZE], index * 6));
    return values;
  }, [cells]);

  useLayoutEffect(() => {
    if (ref.current) writeBoxInstances(ref.current, packed);
  }, [packed, capacity]);

  useEffect(() => () => { document.body.style.cursor = "default"; }, []);

  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[unitBoxGeometry(), sharedPickMaterial(), capacity]}
      dispose={null}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        if (event.instanceId === undefined) return;
        onHover(event.instanceId);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "default";
      }}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        // Un arrastre para girar la cámara no cuenta como selección.
        if (event.delta > 6 || event.instanceId === undefined) return;
        onPick(event.instanceId);
      }}
    />
  );
};

/** Códigos de ubicación pintados en el piso con una única textura. */
const FloorCodes = ({ model, maxSize }: { model: ZoneModel; maxSize: number }) => {
  const invalidate = useThree((state) => state.invalidate);
  const texture = useMemo(() => {
    const labels: FloorLabel[] = model.cells.map((cell) => ({
      text: cell.codigo,
      x: cell.x,
      z: cell.z + LABEL_STRIP.centerZ,
      width: PAD_SIZE * 0.94,
      height: LABEL_STRIP.depth,
    }));
    return createFloorLabelTexture(labels, { width: model.width, depth: model.depth }, maxSize);
  }, [model, maxSize]);

  useEffect(() => {
    invalidate();
    return () => texture?.dispose();
  }, [texture, invalidate]);

  if (!texture) return null;
  return (
    <mesh geometry={floorPlaneGeometry()} position={[0, 0.012, 0]} scale={[model.width, 1, model.depth]} dispose={null}>
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

const CellFrame = ({ cell, color }: { cell: ZoneCell; color: string }) => (
  <lineSegments
    geometry={unitBoxEdgesGeometry()}
    position={[cell.x, 0.004, cell.z]}
    scale={[PAD_SIZE, Math.max(0.3, cell.height) + 0.04, PAD_SIZE]}
    dispose={null}
  >
    <lineBasicMaterial color={color} toneMapped={false} />
  </lineSegments>
);

const CellTag = ({ cell, location, percent, accent }: { cell: ZoneCell; location: SceneLocation; percent: number; accent: boolean }) => {
  const itemName = itemNameOf(location);
  const lot = location.lote_principal ?? location.lote;
  return (
    <Html position={[cell.x, Math.max(0.3, cell.height) + 0.5, cell.z]} center zIndexRange={[20, 0]}>
      <div
        className={`px-2 py-1 rounded text-[11px] leading-tight text-white whitespace-nowrap pointer-events-none shadow-lg ${
          accent ? "bg-sky-600 ring-2 ring-white" : "bg-black/85 border border-white/10"
        }`}
      >
        <div className="font-bold">{cell.codigo} · {percent}%</div>
        {itemName && (
          <div className="font-normal opacity-90">
            <SensitiveText category="Dato" value={itemName} />{lot ? ` · ${lot}` : ""}
          </div>
        )}
        {cell.kind && <div className="font-normal opacity-75">{CARGO_LABEL[cell.kind]}</div>}
      </div>
    </Html>
  );
};

interface ControlsLike {
  target: { set: (x: number, y: number, z: number) => void };
  minDistance: number;
  maxDistance: number;
  update: () => void;
}

/** Encuadra la zona completa al cargar, al cambiar su tamaño y al pedir "centrar". */
export const CameraRig = ({ bounds, resetSignal }: { bounds: SceneBounds; resetSignal: number }) => {
  const get = useThree((state) => state.get);
  const controls = useThree((state) => state.controls) as unknown as ControlsLike | null;
  const { width, depth, height } = bounds;

  useLayoutEffect(() => {
    const { camera, size, invalidate } = get();
    const fit = fitCamera({ width, depth, height }, size.width / Math.max(1, size.height));
    camera.position.set(...fit.position);
    camera.near = fit.near;
    camera.far = fit.far;
    camera.lookAt(...fit.target);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(...fit.target);
      controls.minDistance = fit.minDistance;
      controls.maxDistance = fit.maxDistance;
      controls.update();
    }
    invalidate();
  }, [get, controls, width, depth, height, resetSignal]);

  return null;
};

/** Controles de cámara. Avisa cuándo se mueve para bajar la resolución en gama baja. */
export const SceneControls = ({ onMovingChange }: { onMovingChange?: (moving: boolean) => void }) => (
  <OrbitControls
    makeDefault
    enableDamping={false}
    screenSpacePanning={false}
    maxPolarAngle={Math.PI / 2.08}
    onStart={onMovingChange ? () => onMovingChange(true) : undefined}
    onEnd={onMovingChange ? () => onMovingChange(false) : undefined}
  />
);

export const ContextRecovery = ({ onUnavailable }: { onUnavailable?: () => void }) => {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const latest = useRef(onUnavailable);
  latest.current = onUnavailable;

  useEffect(
    () => watchContextLoss(gl.domElement, { onRestored: () => invalidate(), onUnrecoverable: () => latest.current?.() }),
    [gl, invalidate],
  );
  return null;
};

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

export const ZoneScene = ({ locations, selectedId, onSelect, highlightedId, onUnavailable }: Props) => {
  const { organizacion } = useRole();
  const profile = useMemo(deviceQualityProfile, []);
  const [hovered, setHovered] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [moving, setMoving] = useState(false);

  const model = useMemo(
    () => buildZoneModel(locations.map(toLayoutInput), { triangleBudget: profile.cargoTriangleBudget }),
    [locations, profile],
  );
  const visuals = useMemo(
    () => locations.map((location) => resolveLocationVisualState(occupancyOf(location), organizacion.configuracion)),
    [locations, organizacion.configuracion],
  );
  const padColors = useMemo(() => visuals.map((visual) => visual.color), [visuals]);
  const indexById = useMemo(() => new Map(model.cells.map((cell) => [cell.id, cell.index])), [model]);

  const selectedIndex = selectedId ? indexById.get(selectedId) ?? null : null;
  const highlightedIndex = highlightedId ? indexById.get(highlightedId) ?? null : null;
  const hoveredIndex = hovered !== null && hovered < model.cells.length ? hovered : null;
  const tagged = [...new Set([highlightedIndex, selectedIndex, hoveredIndex].filter((index): index is number => index !== null))];
  const bounds = useMemo<SceneBounds>(() => ({ width: model.width, depth: model.depth, height: MAX_STACK_HEIGHT }), [model.width, model.depth]);
  const highlighted = highlightedIndex !== null ? model.cells[highlightedIndex] : null;

  return (
    <div
      className="w-full h-[min(600px,70vh)] min-h-[320px] rounded-lg overflow-hidden border border-border relative"
      style={{ background: SCENE_BACKGROUND }}
      data-testid="zone-scene"
      data-detail={model.detail.level}
    >
      <Canvas
        frameloop="demand"
        flat
        dpr={sceneDpr(profile, moving)}
        gl={{ antialias: profile.antialias }}
        camera={{ fov: CAMERA_FOV, position: [6, 6, 8] }}
        onPointerMissed={() => setHovered(null)}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[6, 12, 8]} intensity={1.6} />

        <mesh geometry={floorPlaneGeometry()} position={[0, -0.02, 0]} scale={[model.width + 1.2, 1, model.depth + 1.2]} dispose={null}>
          <meshBasicMaterial color={SCENE_COLORS.floor} toneMapped={false} />
        </mesh>

        <StatusPads cells={model.cells} colors={padColors} />
        <FloorCodes model={model} maxSize={profile.labelTextureSize} />
        <PalletInstances packed={model.pallets} simple={model.detail.simplePallet} />
        {model.kinds.map((kind) => (
          <BoxInstances key={kind} geometryName={kind} packed={model.cargo[kind]} />
        ))}
        <PickVolumes
          cells={model.cells}
          onHover={setHovered}
          onPick={(index) => onSelect(locations[index])}
        />

        {tagged.map((index) => (
          <CellFrame
            key={`frame-${model.cells[index].id}`}
            cell={model.cells[index]}
            color={index === highlightedIndex ? SCENE_COLORS.highlight : SCENE_COLORS.focus}
          />
        ))}
        {tagged.map((index) => (
          <CellTag
            key={`tag-${model.cells[index].id}`}
            cell={model.cells[index]}
            location={locations[index]}
            percent={visuals[index].porcentaje}
            accent={index === highlightedIndex}
          />
        ))}
        {highlighted && (
          <mesh
            geometry={pointerGeometry()}
            position={[highlighted.x, Math.max(0.3, highlighted.height) + 0.95, highlighted.z]}
            dispose={null}
          >
            <meshBasicMaterial color={SCENE_COLORS.highlight} toneMapped={false} />
          </mesh>
        )}

        <SceneControls onMovingChange={profile.movingDpr < profile.maxDpr ? setMoving : undefined} />
        <CameraRig bounds={bounds} resetSignal={resetSignal} />
        <ContextRecovery onUnavailable={onUnavailable} />
      </Canvas>

      <button
        type="button"
        onClick={() => setResetSignal((value) => value + 1)}
        className="absolute top-3 right-3 h-9 px-3 rounded-md bg-black/60 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-black/80 focus:outline focus:outline-2 focus:outline-white"
      >
        <LocateFixed className="h-4 w-4" /> Centrar vista
      </button>

      {(model.kinds.length > 0 || model.detail.level !== "unidades") && (
        <div className="absolute left-3 bottom-3 max-w-[calc(100%-1.5rem)] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-black/60 px-2.5 py-1.5 text-[11px] text-white pointer-events-none">
          {model.kinds.map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CARGO_SWATCH[kind] }} />
              {CARGO_LABEL[kind]}
            </span>
          ))}
          <span className="opacity-80">Altura de la pila = ocupación</span>
          {model.detail.level !== "unidades" && <span className="opacity-80">· Vista simplificada</span>}
        </div>
      )}
    </div>
  );
};

/** Color representativo de cada modelo, para la leyenda. */
const CARGO_SWATCH: Record<CargoKind, string> = {
  caja: "#b9844f",
  saco: "#e2d2a8",
  tambor: "#2f6fb0",
  granel: "#f4f2ec",
};
