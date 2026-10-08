import katex from 'katex';
export default function Formula({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, {
    throwOnError: false,
    displayMode: block,
    output: 'htmlAndMathml',
    strict: 'ignore',
  });
  return (
    <span
      className={`formula ${block ? 'formula-block' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
