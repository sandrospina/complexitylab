import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

/** Renders a TeX string with KaTeX. Inline by default. */
export function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: block, throwOnError: false }), [tex, block]);
  return <span className={block ? 'tex-block' : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}
