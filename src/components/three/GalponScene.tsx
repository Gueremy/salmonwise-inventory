import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Edges } from "@react-three/drei";
import * as THREE from "three";
import { Container, estadoColor } from '@/types';

interface Props {
  containers: Container[];
  selectedId: string | null;
  onSelect: (c: Container) => void;
}

const ContainerBox = ({ c, position, selected, onSelect }: { c: Container; position: [number, number, number]; selected: boolean; onSelect: () => void }) => {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = estadoColor[c.estado];

  useFrame((_, dt) => {
    if (ref.current) {
      const target = hovered || selected ? 1.08 : 1;
      ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, target, dt * 10);
      ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, target, dt * 10);
      ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, target, dt * 10);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
        <Edges color={hovered || selected ? "white" : "#ffffff33"} threshold={15} />
      </mesh>
      {/* Indicador de ocupación encima */}
      <Html position={[0, 0.9, 0]} center distanceFactor={8}>
        <div className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-black/60 backdrop-blur whitespace-nowrap pointer-events-none">
          {c.codigo} · {c.ocupacion}%
        </div>
      </Html>
      {hovered && c.producto && (
        <Html position={[0, -0.8, 0]} center>
          <div className="px-2 py-1 rounded bg-black/85 text-white text-[10px] whitespace-nowrap pointer-events-none">
            {c.producto}{c.lote && ` · ${c.lote}`}
          </div>
        </Html>
      )}
    </group>
  );
};

export const GalponScene = ({ containers, selectedId, onSelect }: Props) => {
  // 4 columnas x 5 filas
  const cols = 4;
  const spacing = 1.3;
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border" style={{ background: "hsl(var(--scene-bg))" }}>
      <Canvas camera={{ position: [6, 6, 8], fov: 40 }} shadows>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[6, 10, 6]} intensity={1} castShadow />
          <directionalLight position={[-4, 3, -4]} intensity={0.3} color="#1B6CA8" />

          {/* Suelo */}
          <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[12, 14]} />
            <meshStandardMaterial color="#1f1f3a" />
          </mesh>
          {/* Líneas guía */}
          <gridHelper args={[12, 12, "#2a2a4a", "#2a2a4a"]} position={[0, -0.54, 0]} />

          {containers.slice(0, 20).map((c, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = (col - (cols - 1) / 2) * spacing;
            const z = (row - 2) * spacing;
            return (
              <ContainerBox
                key={c.id}
                c={c}
                position={[x, 0, z]}
                selected={selectedId === c.id}
                onSelect={() => onSelect(c)}
              />
            );
          })}

          <OrbitControls enablePan={false} minDistance={5} maxDistance={18} maxPolarAngle={Math.PI / 2.1} />
        </Suspense>
      </Canvas>
    </div>
  );
};
