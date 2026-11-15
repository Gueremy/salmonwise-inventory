import { SensitiveText } from "@/privacy/EvidenceMode";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { InstancedMesh } from "three";
import { LocateFixed } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { resolveLocationVisualState } from "@/domain/location";
import { buildSiteModel, clampPercent, SITE_LABEL_STRIP, ZONE_BLOCK, type SiteBlock, type SiteModel } from "./siteLayout";
import {
  floorPlaneGeometry,
  mergedBoxEdges,
  sharedBlockMaterial,
  sharedPickMaterial,
  unitBoxEdgesGeometry,
  unitBoxGeometry,
} from "./cargoModels";
import { createFloorLabelTexture, type FloorLabel } from "./floorLabels";
import { deviceQualityProfile, sceneDpr } from "./sceneQuality";
import { CAMERA_FOV, instanceCapacity, writeBoxInstances, writeInstanceColors, type SceneBounds } from "./sceneSetup";
import { SCENE_BACKGROUND, SCENE_COLORS } from "./sceneColors";
import { CameraRig, ContextRecovery, SceneControls } from "./ZoneScene";

export interface SceneZone {
  id: string;
  codigo: string;
  nombre?: string;
  ocupacion_prom?: number;
  ocupacion_promedio?: number;
  containers?: number;
  total_ubicaciones?: number;
}

interface Props {
  zones: SceneZone[];
  tipo: string;
  siteName: string;
  siteId?: string;
  /** Se llama si el contexto gráfico se pierde y no vuelve. */
  onUnavailable?: () => void;
}

const percentOf = (zone: SceneZone) => clampPercent(Number(zone.ocupacion_prom ?? zone.ocupacion_promedio ?? 0));
const formatPercent = (value: number) => `${Math.round(value * 10) / 10}%`;
const locationsOf = (zone: SceneZone) => zone.containers ?? zone.total_ubicaciones ?? 0;

const blockBox = (block: SiteBlock, height: number) => [block.x, 0, block.z, ZONE_BLOCK.size, height, ZONE_BLOCK.size];

/** Relleno de cada zona: una malla instanciada, con el color de estado por instancia. */
const FillBlocks = ({ blocks, colors }: { blocks: SiteBlock[]; colors: string[] }) => {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const capacity = instanceCapacity(blocks.length);
  const packed = useMemo(() => Float32Array.from(blocks.flatMap((block) => blockBox(block, block.fillHeight))), [blocks]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    writeBoxInstances(ref.current, packed);
    writeInstanceColors(ref.current, colors);
    invalidate();
  }, [packed, colors, capacity, invalidate]);

  return <instancedMesh key={capacity} ref={ref} args={[unitBoxGeometry(), sharedBlockMaterial(), capacity]} dispose={null} />;
};

/** Contorno de la capacidad total de cada zona, todos en una sola geometría. */
const CapacityFrames = ({ blocks }: { blocks: SiteBlock[] }) => {
  const geometry = useMemo(() => mergedBoxEdges(blocks.flatMap((block) => blockBox(block, ZONE_BLOCK.height))), [blocks]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry} dispose={null}>
      <lineBasicMaterial color={SCENE_COLORS.frame} transparent opacity={0.55} toneMapped={false} />
    </lineSegments>
  );
};

const PickBlocks = ({
  blocks,
  onHover,
  onPick,
}: {
  blocks: SiteBlock[];
  onHover: (index: number | null) => void;
  onPick: (index: number) => void;
}) => {
  const ref = useRef<InstancedMesh>(null);
  const capacity = instanceCapacity(blocks.length);
  const packed = useMemo(() => Float32Array.from(blocks.flatMap((block) => blockBox(block, ZONE_BLOCK.height))), [blocks]);

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
        if (event.delta > 6 || event.instanceId === undefined) return;
        onPick(event.instanceId);
      }}
    />
  );
};

