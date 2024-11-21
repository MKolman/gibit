<script lang="ts">
    export let list: string[];
    export let disallow: number[];
    export let onclick: (item: number) => void;
    let search = "";
    let filteredList: [string, number][] = [];
    $: filteredList = list.map((v, i) => [v, i] as [string, number]).filter(([v, i]) => !disallow.includes(i) && v.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
</script>

<input on:keydown={(ev) => {if (ev.key==="Enter" && filteredList.length > 0) {onclick(filteredList[0][1]); search="";}}} type="text" bind:value={search} placeholder="Išči..."/>
{#each filteredList as [item, idx]}
    <button on:click={() => onclick(idx)}>{item}</button>
{/each}

<style>
    button {
        color: #184962;
        padding: 0.5em;
        margin: 0.1em;
        border: none;
        background: none;
        font-weight: bold;
    }
</style>