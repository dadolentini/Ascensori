import katex from 'katex';
import { memo, useMemo } from 'react';
const Formula = memo(function Formula({ tex, block = false, label = 'Formula matematica: scorri orizzontalmente se necessario' }: { tex: string; block?: boolean; label?: string }) {
  const html = useMemo(() => katex.renderToString(tex, {
    throwOnError: false,
    displayMode: block,
    output: 'htmlAndMathml',
    strict: 'ignore',
  }), [tex, block]);
  return (
    <span
      className={`formula ${block ? 'formula-block' : ''}`}
      tabIndex={block ? 0 : undefined}
      role={block ? 'region' : undefined}
      aria-label={block ? label : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
export default Formula;
