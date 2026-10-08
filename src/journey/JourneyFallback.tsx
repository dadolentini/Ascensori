import manifest from './sequence/manifest.json';

export interface JourneyFallbackProps {
  phase?: string;
}

/** Supplied photographic frames, without canvas rendering or camera motion. */
export function JourneyFallback({ phase = 'exterior' }: JourneyFallbackProps) {
  const exterior = phase === 'exterior' || phase === 'entrance';
  const lobby = phase === 'lobby';
  const closed = phase === 'elevator' || phase === 'approach';
  const frame = manifest.frames[exterior ? 0 : lobby ? 6 : closed ? 9 : manifest.frames.length - 1];
  const description = exterior
    ? 'Edificio vetrato con balconi laterali e ingresso illuminato.'
    : lobby
      ? 'Lobby con colonne avorio, sospensioni organiche e ascensore interno.'
      : closed
        ? 'Un ascensore inox nella lobby, con due ante centrali chiuse.'
        : manifest.complete ? 'Lo stesso ascensore aperto e illuminato.' : 'Vista frontale dell’ascensore chiuso.';
  return <div className="journey-fallback">
    <img src={frame.url} alt={`${description} Frame originale fornito per il percorso.`}
      width={manifest.width} height={manifest.height} decoding="async" />
  </div>;
}
export default JourneyFallback;
