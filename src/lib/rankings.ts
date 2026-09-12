import type { PlayerRow } from './fetchData';

export type MetricKey =
  | 'skupnaOcena'
  | 'ocenaTrenerja'
  | 'ocenaIzVaj'
  | 'sede'
  | 'zgSp'
  | 'dotik'
  | 'visina'
  | 'sprejem'
  | 'podaja'
  | 'napad'
  | 'blok'
  | 'servis';

export const RANK_GROUPS = ['Vsi', 'V.', 'IV.', 'III.', 'II.', 'I.'];

export function metricValue(p: PlayerRow, key: MetricKey): number | null {
  switch (key) {
    case 'skupnaOcena':
      return p.godmode?.skupnaOcena ?? null;
    case 'ocenaTrenerja':
      return p.godmode?.ocenaTrenerja ?? null;
    case 'ocenaIzVaj':
      return p.godmode?.ocenaIzVaj ?? null;
    case 'sede':
      return p.spodnjiOdbojSede ?? null;
    case 'zgSp':
      return p.zgornjiSpodnjiOdboj ?? null;
    case 'dotik':
      return p.spodnjiOdbojDotikTal ?? null;
    case 'visina':
      return p.telesnaVisina ?? null;
    case 'sprejem':
      return p.godmode?.sprejem ?? null;
    case 'podaja':
      return p.godmode?.podaja ?? null;
    case 'napad':
      return p.godmode?.napad ?? null;
    case 'blok':
      return p.godmode?.blok ?? null;
    case 'servis':
      return p.godmode?.servis ?? null;
  }
}

// Uvrstitev igralca za dano metriko (višje je boljše): mesto = 1 + št. boljših.
// Vrne celice za skupine Vsi, V., IV., III., II., I. ali null, če igralec
// za to metriko nima podatka (takrat se tabela ne prikaže).
export function rankCells(
  self: PlayerRow,
  key: MetricKey,
  pool: PlayerRow[]
): { rank: number; total: number }[] | null {
  const v = metricValue(self, key);
  if (v === null) return null;
  return RANK_GROUPS.map((grp) => {
    const groupPool = pool.filter(
      (p) =>
        (grp === 'Vsi' || p.predlogSkupine === grp) &&
        (metricValue(p, key) ?? null) !== null
    );
    const better = groupPool.filter((p) => (metricValue(p, key) ?? -Infinity) > v).length;
    return { rank: better + 1, total: groupPool.length };
  });
}