import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Edges } from "@react-three/drei";
import * as THREE from "three";
import { Location, resolveLocationVisualState } from "@/domain/location";
import { useRole } from "@/context/RoleContext";

interface Props {
  locations: Location[] | any[];
  selectedId: string | null;
  onSelect: (location: any) => void;
  highlightedId?: string | null;
}

const LocationBox = ({
  location,
  position,
  dimensions = [1, 1, 1],
  selected,
  highlighted,
  onSelect,
}: {
  location: any;
  position: [number, number, number];
  dimensions?: [number, number, number];
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { organizacion } = useRole();

  const visual = resolveLocationVisualState(
    {
      ocupacion_actual: Number(location.ocupacion_actual ?? location.ocupacionActual ?? 0),
      capacidad_maxima: Number(location.capacidad_maxima ?? location.capacidadMax ?? 100),
      estado: location.estado,
    },
    organizacion.configuracion,
  );

  const isFocused = hovered || selected || highlighted;

  useFrame((_, dt) => {
    if (ref.current) {
      const target = isFocused ? 1.08 : 1;
      ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, target, dt * 10);
      ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, target, dt * 10);
      ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, target, dt * 10);
    }
  });

  const edgeColor = highlighted
    ? "#38BDF8"
    : isFocused
    ? "white"
    : "#ffffff33";

  const itemName = location.item_nombre ?? location.producto ?? location.atributos?.tipo_producto_permitido;
  const lotName = location.lote_principal ?? location.lote;

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        castShadow
      >
        <boxGeometry args={dimensions} />
        <meshStandardMaterial color={visual.color} metalness={0.25} roughness={0.5} />
        <Edges color={edgeColor} threshold={15} />
      </mesh>

      {/* Indicador de código y ocupación */}
      <Html position={[0, dimensions[1] * 0.5 + 0.35, 0]} center distanceFactor={9}>
        <div
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap pointer-events-none transition-all ${
            highlighted ? "bg-sky-600 shadow-md ring-2 ring-white" : "bg-black/65 backdrop-blur"
          }`}
        >
          {location.codigo} · {visual.porcentaje}%
        </div>
      </Html>

      {/* Tooltip en hover con contenido */}
      {hovered && itemName && (
        <Html position={[0, -dimensions[1] * 0.5 - 0.3, 0]} center>
          <div className="px-2 py-1 rounded bg-black/90 text-white text-[10px] whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
            {itemName} {lotName ? `· ${lotName}` : ""}
          </div>
        </Html>
      )}
    </group>
  );
};

export const ZoneScene = ({ locations, selectedId, onSelect, highlightedId }: Props) => {
  const cols = 4;
  const spacing = 1.35;

  return (
    <div
      className="w-full h-[600px] rounded-lg overflow-hidden border border-border relative"
      style={{ background: "hsl(var(--scene-bg, 222 47% 11%))" }}
    >
      <Canvas camera={{ position: [6, 6, 8], fov: 42 }} shadows>
        <Suspense fallback={null}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[7, 11, 7]} intensity={1} castShadow />
          <directionalLight position={[-5, 4, -4]} intensity={0.35} color="#38BDF8" />

          {/* Plano de suelo con cuadrícula guía */}
          <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[16, 16]} />
            <meshStandardMaterial color="#1a1c2e" />
          </mesh>
          <gridHelper args={[16, 16, "#2d3250", "#222538"]} position={[0, -0.54, 0]} />

          {locations.map((loc, i) => {
            // Posicionamiento dinámico si existe en layout, o distribución en grilla
            let x: number;
            let y = 0;
            let z: number;

            if (loc.layout && typeof loc.layout.x === "number" && typeof loc.layout.z === "number") {
              x = loc.layout.x;
              y = loc.layout.y ?? 0;
              z = loc.layout.z;
            } else {
              const col = i % cols;
              const row = Math.floor(i / cols);
              x = (col - (cols - 1) / 2) * spacing;
              z = (row - 2) * spacing;
            }

            const dims: [number, number, number] = [
              loc.layout?.width ?? 1,
              loc.layout?.height ?? 1,
              loc.layout?.depth ?? 1,
            ];

            return (
              <LocationBox
                key={loc.id}
                location={loc}
                position={[x, y, z]}
                dimensions={dims}
                selected={selectedId === loc.id}
                highlighted={highlightedId === loc.id}
                onSelect={() => onSelect(loc)}
              />
            );
          })}

          <OrbitControls enablePan={false} minDistance={4} maxDistance={22} maxPolarAngle={Math.PI / 2.05} />
        </Suspense>
      </Canvas>
    </div>
  );
};
