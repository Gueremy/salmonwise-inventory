import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Edges, Float } from "@react-three/drei";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";
import { InventoryGalpon, ocupacionToEstado, estadoColor, TipoSede } from "@/lib/inventory";

interface Props {
  galpones: InventoryGalpon[];
  tipo: TipoSede;
  sedeNombre: string;
}

const GalponBox = ({ g, position, onClick }: { g: InventoryGalpon; position: [number, number, number]; onClick: () => void }) => {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const estado = ocupacionToEstado(g.ocupacion_prom);
  const color = estadoColor[estado];

  useFrame((_, dt) => {
    if (ref.current) {
      const target = hovered ? 1.05 : 1;
      ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, target, dt * 8);
      ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, target, dt * 8);
      ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, target, dt * 8);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
        castShadow
      >
        <boxGeometry args={[2.4, 1.6, 2.4]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.55} />
        <Edges color={hovered ? "white" : "#ffffff44"} threshold={15} />
      </mesh>
      <Html position={[0, 1.25, 0]} center distanceFactor={10}>
        <div className="px-2 py-1 rounded-md bg-black/70 text-white text-[11px] font-semibold whitespace-nowrap pointer-events-none backdrop-blur">
          {g.codigo} · {g.nombre}
          <div className="text-[10px] font-normal opacity-80">{g.containers} containers · {g.ocupacion_prom}%</div>
        </div>
      </Html>
    </group>
  );
};

const Building = ({ tipo }: { tipo: TipoSede }) => {
  // Caja translúcida que envuelve los galpones — varía según tipo
  if (tipo === "embarcacion") {
    return (
      <group>
        {/* Casco del pontón */}
        <mesh position={[0, -1.4, 0]}>
          <boxGeometry args={[12, 0.6, 6]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, -1.05, 0]}>
          <boxGeometry args={[11.5, 0.1, 5.5]} />
          <meshStandardMaterial color="#0F4C75" />
        </mesh>
        {/* Carcasa translúcida */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[10, 3.2, 4.5]} />
          <meshStandardMaterial color="#1B6CA8" transparent opacity={0.08} />
          <Edges color="#1B6CA8" />
        </mesh>
      </group>
    );
  }
  if (tipo === "bodega") {
    return (
      <group>
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[14, 0.2, 7]} />
          <meshStandardMaterial color="#3a3a4e" />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[13, 3.6, 6.5]} />
          <meshStandardMaterial color="#9ca3af" transparent opacity={0.07} />
          <Edges color="#9ca3af" />
        </mesh>
      </group>
    );
  }
  // planta
  return (
    <group>
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[14, 0.2, 7]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[13, 3.6, 6.5]} />
        <meshStandardMaterial color="#0F4C75" transparent opacity={0.08} />
        <Edges color="#1B6CA8" />
      </mesh>
    </group>
  );
};

export const SedeScene = ({ galpones, tipo, sedeNombre }: Props) => {
  const navigate = useNavigate();
  // distribuir galpones en línea
  const spacing = 3.2;
  const offset = (galpones.length - 1) / 2;

  return (
    <div className="w-full h-[520px] rounded-lg overflow-hidden border border-border" style={{ background: "hsl(var(--scene-bg))" }}>
      <Canvas camera={{ position: [9, 7, 12], fov: 45 }} shadows>
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[8, 12, 6]} intensity={1} castShadow />
          <directionalLight position={[-6, 4, -6]} intensity={0.3} color="#1B6CA8" />

          <Building tipo={tipo} />

          {galpones.map((g, i) => (
            <GalponBox
              key={g.id}
              g={g}
              position={[(i - offset) * spacing, -0.3, 0]}
              onClick={() => navigate(`/galpon/${g.id}`)}
            />
          ))}

          {/* Etiqueta sede */}
          <Html position={[0, 3, 0]} center>
            <div className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap shadow-lg">
              {sedeNombre}
            </div>
          </Html>

          <OrbitControls enablePan={false} minDistance={8} maxDistance={25} maxPolarAngle={Math.PI / 2.1} />
        </Suspense>
      </Canvas>
    </div>
  );
};
