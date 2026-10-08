import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  RepeatWrapping,
  Vector3,
} from 'three';
import { ELEVATOR_CENTERS, journeyFov, journeyPose, type Point3 } from './pose';

export interface JourneySceneProps {
  progress: number;
  quality?: 'high' | 'low';
  onReady?: () => void;
}

const cube = new BoxGeometry(1, 1, 1);
type MaterialSet = ReturnType<typeof makeMaterials>;

/** Seeded grain is generated locally: no image requests, fonts or CDN dependencies. */
function grainTexture(): CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.fillStyle = '#b8b8b8';
  context.fillRect(0, 0, 128, 256);
  let seed = 3916;
  for (let x = 0; x < 128; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 145 + (seed % 65);
    context.strokeStyle = `rgba(${value},${value},${value},0.42)`;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 256);
    context.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

function makeMaterials() {
  const grain = grainTexture();
  return {
    stone: new MeshStandardMaterial({ color: '#c8c1b2', roughness: 0.64 }),
    floor: new MeshStandardMaterial({ color: '#b4ac9b', roughness: 0.27, metalness: 0.08 }),
    ceiling: new MeshStandardMaterial({ color: '#e6dcc6', roughness: 0.83 }),
    dark: new MeshStandardMaterial({ color: '#17232b', roughness: 0.42, metalness: 0.25 }),
    wood: new MeshStandardMaterial({ color: '#523a2b', roughness: 0.72 }),
    brass: new MeshStandardMaterial({ color: '#a98c55', metalness: 0.75, roughness: 0.31 }),
    steel: new MeshStandardMaterial({
      color: '#bcc6c8',
      metalness: 0.86,
      roughness: 0.39,
      bumpMap: grain,
      bumpScale: 0.009,
    }),
    rail: new MeshStandardMaterial({ color: '#77868d', metalness: 0.84, roughness: 0.26 }),
    glass: new MeshStandardMaterial({
      color: '#9dbfcf',
      metalness: 0.36,
      roughness: 0.15,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    }),
    facade: new MeshStandardMaterial({
      color: '#ffffff',
      metalness: 0.28,
      roughness: 0.24,
      emissive: '#506982',
      emissiveIntensity: 0.07,
    }),
    light: new MeshStandardMaterial({
      color: '#ffe4b4',
      emissive: '#ffcd83',
      emissiveIntensity: 3,
      toneMapped: false,
    }),
    city: new MeshStandardMaterial({ color: '#182635', roughness: 0.82, metalness: 0.2 }),
    paving: new MeshStandardMaterial({ color: '#28333b', roughness: 0.69 }),
    leaf: new MeshStandardMaterial({ color: '#253d30', roughness: 0.95 }),
  };
}

function Block({
  position,
  scale,
  material,
  rotation,
}: {
  position: Point3;
  scale: Point3;
  material: MeshStandardMaterial;
  rotation?: Point3;
}) {
  return (
    <mesh
      geometry={cube}
      position={position}
      scale={scale}
      material={material}
      rotation={rotation}
      receiveShadow
    />
  );
}

