import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry, Color, ExtrudeGeometry, InstancedMesh, Object3D,
  Path, Shape, type MeshStandardMaterial,
} from 'three';
import { buildReferenceArchitecture, type ArchitecturalBox, type ArchitectureMaterial } from './architecture';

export type ReferenceMaterials = Record<ArchitectureMaterial, MeshStandardMaterial> & {
  fixture: MeshStandardMaterial;
};

function SurfaceBatch({ boxes, material, geometry }: {
  boxes: ArchitecturalBox[]; material: MeshStandardMaterial; geometry: BoxGeometry;
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new Object3D(), color = new Color();
    boxes.forEach((box, index) => {
      transform.position.fromArray(box.position);
      transform.scale.fromArray(box.scale);
      transform.updateMatrix();
      mesh.current!.setMatrixAt(index, transform.matrix);
      if (box.color) mesh.current!.setColorAt(index, color.set(box.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [boxes]);
  return <instancedMesh ref={mesh} args={[geometry, material, boxes.length]} dispose={null} />;
}

/** Organic hollow suspension inspired by the lobby frame, not a flat square panel. */
function pendantGeometry() {
  const shape = new Shape();
  shape.moveTo(-1.12, 0);
  shape.bezierCurveTo(-1.2, 0.75, -0.3, 0.95, 0.52, 0.66);
  shape.bezierCurveTo(0.92, 0.5, 1.44, 0.31, 1.2, -0.12);
  shape.bezierCurveTo(1.01, -0.6, 0.35, -0.4, -0.03, -0.58);
  shape.bezierCurveTo(-0.35, -0.86, -1.02, -0.85, -1.12, 0);
  const hole = new Path();
  hole.absellipse(0.18, 0.08, 0.54, 0.29, 0, Math.PI * 2, true, 0.12);
  shape.holes.push(hole);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1,
    bevelSize: 0.028, bevelThickness: 0.022, curveSegments: 20,
  });
  geometry.center();
  return geometry;
}

const ReferenceArchitecture = memo(function ReferenceArchitecture({ materials }: {
  materials: ReferenceMaterials;
}) {
  const layout = useMemo(buildReferenceArchitecture, []);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const pendant = useMemo(pendantGeometry, []);
  const batches = useMemo(() => {
    const groups = new Map<ArchitectureMaterial, ArchitecturalBox[]>();
    for (const box of layout.boxes) {
      if (!groups.has(box.material)) groups.set(box.material, []);
      groups.get(box.material)!.push(box);
    }
    return [...groups];
  }, [layout]);
  useEffect(() => () => { geometry.dispose(); pendant.dispose(); }, [geometry, pendant]);
  return (
    <group name="reference-constrained-architecture">
      {batches.map(([material, boxes]) => <SurfaceBatch key={material} boxes={boxes}
        material={materials[material]} geometry={geometry} />)}
      {layout.columns.map((position, index) => (
        <group key={index} position={position} name={`round-lobby-column-${index + 1}`}>
          <mesh material={materials.ceiling}>
            <cylinderGeometry args={[0.43, 0.46, 4.1, 24]} />
          </mesh>
          <mesh position={[0, 1.77, 0]} scale={[1.08, 0.4, 1.08]} material={materials.ceiling}>
            <sphereGeometry args={[0.48, 20, 12]} />
          </mesh>
          <mesh position={[0, -2.027, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.74, 24]} />
            <meshBasicMaterial color="#343128" transparent opacity={0.12} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {layout.pendants.map((lamp, index) => (
        <group key={index} position={lamp.position} rotation={[0, lamp.yaw, 0]} scale={lamp.scale}
          name={`organic-lobby-pendant-${index + 1}`}>
          <mesh geometry={pendant} rotation={[-Math.PI / 2, 0, 0]} material={materials.fixture} dispose={null} />
          <mesh position={[0, 0.34, 0]} material={materials.rail}>
            <cylinderGeometry args={[0.007, 0.007, 0.63, 6]} />
          </mesh>
        </group>
      ))}
      {[-4.8, 4.8].map((x) => (
        <group key={x} position={[x, 0, -2.8]} name="lobby-planter">
          <mesh position={[0, 0.31, 0]} material={materials.ceiling}>
            <cylinderGeometry args={[0.27, 0.21, 0.62, 16]} />
          </mesh>
          {[[-0.08, 0.91, 0], [0.19, 1.13, -0.06], [-0.15, 1.27, 0.06]].map((position, i) => (
            <mesh key={i} position={position as [number, number, number]} scale={[0.25, 0.55, 0.13]} material={materials.leaf}>
              <sphereGeometry args={[1, 12, 8]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
});
export default ReferenceArchitecture;
