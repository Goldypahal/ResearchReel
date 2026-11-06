import React from 'react';

/**
 * Minimal, safe Markdown renderer for AI answers (no raw HTML is ever injected).
 * Supports headings, bold, italics, inline code, code blocks, bullet/numbered lists and links.
 */
const inline = (text: string, keyBase: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={k} className="px-1 py-0.5 rounded bg-[var(--foreground)]/10 text-[0.9em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[')) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok) || [];
      out.push(<a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-400 underline">{label}</a>);
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0; let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={key++} className="p-3 rounded-lg bg-black/40 overflow-x-auto text-xs"><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { blocks.push(<p key={key++} className="font-bold mt-2">{inline(h[2], `h${key}`)}</p>); i++; continue; }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(<ListTag key={key++} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>{items.map((it, j) => <li key={j}>{inline(it, `l${key}-${j}`)}</li>)}</ListTag>);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*([-*•]|\d+[.)])\s+)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key++}>{inline(para.join(' '), `p${key}`)}</p>);
  }
  return <div className="space-y-2 text-sm leading-relaxed break-words">{blocks}</div>;
}
