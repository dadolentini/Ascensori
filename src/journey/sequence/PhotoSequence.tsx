import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './manifest.json';
import { FrameCache, type DecodedFrame } from './cache';
import { imageRectangle, backingSize } from './fit';

gsap.registerPlugin(ScrollTrigger);

export default function PhotoSequence({ initialProgress = 0, onProgress, onReady, onFailure }: {
  initialProgress?: number; onProgress(progress: number): void; onReady(): void; onFailure(): void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const posterIndex = useRef(Math.round(Math.min(1, initialProgress / .83) * (manifest.frames.length - 1)));
  const callbacks = useRef({ onProgress, onReady, onFailure });
  callbacks.current = { onProgress, onReady, onFailure };
  useEffect(() => {
    const canvas = canvasRef.current!, viewport = canvas.closest<HTMLElement>('.journey-viewport')!;
    const section = viewport.closest<HTMLElement>('.journey')!;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) { callbacks.current.onFailure(); return; }
    let raf = 0, disposed = false, drawn = false, resized = true, signature = '', lastIndex = 0;
    let width = 0, height = 0, dpr = 1;
    const seq = { frame: 0 }, abort = new AbortController();
    const constrainedDevice = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8) <= 4
      || window.matchMedia('(pointer: coarse)').matches;
    const lowMemory = window.innerWidth < 768 || constrainedDevice;
    const budget = (lowMemory ? 32 : 96) * 1024 * 1024;
    const requestRender = () => { if (!disposed && !raf) raf = requestAnimationFrame(render); };
    const decode = async (index: number): Promise<DecodedFrame> => {
      const response = await fetch(manifest.frames[index].url, { signal: abort.signal });
      if (!response.ok) throw new Error(`Frame ${index}: HTTP ${response.status}`);
      const blob = await response.blob();
      if (typeof createImageBitmap === 'function') {
        const image = await createImageBitmap(blob);
        return { source: image, width: image.width, height: image.height,
          bytes: image.width * image.height * 4, release: () => image.close() };
      }
      const url = URL.createObjectURL(blob), image = new Image();
      image.src = url;
      try { await image.decode(); } catch (error) { URL.revokeObjectURL(url); throw error; }
      return { source: image, width: image.naturalWidth, height: image.naturalHeight,
        bytes: image.naturalWidth * image.naturalHeight * 4,
        release() { image.removeAttribute('src'); URL.revokeObjectURL(url); } };
    };
    const cache = new FrameCache(manifest.frames.length, budget, lowMemory ? 2 : 3, decode, requestRender,
      (index) => {
        canvas.dataset.failedFrames = `${Number(canvas.dataset.failedFrames || 0) + 1}`;
        canvas.dataset.missingFrame = String(index);
        if (index === 0 && !drawn) callbacks.current.onFailure();
        requestRender();
      }, manifest.width * manifest.height * 4);

    function drawImage(image: DecodedFrame, index: number, alpha: number) {
      const initial = index === 0;
      const initialHeight = width < 768 ? height * .45 : Math.max(1, height - 160);
      const rect = imageRectangle(image.width, image.height, width, initial ? initialHeight : height,
        initial ? 'contain' : 'cover');
      if (initial) {
        rect.y += width < 768 ? 88 : 80;
        if (width >= 768) rect.x = Math.max(0, width - rect.width - width * .05);
      } else if (index < 6) {
        // These portrait exterior views place the entrance in the lower portion.
        rect.y = (height - rect.height) * .8;
      }
      ctx!.globalAlpha = alpha;
      ctx!.drawImage(image.source, rect.x, rect.y, rect.width, rect.height);
      canvas.dataset.imageRect = JSON.stringify(rect);
    }
    function render() {
      raf = 0;
      if (disposed) return;
      const frame = Math.max(0, Math.min(manifest.frames.length - 1, seq.frame));
      const lower = Math.floor(frame), upper = Math.ceil(frame), blend = frame - lower;
      canvas.dataset.requestedFrame = frame.toFixed(4);
      canvas.dataset.cacheBytes = String(cache.bytes);
      const first = cache.get(lower), second = cache.get(upper);
      canvas.dataset.frameReady = String(!!first && !!second);
      // Keep the painted buffer during a rapid seek. Never clear to an absent image.
      if (!first && !second && drawn && !resized) return;
      const baseIndex = first ? lower : second ? upper : cache.get(lastIndex) ? lastIndex : 0;
      const base = cache.get(baseIndex);
      if (!base) return;
      const overlay = first && second && lower !== upper ? second : undefined;
      const nextSignature = `${baseIndex}:${overlay ? upper : baseIndex}:${overlay ? blend.toFixed(4) : 0}:${width}:${height}:${dpr}`;
      if (!resized && nextSignature === signature) return;
      // Canvas dimensions clear its buffer. Resize and redraw atomically in this
      // paint callback, after a decoded image is available, never in ResizeObserver.
      const backing = backingSize(width, height, dpr, dpr <= 1.5);
      if (canvas.width !== backing.width || canvas.height !== backing.height) {
        canvas.width = backing.width; canvas.height = backing.height;
      }
      canvas.dataset.dpr = String(dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.globalAlpha = 1; ctx!.fillStyle = '#102338'; ctx!.fillRect(0, 0, width, height);
      drawImage(base, baseIndex, 1);
      if (overlay) drawImage(overlay, upper, blend);
      ctx!.globalAlpha = 1;
      canvas.dataset.drawnFrames = overlay ? `${baseIndex},${upper}` : `${baseIndex}`;
      canvas.dataset.renderCount = String(Number(canvas.dataset.renderCount || 0) + 1);
      lastIndex = baseIndex; signature = nextSignature; resized = false;
      if (!drawn) {
        drawn = true;
        canvas.dataset.painted = 'true';
        if (posterRef.current) { posterRef.current.hidden = true; posterRef.current.removeAttribute('src'); }
        callbacks.current.onReady();
      }
    }
    const resize = () => {
      const bounds = viewport.getBoundingClientRect();
      const mobile = bounds.width < 768 || constrainedDevice;
      const backing = backingSize(bounds.width, bounds.height, window.devicePixelRatio, mobile);
      if (width === bounds.width && height === bounds.height && dpr === backing.dpr) return;
      cache.configure((mobile ? 32 : 96) * 1024 * 1024, mobile ? 2 : 3);
      width = bounds.width; height = bounds.height; dpr = backing.dpr;
      resized = true; requestRender();
    };
    resize(); cache.focus(0);
    const span = () => Math.max(1, section.offsetHeight - viewport.clientHeight);
    const pin = ScrollTrigger.create({ trigger: section, start: 'top top', end: () => `+=${span()}`,
      pin: viewport, pinSpacing: false, anticipatePin: 1,
      onUpdate: (trigger) => callbacks.current.onProgress(trigger.progress),
      onRefresh: (trigger) => { resize(); callbacks.current.onProgress(trigger.progress); } });
    const tween = gsap.to(seq, { frame: manifest.frames.length - 1, ease: 'none',
      onUpdate: () => { cache.focus(seq.frame); requestRender(); },
      scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${span() * .83}`,
        scrub: .18, invalidateOnRefresh: true } });
    const observer = new ResizeObserver(resize); observer.observe(viewport);
    window.addEventListener('resize', resize);
    ScrollTrigger.refresh();
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener('resize', resize);
      tween.scrollTrigger?.kill(); tween.kill(); pin.kill(true);
      abort.abort(); cache.dispose();
    };
  }, []);
  return <div className="photo-sequence">
    <img ref={posterRef} className="sequence-poster" src={manifest.frames[posterIndex.current].url}
      alt="Vista completa del palazzo nei frame forniti" width={manifest.width} height={manifest.height} fetchPriority="high" />
    <canvas ref={canvasRef} data-renderer="photographic-2d" role="img"
      aria-label="Percorso fotografico dall’edificio all’ascensore, controllato dallo scorrimento" />
  </div>;
}
