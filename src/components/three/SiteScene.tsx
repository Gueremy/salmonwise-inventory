import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Edges } from "@react-three/drei";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { resolveLocationVisualState } from "@/domain/location";

interface Props {
  zones: any[];
  tipo: string;
  siteName: string;
  siteId?: string;
}

const ZoneBox = ({
  zone,
  position,
  onClick,
}: {
  zone: any;
  position: [number, number, number];
  onClick: () => void;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { organizacion } = useRole();

  const ocupacion = Number(zone.ocupacion_prom ?? zone.ocupacion_promedio ?? 0);
  const visual = resolveLocationVisualState(
    { ocupacion_actual: ocupacion, capacidad_maxima: 100 },
    organizacion.configuracion,
  );

  useFrame((_, dt) => {
    if (ref.current) {
      const target = hovered ? 1.06 : 1;
      ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, target, dt * 8);
      ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, target, dt * 8);
      ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, target, dt * 8);
    }
  });

  const countUbicaciones = zone.containers ?? zone.total_ubicaciones ?? 0;

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
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
        <boxGeometry args={[2.5, 1.6, 2.5]} />
        <meshStandardMaterial color={visual.color} metalness={0.2} roughness={0.55} />
        <Edges color={hovered ? "white" : "#ffffff44"} threshold={15} />
      </mesh>
      <Html position={[0, 1.3, 0]} center distanceFactor={10}>
        <div className="px-2.5 py-1 rounded-md bg-black/75 text-white text-[11px] font-semibold whitespace-nowrap pointer-events-none backdrop-blur shadow-md border border-white/10">
          {zone.codigo} · {zone.nombre}
          <div className="text-[10px] font-normal opacity-85">
            {countUbicaciones} ubicaciones · {ocupacion}%
          </div>
        </div>
      </Html>
    </group>
  );
};

const ArchitecturalShell = ({ tipo }: { tipo: string }) => {
  // Cascarón arquitectónico según el tipo de sitio
  if (tipo === "embarcacion" || tipo === "ponton") {
    return (
      <group>
        {/* Casco flotante */}
        <mesh position={[0, -1.4, 0]}>
          <boxGeometry args={[13, 0.6, 6.5]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, -1.05, 0]}>
          <boxGeometry args={[12.5, 0.1, 6]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[11, 3.2, 5]} />
          <meshStandardMaterial color="#0284c7" transparent opacity={0.08} />
          <Edges color="#0284c7" />
        </mesh>
      </group>
    );
  }

  // Estructura para bodegas terrestres o plantas industriales
  return (
    <group>
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[15, 0.2, 7.5]} />
        <meshStandardMaterial color="#2d3250" />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[14, 3.6, 7]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.07} />
        <Edges color="#64748b" />
      </mesh>
    </group>
  );
};

export const SiteScene = ({ zones, tipo, siteName, siteId }: Props) => {
  const navigate = useNavigate();
  const spacing = 3.3;
  const offset = (zones.length - 1) / 2;

  return (
    <div
      className="w-full h-[520px] rounded-lg overflow-hidden border border-border relative"
      style={{ background: "hsl(var(--scene-bg, 222 47% 11%))" }}
    >
      <Canvas camera={{ position: [9, 7, 12], fov: 44 }} shadows>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[8, 12, 6]} intensity={1} castShadow />
          <directionalLight position={[-6, 4, -6]} intensity={0.3} color="#0284c7" />

          <ArchitecturalShell tipo={tipo} />

          {zones.map((z, i) => (
            <ZoneBox
              key={z.id}
              zone={z}
              position={[(i - offset) * spacing, -0.3, 0]}
              onClick={() => {
                if (siteId) {
                  navigate(`/sites/${siteId}/zones/${z.id}`);
                } else {
                  navigate(`/zones/${z.id}`);
                }
              }}
            />
          ))}

          {/* Rótulo del Sitio */}
          <Html position={[0, 3.1, 0]} center>
            <div className="px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap shadow-xl border border-white/20">
              {siteName}
            </div>
          </Html>

          <OrbitControls enablePan={false} minDistance={7} maxDistance={26} maxPolarAngle={Math.PI / 2.05} />
        </Suspense>
      </Canvas>
    </div>
  );
};
