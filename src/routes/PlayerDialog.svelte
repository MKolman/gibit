<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PlayerRow } from '$lib/fetchData';
  import { exerciseText, formatScore } from '$lib/formatting';
  import { rankCells, type MetricKey } from '$lib/rankings';
  import { testTypeIcon } from '$lib/testTags';

  export let player: PlayerRow | null = null;
  export let isGodmode = false;
  export let showTestTag = false;
  export let pool: PlayerRow[] = [];

  const dispatch = createEventDispatcher<{ close: void }>();

  let dialogEl: HTMLDialogElement | undefined;

  $: if (dialogEl && player && !dialogEl.open) dialogEl.showModal();
  $: if (dialogEl && !player && dialogEl.open) dialogEl.close();

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

  interface DlgMetric {
    label: string;
    text: string;
    key: MetricKey | null;
  }

  $: dlgMetrics = ((): DlgMetric[] => {
    const sp = player;
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
</script>

<dialog
  bind:this={dialogEl}
  class="player-dialog"
  use:backdropClose
  on:close={() => dispatch('close')}
>
  {#if player}
    {@const sp = player}
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
              {@const cells = rankCells(sp, m.key, pool)}
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

<style>
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
</style>