export default function Icon({
  name = 'arrow',
  size = 20,
}: {
  name?:
    | 'arrow'
    | 'down'
    | 'plus'
    | 'minus'
    | 'close'
    | 'grid'
    | 'clock'
    | 'settings'
    | 'play'
    | 'download'
    | 'check';
  size?: number;
}) {
  const p: Record<string, string> = {
    arrow: 'M4 12h15m-6-6 6 6-6 6',
    down: 'M12 4v15m-6-6 6 6 6-6',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    close: 'm6 6 12 12M6 18 18 6',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    clock: 'M12 8v5l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    settings: 'M4 7h16M4 17h16M9 4v6M15 14v6',
    play: 'm9 5 11 7-11 7z',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    check: 'm5 12 4 4L19 6',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={p[name]} />
    </svg>
  );
}
