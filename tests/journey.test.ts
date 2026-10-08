import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { ELEVATOR_CENTERS, journeyFov, journeyPose } from '../src/journey/pose';

describe('the reversible architectural journey', () => {
  it('shows the complete original tower at the initial desktop and mobile frames', () => {
    for (const aspect of [0.5, 1.78]) {
      const pose = journeyPose(0, aspect);
      const camera = new PerspectiveCamera(journeyFov(0, aspect), aspect, 0.045, 250);
      camera.position.fromArray(pose.cameraPosition);
      camera.lookAt(new Vector3(...pose.target));
      camera.updateMatrixWorld();
      expect(new Vector3(0, 27, -8).project(camera).x).toBeGreaterThan(0.07);
      for (const x of [-9.6, 9.6])
        for (const y of [4.5, 54.4])
          for (const z of [-15.7, -0.4]) {
            const projected = new Vector3(x, y, z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(0.94);
            expect(Math.abs(projected.y)).toBeLessThan(0.94);
          }
    }
  });
  it('starts outside, traverses the entrance, and reaches the end of the corridor', () => {
    expect(journeyPose(0).cameraPosition[2]).toBeGreaterThan(40);
    expect(journeyPose(0.23).cameraPosition).toEqual([0, 1.65, -3]);
    expect(journeyPose(0.43).cameraPosition).toEqual([0, 1.65, -17.5]);
  });
  it('turns right through an arc instead of teleporting into the elevator hall', () => {
    const middle = journeyPose(0.485);
    expect(middle.cameraPosition[0]).toBeGreaterThan(0);
    expect(middle.cameraPosition[0]).toBeLessThan(3);
    expect(middle.cameraPosition[2]).toBeLessThan(-17.5);
    expect(journeyPose(0.54).cameraPosition).toEqual([3, 1.65, -20.5]);
    expect(journeyPose(0.54).target[0]).toBeGreaterThan(20);
  });
  it('frames four complete portals on a portrait viewport before approaching one', () => {
    const aspect = 0.5;
    for (const progress of [0.54, 0.58, 0.62]) {
      const pose = journeyPose(progress, aspect);
      const camera = new PerspectiveCamera(journeyFov(progress, aspect), aspect, 0.05, 250);
      camera.position.fromArray(pose.cameraPosition);
      camera.lookAt(new Vector3(...pose.target));
      camera.updateMatrixWorld();
      for (const z of ELEVATOR_CENTERS) {
        for (const offset of [-1, 1]) {
          const corner = new Vector3(22, offset === -1 ? 0 : 3.2, z + offset).project(camera);
          expect(Math.abs(corner.x)).toBeLessThan(0.94);
          expect(Math.abs(corner.y)).toBeLessThan(0.94);
          expect(corner.z).toBeLessThan(1);
        }
      }
    }
  });
  it('advances the wide-screen reveal while preserving the portrait bank framing', () => {
    expect(journeyPose(0.58, 1.78).cameraPosition[0]).toBeGreaterThan(10);
    expect(journeyPose(0.58, 0.5).cameraPosition[0]).toBe(3);
  });
  it('opens two elevator panels before crossing their threshold', () => {
    expect(journeyPose(0.72).doorOpen).toBe(0);
    expect(journeyPose(0.755).doorOpen).toBeGreaterThan(0.3);
    expect(journeyPose(0.79).doorOpen).toBe(1);
    expect(journeyPose(0.79).cameraPosition[0]).toBeLessThan(22);
    expect(journeyPose(0.83).cameraPosition[0]).toBeGreaterThan(22);
  });
  it('keeps the selected door lintel and threshold in frame during its opening', () => {
    const pose = journeyPose(0.755, 1.78);
    const camera = new PerspectiveCamera(journeyFov(0.755, 1.78), 1.78, 0.045, 250);
    camera.position.fromArray(pose.cameraPosition);
    camera.lookAt(new Vector3(...pose.target));
    camera.updateMatrixWorld();
    for (const y of [0, 3.04])
      expect(Math.abs(new Vector3(22, y, -21.7).project(camera).y)).toBeLessThan(0.94);
  });
  it('opens the entrance before reaching the glass and closes it on reverse', () => {
    expect(journeyPose(0.14).entranceOpen).toBeGreaterThan(0.95);
    expect(journeyPose(0.06).entranceOpen).toBe(0);
  });
  it('has continuous finite positions, targets and doors at every phase boundary', () => {
    for (const boundary of [0.15, 0.23, 0.43, 0.54, 0.62, 0.72, 0.79, 0.83, 0.92]) {
      const before = journeyPose(boundary - 0.000001);
      const after = journeyPose(boundary + 0.000001);
      expect(
        new Vector3(...before.cameraPosition).distanceTo(new Vector3(...after.cameraPosition)),
      ).toBeLessThan(0.01);
      expect(new Vector3(...before.target).distanceTo(new Vector3(...after.target))).toBeLessThan(
        0.01,
      );
    }
    for (let step = 0; step <= 1000; step++) {
      const pose = journeyPose(step / 1000);
      expect(
        [...pose.cameraPosition, ...pose.target, pose.doorOpen, pose.entranceOpen].every(
          Number.isFinite,
        ),
      ).toBe(true);
      expect(pose.cameraPosition[1]).toBe(1.65);
    }
  });
  it('reconstructs identical state on reverse, seek and invalid input', () => {
    const checkpoints = [0.12, 0.38, 0.49, 0.58, 0.7, 0.76, 0.81, 0.96];
    const snapshots = checkpoints.map((value) => journeyPose(value));
    [...checkpoints]
      .reverse()
      .forEach((value) =>
        expect(journeyPose(value)).toEqual(snapshots[checkpoints.indexOf(value)]),
      );
    expect(journeyPose(-5)).toEqual(journeyPose(0));
    expect(journeyPose(5)).toEqual(journeyPose(1));
    expect(journeyPose(Number.NaN)).toEqual(journeyPose(0));
  });
});
