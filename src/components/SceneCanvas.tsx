import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import JourneyScene from '../journey/JourneyScene';
export default function SceneCanvas({
  progress,
  onReady,
  onFailure,
}: {
  progress: number;
  onReady: () => void;
  onFailure: () => void;
}) {
  return (
    <Canvas
      frameloop="demand"
      camera={{ fov: 48, near: 0.08, far: 220 }}
      dpr={[1, window.innerWidth < 768 ? 1 : 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', onFailure, { once: true });
      }}
    >
      <Suspense fallback={null}>
        <JourneyScene
          progress={progress}
          quality={window.innerWidth < 768 ? 'low' : 'high'}
          onReady={onReady}
        />
      </Suspense>
    </Canvas>
  );
}
