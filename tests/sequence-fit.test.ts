import { describe, expect, it } from 'vitest';
import { imageRectangle, backingSize, photoRectangle } from '../src/journey/sequence/fit';

describe('photographic canvas sizing', () => {
  it('starts a continuous proportional transition from the complete building to fullscreen', () => {
    for (const [width, height] of [[1440, 900], [640, 900], [375, 812]]) {
      const start = photoRectangle(1122, 1402, width, height, 0, true);
      const next = photoRectangle(1122, 1402, width, height, .00001, true);
      expect(Math.abs(next.width - start.width)).toBeLessThan(.1);
      expect(Math.abs(next.x - start.x)).toBeLessThan(.1);
      expect(start.width / start.height).toBeCloseTo(1122 / 1402, 10);
      expect(start.x).toBeGreaterThanOrEqual(0);
      expect(start.y).toBeGreaterThanOrEqual(0);
      expect(start.y + start.height).toBeLessThanOrEqual(height);
      const end = photoRectangle(1122, 1402, width, height, 1, true);
      expect(end.width).toBeGreaterThanOrEqual(width);
      expect(end.height).toBeGreaterThanOrEqual(height);
    }
  });
  it('contains the complete portrait building on desktop and mobile without stretching', () => {
    for (const [width, height] of [[1440, 900], [375, 812]]) {
      const rect = imageRectangle(1122, 1402, width, height, 'contain');
      expect(rect.width / rect.height).toBeCloseTo(1122 / 1402, 10);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width + .001);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height + .001);
    }
  });
  it('covers the viewport in the interior while preserving photograph proportions', () => {
    const rect = imageRectangle(1122, 1402, 1440, 900, 'cover');
    expect(rect.width / rect.height).toBeCloseTo(1122 / 1402, 10);
    expect(rect.width).toBeGreaterThanOrEqual(1440);
    expect(rect.height).toBeGreaterThanOrEqual(900);
  });
  it('keeps the hall reception and lower chandelier in view instead of favoring the floor', () => {
    const hall = { id: 'hall', from: .38, to: .57, focal: { x: .5, y: .34 } };
    for (const progress of [.38, .47, .57]) {
      const rect = photoRectangle(896, 1120, 1440, 900, progress, hall);
      for (const sourceY of [.24, .46]) {
        const screenY = rect.y + rect.height * sourceY;
        expect(screenY).toBeGreaterThanOrEqual(0);
        expect(screenY).toBeLessThanOrEqual(900);
      }
    }
  });
  it('shows the complete exterior through its first stop, then approaches the doorway', () => {
    const exterior = { id: 'exterior', from: 0, to: .25, focal: { x: .5, y: .58 } };
    const start = photoRectangle(896, 1120, 1440, 900, 0, exterior);
    expect(photoRectangle(896, 1120, 1440, 900, .1, exterior)).toEqual(start);
    expect(photoRectangle(896, 1120, 1440, 900, .17, exterior).width).toBeGreaterThan(start.width);
    const door = photoRectangle(896, 1120, 1440, 900, .25, exterior);
    expect(door.y + door.height * .6).toBeGreaterThan(0);
    expect(door.y + door.height * .6).toBeLessThan(900);
  });
  it('resizes the backing buffer at HiDPI while capping device memory use', () => {
    expect(backingSize(375, 812, 3, true)).toEqual({ width: 563, height: 1218, dpr: 1.5 });
    expect(backingSize(1440, 900, 2, false)).toEqual({ width: 2880, height: 1800, dpr: 2 });
    expect(backingSize(1440, 900, 1, false).dpr).toBe(1);
  });
  it('preserves device density throughout the complete-building view and approach', () => {
    for (const progress of [0, .05, .1, .24]) {
      expect(backingSize(1440, 900, 2, false, { imageWidth: 896, progress }))
        .toEqual({ width: 2880, height: 1800, dpr: 2 });
    }
  });
  it('caps fullscreen raster work while retaining the native photograph width', () => {
    const fullscreen = backingSize(1440, 900, 2, false, { imageWidth: 896, progress: .25 });
    expect(fullscreen.width).toBe(1024);
    expect(fullscreen.height).toBe(640);
    expect(fullscreen.dpr).toBeCloseTo(1024 / 1440, 10);
    expect(fullscreen.width).toBeGreaterThanOrEqual(896);
    const largerSource = backingSize(3840, 2160, 2, false, { imageWidth: 1600, progress: .8 });
    expect(largerSource.width).toBe(1600);
    expect(largerSource.height).toBe(900);
  });
  it('keeps mobile density unchanged when its existing buffer fits the photo cap', () => {
    for (const [width, height] of [[375, 812], [640, 900]]) {
      expect(backingSize(width, height, 3, true, { imageWidth: 560, progress: .8 }))
        .toEqual(backingSize(width, height, 3, true));
    }
  });
  it('uses the same fullscreen scale on both axes within pixel-rounding precision', () => {
    for (const [width, height] of [[1920, 1080], [1080, 1920], [1440, 901]]) {
      const size = backingSize(width, height, 2, false, { imageWidth: 896, progress: .8 });
      expect(size.width).toBe(1024);
      expect(Math.abs(size.height - height * size.dpr)).toBeLessThanOrEqual(.5);
      expect(size.width / size.height).toBeCloseTo(width / height, 2);
    }
  });
});
