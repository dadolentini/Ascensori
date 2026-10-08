export function imageRectangle(iw: number, ih: number, width: number, height: number, mode: 'contain' | 'cover') {
  const scale = (mode === 'contain' ? Math.min : Math.max)(width / iw, height / ih);
  const drawnWidth = iw * scale, drawnHeight = ih * scale;
  return { x: (width - drawnWidth) / 2, y: (height - drawnHeight) / 2, width: drawnWidth, height: drawnHeight };
}
export function backingSize(width: number, height: number, deviceDpr: number, mobile: boolean) {
  const dpr = Math.max(1, Math.min(deviceDpr || 1, mobile ? 1.5 : 2));
  return { width: Math.round(width * dpr), height: Math.round(height * dpr), dpr };
}
