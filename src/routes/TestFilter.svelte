<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { capitalize } from '$lib/formatting';
  import { compareTestTags, splitTestTag } from '$lib/testTags';

  export let availableTests: string[] = [];
  export let enabledTests: string[] = [];

  const dispatch = createEventDispatcher<{ change: string[] }>();

  function toggleTest(tag: string) {
    let next: string[];
    if (enabledTests.includes(tag)) {
      // Vsaj en test mora ostati vključen
      if (enabledTests.length <= 1) return;
      next = enabledTests.filter((t) => t !== tag);
    } else {
      next = [...enabledTests, tag].sort(compareTestTags);
    }
    dispatch('change', next);
  }
</script>

{#if availableTests.length > 0}
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

<style>
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
</style>