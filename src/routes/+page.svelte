<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Footer from './Footer.svelte';
  import { fetchPublicSheetData, type PlayerRow } from '$lib/fetchData';

  let loading = true;
  let error: string | null = null;
  let players: PlayerRow[] = [];
  let isGodmode = false;

  type SortKey =
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

  let sortColumn: SortKey = 'rank';
  let sortAsc = false;

  const ranks = ['V.', 'IV.', 'III.', 'II.', 'I.', '?'];

  function setTableSortColumn(col: SortKey) {
    if (sortColumn === col) {
      sortAsc = !sortAsc;
    } else {
      sortColumn = col;
      sortAsc = col === 'name' || col === 'vzdevek' || col === 'trener';
    }
  }

  function formatScore(val: number | null | undefined): string {
    if (val === null || val === undefined) return '/';
    return Number.isInteger(val) ? val.toFixed(2) : val.toFixed(2);
  }

  function formatRaw(val: number | null | undefined): string {
    if (val === null || val === undefined) return '/';
    return String(val);
  }

  $: sortedPlayers = [...players].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    switch (sortColumn) {
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
  });

  function exportTableCSV(): string {
    let result = 'Ime,Sifra,Skupina,Skupna Ocena,Ocena Trenerja,Ocena iz vaj,Trener,';
    result +=
      'Spodnji odboj sede,Spodnji odboj sede (ocena),' +
      'Zgornji-spodnji odboj,Zgornji-spodnji odboj (ocena),' +
      'Spodnji odboj z dotikom tal,Spodnji odboj z dotikom tal (ocena),' +
      'Telesna višina,Telesna višina (ocena),' +
      'sprejem-obramba,podaja,napad,blok,servis\n';

    for (const p of sortedPlayers) {
      const g = p.godmode;
      const name = g?.name || p.vzdevek;
      const sifra = p.vzdevek;
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

      result += `${name},${sifra},${rank},${skupna},${ocenaTrener},${ocenaVaje},${trener},${rawSede},${normSede},${rawZgSp},${normZgSp},${rawDotik},${normDotik},${rawVisina},${normVisina},${sprejem},${podaja},${napad},${blok},${servis}\n`;
    }

    return result;
  }

  function downloadTable() {
    const link = document.createElement('a');
    const file = new Blob([exportTableCSV()], { type: 'text/csv;charset=utf-8;' });
    link.href = URL.createObjectURL(file);
    link.download = 'odbit_odbojkarski_karton.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  onMount(async () => {
    try {
      loading = true;
      error = null;
      const res = await fetchPublicSheetData($page.url.searchParams);
      players = res.data;
      isGodmode = res.isGodmode;
    } catch (e: any) {
      error = e.message || 'Napaka pri nalaganju podatkov.';
    } finally {
      loading = false;
    }
  });
</script>

<h1>
  <img src="/white_rabbit.png" alt="gibit logo" />
  ODBIT ODBOJKARSKI KARTON
</h1>

