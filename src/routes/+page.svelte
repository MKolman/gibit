<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Footer from './Footer.svelte';
  import { fetchPublicSheetData, type PlayerRow } from '$lib/fetchData';

  let loading = true;
  let error: string | null = null;
  let players: PlayerRow[] = [];
  let isGodmode = false;
  let enabledTests: string[] = [];
  let searchName = '';
  let searchVzdevek = '';
  let searchingName = false;
  let searchingVzdevek = false;
  let selectedPlayer: PlayerRow | null = null;
  let dialogEl: HTMLDialogElement | undefined;

  $: if (dialogEl && selectedPlayer && !dialogEl.open) dialogEl.showModal();
  $: if (dialogEl && !selectedPlayer && dialogEl.open) dialogEl.close();

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

  function splitTestTag(tag: string): { year: string; month: string; type: string } | null {
    const m = /^(\d{4})-(\d{1,2})-(.+)$/.exec(tag.trim());
    if (!m) return null;
    return { year: m[1], month: m[2], type: m[3] };
  }

  function parseTestTag(tag: string): { year: number; month: number; type: string } | null {
    const p = splitTestTag(tag);
    if (!p) return null;
    return { year: parseInt(p.year, 10), month: parseInt(p.month, 10), type: p.type };
  }

  function capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // Ikona tipa testiranja: ☀️ za mivko, 🏫 za dvorano
  function testTypeIcon(tag: string): string {
    const t = splitTestTag(tag)?.type.toLowerCase();
    if (t === 'mivka') return '☀️';
    if (t === 'dvorana') return '🏫';
    return '❓';
  }

  // Kronološka primerjava oznak oblike <leto>-<mesec>-<tip> (naraščajoče).
  function compareTestTags(a: string, b: string): number {
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

  function getSortedTestTags(rows: PlayerRow[]): string[] {
    return [...new Set(rows.map((p) => p.testiranje).filter((t) => t))].sort(compareTestTags);
  }

  function toggleTest(tag: string) {
    if (enabledTests.includes(tag)) {
      enabledTests = enabledTests.filter((t) => t !== tag);
    } else {
      enabledTests = [...enabledTests, tag].sort(compareTestTags);
    }
  }

  $: availableTests = getSortedTestTags(players);
  // Oznako v prvem stolpcu pokažemo le, ko je vključenih več testov hkrati
  $: showTestTag = enabledTests.length > 1;
  $: filteredPlayers =
    availableTests.length === 0
      ? players
      : players.filter((p) => !p.testiranje || enabledTests.includes(p.testiranje));

  function comparePlayers(a: PlayerRow, b: PlayerRow, column: SortKey, asc: boolean): number {
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

  // Normalizacija za iskanje: male črke, presledki in ločila (.,-~!?) postanejo en presledek
  function normalizeText(s: string): string {
    return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function matchesFull(value: string, query: string): boolean {
    const q = normalizeText(query);
    if (!q) return false;
    return normalizeText(value).includes(q);
  }

  function matchesAnyWord(value: string, query: string): boolean {
    const words = normalizeText(query).split(' ').filter((w) => w);
    if (words.length === 0) return false;
    const v = normalizeText(value);
    return words.some((w) => v.includes(w));
  }

  function autofocus(node: HTMLInputElement) {
    node.focus();
  }

  // Zapiranje dialoga s klikom na ozadje (imperativno, da se izognemo
  // a11y-opozorilom za on:click na neinteraktivnem elementu)
  function backdropClose(node: HTMLDialogElement) {
    const onClick = (e: MouseEvent) => {
      if (e.target === node) node.close();
    };
    node.addEventListener('click', onClick);
    return {
      destroy() {
        node.removeEventListener('click', onClick);
      }
    };
  }

  // Razbije besedilo na dele; deli, ki se ujemajo s katerokoli besedo iskalnega
  // niza (neobčutljivo na velikost črk), so označeni za krepki prikaz.
  function highlightParts(
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

  function clearNameSearch() {
    searchName = '';
    searchingName = false;
  }

  function clearVzdevekSearch() {
    searchVzdevek = '';
    searchingVzdevek = false;
  }

  type MetricKey =
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

  const RANK_GROUPS = ['Vsi', 'V.', 'IV.', 'III.', 'II.', 'I.'];

  function metricValue(p: PlayerRow, key: MetricKey): number | null {
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
  function rankCells(
    self: PlayerRow,
    key: MetricKey
  ): { rank: number; total: number }[] | null {
    const v = metricValue(self, key);
    if (v === null) return null;
    return RANK_GROUPS.map((grp) => {
      const pool = filteredPlayers.filter(
        (p) =>
          (grp === 'Vsi' || p.predlogSkupine === grp) &&
          (metricValue(p, key) ?? null) !== null
      );
      const better = pool.filter((p) => (metricValue(p, key) ?? -Infinity) > v).length;
      return { rank: better + 1, total: pool.length };
    });
  }

  interface DlgMetric {
    label: string;
    text: string;
    key: MetricKey | null;
  }

  function exerciseText(
    raw: number | null | undefined,
    norm: number | null | undefined
  ): string {
    const r = formatRaw(raw);
    if (raw === null || raw === undefined || norm === null || norm === undefined) return r;
    return `${r} (${formatScore(norm)})`;
  }

  $: dlgMetrics = ((): DlgMetric[] => {
    const sp = selectedPlayer;
    if (!sp) return [];
    const g = sp.godmode;
    const rows: DlgMetric[] = [];
    if (isGodmode) {
      rows.push(
        { label: 'Skupna ocena', text: formatScore(g?.skupnaOcena), key: 'skupnaOcena' },
        { label: 'Ocena trenerja', text: formatScore(g?.ocenaTrenerja), key: 'ocenaTrenerja' },
        { label: 'Ocena iz vaj', text: formatScore(g?.ocenaIzVaj), key: 'ocenaIzVaj' }
      );
    }
    rows.push(
      {
        label: 'Spodnji odboj sede',
        text: exerciseText(sp.spodnjiOdbojSede, g?.normSede),
        key: 'sede'
      },
      {
        label: 'Zgornji-spodnji odboj',
        text: exerciseText(sp.zgornjiSpodnjiOdboj, g?.normZgSp),
        key: 'zgSp'
      },
      {
        label: 'Spodnji odboj z dotikom tal',
        text: exerciseText(sp.spodnjiOdbojDotikTal, g?.normDotik),
        key: 'dotik'
      },
      {
        label: 'Telesna višina',
        text: exerciseText(sp.telesnaVisina, g?.normVisina),
        key: 'visina'
      }
    );
    if (isGodmode) {
      rows.push(
        { label: 'sprejem-obramba', text: formatScore(g?.sprejem), key: 'sprejem' },
        { label: 'podaja', text: formatScore(g?.podaja), key: 'podaja' },
        { label: 'napad', text: formatScore(g?.napad), key: 'napad' },
        { label: 'blok', text: formatScore(g?.blok), key: 'blok' },
        { label: 'servis', text: formatScore(g?.servis), key: 'servis' },
        { label: 'Trener', text: g?.trener || '/', key: null }
      );
    }
    return rows;
  })();

  // Najprej vrstice, ki vsebujejo celoten iskalni niz, nato tiste, ki vsebujejo
  // katerokoli besedo; znotraj vsake skupine velja izbrano razvrščanje.
  // Stolpca sortColumn/sortAsc sta namerna argumenta, da ostane stavek
  // reaktiven tudi na klike po glavah stolpcev.
  function applySearchAndSort(
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

  $: sortedPlayers = applySearchAndSort(
    filteredPlayers,
    searchName,
    searchVzdevek,
    sortColumn,
    sortAsc
  );

  function exportTableCSV(): string {
    let result = 'Ime,Sifra,Testiranje,Skupina,Skupna Ocena,Ocena Trenerja,Ocena iz vaj,Trener,';
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
      // Privzeto prikaži samo najnovejše testiranje
      const tags = getSortedTestTags(res.data);
      enabledTests = tags.length > 0 ? [tags[tags.length - 1]] : [];
    } catch (e: any) {
      error = e.message || 'Napaka pri nalaganju podatkov.';
    } finally {
      loading = false;
    }
  });
</script>

<div class="page">
  <h1>
    <img src="/white_rabbit.png" alt="gibit logo" />
    ODBIT ODBOJKARSKI KARTON
  </h1>

  {#if !loading && !error && availableTests.length > 0}
    <div class="test-filter">
      <span class="test-filter-label">Testiranje:</span>
      {#each [...availableTests].reverse() as tag (tag)}
        {@const parts = splitTestTag(tag)}
        <button
          type="button"
          class="test-chip"
          class:active={enabledTests.includes(tag)}
          aria-pressed={enabledTests.includes(tag)}
          title={`${tag} — ${enabledTests.includes(tag) ? 'Skrij test' : 'Prikaži test'}`}
          on:click={() => toggleTest(tag)}
        >
          {#if parts}
            <span class="chip-date">{parts.year} {parts.month}</span>
            <span class="chip-type">{capitalize(parts.type)}</span>
          {:else}
            {tag}
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  <div class="table-wrapper">
  {#if loading}
    <div class="loading">Nalaganje podatkov...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <table class="players-table">
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
              {showTestTag ? 'Test' : '#'}
            {/if}
          </th>

          {#if isGodmode}
            <th
              on:click={() => !searchingName && setTableSortColumn('name')}
              class:sorted={sortColumn === 'name'}
              class:asc={sortAsc}
            >
              {#if searchingName}
                <span class="search-wrap">
                  <input
                    bind:value={searchName}
                    use:autofocus
                    placeholder="Išči..."
                    on:click|stopPropagation={() => {}}
                    on:keydown={(e) => {
                      if (e.key === 'Escape') clearNameSearch();
                    }}
                  />
                  <button
                    type="button"
                    class="search-clear"
                    title="Počisti iskanje"
                    on:click|stopPropagation={clearNameSearch}
                  >
                    ✕
                  </button>
                </span>
              {:else}
                Ime
                <button
                  type="button"
                  class="search-toggle"
                  title="Išči po imenu"
                  on:click|stopPropagation={() => (searchingName = true)}
                >
                  🔍
                </button>
              {/if}
            </th>
            <th
              on:click={() => !searchingVzdevek && setTableSortColumn('vzdevek')}
              class:sorted={sortColumn === 'vzdevek'}
              class:asc={sortAsc}
            >
              {#if searchingVzdevek}
                <span class="search-wrap">
                  <input
                    bind:value={searchVzdevek}
                    use:autofocus
                    placeholder="Išči..."
                    on:click|stopPropagation={() => {}}
                    on:keydown={(e) => {
                      if (e.key === 'Escape') clearVzdevekSearch();
                    }}
                  />
                  <button
                    type="button"
                    class="search-clear"
                    title="Počisti iskanje"
                    on:click|stopPropagation={clearVzdevekSearch}
                  >
                    ✕
                  </button>
                </span>
              {:else}
                Vzdevek
                <button
                  type="button"
                  class="search-toggle"
                  title="Išči po vzdevku"
                  on:click|stopPropagation={() => (searchingVzdevek = true)}
                >
                  🔍
                </button>
              {/if}
            </th>
          {:else}
            <th
              on:click={() => !searchingVzdevek && setTableSortColumn('vzdevek')}
              class:sorted={sortColumn === 'vzdevek'}
              class:asc={sortAsc}
            >
              {#if searchingVzdevek}
                <span class="search-wrap">
                  <input
                    bind:value={searchVzdevek}
                    use:autofocus
                    placeholder="Išči..."
                    on:click|stopPropagation={() => {}}
                    on:keydown={(e) => {
                      if (e.key === 'Escape') clearVzdevekSearch();
                    }}
                  />
                  <button
                    type="button"
                    class="search-clear"
                    title="Počisti iskanje"
                    on:click|stopPropagation={clearVzdevekSearch}
                  >
                    ✕
                  </button>
                </span>
              {:else}
                Vzdevek
                <button
                  type="button"
                  class="search-toggle"
                  title="Išči po vzdevku"
                  on:click|stopPropagation={() => (searchingVzdevek = true)}
                >
                  🔍
                </button>
              {/if}
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
          <tr
            class="clickable"
            role="button"
            tabindex="0"
            aria-label={`Podrobnosti: ${p.godmode?.name || p.vzdevek}`}
            on:click={() => (selectedPlayer = p)}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectedPlayer = p;
              }
            }}
          >
            <td class:tagcell={showTestTag}>
              {#if showTestTag}
                <span title={p.testiranje || undefined}
                  >{p.testiranje ? testTypeIcon(p.testiranje) : '/'}</span
                >
              {:else}
                .
              {/if}
            </td>
            {#if isGodmode}
              <td>
                {#if p.godmode?.ocenaTrenerja && p.godmode?.ocenaIzVaj && Math.abs(p.godmode.ocenaTrenerja - p.godmode.ocenaIzVaj) > 1}
                  <span class="alert" title="Ocena trenerja odstopa za več kot 1">!!!!</span>
                {/if}
                {#if normalizeText(searchName)}
                  {#each highlightParts(p.godmode?.name || p.vzdevek, searchName) as part}
                    {#if part.hl}<strong>{part.text}</strong>{:else}{part.text}{/if}
                  {/each}
                {:else}
                  {p.godmode?.name || p.vzdevek}
                {/if}
              </td>
              <td>
                {#if normalizeText(searchVzdevek)}
                  {#each highlightParts(p.vzdevek, searchVzdevek) as part}
                    {#if part.hl}<strong>{part.text}</strong>{:else}{part.text}{/if}
                  {/each}
                {:else}
                  {p.vzdevek}
                {/if}
              </td>
            {:else}
              <td>
                {#if normalizeText(searchVzdevek)}
                  {#each highlightParts(p.vzdevek, searchVzdevek) as part}
                    {#if part.hl}<strong>{part.text}</strong>{:else}{part.text}{/if}
                  {/each}
                {:else}
                  {p.vzdevek}
                {/if}
              </td>
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
  </div>

  <dialog
    bind:this={dialogEl}
    class="player-dialog"
    use:backdropClose
    on:close={() => (selectedPlayer = null)}
  >
    {#if selectedPlayer}
      {@const sp = selectedPlayer}
      {@const g = sp.godmode}
      <div class="dlg-head">
        <div class="dlg-titles">
          <div class="dlg-vzdevek">{sp.vzdevek}</div>
          {#if isGodmode}
            <div class="dlg-name">{g?.name || sp.vzdevek}</div>
          {/if}
        </div>
        <span class="dlg-rank">{sp.predlogSkupine}</span>
        <button type="button" class="dlg-close" title="Zapri" on:click={() => dialogEl?.close()}>
          ✕
        </button>
      </div>
      <div class="dlg-body">
        {#if showTestTag && sp.testiranje}
          <div class="dlg-test">
            <span title={sp.testiranje}>{testTypeIcon(sp.testiranje)}</span>
            {sp.testiranje}
          </div>
        {/if}
        {#if isGodmode && g?.ocenaTrenerja && g?.ocenaIzVaj && Math.abs(g.ocenaTrenerja - g.ocenaIzVaj) > 1}
          <div class="dlg-warning">Ocena trenerja odstopa od ocene iz vaj za več kot 1!</div>
        {/if}
        <dl class="dlg-grid">
          {#each dlgMetrics as m (m.label)}
            <div class="dlg-metric">
              <div class="dlg-line"><dt>{m.label}</dt><dd>{m.text}</dd></div>
              {#if m.key}
                {@const cells = rankCells(sp, m.key)}
                {#if cells}
                  <table class="rank-table">
                    <caption>Uvrstitev: mesto / št. igralcev</caption>
                    <thead>
                      <tr>
                        <th>Vsi</th>
                        <th>V.</th>
                        <th>IV.</th>
                        <th>III.</th>
                        <th>II.</th>
                        <th>I.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {#each cells as c}
                          <td class:best={c.rank === 1 && c.total > 0}
                            >{c.total === 0 ? '–' : `${c.rank}/${c.total}`}</td
                          >
                        {/each}
                      </tr>
                    </tbody>
                  </table>
                {/if}
              {/if}
            </div>
          {/each}
        </dl>
      </div>
    {/if}
  </dialog>

  <div class="footer-wrap">
    <Footer />
  </div>
</div>

<style>
  :global(html) {
    height: 100%;
    overflow: hidden;
  }
  :global(body) {
    margin: 0;
    height: 100%;
    overflow: hidden;
  }
  :global(body) * {
    font-family: 'Ubuntu', sans-serif;
  }
  /* Single scroll container filling the viewport, handling BOTH axes.
     This is what lets the thead stick to the viewport top (container top
     coincides with viewport top) while the h1 scrolls away. */
  .page {
    height: 100vh;
    height: 100dvh;
    overflow: auto;
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
    /* Keep the title pinned horizontally when .page scrolls sideways
       (no `top`, so it still scrolls away vertically as wanted). */
    position: sticky;
    left: 0;
  }
  h1 img {
    height: 1.4em;
  }
  .test-filter {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    padding: 0.8em 1em 0;
    position: sticky;
    left: 0;
  }
  .test-filter-label {
    font-weight: 600;
    color: #555;
  }
  .test-chip {
    cursor: pointer;
    border: 2px solid #1c93d1;
    background: white;
    color: #1c93d1;
    border-radius: 999px;
    padding: 0.3em 0.9em;
    font-size: 0.95em;
    font-weight: 600;
    white-space: nowrap;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.25;
  }
  .test-chip.active {
    background: #1c93d1;
    color: white;
  }
  .chip-type {
    font-size: 0.8em;
    font-weight: 400;
    opacity: 0.75;
  }
  /* No overflow here on purpose: .table-wrapper must NOT become a scroll
     container, otherwise the thead would stick to it instead of the page.
     Scrolling in both axes is handled by .page above. */
  .table-wrapper {
    text-align: center;
    padding-bottom: 2em;
    /* Keep table centered when it fits, allow .page to scroll when it doesn't */
    display: block;
  }
  .footer-wrap {
    position: sticky;
    left: 0;
    text-align: center;
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
    margin: 1.5em auto 0;
    max-width: 100%;
    border-collapse: collapse;
  }
  thead th {
    padding: 0.8em;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 21;
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
  table.players-table tbody tr td:first-child::before {
    content: counter(rowNumber);
    min-width: 1em;
  }
  table.players-table tbody tr td:first-child.tagcell::before {
    content: none;
  }
  td:first-child.tagcell {
    color: inherit;
    font-size: 1em;
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
  tbody tr.clickable {
    cursor: pointer;
  }
  tbody tr.clickable td {
    transition: background-color 0.15s ease;
  }
  tbody tr.clickable:hover td,
  tbody tr.clickable:hover td:nth-child(2) {
    background: #d9eefa;
  }
  tbody tr.clickable:focus-visible {
    outline: 2px solid #1c93d1;
    outline-offset: -2px;
  }
  .player-dialog {
    border: none;
    border-radius: 1em;
    padding: 0;
    width: min(92vw, 32em);
    color: #222;
  }
  .player-dialog::backdrop {
    background: rgba(0, 0, 0, 0.45);
  }
  .dlg-head {
    display: flex;
    align-items: center;
    gap: 0.8em;
    background: #1c93d1;
    color: white;
    padding: 1em 1.2em;
  }
  .dlg-titles {
    min-width: 0;
  }
  .dlg-vzdevek {
    font-size: 1.3em;
    font-weight: 700;
  }
  .dlg-name {
    opacity: 0.9;
  }
  .dlg-rank {
    margin-left: auto;
    background: white;
    color: #1c93d1;
    font-weight: 700;
    border-radius: 999px;
    padding: 0.25em 0.8em;
    white-space: nowrap;
  }
  .dlg-close {
    cursor: pointer;
    border: none;
    background: none;
    color: white;
    font-size: 1.2em;
    line-height: 1;
    padding: 0.2em;
  }
  .dlg-body {
    padding: 0.6em 1.2em 1.2em;
  }
  .dlg-test {
    padding: 0.5em 0;
    font-weight: 600;
    white-space: nowrap;
  }
  .dlg-warning {
    color: #c00;
    font-weight: 700;
    padding: 0.5em 0;
  }
  .dlg-grid {
    margin: 0;
  }
  .dlg-grid > div.dlg-metric {
    padding: 0.4em 0;
    border-bottom: 1px solid #eee;
  }
  .dlg-grid > div.dlg-metric:last-child {
    border-bottom: none;
  }
  .dlg-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1em;
  }
  .dlg-grid dt {
    color: #555;
  }
  .dlg-grid dd {
    margin: 0;
    font-weight: 600;
    text-align: right;
    white-space: nowrap;
  }
  .rank-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.35em 0 0.3em;
    font-size: 0.85em;
  }
  .rank-table caption {
    font-size: 0.9em;
    color: #777;
    padding-bottom: 0.25em;
  }
  .rank-table th,
  .rank-table td {
    border: 1px solid #e0e0e0;
    padding: 0.25em 0.3em;
    text-align: center;
    white-space: nowrap;
  }
  .rank-table thead th {
    background: #f0f7fc;
    color: #1c93d1;
  }
  .rank-table td {
    font-weight: 600;
  }
  .rank-table td.best {
    background: #e6f4ea;
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
  .search-toggle {
    cursor: pointer;
    border: none;
    background: none;
    padding: 0 0 0 0.3em;
    font-size: 0.9em;
    line-height: 1;
  }
  .search-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
  }
  .search-wrap input {
    width: 9em;
    max-width: 100%;
    padding: 0.25em 0.5em;
    border: none;
    border-radius: 0.4em;
    font-size: 0.85em;
    font-weight: 400;
    color: #222;
    cursor: text;
    user-select: text;
  }
  .search-clear {
    cursor: pointer;
    border: none;
    background: none;
    color: white;
    font-size: 0.9em;
    line-height: 1;
    padding: 0;
  }
  .download-btn img {
    height: 1.2em;
    filter: brightness(0) invert(1);
  }
</style>