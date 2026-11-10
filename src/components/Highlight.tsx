import { Fragment } from 'react';
import { normalizeText } from '../lib/utils';

/** Highlights query tokens inside text without using innerHTML. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const tokens = normalizeText(query).split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) return <>{text}</>;

  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(token, from);
      if (index === -1) break;
      ranges.push([index, index + token.length]);
      from = index + token.length;
    }
  }
  if (ranges.length === 0) return <>{text}</>;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], index) => {
    if (start > cursor) parts.push(<Fragment key={`t${index}`}>{text.slice(cursor, start)}</Fragment>);
    parts.push(<mark key={`m${index}`}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  return <>{parts}</>;
}