<div class="table-wrapper">
  {#if loading}
    <div class="loading">Nalaganje podatkov...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <table>
      <thead>
        <tr>
          <th>
            {#if isGodmode}
              <button
                type="button"
                class="download-btn"
                title="Prenesi tabelo (CSV)"
                on:click={downloadTable}
              >
                <img src="/download.svg" alt="Prenesi" />
              </button>
            {:else}
              #
            {/if}
          </th>

          {#if isGodmode}
            <th
              on:click={() => setTableSortColumn('name')}
              class:sorted={sortColumn === 'name'}
              class:asc={sortAsc}
            >
              Ime
            </th>
            <th
              on:click={() => setTableSortColumn('vzdevek')}
              class:sorted={sortColumn === 'vzdevek'}
              class:asc={sortAsc}
            >
              Vzdevek
            </th>
          {:else}
            <th
              on:click={() => setTableSortColumn('vzdevek')}
              class:sorted={sortColumn === 'vzdevek'}
              class:asc={sortAsc}
            >
              Vzdevek
            </th>
          {/if}

          <th
            on:click={() => setTableSortColumn('rank')}
            class:sorted={sortColumn === 'rank'}
            class:asc={sortAsc}
          >
            Predlog skupine
          </th>

          {#if isGodmode}
            <th
              on:click={() => setTableSortColumn('skupnaOcena')}
              class:sorted={sortColumn === 'skupnaOcena'}
              class:asc={sortAsc}
            >
              Skupna ocena
            </th>
            <th
              on:click={() => setTableSortColumn('ocenaTrenerja')}
              class:sorted={sortColumn === 'ocenaTrenerja'}
              class:asc={sortAsc}
            >
              Ocena trenerja
            </th>
            <th
              on:click={() => setTableSortColumn('ocenaIzVaj')}
              class:sorted={sortColumn === 'ocenaIzVaj'}
              class:asc={sortAsc}
            >
              Ocena iz vaj
            </th>
          {/if}

          <th
            on:click={() => setTableSortColumn('sede')}
            class:sorted={sortColumn === 'sede'}
            class:asc={sortAsc}
          >
            Spodnji odboj sede
          </th>
          <th
            on:click={() => setTableSortColumn('zgSp')}
            class:sorted={sortColumn === 'zgSp'}
            class:asc={sortAsc}
          >
            Zgornji-spodnji odboj
          </th>
          <th
            on:click={() => setTableSortColumn('dotik')}
            class:sorted={sortColumn === 'dotik'}
            class:asc={sortAsc}
          >
            Spodnji odboj z dotikom tal
          </th>
          <th
            on:click={() => setTableSortColumn('visina')}
            class:sorted={sortColumn === 'visina'}
            class:asc={sortAsc}
          >
            Telesna višina
          </th>

          {#if isGodmode}
            <th
              on:click={() => setTableSortColumn('sprejem')}
              class:sorted={sortColumn === 'sprejem'}
              class:asc={sortAsc}
            >
              sprejem-obramba
            </th>
            <th
              on:click={() => setTableSortColumn('podaja')}
              class:sorted={sortColumn === 'podaja'}
              class:asc={sortAsc}
            >
              podaja
            </th>
            <th
              on:click={() => setTableSortColumn('napad')}
              class:sorted={sortColumn === 'napad'}
              class:asc={sortAsc}
            >
              napad
            </th>
            <th
              on:click={() => setTableSortColumn('blok')}
              class:sorted={sortColumn === 'blok'}
              class:asc={sortAsc}
            >
              blok
            </th>
            <th
              on:click={() => setTableSortColumn('servis')}
              class:sorted={sortColumn === 'servis'}
              class:asc={sortAsc}
            >
              servis
            </th>
            <th
              on:click={() => setTableSortColumn('trener')}
              class:sorted={sortColumn === 'trener'}
              class:asc={sortAsc}
            >
              Trener
            </th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each sortedPlayers as p}
          <tr>
            <td>.</td>
            {#if isGodmode}
              <td>
                {#if p.godmode?.ocenaTrenerja && p.godmode?.ocenaIzVaj && Math.abs(p.godmode.ocenaTrenerja - p.godmode.ocenaIzVaj) > 1}
                  <span class="alert" title="Ocena trenerja odstopa za več kot 1">!!!!</span>
                {/if}
                {p.godmode?.name || p.vzdevek}
              </td>
              <td>{p.vzdevek}</td>
            {:else}
              <td>{p.vzdevek}</td>
            {/if}

            <td>{p.predlogSkupine}</td>

            {#if isGodmode}
              <td>{formatScore(p.godmode?.skupnaOcena)}</td>
              <td>{formatScore(p.godmode?.ocenaTrenerja)}</td>
              <td>{formatScore(p.godmode?.ocenaIzVaj)}</td>
            {/if}

            <td>
              {formatRaw(p.spodnjiOdbojSede)}
              {#if isGodmode && p.godmode?.normSede !== null && p.godmode?.normSede !== undefined}
                ({formatScore(p.godmode.normSede)})
              {/if}
            </td>
            <td>
              {formatRaw(p.zgornjiSpodnjiOdboj)}
              {#if isGodmode && p.godmode?.normZgSp !== null && p.godmode?.normZgSp !== undefined}
                ({formatScore(p.godmode.normZgSp)})
              {/if}
            </td>
            <td>
              {formatRaw(p.spodnjiOdbojDotikTal)}
              {#if isGodmode && p.godmode?.normDotik !== null && p.godmode?.normDotik !== undefined}
                ({formatScore(p.godmode.normDotik)})
              {/if}
            </td>
            <td>
              {formatRaw(p.telesnaVisina)}
              {#if isGodmode && p.godmode?.normVisina !== null && p.godmode?.normVisina !== undefined}
                ({formatScore(p.godmode.normVisina)})
              {/if}
            </td>

            {#if isGodmode}
              <td>{formatScore(p.godmode?.sprejem)}</td>
              <td>{formatScore(p.godmode?.podaja)}</td>
              <td>{formatScore(p.godmode?.napad)}</td>
              <td>{formatScore(p.godmode?.blok)}</td>
              <td>{formatScore(p.godmode?.servis)}</td>
              <td>{p.godmode?.trener || ''}</td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <Footer />
</div>

<style>
  :global(body) {
    margin: 0;
  }
  :global(body) * {
    font-family: 'Ubuntu', sans-serif;
  }
  h1 {
    background-color: #1c93d1;
    margin: 0;
    padding: 0.5em;
    color: white;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
  }
  h1 img {
    height: 1.4em;
  }
  .table-wrapper {
    text-align: center;
    max-width: 100vw;
    overflow-x: auto;
    padding-bottom: 2em;
  }
  .loading,
  .error {
    margin: 3em auto;
    font-size: 1.2em;
    color: #555;
  }
  .error {
    color: #c00;
  }
  table {
    margin-top: 1.5em;
    max-width: 100%;
    display: inline-block;
    overflow-x: auto;
    border-collapse: collapse;
  }
  thead th {
    padding: 0.8em;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 20;
    background: #1c93d1;
    color: white;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
  }
  thead th.sorted::after {
    content: ' ▼';
    font-size: 0.8em;
  }
  thead th.sorted.asc::after {
    content: ' ▲';
    font-size: 0.8em;
  }
  tbody tr {
    counter-increment: rowNumber;
  }
  tbody tr td:first-child::before {
    content: counter(rowNumber);
    min-width: 1em;
  }
  td:first-child {
    color: #888;
    font-size: 0.9em;
    padding: 0.6em 0.8em;
  }
  td:nth-child(2),
  th:nth-child(2) {
    position: sticky;
    left: 0;
    z-index: 10;
  }
  th:nth-child(2) {
    z-index: 30;
    background: #1c93d1;
  }
  td {
    text-align: left;
    padding: 0.6em 0.8em;
    white-space: nowrap;
  }
  tbody tr:nth-child(even) td:nth-child(2) {
    background: #fff;
  }
  tbody tr:nth-child(odd),
  tbody tr:nth-child(odd) td:nth-child(2) {
    background: #f5f5f5;
  }
  .alert {
    color: red;
    font-weight: bold;
    margin-right: 0.3em;
  }
  .download-btn {
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    display: inline-flex;
    align-items: center;
  }
  .download-btn img {
    height: 1.2em;
    filter: brightness(0) invert(1);
  }
</style>