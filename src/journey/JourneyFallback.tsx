import { useId } from 'react';
import type { JourneyPhase } from './pose';

export interface JourneyFallbackProps {
  phase?: JourneyPhase | string;
}

/** Original accessible illustration; stays independent of WebGL and the simulator. */
export function JourneyFallback({ phase = 'exterior' }: JourneyFallbackProps) {
  const id = useId().replaceAll(':', '');
  const exterior = phase === 'exterior' || phase === 'entrance';
  const corridor = phase === 'corridor' || phase === 'turn';
  const description = exterior
    ? 'Edificio per uffici al crepuscolo, con ingresso illuminato.'
    : corridor
      ? 'Corridoio della lobby che conduce a destra verso gli ascensori.'
      : 'Quattro ascensori in acciaio satinato; il secondo apre la cabina.';
  return (
    <svg
      viewBox="0 0 1200 800"
      role="img"
      aria-labelledby={`${id}-title ${id}-description`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', background: '#112638' }}
    >
      <title id={`${id}-title`}>Architettura e mobilità verticale</title>
      <desc id={`${id}-description`}>
        {description} Illustrazione statica senza movimento della camera.
      </desc>
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor="#0c2037" />
          <stop offset="1" stopColor="#71818a" />
        </linearGradient>
        <linearGradient id={`${id}-steel`}>
          <stop stopColor="#354952" />
          <stop offset=".28" stopColor="#c8d0cf" />
          <stop offset=".5" stopColor="#738087" />
          <stop offset=".78" stopColor="#c5cbc8" />
          <stop offset="1" stopColor="#455860" />
        </linearGradient>
        <linearGradient id={`${id}-wall`} x2="0" y2="1">
          <stop stopColor="#e2d7c1" />
          <stop offset="1" stopColor="#7a796f" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x2="0" y2="1">
          <stop stopColor="#9e9a8b" />
          <stop offset="1" stopColor="#4b565a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill={`url(#${id}-sky)`} />
      {exterior ? (
        <g>
          {[60, 195, 335, 990, 1100].map((x, i) => (
            <rect key={x} x={x} y={390 + (i % 3) * 50} width="90" height="340" fill="#1b3447" />
          ))}
          <path d="M0 680H1200V800H0Z" fill="#283c47" />
          <path d="M665 103L865 147V630L665 655Z" fill="#152f44" />
          <path d="M440 142L665 103V655L440 630Z" fill="#32536a" />
          {Array.from({ length: 15 }, (_, floor) => (
            <g key={floor}>
              <path
                d={`M440 ${154 + floor * 32}L665 ${115 + floor * 35}L865 ${159 + floor * 31}`}
                fill="none"
                stroke="#829296"
                strokeWidth="3"
              />
              {[464, 512, 560, 608].map((x, column) => (
                <rect
                  key={x}
                  x={x}
                  y={158 + floor * 31}
                  width="27"
                  height="22"
                  fill={(floor + column * 2) % 5 === 0 ? '#d6b176' : '#7b939e'}
                  opacity=".72"
                />
              ))}
            </g>
          ))}
          {[449, 512, 585, 656].map((x) => (
            <path key={x} d={`M${x} 143V647`} stroke="#cdb88d" strokeWidth="2" />
          ))}
          <rect x="330" y="623" width="645" height="100" fill="#263e4a" />
          <rect x="535" y="635" width="175" height="90" fill="#ddc496" />
          <path d="M320 614H980" stroke="#d9bd87" strokeWidth="7" />
          <rect x="596" y="650" width="54" height="75" fill="#44565b" />
          <path d="M0 754H1200" stroke="#64716c" />
        </g>
      ) : corridor ? (
        <g>
          <path d="M0 0H1200L745 220H450Z" fill="#c5bba7" />
          <path d="M0 0L450 220V520L0 800Z" fill="#797f79" />
          <path d="M1200 0L745 220V520L1200 800Z" fill="#b2a996" />
          <path d="M0 800L450 520H745L1200 800Z" fill={`url(#${id}-floor)`} />
          <rect x="450" y="220" width="295" height="300" fill="#584c3b" />
          <rect x="515" y="268" width="148" height="220" fill="#c2b59d" />
          <path d="M90 35L474 236M1100 32L724 236" stroke="#ffe4b2" strokeWidth="5" />
          <path d="M792 235V520H1110V650" fill="none" stroke="#e5d7b7" strokeWidth="5" />
          <path
            d="M0 790L450 520M300 800L515 520M890 800L685 520"
            stroke="#9f9d8d"
            strokeWidth="2"
          />
        </g>
      ) : (
        <g>
          <rect width="1200" height="585" fill={`url(#${id}-wall)`} />
          <rect y="585" width="1200" height="215" fill={`url(#${id}-floor)`} />
          <path d="M0 74H1200" stroke="#ffe2a8" strokeWidth="5" />
          {[110, 365, 620, 875].map((x, index) => (
            <g key={x}>
              <rect x={x - 12} y="174" width="224" height="416" fill="#4a5657" />
              <rect x={x} y="188" width="200" height="390" fill={`url(#${id}-steel)`} />
              {index === 1 && phase !== 'elevators' && phase !== 'approach' ? (
                <g>
                  <rect x={x + 45} y="188" width="110" height="390" fill="#253943" />
                  <rect x={x + 64} y="224" width="72" height="266" fill="#74868b" />
                  <path d={`M${x + 45} 195H${x + 155}`} stroke="#ffe6b8" strokeWidth="5" />
                </g>
              ) : (
                <path d={`M${x + 100} 188V578`} stroke="#33444a" strokeWidth="3" />
              )}
              <rect x={x - 34} y="354" width="12" height="38" fill="#c1b080" />
              <path d={`M${x} 581H${x + 200}`} stroke="#c7cbc0" strokeWidth="6" />
              <path d={`M${x} 169H${x + 200}`} stroke="#ffe3aa" strokeWidth="3" />
            </g>
          ))}
          <path
            d="M0 745H1200M120 800L420 585M1000 800L730 585"
            stroke="#abb09e"
            strokeWidth="2"
            opacity=".5"
          />
        </g>
      )}
    </svg>
  );
}
export default JourneyFallback;
