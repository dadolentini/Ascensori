import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { buildReferenceArchitecture, REFERENCE_TOWER_BOUNDS } from '../src/journey/architecture';
import { journeyFov, journeyPose } from '../src/journey/pose';
import { PORTAL_GEOMETRY as portal } from '../src/journey/portalGeometry';

describe('architecture constrained by the supplied visual references', () => {
  it('fully conceals the open leaves behind the steel side pockets', () => {
    const leafOuter = portal.leafClosedCenter + portal.leafTravel + portal.leafWidth / 2;
    expect(portal.pierCenter + portal.pierWidth / 2).toBeGreaterThanOrEqual(leafOuter);
    expect(portal.pierCenter - portal.pierWidth / 2).toBeLessThanOrEqual(
      portal.leafClosedCenter + portal.leafTravel - portal.leafWidth / 2 + .01);
    expect(portal.pierZ + portal.pierDepth / 2).toBeGreaterThan(portal.leafFront);
  });
  it('articulates the facade instead of rendering one flat window grid', () => {
    const { boxes } = buildReferenceArchitecture();
    const windows = boxes.filter((box) => box.role === 'facade-window');
    expect(windows.length).toBeGreaterThan(70);
    expect(new Set(windows.filter((box) => box.scale[0] > 1).map((box) => box.position[2])).size)
      .toBeGreaterThanOrEqual(3);
    expect(windows.every((box) => box.color !== undefined)).toBe(true);
    expect(windows.some((box) => box.color === '#e0c4a0')).toBe(true);
  });
  it('keeps the observed left balconies above and behind the entrance', () => {
    const balconies = buildReferenceArchitecture().boxes.filter((box) => box.role === 'balcony-slab');
    expect(balconies.length).toBeGreaterThanOrEqual(12);
    for (const balcony of balconies) {
      expect(balcony.position[0]).toBeLessThan(-9);
      expect(balcony.position[1] - balcony.scale[1] / 2).toBeGreaterThan(5);
      expect(balcony.position[2] + balcony.scale[2] / 2).toBeLessThan(0);
    }
  });
  it('does not bury recessed facade windows behind the opaque structural core', () => {
    const { boxes } = buildReferenceArchitecture();
    const core = boxes.find((box) => box.role === 'tower-core')!;
    const front = core.position[2] + core.scale[2] / 2;
    for (const window of boxes.filter((box) => box.role === 'facade-window' && box.scale[0] > 1))
      expect(window.position[2] - window.scale[2] / 2).toBeGreaterThan(front + 0.02);
  });
  it('creates a setback crown with grey vertical fins rather than a gold flat cap', () => {
    const { boxes } = buildReferenceArchitecture();
    const fins = boxes.filter((box) => box.role === 'crown-fin');
    expect(fins.length).toBeGreaterThan(10);
    expect(fins.every((box) => box.material === 'rail' && box.scale[1] > box.scale[0] * 4)).toBe(true);
    const crown = boxes.find((box) => box.role === 'crown-volume')!;
    expect(crown.scale[0]).toBeLessThan(18);
    expect(crown.position[2] + crown.scale[2] / 2).toBeLessThan(-1);
  });
  it('keeps round columns and the reception out of the complete camera trajectory', () => {
    const layout = buildReferenceArchitecture();
    expect(layout.columns).toHaveLength(4);
    expect(layout.columns.every(([x]) => Math.abs(x) >= 3)).toBe(true);
    expect(layout.pendants).toHaveLength(4);
    expect(layout.pendants.every((lamp) => lamp.position[1] > 3)).toBe(true);
    const reception = layout.boxes.find((box) => box.role === 'reception-desk')!;
    expect(Math.abs(reception.position[0])).toBeGreaterThan(3);
    expect(reception.position[2]).toBeLessThan(-12);
    for (let i = 0; i <= 830; i++) {
      const { cameraPosition } = journeyPose(i / 1000);
      const point = new Vector3(...cameraPosition);
      for (const column of layout.columns)
        expect(Math.hypot(point.x - column[0], point.z - column[2])).toBeGreaterThan(0.5);
      for (const box of layout.boxes) {
        if (box.zone !== 'lobby' || box.role === 'floor-seam') continue;
        const inside = box.position.every((value, axis) =>
          Math.abs(cameraPosition[axis] - value) < box.scale[axis] / 2 + 0.06);
        expect(inside, `Camera intersected ${box.role} at ${i / 1000}`).toBe(false);
      }
    }
  });
  it('frames all revised tower bounds on portrait and desktop without cropping balconies', () => {
    for (const aspect of [0.5, 1.78]) {
      const pose = journeyPose(0, aspect);
      const camera = new PerspectiveCamera(journeyFov(0, aspect), aspect, 0.045, 250);
      camera.position.fromArray(pose.cameraPosition);
      camera.lookAt(new Vector3(...pose.target));
      camera.updateMatrixWorld();
      for (const x of [REFERENCE_TOWER_BOUNDS.min[0], REFERENCE_TOWER_BOUNDS.max[0]])
        for (const y of [REFERENCE_TOWER_BOUNDS.min[1], REFERENCE_TOWER_BOUNDS.max[1]])
          for (const z of [REFERENCE_TOWER_BOUNDS.min[2], REFERENCE_TOWER_BOUNDS.max[2]]) {
            const projected = new Vector3(x, y, z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(0.95);
            expect(Math.abs(projected.y)).toBeLessThan(0.95);
          }
    }
  });
  it('produces stable finite geometry and a bounded material batching budget', () => {
    const first = buildReferenceArchitecture();
    expect(first).toEqual(buildReferenceArchitecture());
    expect(new Set(first.boxes.map((box) => box.material)).size).toBeLessThanOrEqual(11);
    for (const box of first.boxes) {
      expect([...box.position, ...box.scale].every(Number.isFinite)).toBe(true);
      expect(box.scale.every((value) => value > 0)).toBe(true);
    }
  });
});
