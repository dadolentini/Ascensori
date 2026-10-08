import { Suspense, useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import JourneyScene from '../journey/JourneyScene';
import { observeContextLoss } from '../journey/sceneLifecycle';

function RendererLifecycle({ onFailure }: { onFailure: () => void }) {
  const gl = useThree((state) => state.gl);
  // R3F deliberately loses the old context during teardown. Remove our listener
  // before that disposal so changing routes does not switch the next mount to 2D.
  useLayoutEffect(() => observeContextLoss(gl.domElement, onFailure), [gl, onFailure]);
  return null;
}
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
    >
      <RendererLifecycle onFailure={onFailure} />
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
