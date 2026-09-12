import type { PlayerRow } from './fetchData';

export type SortKey =
  | 'rank'
  | 'name'
  | 'vzdevek'
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
  | 'servis'
  | 'trener';

export const ranks = ['V.', 'IV.', 'III.', 'II.', 'I.', '?'];

export function comparePlayers(a: PlayerRow, b: PlayerRow, column: SortKey, asc: boolean): number {
  const mul = asc ? 1 : -1;
  switch (column) {
    case 'rank': {
      const rA = ranks.indexOf(a.predlogSkupine);
      const rB = ranks.indexOf(b.predlogSkupine);
      const rankDiff = (rA === -1 ? 99 : rA) - (rB === -1 ? 99 : rB);
      if (rankDiff !== 0) return mul * -rankDiff;
      const sA = a.godmode?.skupnaOcena ?? -1;
      const sB = b.godmode?.skupnaOcena ?? -1;
      return mul * (sB - sA);
    }
    case 'name': {
      const nA = a.godmode?.name || a.vzdevek;
      const nB = b.godmode?.name || b.vzdevek;
      return mul * nA.localeCompare(nB);
    }
    case 'vzdevek':
      return mul * a.vzdevek.localeCompare(b.vzdevek);
    case 'skupnaOcena': {
      const sA = a.godmode?.skupnaOcena ?? -1;
      const sB = b.godmode?.skupnaOcena ?? -1;
      return mul * (sA - sB);
    }
    case 'ocenaTrenerja': {
      const sA = a.godmode?.ocenaTrenerja ?? -1;
      const sB = b.godmode?.ocenaTrenerja ?? -1;
      return mul * (sA - sB);
    }
    case 'ocenaIzVaj': {
      const sA = a.godmode?.ocenaIzVaj ?? -1;
      const sB = b.godmode?.ocenaIzVaj ?? -1;
      return mul * (sA - sB);
    }
    case 'sede': {
      const vA = a.spodnjiOdbojSede ?? -1;
      const vB = b.spodnjiOdbojSede ?? -1;
      return mul * (vA - vB);
    }
    case 'zgSp': {
      const vA = a.zgornjiSpodnjiOdboj ?? -1;
      const vB = b.zgornjiSpodnjiOdboj ?? -1;
      return mul * (vA - vB);
    }
    case 'dotik': {
      const vA = a.spodnjiOdbojDotikTal ?? -1;
      const vB = b.spodnjiOdbojDotikTal ?? -1;
      return mul * (vA - vB);
    }
    case 'visina': {
      const vA = a.telesnaVisina ?? -1;
      const vB = b.telesnaVisina ?? -1;
      return mul * (vA - vB);
    }
    case 'sprejem': {
      const vA = a.godmode?.sprejem ?? -1;
      const vB = b.godmode?.sprejem ?? -1;
      return mul * (vA - vB);
    }
    case 'podaja': {
      const vA = a.godmode?.podaja ?? -1;
      const vB = b.godmode?.podaja ?? -1;
      return mul * (vA - vB);
    }
    case 'napad': {
      const vA = a.godmode?.napad ?? -1;
      const vB = b.godmode?.napad ?? -1;
      return mul * (vA - vB);
    }
    case 'blok': {
      const vA = a.godmode?.blok ?? -1;
      const vB = b.godmode?.blok ?? -1;
      return mul * (vA - vB);
    }
    case 'servis': {
      const vA = a.godmode?.servis ?? -1;
      const vB = b.godmode?.servis ?? -1;
      return mul * (vA - vB);
    }
    case 'trener': {
      const tA = a.godmode?.trener || '';
      const tB = b.godmode?.trener || '';
      return mul * tA.localeCompare(tB);
    }
    default:
      return 0;
  }
}