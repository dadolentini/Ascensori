export interface DecodedFrame {
  source: CanvasImageSource; width: number; height: number; bytes: number; release(): void;
}
export class FrameCache {
  bytes = 0;
  private images = new Map<number, DecodedFrame>();
  private active = new Set<number>();
  private failures = new Set<number>();
  private queue: number[] = [];
  private protected = new Set<number>();
  private target = 0;
  private disposed = false;
  constructor(private count: number, private budget: number, private concurrency: number,
    private decode: (index: number) => Promise<DecodedFrame>, private changed: () => void,
    private failed: (index: number) => void = () => {}, private estimatedBytes = budget / 3) {}
  focus(frame: number, keep: number[] = []) {
    if (this.disposed) return;
    this.target = Math.max(0, Math.min(this.count - 1, frame));
    const lower = Math.floor(this.target), upper = Math.ceil(this.target);
    this.protected = new Set([0, lower, upper, ...keep]);
    const capacity = Math.min(this.count, Math.max(3, Math.floor(this.budget / this.estimatedBytes)));
    const candidates = Array.from({ length: this.count }, (_, i) => i)
      .sort((a, b) => Math.abs(a - this.target) - Math.abs(b - this.target));
    const wanted = [...new Set([lower, upper, 0, ...keep, ...candidates])].slice(0, capacity);
    this.queue = wanted.filter((i) => !this.images.has(i) && !this.active.has(i) && !this.failures.has(i));
    this.pump();
  }
  get(index: number) { return this.images.get(index); }
  configure(budget: number, concurrency: number) {
    if (this.budget === budget && this.concurrency === concurrency) return;
    this.budget = budget; this.concurrency = concurrency;
    this.trim(); this.focus(this.target);
  }
  private trim() {
    const distant = [...this.images.keys()].filter((i) => !this.protected.has(i))
      .sort((a, b) => Math.abs(b - this.target) - Math.abs(a - this.target));
    for (const index of distant) {
      if (this.bytes <= this.budget) break;
      const image = this.images.get(index)!;
      this.images.delete(index); this.bytes -= image.bytes; image.release();
    }
  }
  private pump() {
    while (!this.disposed && this.active.size < this.concurrency && this.queue.length) {
      const index = this.queue.shift()!;
      this.active.add(index);
      this.decode(index).then((image) => {
        if (this.disposed) { image.release(); return; }
        this.images.set(index, image); this.bytes += image.bytes;
        this.trim(); this.changed();
      }).catch(() => {
        if (this.disposed) return;
        this.failures.add(index); this.failed(index);
      }).finally(() => { this.active.delete(index); this.pump(); });
    }
  }
  dispose() {
    this.disposed = true; this.queue = [];
    for (const image of this.images.values()) image.release();
    this.images.clear(); this.bytes = 0;
  }
}
