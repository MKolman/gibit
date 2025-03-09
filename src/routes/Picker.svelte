<script lang="ts">
    import Hint from './Hint.svelte'
    import { type GroupBreakdown } from "$lib/groups";
	import { onMount, tick } from "svelte";
    export let values: [string|number, boolean][] | [GroupBreakdown, boolean][];
    export let sections: boolean = false;
    export let allTxt = "Vsi";
    export let hint: string = "";
    export let alt = 0;
    export let labels: string[] = [];
    export let colors: string[]|null = null;
    let groupings: Map<string, GroupBreakdown[]> = new Map();
    $: {
        if (sections) {
            groupings = new Map()
            values.forEach(([g, _], idx) => {
                const group = g as GroupBreakdown
                if (!groupings.has(group.level)) {
                    groupings.set(group.level, [])
                }
                group.index = idx
                groupings.get(group.level)?.push(group)
            })
        } else {
            groupings = new Map()
        }
    }
    $: realLabels = labels.length ? labels : values.map(([v]) => (v as GroupBreakdown).name || v);
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let backgroundUrls: string[] = [];
    onMount(async () => {
        ctx = canvas.getContext("2d") as any

    })
    function initColors(colors: string[]) {
        if (!ctx || !sections) {
            return
        }
        backgroundUrls = colors.map((color) => {
            ctx.fillStyle = color
            ctx.fillRect(0, 0, 300, 300)
            return canvas.toDataURL()
        })
    }
    $: initColors(colors||[])
</script>
<canvas hidden bind:this={canvas} width=300 height=300></canvas>
{#if !sections}
    <div class="row">
        <label class:alt-1={alt === 1} class:alt-2={alt === 2}><input type="checkbox" checked="{values.every(([_, v]) => v)}" on:change={(ev) => {values.forEach(v => (v[1] = (ev.target as any).checked)); values = values}}>{allTxt}{#if hint.length > 0}<Hint message={hint}/>{/if}</label>
        
        {#each values as _, i}
            <label class:alt-1={alt === 1} class:alt-2={alt === 2} style="background: {colors === null?'': colors[i%colors.length]}"><input type="checkbox" bind:checked={values[i][1]}/>{realLabels[i]}</label>
        {/each}
    </div>
{:else}
    
    <div class="row">
        <label class:alt-1={alt === 1} class:alt-2={alt === 2}><input type="checkbox" checked="{values.every(([_, v]) => v)}" on:change={(ev) => {values.forEach(v => (v[1] = (ev.target as any).checked)); values = values}}>{allTxt}</label>
    </div>
    {#each groupings as [name, groups], i}
        <b>{name}</b>
        <div class="row">
            {#each groups as group}
                <label class:alt-1={alt === 1} class:alt-2={alt === 2} style="background-image: url({backgroundUrls[group.index]})"><input type="checkbox" bind:checked={values[group.index][1]}/><span>{group.day} <br> <small>{group.location}</small></span></label>
            {/each}
        </div>
    {/each}
{/if}

<style>
    .row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }
    label {
        border-radius: 5px;
        background: #1c93d1;
        color: white;
        padding: 0.5em 2em;
        margin: 0.1em;
        opacity: 0.5;
        text-align: center;
        position: relative;
    }
    label > span {
        background-color: rgba(0, 0, 0, 60%);
        display: inline-block;
        border-radius: 4px;
        padding: 0.1em;
    }
    label > :global(button) {
        position: absolute;
        right: -0.1em;
        top: -0.2em;
        outline: 1px white solid;
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
    b::first-letter {
        text-transform: capitalize;
    }
    canvas {
        height: 50px;
        background-color: red;
    }
</style>