import React from 'react';
import Link from 'next/link';

/** Renders text with clickable #hashtags, @mentions and links. */
export default function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]{2,50}|@[a-z0-9_.]{3,30}|https?:\/\/[^\s<]+)/giu);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^#/.test(part)) return <Link key={i} href={`/search?q=${encodeURIComponent(part)}`} className="text-indigo-400 hover:underline">{part}</Link>;
        if (/^@/.test(part)) return <Link key={i} href={`/profile/${part.slice(1).toLowerCase()}`} className="text-indigo-400 hover:underline">{part}</Link>;
        if (/^https?:\/\//.test(part)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-400 hover:underline break-all">{part}</a>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