function FacadePanels({ materials }: { materials: MaterialSet }) {
  const ref = useRef<InstancedMesh>(null);
  const panels = useMemo(() => {
    const result: { position: Point3; scale: Point3; color: string }[] = [];
    for (let floor = 0; floor < 15; floor++) {
      for (let column = 0; column < 7; column++) {
        const illuminated = (floor * 7 + column * 11) % 9 < 3;
        result.push({
          position: [-7.65 + column * 2.55, 7.5 + floor * 3.15, -0.92],
          scale: [2.35, 2.72, 0.16],
          color: illuminated ? '#d7b484' : '#4c7188',
        });
      }
      for (let column = 0; column < 5; column++) {
        result.push({
          position: [-9.02, 7.5 + floor * 3.15, -2.5 - column * 2.55],
          scale: [0.16, 2.72, 2.35],
          color: (floor + column) % 5 === 0 ? '#bf9b72' : '#4b6a7b',
        });
      }
    }
    return result;
  }, []);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new Object3D();
    panels.forEach((panel, index) => {
      object.position.fromArray(panel.position);
      object.scale.fromArray(panel.scale);
      object.updateMatrix();
      ref.current!.setMatrixAt(index, object.matrix);
      ref.current!.setColorAt(index, new Color(panel.color));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [panels]);
  return <instancedMesh ref={ref} args={[cube, materials.facade, panels.length]} />;
}

function Exterior({
  materials: m,
  entrance,
}: {
  materials: MaterialSet;
  entrance: React.RefObject<Group | null>;
}) {
  return (
    <group name="original-exterior">
      <Block position={[0, -0.21, 20]} scale={[220, 0.4, 180]} material={m.paving} />
      <Block position={[0, -0.08, 4]} scale={[38, 0.18, 18]} material={m.stone} />
      <Block position={[0, 29.4, -8.1]} scale={[18, 48.8, 14]} material={m.dark} />
      <FacadePanels materials={m} />
      {Array.from({ length: 16 }, (_, floor) => (
        <Block
          key={floor}
          position={[0, 5.84 + floor * 3.15, -8.1]}
          scale={[18.45, 0.2, 14.4]}
          material={m.rail}
        />
      ))}
      {[-9, -6.45, -3.9, -1.35, 1.2, 3.75, 6.3, 8.9].map((x) => (
        <Block key={x} position={[x, 29.4, -0.68]} scale={[0.12, 47, 0.28]} material={m.rail} />
      ))}
      <Block position={[0, 54.1, -8.1]} scale={[19.2, 0.5, 15.2]} material={m.brass} />
      {[-7.5, -2.5, 2.5, 7.5].map((x) => (
        <Block key={x} position={[x, 29.5, -0.48]} scale={[0.033, 47.7, 0.06]} material={m.light} />
      ))}
      <Block position={[5.7, 4.58, -12]} scale={[39, 0.55, 30]} material={m.stone} />
      <Block position={[0, 4.06, 1.7]} scale={[12, 0.27, 5]} material={m.dark} />
      <Block position={[0, 3.87, 3.45]} scale={[11.5, 0.05, 0.045]} material={m.light} />
      {[-5.7, 5.7].map((x) => (
        <Block key={x} position={[x, 1.99, 2.8]} scale={[0.2, 4, 0.2]} material={m.brass} />
      ))}
      {[-8.1, 8.1].map((x) => (
        <group key={x}>
          <Block position={[x, 2.05, 0.15]} scale={[11.6, 4.1, 0.07]} material={m.glass} />
          {[-4.5, -1.5, 1.5, 4.5].map((dx) => (
            <Block
              key={dx}
              position={[x + dx, 2.05, 0.1]}
              scale={[0.065, 4.1, 0.13]}
              material={m.brass}
            />
          ))}
        </group>
      ))}
      <Block position={[0, 3.9, 0]} scale={[3, 0.17, 0.22]} material={m.brass} />
      <group ref={entrance} name="sliding-entrance">
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.68, 0, 0]}>
            <Block position={[0, 1.9, 0.05]} scale={[1.34, 3.75, 0.07]} material={m.glass} />
            <Block
              position={[side * 0.64, 1.9, 0.08]}
              scale={[0.048, 3.75, 0.13]}
              material={m.brass}
            />
            <Block
              position={[-side * 0.56, 1.25, 0.15]}
              scale={[0.035, 0.5, 0.04]}
              material={m.brass}
            />
          </group>
        ))}
      </group>
      {[-6, 6].map((x) => (
        <group key={x} position={[x, 0, 3.3]}>
          <Block position={[0, 0.25, 0]} scale={[2.1, 0.5, 1.1]} material={m.dark} />
          <mesh position={[0, 0.76, 0]} scale={[1, 0.55, 0.48]} material={m.leaf}>
            <sphereGeometry args={[1, 12, 8]} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 20 }, (_, index) => {
        const side = index % 2 ? 1 : -1;
        const height = 12 + ((index * 17) % 29);
        return (
          <group key={index}>
            <Block
              position={[side * (30 + index * 2.6), height / 2, -38 - index * 4.1]}
              scale={[8 + (index % 4), height, 10]}
              material={m.city}
            />
            {[0.2, 0.45, 0.7].map((fraction) => (
              <Block
                key={fraction}
                position={[side * (30 + index * 2.6), height * fraction, -32.95 - index * 4.1]}
                scale={[5, 0.1, 0.05]}
                material={m.brass}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}

function Interior({ materials: m }: { materials: MaterialSet }) {
  return (
    <group name="connected-lobby-and-corridor">
      <Block position={[0, -0.09, -9]} scale={[4.65, 0.18, 20]} material={m.floor} />
      <Block position={[10.8, -0.09, -20.6]} scale={[26.5, 0.18, 13.5]} material={m.floor} />
      <Block position={[0, 4.25, -8]} scale={[4.7, 0.2, 17]} material={m.ceiling} />
      <Block position={[10, 4.25, -20.4]} scale={[27, 0.2, 13.5]} material={m.ceiling} />
      <Block position={[-2.36, 2.1, -12.8]} scale={[0.24, 4.2, 27]} material={m.stone} />
      <Block position={[2.36, 2.1, -7.1]} scale={[0.24, 4.2, 14.3]} material={m.stone} />
      <Block position={[10.1, 2.1, -27.35]} scale={[25.3, 4.2, 0.22]} material={m.stone} />
      <Block position={[12.1, 2.1, -13.95]} scale={[19.9, 4.2, 0.22]} material={m.wood} />
      <Block position={[22.15, 2.1, -26.32]} scale={[0.5, 4.2, 2.06]} material={m.stone} />
      <Block position={[22.15, 2.1, -14.82]} scale={[0.5, 4.2, 1.76]} material={m.stone} />
      <Block position={[22.15, 3.7, -20.65]} scale={[0.5, 1, 13.4]} material={m.stone} />
      {/* Recessed skirting and cornices give contact depth without live shadow maps. */}
      <Block position={[-2.215, 0.13, -12.8]} scale={[0.035, 0.22, 27]} material={m.dark} />
      <Block position={[2.215, 0.13, -7.1]} scale={[0.035, 0.22, 14.3]} material={m.dark} />
      <Block position={[10, 0.13, -27.215]} scale={[25, 0.22, 0.035]} material={m.dark} />
      <Block position={[12.1, 0.13, -14.095]} scale={[19.9, 0.22, 0.035]} material={m.dark} />
      <Block position={[0, 2.1, -27.12]} scale={[4.4, 4.15, 0.25]} material={m.wood} />
      {[-1.99, 1.99].map((x) => (
        <Block key={x} position={[x, 4.05, -7.6]} scale={[0.05, 0.045, 15]} material={m.light} />
      ))}
      {[-26.85, -14.36].map((z) => (
        <Block key={z} position={[10, 4.05, z]} scale={[24, 0.045, 0.05]} material={m.light} />
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <group key={index}>
          <Block
            position={[0, 0.015, -index * 2.3]}
            scale={[4.4, 0.006, 0.012]}
            material={m.stone}
          />
          <Block
            position={[index * 2.7 - 1, 0.015, -20.5]}
            scale={[0.012, 0.006, 12.8]}
            material={m.stone}
          />
        </group>
      ))}
      {[-4.5, -9, -13.5].map((z) => (
        <group key={z}>
          <Block position={[-2.18, 1.82, z]} scale={[0.12, 2.5, 1.3]} material={m.wood} />
          <Block position={[-2.06, 1.9, z]} scale={[0.025, 1.65, 0.05]} material={m.light} />
          <Block position={[2.16, 1.7, z]} scale={[0.05, 2.1, 1.18]} material={m.brass} />
          <Block position={[2.1, 1.7, z]} scale={[0.04, 1.96, 1.04]} material={m.dark} />
          <Block position={[2.07, 1.7, z]} scale={[0.02, 0.88, 0.74]} material={m.stone} />
        </group>
      ))}
      {[6, 13, 19].map((x) => (
        <group key={x}>
          <Block position={[x, 3.87, -20.5]} scale={[2.5, 0.12, 2.4]} material={m.brass} />
          <Block position={[x, 3.8, -20.5]} scale={[2.2, 0.04, 2.1]} material={m.light} />
        </group>
      ))}
      <Block position={[0.2, 1.8, -26.9]} scale={[2.1, 2.7, 0.025]} material={m.brass} />
      <Block position={[0.2, 1.8, -26.87]} scale={[1.96, 2.56, 0.018]} material={m.stone} />
    </group>
  );
}

function Elevator({
  index,
  materials: m,
  doorRef,
}: {
  index: number;
  materials: MaterialSet;
  doorRef?: React.RefObject<Group | null>;
}) {
  return (
    <group
      position={[22, 0, ELEVATOR_CENTERS[index]]}
      rotation={[0, -Math.PI / 2, 0]}
      name={`elevator-${index + 1}`}
    >
      {/* These piers form one continuous wall, while the door leaves enter their pockets. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            position={[side * 0.985, 2.1, -0.35]}
            scale={[0.43, 4.2, 0.7]}
            material={m.stone}
          />
          <Block
            position={[side * 0.795, 1.43, 0.015]}
            scale={[0.13, 2.86, 0.2]}
            material={m.steel}
          />
          <Block
            position={[side * 0.81, 1.43, 0.14]}
            scale={[0.025, 2.86, 0.04]}
            material={m.brass}
          />
        </group>
      ))}
      <Block position={[0, 3.56, -0.34]} scale={[1.65, 1.29, 0.7]} material={m.stone} />
      <Block position={[0, 2.88, 0.025]} scale={[1.72, 0.15, 0.2]} material={m.steel} />
      <Block position={[0, 2.96, 0.1]} scale={[1.46, 0.026, 0.035]} material={m.light} />
      <Block position={[0, 0.035, -0.02]} scale={[1.58, 0.07, 0.48]} material={m.rail} />
      {[-0.11, -0.02, 0.07].map((z) => (
        <Block key={z} position={[0, 0.075, z]} scale={[1.53, 0.008, 0.009]} material={m.dark} />
      ))}
      <Block position={[-0.998, 1.16, 0.035]} scale={[0.11, 0.27, 0.04]} material={m.rail} />
      <mesh position={[-0.998, 1.16, 0.065]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}>
        <cylinderGeometry args={[0.03, 0.03, 0.015, 12]} />
      </mesh>
      <Block position={[-0.998, 2.35, 0.035]} scale={[0.15, 0.23, 0.04]} material={m.dark} />
      <Block position={[-0.998, 2.35, 0.061]} scale={[0.015, 0.105, 0.006]} material={m.light} />
      <group ref={doorRef} name={`door-leaves-${index + 1}`}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.37, 0, 0]}>
            <Block position={[0, 1.44, -0.08]} scale={[0.735, 2.8, 0.085]} material={m.steel} />
            <Block
              position={[-side * 0.357, 1.44, -0.03]}
              scale={[0.01, 2.8, 0.006]}
              material={m.dark}
            />
          </group>
        ))}
      </group>
      {/* Full cabin exists behind every opening, not a flat photographic reveal. */}
      <Block position={[0, 0.045, -1.51]} scale={[2.05, 0.09, 2.94]} material={m.dark} />
      <Block position={[0, 2.98, -1.55]} scale={[2.1, 0.12, 3]} material={m.ceiling} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            position={[side * 1.01, 1.52, -1.52]}
            scale={[0.1, 2.92, 2.9]}
            material={m.steel}
          />
          <Block
            position={[side * 0.94, 0.91, -1.62]}
            scale={[0.055, 0.055, 2.32]}
            material={m.rail}
          />
          <Block
            position={[side * 0.86, 2.89, -1.52]}
            scale={[0.045, 0.03, 2.72]}
            material={m.light}
          />
        </group>
      ))}
      <Block position={[0, 1.53, -3.01]} scale={[2.08, 2.97, 0.12]} material={m.steel} />
      <Block position={[0, 1.7, -2.934]} scale={[1.45, 1.82, 0.014]} material={m.dark} />
      <Block position={[0, 1.7, -2.92]} scale={[1.37, 1.74, 0.008]} material={m.rail} />
      <Block position={[0, 0.91, -2.88]} scale={[1.79, 0.055, 0.055]} material={m.rail} />
      <Block position={[0.86, 1.52, -0.65]} scale={[0.045, 0.87, 0.18]} material={m.dark} />
      {Array.from({ length: 8 }, (_, button) => (
        <mesh
          key={button}
          position={[0.828, 1.85 - button * 0.085, -0.65]}
          rotation={[0, 0, Math.PI / 2]}
          material={m.brass}
        >
          <cylinderGeometry args={[0.018, 0.018, 0.008, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function Sky() {
  return (
    <mesh>
      <sphereGeometry args={[180, 24, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        vertexShader={
          'varying vec3 vPosition; void main(){vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
        }
        fragmentShader={
          'varying vec3 vPosition; void main(){float h=clamp(normalize(vPosition).y*1.8+0.15,0.0,1.0); vec3 horizon=vec3(0.23,0.31,0.41); vec3 zenith=vec3(0.025,0.065,0.145); gl_FragColor=vec4(mix(horizon,zenith,h),1.0); }'
        }
      />
    </mesh>
  );
}

// EnvironmentPortal captures six cubemap faces in its layout effect when its
// children identity changes, even with frames=1. Keep the subtree independent
// of scroll updates so capture occurs only on mount or a quality change.
const ReflectionEnvironment = memo(function ReflectionEnvironment({
  quality,
}: Pick<JourneySceneProps, 'quality'>) {
  return (
    <Environment frames={1} resolution={quality === 'high' ? 128 : 64}>
      <Lightformer
        form="rect"
        intensity={2}
        color="#bed3ec"
        position={[-12, 9, 3]}
        scale={[16, 12, 1]}
        rotation={[0, Math.PI / 3, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1.8}
        color="#ffe1b4"
        position={[8, 8, -8]}
        scale={[12, 4, 1]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={1}
        color="#ffffff"
        position={[0, 5, 10]}
        scale={[3, 8, 1]}
      />
    </Environment>
  );
});

export default function JourneyScene({ progress, quality = 'high', onReady }: JourneySceneProps) {
  const { camera, size, gl, invalidate } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const materials = useMemo(makeMaterials, []);
  const doors = useRef<Group>(null);
  const entrance = useRef<Group>(null);
  const targetVector = useMemo(() => new Vector3(), []);
  const ready = useRef(false);
  // The scene has no autonomous animation. A requested frame applies the full
  // deterministic pose before rendering, including on seek and viewport resize.
  useLayoutEffect(() => {
    invalidate();
  }, [progress, aspect, quality, invalidate]);
  useEffect(
    () => () => {
      materials.steel.bumpMap?.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );
  useFrame(() => {
    const pose = journeyPose(progress, aspect);
    camera.position.fromArray(pose.cameraPosition);
    targetVector.fromArray(pose.target);
    camera.lookAt(targetVector);
    if (camera instanceof PerspectiveCamera) {
      const fov = journeyFov(progress, aspect);
      if (camera.fov !== fov || camera.aspect !== aspect) {
        camera.fov = fov;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      if (camera.near !== 0.045 || camera.far !== 250) {
        camera.near = 0.045;
        camera.far = 250;
        camera.updateProjectionMatrix();
      }
    }
    if (doors.current)
      doors.current.children.forEach((child, index) => {
        child.position.x = (index === 0 ? -1 : 1) * (0.37 + 0.76 * pose.doorOpen);
      });
    if (entrance.current)
      entrance.current.children.forEach((child, index) => {
        child.position.x = (index === 0 ? -1 : 1) * (0.68 + 1.45 * pose.entranceOpen);
      });
    gl.domElement.dataset.journeyPhase = pose.phase;
    gl.domElement.dataset.cameraPosition = pose.cameraPosition
      .map((value) => value.toFixed(3))
      .join(',');
    gl.domElement.dataset.doorOpen = pose.doorOpen.toFixed(3);
    gl.domElement.dataset.elevators = '4';
    if (!ready.current) {
      ready.current = true;
      onReady?.();
    }
  });
  return (
    <>
      <color attach="background" args={['#102338']} />
      <fog attach="fog" args={['#344856', 90, 220]} />
      <Sky />
      <ambientLight intensity={0.35} color="#d7deed" />
      <hemisphereLight args={['#b0c7e3', '#97816c', 0.85]} />
      <directionalLight position={[-28, 48, 30]} intensity={1.8} color="#c6d6ed" />
      <pointLight position={[0, 3.3, -4]} intensity={40} distance={15} decay={2} color="#ffdcad" />
      <pointLight position={[0, 3.3, -12]} intensity={34} distance={14} decay={2} color="#ffe0b5" />
      <pointLight
        position={[10, 3.5, -20.5]}
        intensity={80}
        distance={25}
        decay={2}
        color="#ffe3bc"
      />
      <pointLight
        position={[20, 3.45, -20.5]}
        intensity={45}
        distance={15}
        decay={2}
        color="#f5e1c7"
      />
      <pointLight
        position={[23.5, 2.7, -21.7]}
        intensity={14}
        distance={6}
        decay={2}
        color="#eff3fa"
      />
      <ReflectionEnvironment quality={quality} />
      <Exterior materials={materials} entrance={entrance} />
      <Interior materials={materials} />
      {ELEVATOR_CENTERS.map((_, index) => (
        <Elevator
          key={index}
          index={index}
          materials={materials}
          doorRef={index === 1 ? doors : undefined}
        />
      ))}
    </>
  );
}
