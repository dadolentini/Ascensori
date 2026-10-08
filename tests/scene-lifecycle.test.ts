import { describe, expect, it, vi } from 'vitest';
import { observeContextLoss } from '../src/journey/sceneLifecycle';

describe('WebGL context observer ownership', () => {
  it('reports a genuine context loss once and allows recovery handling', () => {
    const canvas = new EventTarget(), failure = vi.fn();
    const dispose = observeContextLoss(canvas, failure);
    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(failure).toHaveBeenCalledTimes(1);
    expect(lost.defaultPrevented).toBe(true);
    dispose();
  });
  it('does not report intentional renderer teardown after unmount', () => {
    const canvas = new EventTarget(), failure = vi.fn();
    const dispose = observeContextLoss(canvas, failure);
    dispose();
    dispose();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(failure).not.toHaveBeenCalled();
  });
  it('does not detach another mounted observer while cleaning up an older instance', () => {
    const canvas = new EventTarget(), first = vi.fn(), second = vi.fn();
    const cleanupFirst = observeContextLoss(canvas, first);
    const cleanupSecond = observeContextLoss(canvas, second);
    cleanupFirst();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    cleanupSecond();
  });
});
