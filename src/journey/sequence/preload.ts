import type { DecodedFrame } from './cache';

export async function decodePhotograph(url: string, size: { width: number; height: number }, signal: AbortSignal): Promise<DecodedFrame> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Photograph: HTTP ${response.status}`);
  const blob = await response.blob();
  signal.throwIfAborted();
  if (typeof createImageBitmap === 'function') {
    try {
      const image = await createImageBitmap(blob, {
        resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'high',
      });
      if (signal.aborted) { image.close(); signal.throwIfAborted(); }
      return { source: image, width: image.width, height: image.height,
        bytes: image.width * image.height * 4, release: () => image.close() };
    } catch { signal.throwIfAborted(); }
  }
  // Browsers without bitmap resizing retain a small canvas instead of every
  // full-resolution HTMLImageElement and its decoded backing buffer.
  const objectUrl = URL.createObjectURL(blob), image = new Image();
  image.src = objectUrl;
  try {
    await image.decode(); signal.throwIfAborted();
    const source = document.createElement('canvas');
    source.width = size.width; source.height = size.height;
    const context = source.getContext('2d', { alpha: false });
    if (!context) throw new Error('Photographic decoding canvas unavailable');
    context.drawImage(image, 0, 0, size.width, size.height);
    return { source, width: size.width, height: size.height, bytes: size.width * size.height * 4,
      release() { source.width = 0; source.height = 0; } };
  } finally {
    image.removeAttribute('src'); URL.revokeObjectURL(objectUrl);
  }
}

export class FramePreloader {
  loaded = 0;
  ready = false;
  bytes = 0;
  private images: (DecodedFrame | undefined)[];
  private abort = new AbortController();
  private disposed = false;
  private next = 0;
  private promise?: Promise<readonly DecodedFrame[]>;
  constructor(private count: number, private concurrency: number,
    private decode: (index: number, signal: AbortSignal) => Promise<DecodedFrame>,
    private progress: (loaded: number, total: number) => void = () => {}) {
    this.images = Array(count);
  }
  start(): Promise<readonly DecodedFrame[]> {
    if (this.promise) return this.promise;
    if (this.disposed) return Promise.reject(new DOMException('Sequence cancelled', 'AbortError'));
    const worker = async () => {
      while (!this.disposed && this.next < this.count) {
        const index = this.next++;
        try {
          const image = await this.decode(index, this.abort.signal);
          if (this.disposed) {
            image.release();
            throw new DOMException('Sequence cancelled', 'AbortError');
          }
          this.images[index] = image;
          this.bytes += image.bytes; this.loaded++;
          this.progress(this.loaded, this.count);
        } catch (error) {
          this.dispose();
          throw error;
        }
      }
    };
    this.promise = Promise.all(Array.from({ length: Math.min(this.count, this.concurrency) }, worker))
      .then(() => {
        if (this.disposed) throw new DOMException('Sequence cancelled', 'AbortError');
        this.ready = true;
        return this.images as DecodedFrame[];
      });
    return this.promise;
  }
  dispose() {
    this.disposed = true; this.ready = false; this.abort.abort();
    for (const image of this.images) image?.release();
    this.images.fill(undefined); this.bytes = 0;
  }
}
