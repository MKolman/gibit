<script lang="ts">
    export let values: [string|number, boolean][];
    export let allTxt = "Vsi";
    export let alt = 0;
    export let labels: string[] = [];
    export let colors: string[]|null = null;
    $: realLabels = labels.length ? labels : values.map(([v]) => v);
</script>

<label class:alt-1={alt === 1} class:alt-2={alt === 2}><input type="checkbox" checked="{values.every(([_, v]) => v)}" on:change={(ev) => {values.forEach(v => (v[1] = (ev.target as any).checked)); values = values}}>{allTxt}</label>
{#each values as _, i}
    <label class:alt-1={alt === 1} class:alt-2={alt === 2} style="background: {colors === null?'': colors[i%colors.length]}"><input type="checkbox" bind:checked={values[i][1]}/>{realLabels[i]}</label>
{/each}

<style>

    label {
        border-radius: 1em;
        background: #1c93d1;
        color: white;
        padding: 0.5em;
        margin: 0.1em;
        opacity: 0.5;
    }
    label.alt-1 {
        background: #6cac44;
    }
    label.alt-2 {
        background: #184962;
    }
    label:has(input:checked) {
        opacity: 1;
    }
    input {
        display: none;
    }
</style>