/** Código y ocupación de cada zona pintados en el piso con una única textura. */
const ZoneCodes = ({ model, texts, maxSize }: { model: SiteModel; texts: string[]; maxSize: number }) => {
  const invalidate = useThree((state) => state.invalidate);
  const texture = useMemo(() => {
    const labels: FloorLabel[] = model.blocks.map((block, index) => ({
      text: texts[index],
      x: block.x,
      z: block.z + SITE_LABEL_STRIP.offsetZ,
      width: ZONE_BLOCK.size * 1.2,
      height: SITE_LABEL_STRIP.depth,
    }));
    return createFloorLabelTexture(labels, { width: model.floorWidth, depth: model.floorDepth }, maxSize);
  }, [model, texts, maxSize]);

  useEffect(() => {
    invalidate();
    return () => texture?.dispose();
  }, [texture, invalidate]);

  if (!texture) return null;
  return (
    <mesh geometry={floorPlaneGeometry()} position={[0, 0.012, 0]} scale={[model.floorWidth, 1, model.floorDepth]} dispose={null}>
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

/** Cascarón del sitio: casco y cubierta para pontones y embarcaciones; losa para bodegas y plantas. */
const SiteShell = ({ model }: { model: SiteModel }) => {
  if (model.shell === "flotante") {
    return (
      <group>
        <mesh geometry={unitBoxGeometry()} position={[0, -1.0, 0]} scale={[model.floorWidth + 1.4, 0.86, model.floorDepth + 0.7]} dispose={null}>
          <meshLambertMaterial color={SCENE_COLORS.hull} />
        </mesh>
        <mesh geometry={unitBoxGeometry()} position={[0, -0.14, 0]} scale={[model.floorWidth, 0.12, model.floorDepth]} dispose={null}>
          <meshLambertMaterial color={SCENE_COLORS.deck} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh geometry={unitBoxGeometry()} position={[0, -0.22, 0]} scale={[model.floorWidth, 0.2, model.floorDepth]} dispose={null}>
      <meshLambertMaterial color={SCENE_COLORS.slab} />
    </mesh>
  );
};

export const SiteScene = ({ zones, tipo, siteName, siteId, onUnavailable }: Props) => {
  const navigate = useNavigate();
  const { organizacion } = useRole();
  const profile = useMemo(deviceQualityProfile, []);
  const [hovered, setHovered] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [moving, setMoving] = useState(false);

  const model = useMemo(
    () => buildSiteModel(zones.map((zone) => ({ id: zone.id, codigo: zone.codigo, nombre: zone.nombre, ocupacion: percentOf(zone), ubicaciones: locationsOf(zone) })), tipo),
    [zones, tipo],
  );
  const colors = useMemo(
    () => zones.map((zone) => resolveLocationVisualState({ ocupacion_actual: percentOf(zone), capacidad_maxima: 100 }, organizacion.configuracion).color),
    [zones, organizacion.configuracion],
  );
  const texts = useMemo(() => zones.map((zone) => `${zone.codigo} · ${formatPercent(percentOf(zone))}`), [zones]);
  const bounds = useMemo<SceneBounds>(
    () => ({ width: model.floorWidth, depth: model.floorDepth, height: model.height }),
    [model.floorWidth, model.floorDepth, model.height],
  );

  const hoveredIndex = hovered !== null && hovered < zones.length ? hovered : null;
  const hoveredBlock = hoveredIndex !== null ? model.blocks[hoveredIndex] : null;
  const hoveredZone = hoveredIndex !== null ? zones[hoveredIndex] : null;

  return (
    <div
      className="w-full h-[min(520px,65vh)] min-h-[300px] rounded-lg overflow-hidden border border-border relative"
      style={{ background: SCENE_BACKGROUND }}
      data-testid="site-scene"
    >
      <Canvas
        frameloop="demand"
        flat
        dpr={sceneDpr(profile, moving)}
        gl={{ antialias: profile.antialias }}
        camera={{ fov: CAMERA_FOV, position: [9, 7, 12] }}
        onPointerMissed={() => setHovered(null)}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[8, 12, 6]} intensity={1.6} />

        <SiteShell model={model} />
        <FillBlocks blocks={model.blocks} colors={colors} />
        <CapacityFrames blocks={model.blocks} />
        <ZoneCodes model={model} texts={texts} maxSize={profile.labelTextureSize} />
        <PickBlocks
          blocks={model.blocks}
          onHover={setHovered}
          onPick={(index) => navigate(siteId ? `/sites/${siteId}/zones/${zones[index].id}` : `/zones/${zones[index].id}`)}
        />

        {hoveredBlock && hoveredZone && (
          <>
            <lineSegments
              geometry={unitBoxEdgesGeometry()}
              position={[hoveredBlock.x, 0.004, hoveredBlock.z]}
              scale={[ZONE_BLOCK.size + 0.06, ZONE_BLOCK.height + 0.04, ZONE_BLOCK.size + 0.06]}
              dispose={null}
            >
              <lineBasicMaterial color={SCENE_COLORS.focus} toneMapped={false} />
            </lineSegments>
            <Html position={[hoveredBlock.x, ZONE_BLOCK.height + 0.6, hoveredBlock.z]} center zIndexRange={[20, 0]}>
              <div className="px-2.5 py-1 rounded-md bg-black/85 text-white text-[11px] leading-tight whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                <div className="font-semibold">
                  {hoveredZone.codigo} · <SensitiveText category="Dato" value={hoveredZone.nombre} />
                </div>
                <div className="opacity-85">
                  {locationsOf(hoveredZone)} ubicaciones · {formatPercent(percentOf(hoveredZone))}
                </div>
              </div>
            </Html>
          </>
        )}

        <SceneControls onMovingChange={profile.movingDpr < profile.maxDpr ? setMoving : undefined} />
        <CameraRig bounds={bounds} resetSignal={resetSignal} />
        <ContextRecovery onUnavailable={onUnavailable} />
      </Canvas>

      <div className="absolute top-3 left-3 max-w-[60%] truncate px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-md pointer-events-none">
        <SensitiveText category="Dato" value={siteName} />
      </div>
      <button
        type="button"
        onClick={() => setResetSignal((value) => value + 1)}
        className="absolute top-3 right-3 h-9 px-3 rounded-md bg-black/60 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-black/80 focus:outline focus:outline-2 focus:outline-white"
      >
        <LocateFixed className="h-4 w-4" /> Centrar vista
      </button>
      <div className="absolute left-3 bottom-3 rounded-md bg-black/60 px-2.5 py-1.5 text-[11px] text-white/90 pointer-events-none">
        Altura del relleno = ocupación de la zona
      </div>
    </div>
  );
};
