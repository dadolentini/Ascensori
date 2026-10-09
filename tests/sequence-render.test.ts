import { describe, expect, it } from 'vitest';
import { frameLayers } from '../src/journey/sequence/render';

describe('photographic frame layers', () => {
  const frames = [
    { scene: 'exterior' }, { scene: 'exterior' }, { scene: 'hall' },
    { scene: 'hall' }, { scene: 'elevator' }, { scene: 'elevator' },
  ];
  it('draws the current nearest photograph first and smooths only its own scene', () => {
    expect(frameLayers(.1, frames)).toEqual([{ index: 0, alpha: 1 }]);
    const layers = frameLayers(.4, frames);
    expect(layers[0]).toEqual({ index: 0, alpha: 1 });
    expect(layers[1].index).toBe(1); expect(layers[1].alpha).toBeGreaterThan(0);
    expect(layers[1].alpha).toBeLessThan(.5);
    expect(frameLayers(1.49, frames)).toEqual([{ index: 1, alpha: 1 }]);
    expect(frameLayers(1.51, frames)).toEqual([{ index: 2, alpha: 1 }]);
  });
  it('keeps door blends brief and gives reverse scroll the identical layer weights', () => {
    expect(frameLayers(4.25, frames)).toEqual([{ index: 4, alpha: 1 }]);
    expect(frameLayers(4.75, frames)).toEqual([{ index: 5, alpha: 1 }]);
    const forward = [.1, .4, .6, 1.51, 2.4, 4.45, 4.6].map((p) => frameLayers(p, frames));
    const reverse = [4.6, 4.45, 2.4, 1.51, .6, .4, .1].map((p) => frameLayers(p, frames)).reverse();
    expect(reverse).toEqual(forward);
  });
});
