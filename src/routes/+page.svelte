<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Footer from './Footer.svelte';
  import TestFilter from './TestFilter.svelte';
  import PlayerTable from './PlayerTable.svelte';
  import PlayerDialog from './PlayerDialog.svelte';
  import { fetchPublicSheetData, type PlayerRow } from '$lib/fetchData';
  import { getSortedTestTags } from '$lib/testTags';

  let loading = true;
  let error: string | null = null;
  let players: PlayerRow[] = [];
  let isGodmode = false;
  let enabledTests: string[] = [];
  let selectedPlayer: PlayerRow | null = null;

  $: availableTests = getSortedTestTags(players);
  // Oznako v prvem stolpcu pokažemo le, ko je vključenih več testov hkrati
  $: showTestTag = enabledTests.length > 1;
  $: filteredPlayers =
    availableTests.length === 0
      ? players
      : players.filter((p) => !p.testiranje || enabledTests.includes(p.testiranje));

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

  {#if !loading && !error}
    <TestFilter {availableTests} {enabledTests} on:change={(e) => (enabledTests = e.detail)} />
  {/if}

  <div class="table-wrapper">
  {#if loading}
    <div class="loading">Nalaganje podatkov...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <PlayerTable
      rows={filteredPlayers}
      {isGodmode}
      {showTestTag}
      on:select={(e) => (selectedPlayer = e.detail)}
    />
  {/if}
  </div>

  <PlayerDialog
    player={selectedPlayer}
    {isGodmode}
    {showTestTag}
    pool={filteredPlayers}
    on:close={() => (selectedPlayer = null)}
  />

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
</style>