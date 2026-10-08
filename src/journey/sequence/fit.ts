export function imageRectangle(iw: number, ih: number, width: number, height: number, mode: 'contain' | 'cover') {
  const scale = (mode === 'contain' ? Math.min : Math.max)(width / iw, height / ih);
  const drawnWidth = iw * scale, drawnHeight = ih * scale;
  return { x: (width - drawnWidth) / 2, y: (height - drawnHeight) / 2, width: drawnWidth, height: drawnHeight };
}
export function backingSize(width: number, height: number, deviceDpr: number, mobile: boolean) {
  const dpr = Math.max(1, Math.min(deviceDpr || 1, mobile ? 1.5 : 2));
  return { width: Math.round(width * dpr), height: Math.round(height * dpr), dpr };
}
export function photoRectangle(iw: number, ih: number, width: number, height: number, progress: number, entrance: boolean) {
  const mobile = width < 768;
  const start = imageRectangle(iw, ih, width, mobile ? height * .45 : Math.max(1, height - 160), 'contain');
  start.y += mobile ? 88 : 80;
  if (!mobile) start.x = Math.max(0, width - start.width - width * .05);
  const end = imageRectangle(iw, ih, width, height, 'cover');
  if (entrance) end.y = (height - end.height) * .8;
  const t = Math.min(1, Math.max(0, progress / .18));
  const blend = t * t * (3 - 2 * t);
  return { x: start.x + (end.x - start.x) * blend, y: start.y + (end.y - start.y) * blend,
    width: start.width + (end.width - start.width) * blend,
    height: start.height + (end.height - start.height) * blend };
}
