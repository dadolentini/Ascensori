import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './manifest.json';
import type { DecodedFrame } from './cache';
import { FramePreloader, decodePhotograph } from './preload';
import { photoRectangle, backingSize, frameDecodeSize } from './fit';
import { frameAtProgress, progressAtFrame } from './timeline';
import { frameLayers } from './render';
import { journeyEquationState } from '../JourneyEquations';

gsap.registerPlugin(ScrollTrigger);

export default function PhotoSequence({ initialProgress = 0, onProgress, onReady, onFailure, onLoadProgress }: {
  initialProgress?: number; onProgress(progress: number): void; onReady(): void; onFailure(): void;
  onLoadProgress?(loaded: number, total: number): void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const stops = manifest.frames.map((frame) => frame.at);
  const initialFrame = useRef(frameAtProgress(initialProgress / .83, stops));
  const callbacks = useRef({ onProgress, onReady, onFailure, onLoadProgress });
  callbacks.current = { onProgress, onReady, onFailure, onLoadProgress };
  useEffect(() => {
    const canvas = canvasRef.current!, viewport = canvas.closest<HTMLElement>('.journey-viewport')!;
    const section = viewport.closest<HTMLElement>('.journey')!;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) { callbacks.current.onFailure(); return; }
    let raf = 0, disposed = false, drawn = false, resized = true, signature = '';
    let width = 0, height = 0, deviceDpr = 1;
    let images: readonly DecodedFrame[] | undefined;
    let tween: gsap.core.Tween | undefined, pin: ScrollTrigger | undefined;
    const composition = document.createElement('canvas');
    // Blend at retained-image resolution on a CPU surface. The visible canvas
    // receives one opaque image instead of two costly viewport alpha passes.
    const compositionContext = composition.getContext('2d', { alpha: false, willReadFrequently: true });
    // The tween always spans the complete route. Only the loading poster uses
    // initialProgress; otherwise a remount would make frame zero unreachable.
    const seq = { frame: 0 };
    const constrainedDevice = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8) <= 4
      || window.matchMedia('(pointer: coarse)').matches;
    const lowMemory = window.innerWidth < 768 || constrainedDevice;
    const budget = (lowMemory ? 32 : 96) * 1024 * 1024;
    const decodeSize = frameDecodeSize(manifest.width, manifest.height, manifest.frames.length, budget, lowMemory ? 560 : 900);
    composition.width = decodeSize.width; composition.height = decodeSize.height;
    Object.assign(canvas.dataset, {
      preloadState: 'loading', preloadCount: '0', preloadTotal: String(manifest.frames.length),
      preloadReady: 'false', animationReady: 'false', frameReady: 'false',
      decodeBudget: String(budget), decodeWidth: String(decodeSize.width), decodeHeight: String(decodeSize.height),
      compositionBytes: String(decodeSize.width * decodeSize.height * 4),
    });
    callbacks.current.onLoadProgress?.(0, manifest.frames.length);
    const requestRender = () => { if (!disposed && images && !raf) raf = requestAnimationFrame(render); };
    const preload = new FramePreloader(manifest.frames.length, lowMemory ? 2 : 3,
      (index, signal) => decodePhotograph(manifest.frames[index].url, decodeSize, signal),
      (loaded, total) => {
        canvas.dataset.preloadCount = String(loaded);
        canvas.dataset.decodedBytes = canvas.dataset.cacheBytes = String(preload.bytes);
        callbacks.current.onLoadProgress?.(loaded, total);
      });

    function paint(source: CanvasImageSource, image: DecodedFrame, rect: ReturnType<typeof photoRectangle>) {
      // Clip source pixels explicitly before scaling the portrait cover.
      const scaleX = rect.width / image.width, scaleY = rect.height / image.height;
      const sx = Math.max(0, -rect.x / scaleX), sy = Math.max(0, -rect.y / scaleY);
      const sw = Math.min(image.width, (width - rect.x) / scaleX) - sx;
      const sh = Math.min(image.height, (height - rect.y) / scaleY) - sy;
      ctx!.drawImage(source, sx, sy, sw, sh,
        rect.x + sx * scaleX, rect.y + sy * scaleY, sw * scaleX, sh * scaleY);
    }
    function render() {
      raf = 0;
      if (disposed || !images) return;
      const frame = Math.max(0, Math.min(manifest.frames.length - 1, seq.frame));
      const index = Math.round(frame), photoProgress = progressAtFrame(frame, stops);
      const chapter = manifest.chapters.find((chapter) => chapter.id === manifest.frames[index].scene)!;
      const image = images[index];
      const rect = photoRectangle(image.width, image.height, width, height, photoProgress, chapter);
      const layers = frameLayers(frame, manifest.frames);
      canvas.dataset.requestedFrame = frame.toFixed(4);
      const equation = journeyEquationState(pin?.progress ?? 0);
      const paper = equation?.opacity === 1
        ? viewport.querySelector<HTMLElement>(`.journey-equation[data-equation="${equation.chapter.n}"]`) : null;
      // Cull only a photograph already painted beneath matching opaque paper.
      // The DOM check protects the first fade-out frame when React trails GSAP.
      if (drawn && paper?.style.opacity === '1' && paper.style.visibility === 'visible') {
        if (canvas.dataset.renderState !== 'covered') signature = '';
        canvas.dataset.renderState = 'covered';
        return;
      }
      canvas.dataset.renderState = 'visible';
      const backing = backingSize(width, height, deviceDpr, width < 768 || constrainedDevice,
        { imageWidth: image.width, progress: photoProgress });
      const dpr = backing.dpr;
      const nextSignature = `${layers.map((layer) => `${layer.index}:${layer.alpha.toFixed(4)}`).join(',')}:${rect.x.toFixed(2)}:${rect.y.toFixed(2)}:${rect.width.toFixed(2)}:${rect.height.toFixed(2)}:${width}:${height}:${dpr}`;
      if (!resized && signature === nextSignature) return;
      const started = performance.now();
      if (canvas.width !== backing.width || canvas.height !== backing.height) {
        canvas.width = backing.width; canvas.height = backing.height;
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.globalAlpha = 1; ctx!.fillStyle = '#102338'; ctx!.fillRect(0, 0, width, height);
      let source = image.source;
      if (layers.length > 1 && compositionContext) {
        compositionContext.globalAlpha = 1;
        compositionContext.fillStyle = '#102338'; compositionContext.fillRect(0, 0, image.width, image.height);
        for (const layer of layers) {
          compositionContext.globalAlpha = layer.alpha;
          compositionContext.drawImage(images[layer.index].source, 0, 0);
        }
        compositionContext.globalAlpha = 1; source = composition;
      }
      paint(source, image, rect);
      ctx!.globalAlpha = 1;
      Object.assign(canvas.dataset, {
        actualFrame: String(index), frameId: manifest.frames[index].id, scene: chapter.id,
        frameReady: 'true', drawnFrames: layers.map((layer) => layer.index).join(','),
        imageRect: JSON.stringify(rect), dpr: String(dpr), deviceDpr: String(window.devicePixelRatio || 1),
        renderCount: String(Number(canvas.dataset.renderCount || 0) + 1),
        renderMs: (performance.now() - started).toFixed(3),
      });
      signature = nextSignature; resized = false;
      if (!drawn) {
        drawn = true; canvas.dataset.painted = 'true';
        if (posterRef.current) { posterRef.current.hidden = true; posterRef.current.removeAttribute('src'); }
        callbacks.current.onReady();
      }
    }
    const resize = () => {
      const bounds = viewport.getBoundingClientRect();
      const backing = backingSize(bounds.width, bounds.height, window.devicePixelRatio, bounds.width < 768 || constrainedDevice);
      if (width === bounds.width && height === bounds.height && deviceDpr === backing.dpr) return;
      width = bounds.width; height = bounds.height; deviceDpr = backing.dpr;
      resized = true; requestRender();
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(viewport);
    window.addEventListener('resize', resize);
    preload.start().then(async (frames) => {
      if (disposed) return;
      canvas.dataset.preloadState = 'ready'; canvas.dataset.preloadReady = 'true';
      // Prepare both Canvas upload paths while the loading poster still covers
      // the hidden canvas. One small readback completes their deferred GPU work.
      // Keep playback and resize-driven rendering disabled throughout this step.
      const warmStarted = performance.now(); canvas.dataset.warmState = 'preparing';
      const image = frames[0], chapter = manifest.chapters.find((item) => item.id === manifest.frames[0].scene)!;
      const rect = photoRectangle(image.width, image.height, width, height, 0, chapter);
      const backing = backingSize(width, height, deviceDpr, width < 768 || constrainedDevice);
      canvas.width = backing.width; canvas.height = backing.height;
      ctx!.setTransform(backing.dpr, 0, 0, backing.dpr, 0, 0);
      ctx!.fillStyle = '#102338'; ctx!.fillRect(0, 0, width, height);
      paint(image.source, image, rect);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (disposed) return;
      if (compositionContext) {
        compositionContext.globalAlpha = 1; compositionContext.drawImage(image.source, 0, 0);
        compositionContext.globalAlpha = .5; compositionContext.drawImage(frames[1].source, 0, 0);
        compositionContext.globalAlpha = 1;
        paint(composition, image, rect);
      }
      ctx!.getImageData(0, 0, 1, 1);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (disposed) return;
      canvas.dataset.warmState = 'ready'; canvas.dataset.warmMs = (performance.now() - warmStarted).toFixed(3);
      images = frames;
      const span = () => Math.max(1, section.offsetHeight - viewport.clientHeight);
      // Normal document scrolling stays available during loading or failure.
      pin = ScrollTrigger.create({ trigger: section, start: 'top top', end: () => `+=${span()}`,
        pin: viewport, pinSpacing: false, anticipatePin: 1,
        onUpdate: (trigger) => { callbacks.current.onProgress(trigger.progress); requestRender(); },
        onRefresh: (trigger) => { resize(); callbacks.current.onProgress(trigger.progress); requestRender(); } });
      tween = gsap.to(seq, { frame: manifest.frames.length - 1,
        ease: (p: number) => frameAtProgress(p, stops) / (manifest.frames.length - 1),
        onUpdate: requestRender,
        scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${span() * .83}`,
          scrub: true, invalidateOnRefresh: true } });
      canvas.dataset.animationReady = 'true';
      ScrollTrigger.refresh(); requestRender();
    }).catch((error: unknown) => {
      if (disposed) return;
      canvas.dataset.preloadState = 'failed'; canvas.dataset.preloadReady = 'false';
      canvas.dataset.loadError = error instanceof Error ? error.message : 'Photographic preload failed';
      canvas.dataset.decodedBytes = canvas.dataset.cacheBytes = '0';
      callbacks.current.onFailure();
    });
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      window.removeEventListener('resize', resize);
      tween?.scrollTrigger?.kill(); tween?.kill(); pin?.kill(true);
      preload.dispose(); images = undefined;
      composition.width = 0; composition.height = 0;
    };
  }, []);
  return <div className="photo-sequence">
    <img ref={posterRef} className="sequence-poster" src={manifest.frames[Math.round(initialFrame.current)].url}
      alt="Vista completa del palazzo nei frame forniti" width={manifest.width} height={manifest.height} fetchPriority="high" />
    <canvas ref={canvasRef} data-renderer="photographic-2d" role="img"
      aria-label="Percorso fotografico dall’edificio all’ascensore, controllato dallo scorrimento" />
  </div>;
}
