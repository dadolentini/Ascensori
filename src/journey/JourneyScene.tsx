import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Group,
  MeshStandardMaterial,
  PerspectiveCamera,
  RepeatWrapping,
  Vector3,
} from 'three';
import { PORTAL_POSITION, journeyFov, journeyPose, type Point3 } from './pose';
import ReferenceArchitecture from './ReferenceArchitecture';
import { PORTAL_GEOMETRY as portal } from './portalGeometry';

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
    stone: new MeshStandardMaterial({ color: '#d0c8b9', roughness: 0.62 }),
    floor: new MeshStandardMaterial({ color: '#c8bdab', roughness: 0.29, metalness: 0.05 }),
    ceiling: new MeshStandardMaterial({ color: '#ebe5d7', roughness: 0.74 }),
    dark: new MeshStandardMaterial({ color: '#17232b', roughness: 0.42, metalness: 0.25 }),
    wood: new MeshStandardMaterial({ color: '#6b4b35', roughness: 0.71 }),
    brass: new MeshStandardMaterial({ color: '#a98c55', metalness: 0.75, roughness: 0.31 }),
    steel: new MeshStandardMaterial({
      color: '#bcc6c8',
      metalness: 0.86,
      roughness: 0.39,
      bumpMap: grain,
      bumpScale: 0.009,
    }),
    rail: new MeshStandardMaterial({ color: '#8a9396', metalness: 0.61, roughness: 0.35 }),
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
      emissive: '#788894',
      emissiveIntensity: 0.15,
    }),
    light: new MeshStandardMaterial({
      color: '#ffe4b4',
      emissive: '#ffcd83',
      emissiveIntensity: 1.8,
      toneMapped: false,
    }),
    fixture: new MeshStandardMaterial({ color: '#fff4df', roughness: 0.42,
      emissive: '#ffdeb0', emissiveIntensity: 0.72 }),
    display: new MeshStandardMaterial({ color: '#e44030', roughness: 0.6,
      emissive: '#e44030', emissiveIntensity: 1.5, toneMapped: false }),
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
      <Block position={[5.7, 4.58, -12]} scale={[39, 0.55, 30]} material={m.stone} />
      <Block position={[0, 4.06, 1.7]} scale={[12, 0.27, 5]} material={m.dark} />
      <Block position={[0, 3.87, 3.45]} scale={[11.5, 0.05, 0.045]} material={m.light} />
      {[-5.7, 5.7].map((x) => (
        <Block key={x} position={[x, 1.99, 2.8]} scale={[0.2, 4, 0.2]} material={m.rail} />
      ))}
      {[-8.1, 8.1].map((x) => (
        <group key={x}>
          <Block position={[x, 2.05, 0.15]} scale={[11.6, 4.1, 0.07]} material={m.glass} />
          {[-4.5, -1.5, 1.5, 4.5].map((dx) => (
            <Block
              key={dx}
              position={[x + dx, 2.05, 0.1]}
              scale={[0.065, 4.1, 0.13]}
              material={m.rail}
            />
          ))}
        </group>
      ))}
      <Block position={[0, 3.9, 0]} scale={[3, 0.17, 0.22]} material={m.rail} />
      <group ref={entrance} name="sliding-entrance">
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.68, 0, 0]}>
            <Block position={[0, 1.9, 0.05]} scale={[1.34, 3.75, 0.07]} material={m.glass} />
            <Block
              position={[side * 0.64, 1.9, 0.08]}
              scale={[0.048, 3.75, 0.13]}
              material={m.rail}
            />
            <Block
              position={[-side * 0.56, 1.25, 0.15]}
              scale={[0.035, 0.5, 0.04]}
              material={m.rail}
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
      position={PORTAL_POSITION}
      name={`elevator-${index + 1}`}
    >
      {/* These piers form one continuous wall, while the door leaves enter their pockets. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            position={[side * portal.pierCenter, 2.1, portal.pierZ]}
            scale={[portal.pierWidth, 4.2, portal.pierDepth]}
            material={m.steel}
          />
          <Block
            position={[side * 0.795, 1.43, 0.015]}
            scale={[0.13, 2.86, 0.2]}
            material={m.steel}
          />
          <Block
            position={[side * 0.81, 1.43, 0.14]}
            scale={[0.025, 2.86, 0.04]}
            material={m.rail}
          />
        </group>
      ))}
      <Block position={[0, 3.56, -0.34]} scale={[1.65, 1.29, 0.7]} material={m.steel} />
      <Block position={[0, 2.88, 0.025]} scale={[1.72, 0.15, 0.2]} material={m.steel} />
      <Block position={[0, 0.035, -0.02]} scale={[1.58, 0.07, 0.48]} material={m.rail} />
      {[-0.11, -0.02, 0.07].map((z) => (
        <Block key={z} position={[0, 0.075, z]} scale={[1.53, 0.008, 0.009]} material={m.dark} />
      ))}
      <Block position={[-0.998, 1.16, 0.035]} scale={[0.11, 0.27, 0.04]} material={m.rail} />
      <mesh position={[-0.998, 1.16, 0.065]} rotation={[Math.PI / 2, 0, 0]} material={m.rail}>
        <cylinderGeometry args={[0.03, 0.03, 0.015, 12]} />
      </mesh>
      <Block position={[-0.998, 2.35, 0.035]} scale={[0.15, 0.23, 0.04]} material={m.rail} />
      <Block position={[-0.998, 2.35, 0.06]} scale={[0.11, 0.18, 0.008]} material={m.dark} />
      <Block position={[-0.998, 2.35, 0.067]} scale={[0.018, 0.105, 0.006]} material={m.display} />
      <group ref={doorRef} name={`door-leaves-${index + 1}`}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * portal.leafClosedCenter, 0, 0]}>
            <Block position={[0, 1.44, portal.leafFront - 0.085 / 2]} scale={[portal.leafWidth, 2.8, 0.085]} material={m.steel} />
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
            position={[side * 0.86, 2.89, -1.52]}
            scale={[0.045, 0.03, 2.72]}
            material={m.light}
          />
        </group>
      ))}
      <Block position={[0, 1.53, -3.01]} scale={[2.08, 2.97, 0.12]} material={m.steel} />
      {[-0.48, 0.48].map((x) => (
        <group key={x}>
          <Block position={[x, 1.59, -2.928]} scale={[0.79, 2.23, 0.025]} material={m.rail} />
          <Block position={[x, 1.59, -2.909]} scale={[0.69, 2.12, 0.009]} material={m.dark} />
        </group>
      ))}
      <Block position={[0.62, 2.67, -0.22]} scale={[0.18, 0.26, 0.022]} material={m.rail} />
      {Array.from({ length: 5 }, (_, i) => <Block key={i} position={[0.62, 2.59 + i * 0.043, -0.202]}
        scale={[0.14, 0.012, 0.009]} material={m.dark} />)}
      {Array.from({ length: 19 }, (_, i) => <Block key={i} position={[-0.9 + i * 0.1, 0.098, -1.51]}
        scale={[0.028, 0.005, 2.8]} material={m.rail} />)}
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
        child.position.x = (index === 0 ? -1 : 1) * (portal.leafClosedCenter + portal.leafTravel * pose.doorOpen);
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
    gl.domElement.dataset.elevators = '1';
    gl.domElement.dataset.architecture = 'reference-constrained';
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
      <pointLight position={[0, 3.3, -4]} intensity={55} distance={18} decay={2} color="#ffdcad" />
      <pointLight position={[0, 3.3, -10]} intensity={48} distance={17} decay={2} color="#ffe0b5" />
      <pointLight
        position={[-3.5, 3.5, -13.5]}
        intensity={32}
        distance={13}
        decay={2}
        color="#ffe3bc"
      />
      <pointLight
        position={[0, 3.45, -15.5]}
        intensity={24}
        distance={10}
        decay={2}
        color="#f5e1c7"
      />
      <pointLight
        position={[0, 2.7, -18]}
        intensity={14}
        distance={6}
        decay={2}
        color="#eff3fa"
      />
      <ReflectionEnvironment quality={quality} />
      <Exterior materials={materials} entrance={entrance} />
      <ReferenceArchitecture materials={materials} />
      <Elevator index={0} materials={materials} doorRef={doors} />
    </>
  );
}
