import { describe, expect, it } from 'vitest';
import { FramePreloader } from '../src/journey/sequence/preload';
import { frameDecodeSize } from '../src/journey/sequence/fit';
import type { DecodedFrame } from '../src/journey/sequence/cache';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function frame(index: number, released: number[] = []): DecodedFrame {
  return { source: { index } as unknown as CanvasImageSource, width: 2, height: 3, bytes: 24,
    release() { released.push(index); } };
}

describe('complete photographic preload', () => {
  it('holds readiness until every decoded photograph is retained, with bounded concurrency', async () => {
    const pending = new Map<number, (image: DecodedFrame) => void>();
    const updates: number[] = [];
    const preload = new FramePreloader(4, 2, (index) => new Promise((resolve) => pending.set(index, resolve)),
      (loaded) => updates.push(loaded));
    const ready = preload.start();
    expect([...pending.keys()]).toEqual([0, 1]);
    pending.get(0)!(frame(0)); await tick();
    expect(preload.ready).toBe(false); expect(preload.loaded).toBe(1);
    expect([...pending.keys()]).toEqual([0, 1, 2]);
    pending.get(2)!(frame(2)); await tick();
    pending.get(3)!(frame(3)); await tick();
    expect(preload.ready).toBe(false);
    pending.get(1)!(frame(1));
    const images = await ready;
    expect(preload.ready).toBe(true); expect(preload.loaded).toBe(4);
    expect(images.map((image) => (image.source as unknown as { index: number }).index)).toEqual([0, 1, 2, 3]);
    expect(updates).toEqual([1, 2, 3, 4]); expect(preload.bytes).toBe(96);
    preload.dispose();
  });

  it('keeps all photographs for forward and reverse seeks without decoding again', async () => {
    const decoded: number[] = [], released: number[] = [];
    const preload = new FramePreloader(18, 3, async (index) => {
      decoded.push(index); return frame(index, released);
    });
    const images = await preload.start();
    for (const index of [...Array(18).keys(), ...Array(18).keys()].reverse())
      expect((images[index].source as unknown as { index: number }).index).toBe(index);
    expect(decoded).toHaveLength(18); expect(released).toEqual([]);
    preload.dispose();
    expect(released.sort((a, b) => a - b)).toEqual([...Array(18).keys()]);
    expect(preload.bytes).toBe(0);
  });

  it('aborts pending loads and releases late decoded results after unmount', async () => {
    const pending: ((image: DecodedFrame) => void)[] = [], signals: AbortSignal[] = [];
    const released: number[] = [], updates: number[] = [];
    const preload = new FramePreloader(3, 2, (_index, signal) => {
      signals.push(signal); return new Promise((resolve) => pending.push(resolve));
    }, (loaded) => updates.push(loaded));
    const ready = preload.start();
    const rejection = expect(ready).rejects.toMatchObject({ name: 'AbortError' });
    preload.dispose();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    pending.forEach((resolve, index) => resolve(frame(index, released)));
    await rejection; await tick();
    expect(released).toEqual([0, 1]); expect(updates).toEqual([]);
    expect(preload.ready).toBe(false); expect(preload.bytes).toBe(0);
  });

  it('rejects the entire sequence on a missing photograph and releases retained frames', async () => {
    const released: number[] = [];
    const preload = new FramePreloader(4, 1, async (index) => {
      if (index === 2) throw new Error('Frame 2: HTTP 404');
      return frame(index, released);
    });
    await expect(preload.start()).rejects.toThrow('Frame 2: HTTP 404');
    expect(preload.ready).toBe(false); expect(preload.bytes).toBe(0);
    expect(released).toEqual([0, 1]);
  });
});

describe('retained sequence decoding resolution', () => {
  it('fits the whole mobile sequence in the budget while preserving image proportions', () => {
    const budget = 32 * 1024 * 1024;
    const size = frameDecodeSize(1122, 1402, 18, budget, 560);
    expect(size.width).toBeLessThanOrEqual(560);
    expect(size.width * size.height * 4 * 18).toBeLessThanOrEqual(budget);
    expect(size.width / size.height).toBeCloseTo(1122 / 1402, 2);
  });
  it('caps desktop decode width and never enlarges a source photograph', () => {
    expect(frameDecodeSize(1122, 1402, 10, 96 * 1024 * 1024, 900).width).toBe(900);
    expect(frameDecodeSize(896, 1120, 10, 96 * 1024 * 1024, 900)).toEqual({ width: 896, height: 1120 });
  });
});
