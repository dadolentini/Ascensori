import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { PORTAL_POSITION, journeyFov, journeyPose } from '../src/journey/pose';

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
  it('starts outside and traverses the entrance directly into the lobby', () => {
    expect(journeyPose(0).cameraPosition[2]).toBeGreaterThan(40);
    expect(journeyPose(0.23).cameraPosition).toEqual([0, 1.65, -3]);
    expect(journeyPose(0.43).cameraPosition).toEqual([0, 1.65, -8.2]);
    expect(journeyPose(0.4).phase).toBe('lobby');
  });
  it('keeps an axial route, with no long corridor or right turn', () => {
    for (let i = 230; i <= 830; i++) {
      const pose = journeyPose(i / 1000);
      expect(pose.cameraPosition[0]).toBe(0);
      expect(pose.target[0]).toBe(0);
      expect(['corridor', 'turn']).not.toContain(pose.phase);
    }
  });
  it('frames the complete single portal on a portrait viewport before approaching', () => {
    const aspect = 0.5;
    for (const progress of [0.54, 0.58, 0.62]) {
      const pose = journeyPose(progress, aspect);
      const camera = new PerspectiveCamera(journeyFov(progress, aspect), aspect, 0.05, 250);
      camera.position.fromArray(pose.cameraPosition);
      camera.lookAt(new Vector3(...pose.target));
      camera.updateMatrixWorld();
      for (const x of [-1.2, 1.2]) {
        for (const y of [0, 3.2]) {
          const corner = new Vector3(x, y, PORTAL_POSITION[2]).project(camera);
          expect(Math.abs(corner.x)).toBeLessThan(0.94);
          expect(Math.abs(corner.y)).toBeLessThan(0.94);
          expect(corner.z).toBeLessThan(1);
        }
      }
    }
  });
  it('shows the same in-building elevator on desktop and portrait', () => {
    expect(journeyPose(0.58, 1.78).phase).toBe('elevator');
    expect(journeyPose(0.58, 0.5).cameraPosition).toEqual(journeyPose(0.58, 1.78).cameraPosition);
  });
  it('opens two elevator panels before crossing their threshold', () => {
    expect(journeyPose(0.72).doorOpen).toBe(0);
    expect(journeyPose(0.755).doorOpen).toBeGreaterThan(0.3);
    expect(journeyPose(0.79).doorOpen).toBe(1);
    expect(journeyPose(0.79).cameraPosition[2]).toBeGreaterThan(PORTAL_POSITION[2]);
    expect(journeyPose(0.83).cameraPosition[2]).toBeLessThan(PORTAL_POSITION[2]);
  });
  it('keeps the selected door lintel and threshold in frame during its opening', () => {
    const pose = journeyPose(0.755, 1.78);
    const camera = new PerspectiveCamera(journeyFov(0.755, 1.78), 1.78, 0.045, 250);
    camera.position.fromArray(pose.cameraPosition);
    camera.lookAt(new Vector3(...pose.target));
    camera.updateMatrixWorld();
    for (const y of [0, 3.04])
      expect(Math.abs(new Vector3(0, y, PORTAL_POSITION[2]).project(camera).y)).toBeLessThan(0.94);
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
