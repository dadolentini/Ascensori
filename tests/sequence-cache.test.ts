import { describe, expect, it } from 'vitest';
import { FrameCache, type DecodedFrame } from '../src/journey/sequence/cache';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
describe('decoded image cache', () => {
  it('reduces the decoded budget when the viewport switches to a mobile layout', async () => {
    const cache = new FrameCache(9, 90, 3, async () => ({ source: {} as CanvasImageSource,
      width: 1, height: 1, bytes: 10, release() {} }), () => {}, undefined, 10);
    cache.focus(7.5); await tick(); expect(cache.bytes).toBe(90);
    cache.configure(30, 2); await tick();
    expect(cache.bytes).toBeLessThanOrEqual(30);
    expect(cache.get(0)).toBeDefined(); expect(cache.get(7)).toBeDefined(); expect(cache.get(8)).toBeDefined();
    cache.dispose();
  });
  it('loads the first images in priority order without exceeding decoding concurrency', async () => {
    const started: number[] = [], pending: (() => void)[] = [];
    const cache = new FrameCache(8, 30, 2, async (index) => {
      started.push(index);
      await new Promise<void>((resolve) => pending.push(resolve));
      return { source: {} as CanvasImageSource, width: 1, height: 1, bytes: 10, release() {} };
    }, () => {});
    cache.focus(0);
    expect(started).toEqual([0, 1]);
    pending.shift()!(); await tick();
    expect(started).toEqual([0, 1, 2]);
    cache.dispose(); pending.forEach((resolve) => resolve()); await tick();
  });
  it('keeps the initial and requested images, evicts distant frames and reloads during reversal', async () => {
    const released: number[] = [], loaded: number[] = [];
    const cache = new FrameCache(10, 30, 2, async (index) => {
      loaded.push(index);
      return { source: {} as CanvasImageSource, width: 1, height: 1, bytes: 10,
        release() { released.push(index); } };
    }, () => {});
    cache.focus(0); await tick();
    expect(cache.get(0)).toBeDefined();
    cache.focus(8.5); await tick(); await tick();
    expect(cache.get(8)).toBeDefined(); expect(cache.get(9)).toBeDefined();
    expect(cache.bytes).toBeLessThanOrEqual(30);
    expect(cache.get(0)).toBeDefined(); expect(released).toContain(1);
    cache.focus(1); await tick(); await tick();
    expect(cache.get(1)).toBeDefined();
    expect(loaded.filter((i) => i === 1).length).toBe(2);
    cache.dispose(); expect(cache.bytes).toBe(0);
  });
  it('releases late decoding results after disposal and never notifies the unmounted renderer', async () => {
    let finish!: (image: DecodedFrame) => void, released = 0, notifications = 0;
    const cache = new FrameCache(1, 30, 1,
      () => new Promise((resolve) => { finish = resolve; }), () => { notifications++; });
    cache.focus(0); cache.dispose();
    finish({ source: {} as CanvasImageSource, width: 1, height: 1, bytes: 10, release() { released++; } });
    await tick();
    expect(released).toBe(1); expect(notifications).toBe(0); expect(cache.bytes).toBe(0);
  });
  it('reports a failed image once and still decodes the next available frame', async () => {
    const failures: number[] = [];
    const cache = new FrameCache(3, 30, 1, async (index) => {
      if (index === 1) throw new Error('missing image');
      return { source: {} as CanvasImageSource, width: 1, height: 1, bytes: 10, release() {} };
    }, () => {}, (index) => failures.push(index));
    cache.focus(0); await tick();
    expect(failures).toEqual([1]); expect(cache.get(2)).toBeDefined();
    cache.focus(1); await tick(); expect(failures).toEqual([1]); cache.dispose();
  });
});
