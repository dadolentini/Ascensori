import { describe, expect, it } from 'vitest';
import { frameAtProgress, progressAtFrame } from '../src/journey/sequence/timeline';

describe('weighted photographic progression', () => {
  const stops = [0, .1, .2, .8, 1];
  it('keeps architectural stages at their assigned time when intermediate frames are inserted', () => {
    expect(frameAtProgress(.2, stops)).toBe(2);
    expect(frameAtProgress(.5, stops)).toBeCloseTo(2.5);
    expect(frameAtProgress(.9, stops)).toBeCloseTo(3.5);
  });
  it('retraces the identical frame and blend when scrolling in reverse', () => {
    for (const progress of [0, .035, .2, .5, .83, 1]) {
      const frame = frameAtProgress(progress, stops);
      expect(progressAtFrame(frame, stops)).toBeCloseTo(progress, 10);
      expect(frameAtProgress(progressAtFrame(frame, stops), stops)).toBeCloseTo(frame, 10);
    }
    expect(frameAtProgress(-1, stops)).toBe(0);
    expect(frameAtProgress(2, stops)).toBe(stops.length - 1);
  });
});
