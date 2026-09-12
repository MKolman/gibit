<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PlayerRow } from '$lib/fetchData';
  import { type SortKey } from '$lib/sorting';
  import { applySearchAndSort, highlightParts, normalizeText } from '$lib/search';
  import { formatRaw, formatScore } from '$lib/formatting';
  import { buildPlayersCSV } from '$lib/csv';
  import { testTypeIcon } from '$lib/testTags';

  export let rows: PlayerRow[] = [];
  export let isGodmode = false;
  export let showTestTag = false;

  const dispatch = createEventDispatcher<{ select: PlayerRow }>();

  let sortColumn: SortKey = 'rank';
  let sortAsc = false;
  let searchName = '';
  let searchVzdevek = '';
  let searchingName = false;
  let searchingVzdevek = false;

  function setTableSortColumn(col: SortKey) {
    if (sortColumn === col) {
      sortAsc = !sortAsc;
    } else {
      sortColumn = col;
      sortAsc = col === 'name' || col === 'vzdevek' || col === 'trener';
    }
  }

  function autofocus(node: HTMLInputElement) {
    node.focus();
  }

  function clearNameSearch() {
    searchName = '';
    searchingName = false;
  }

  function clearVzdevekSearch() {
    searchVzdevek = '';
    searchingVzdevek = false;
  }

  function downloadTable() {
    const link = document.createElement('a');
    const file = new Blob([buildPlayersCSV(sortedPlayers)], { type: 'text/csv;charset=utf-8;' });
    link.href = URL.createObjectURL(file);
    link.download = 'odbit_odbojkarski_karton.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  $: sortedPlayers = applySearchAndSort(rows, searchName, searchVzdevek, sortColumn, sortAsc);
</script>

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
        on:click={() => dispatch('select', p)}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dispatch('select', p);
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

<style>
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