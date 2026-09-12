import type { PlayerRow } from './fetchData';

export function splitTestTag(tag: string): { year: string; month: string; type: string } | null {
  const m = /^(\d{4})-(\d{1,2})-(.+)$/.exec(tag.trim());
  if (!m) return null;
  return { year: m[1], month: m[2], type: m[3] };
}

export function parseTestTag(tag: string): { year: number; month: number; type: string } | null {
  const p = splitTestTag(tag);
  if (!p) return null;
  return { year: parseInt(p.year, 10), month: parseInt(p.month, 10), type: p.type };
}

// Kronološka primerjava oznak oblike <leto>-<mesec>-<tip> (naraščajoče).
export function compareTestTags(a: string, b: string): number {
  const pa = parseTestTag(a);
  const pb = parseTestTag(b);
  if (!pa && !pb) return a.localeCompare(b);
  if (!pa) return -1;
  if (!pb) return 1;
  if (pa.year !== pb.year) return pa.year - pb.year;
  if (pa.month !== pb.month) return pa.month - pb.month;
  if (pa.type !== pb.type) return pa.type < pb.type ? -1 : 1;
  return 0;
}

export function getSortedTestTags(rows: PlayerRow[]): string[] {
  return [...new Set(rows.map((p) => p.testiranje).filter((t) => t))].sort(compareTestTags);
}

// Ikona tipa testiranja: ☀️ za mivko, 🏫 za dvorano
export function testTypeIcon(tag: string): string {
  const t = splitTestTag(tag)?.type.toLowerCase();
  if (t === 'mivka') return '☀️';
  if (t === 'dvorana') return '🏫';
  return '❓';
}