/** Bound to the lifetime of the mounted renderer, not the application. */
export function observeContextLoss(canvas: EventTarget, onFailure: () => void): () => void {
  const lost = (event: Event) => {
    event.preventDefault();
    onFailure();
  };
  canvas.addEventListener('webglcontextlost', lost, { once: true });
  return () => canvas.removeEventListener('webglcontextlost', lost);
}
