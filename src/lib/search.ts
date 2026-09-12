import type { PlayerRow } from './fetchData';
import { comparePlayers, type SortKey } from './sorting';

// Normalizacija za iskanje: male črke, presledki in ločila (.,-~!?) postanejo en presledek
export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function matchesFull(value: string, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return false;
  return normalizeText(value).includes(q);
}

export function matchesAnyWord(value: string, query: string): boolean {
  const words = normalizeText(query).split(' ').filter((w) => w);
  if (words.length === 0) return false;
  const v = normalizeText(value);
  return words.some((w) => v.includes(w));
}

// Razbije besedilo na dele; deli, ki se ujemajo s katerokoli besedo iskalnega
// niza (neobčutljivo na velikost črk), so označeni za krepki prikaz.
export function highlightParts(
  value: string,
  query: string
): { text: string; hl: boolean }[] {
  const words = [...new Set(normalizeText(query).split(' ').filter((w) => w))].sort(
    (a, b) => b.length - a.length
  );
  if (words.length === 0 || !value) return [{ text: value, hl: false }];
  const lower = value.toLowerCase();
  const ranges: [number, number][] = [];
  for (const w of words) {
    let from = 0;
    while (true) {
      const i = lower.indexOf(w, from);
      if (i === -1) break;
      ranges.push([i, i + w.length]);
      from = i + 1;
    }
  }
  if (ranges.length === 0) return [{ text: value, hl: false }];
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  const parts: { text: string; hl: boolean }[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) parts.push({ text: value.slice(pos, s), hl: false });
    parts.push({ text: value.slice(s, e), hl: true });
    pos = e;
  }
  if (pos < value.length) parts.push({ text: value.slice(pos), hl: false });
  return parts;
}

// Najprej vrstice, ki vsebujejo celoten iskalni niz, nato tiste, ki vsebujejo
// katerokoli besedo; znotraj vsake skupine velja izbrano razvrščanje.
// Stolpca column/asc sta namerna argumenta, da ostane stavek reaktiven tudi
// na klike po glavah stolpcev.
export function applySearchAndSort(
  rows: PlayerRow[],
  nameQuery: string,
  vzdevekQuery: string,
  column: SortKey,
  asc: boolean
): PlayerRow[] {
  const qN = normalizeText(nameQuery);
  const qV = normalizeText(vzdevekQuery);
  if (!qN && !qV) return [...rows].sort((a, b) => comparePlayers(a, b, column, asc));
  const scored: { p: PlayerRow; key: number }[] = [];
  for (const p of rows) {
    let key = 0;
    if (qN) {
      const v = p.godmode?.name || p.vzdevek;
      if (matchesFull(v, qN)) key += 0;
      else if (matchesAnyWord(v, qN)) key += 1;
      else continue;
    }
    if (qV) {
      if (matchesFull(p.vzdevek, qV)) key += 0;
      else if (matchesAnyWord(p.vzdevek, qV)) key += 1;
      else continue;
    }
    scored.push({ p, key });
  }
  scored.sort((a, b) => a.key - b.key || comparePlayers(a.p, b.p, column, asc));
  return scored.map((s) => s.p);
}