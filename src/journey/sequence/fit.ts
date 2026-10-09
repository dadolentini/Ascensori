export function imageRectangle(iw: number, ih: number, width: number, height: number, mode: 'contain' | 'cover') {
  const scale = (mode === 'contain' ? Math.min : Math.max)(width / iw, height / ih);
  const drawnWidth = iw * scale, drawnHeight = ih * scale;
  return { x: (width - drawnWidth) / 2, y: (height - drawnHeight) / 2, width: drawnWidth, height: drawnHeight };
}
export function frameDecodeSize(iw: number, ih: number, count: number, budget: number, maxWidth: number) {
  const scale = Math.min(1, maxWidth / iw, Math.sqrt(budget / (count * iw * ih * 4)));
  return { width: Math.max(1, Math.floor(iw * scale)), height: Math.max(1, Math.floor(ih * scale)) };
}
export function backingSize(width: number, height: number, deviceDpr: number, mobile: boolean,
  photo?: { imageWidth: number; progress: number }) {
  const deviceDensity = Math.max(1, Math.min(deviceDpr || 1, mobile ? 1.5 : 2));
  // Keep device density through the contain view and approach to full cover.
  // Fullscreen photos need no more pixels than their retained native width.
  const dpr = photo && photo.progress >= .25
    ? Math.min(deviceDensity, Math.max(1024, photo.imageWidth) / Math.max(1, width)) : deviceDensity;
  return { width: Math.round(width * dpr), height: Math.round(height * dpr), dpr };
}
export interface PhotoChapter {
  id: string; from: number; to: number; focal: { x: number; y: number };
}
export function photoRectangle(iw: number, ih: number, width: number, height: number, progress: number,
  chapter: PhotoChapter | boolean) {
  const scene = typeof chapter === 'boolean'
    ? { id: 'exterior', from: 0, to: .18, focal: { x: .5, y: chapter ? .38 : .5 } }
    : chapter;
  const stage = Math.min(1, Math.max(0, (progress - scene.from) / Math.max(.001, scene.to - scene.from)));
  const end = imageRectangle(iw, ih, width, height, 'cover');
  const focalY = scene.focal.y + (scene.id === 'hall' ? .04 * stage : 0);
  end.x = (width - end.width) * scene.focal.x;
  end.y = (height - end.height) * focalY;
  if (scene.id !== 'exterior') return end;
  const mobile = width < 768;
  const start = imageRectangle(iw, ih, width, mobile ? height * .45 : Math.max(1, height - 160), 'contain');
  start.y += mobile ? 88 : 80;
  if (!mobile) start.x = Math.max(0, width - start.width - width * .05);
  const approachStart = typeof chapter === 'boolean' ? 0 : scene.from + .1;
  const t = Math.min(1, Math.max(0, (progress - approachStart) / Math.max(.001, scene.to - approachStart)));
  const blend = t * t * (3 - 2 * t);
  return { x: start.x + (end.x - start.x) * blend, y: start.y + (end.y - start.y) * blend,
    width: start.width + (end.width - start.width) * blend,
    height: start.height + (end.height - start.height) * blend };
}
