import type { PlayerRow } from './fetchData';
import { formatRaw, formatScore } from './formatting';

export function buildPlayersCSV(rows: PlayerRow[]): string {
  let result = 'Ime,Sifra,Testiranje,Skupina,Skupna Ocena,Ocena Trenerja,Ocena iz vaj,Trener,';
  result +=
    'Spodnji odboj sede,Spodnji odboj sede (ocena),' +
    'Zgornji-spodnji odboj,Zgornji-spodnji odboj (ocena),' +
    'Spodnji odboj z dotikom tal,Spodnji odboj z dotikom tal (ocena),' +
    'Telesna višina,Telesna višina (ocena),' +
    'sprejem-obramba,podaja,napad,blok,servis\n';

  for (const p of rows) {
    const g = p.godmode;
    const name = g?.name || p.vzdevek;
    const sifra = p.vzdevek;
    const test = p.testiranje || '';
    const rank = p.predlogSkupine;
    const skupna = formatScore(g?.skupnaOcena);
    const ocenaTrener = formatScore(g?.ocenaTrenerja);
    const ocenaVaje = formatScore(g?.ocenaIzVaj);
    const trener = g?.trener ? `"${g.trener}"` : '""';

    const rawSede = formatRaw(p.spodnjiOdbojSede);
    const normSede = formatScore(g?.normSede);

    const rawZgSp = formatRaw(p.zgornjiSpodnjiOdboj);
    const normZgSp = formatScore(g?.normZgSp);

    const rawDotik = formatRaw(p.spodnjiOdbojDotikTal);
    const normDotik = formatScore(g?.normDotik);

    const rawVisina = formatRaw(p.telesnaVisina);
    const normVisina = formatScore(g?.normVisina);

    const sprejem = formatScore(g?.sprejem);
    const podaja = formatScore(g?.podaja);
    const napad = formatScore(g?.napad);
    const blok = formatScore(g?.blok);
    const servis = formatScore(g?.servis);

    result += `${name},${sifra},${test},${rank},${skupna},${ocenaTrener},${ocenaVaje},${trener},${rawSede},${normSede},${rawZgSp},${normZgSp},${rawDotik},${normDotik},${rawVisina},${normVisina},${sprejem},${podaja},${napad},${blok},${servis}\n`;
  }

  return result;
}