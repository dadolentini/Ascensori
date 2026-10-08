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
  it('resizes the backing buffer at HiDPI while capping device memory use', () => {
    expect(backingSize(375, 812, 3, true)).toEqual({ width: 563, height: 1218, dpr: 1.5 });
    expect(backingSize(1440, 900, 2, false)).toEqual({ width: 2880, height: 1800, dpr: 2 });
    expect(backingSize(1440, 900, 1, false).dpr).toBe(1);
  });
});
