import type { JourneyPhase } from './pose';

export interface JourneyFallbackProps {
  phase?: JourneyPhase;
}

/** Static captures of the actual scene, without WebGL or camera motion. */
export function JourneyFallback({ phase = 'exterior' }: JourneyFallbackProps) {
  const exterior = phase === 'exterior' || phase === 'entrance';
  const lobby = phase === 'lobby';
  const closed = phase === 'elevator' || phase === 'approach';
  const scene = exterior ? 'exterior' : lobby ? 'lobby' : closed ? 'elevator-closed' : 'elevator-open';
  const description = exterior
    ? 'Edificio vetrato con balconi laterali e ingresso illuminato.'
    : lobby
      ? 'Lobby con colonne avorio, sospensioni organiche e ascensore interno.'
      : closed
        ? 'Un ascensore inox nella lobby, con due ante centrali chiuse.'
        : 'Lo stesso ascensore aperto, con pannelli scuri posteriori e pavimento rigato.';
  return <div className="journey-fallback">
    <img src={`/visual/scene-${scene}.jpg`} alt={`${description} Immagine statica della scena 3D.`}
      width="1440" height="900" decoding="async" />
  </div>;
}
export default JourneyFallback;
