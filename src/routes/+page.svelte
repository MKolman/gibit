<script lang="ts">
	import { onMount } from "svelte";
    import {makeHistograms, unify, normalizer, type Data, gaussianRandom, score, scoreToPctTxt } from "$lib/stat"
    import Chart from './Chart.svelte'
    import Picker from './Picker.svelte'
	import PeopleSearch from "./PeopleSearch.svelte";
	import { page } from "$app/stores";

    let colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    let exercises: string[] = [];
    let selectedExercises: [string, boolean][];
    $: selectedExercises = exercises.map(v => [v, true]);
    let data: Data[] = [];
    function b64ToBytes(b64: string): Uint8Array {
        return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    }
    async function fetchGibitEncData() {
        const res = await fetch("gibit.json.enc");
        const ecncrypted = await res.arrayBuffer();
        const pass = $page.url.searchParams.get("pass");
        if (!pass) {
            console.error("No password provided");
            alert("No password provided");
            return;
        }
        const key = await crypto.subtle.importKey("raw", b64ToBytes(pass), "AES-CBC", false, ["decrypt"]);
        const decrypted = await crypto.subtle.decrypt({name: "AES-CBC", iv: b64ToBytes('VoTyZIYxSqocdn6H/THSXw==')}, key, ecncrypted);
        console.log(new TextDecoder().decode(decrypted));
        ({exercises, data} = JSON.parse(new TextDecoder().decode(decrypted)));
        // ({exercises, data} = (await res.json() as {exercises: string[]; data: Data[]}))
        exercises = ["Spodnji odboj sede", "Spodnji odboj z dotikom tal", "Zgornji odboj sede", "Zgornji odboj s ploskom", "Zgornji-spodnji odboj", "Spodnji servis", "Zgornji servis", "Napadalni udarec", "Dosežena višina"]
    } 
    async function fetchGibitData() {
        const res = await fetch("gibit.json");
        ({exercises, data} = (await res.json() as {exercises: string[]; data: Data[]}))
        exercises = ["Spodnji odboj sede", "Spodnji odboj z dotikom tal", "Zgornji odboj sede", "Zgornji odboj s ploskom", "Zgornji-spodnji odboj", "Spodnji servis", "Zgornji servis", "Napadalni udarec", "Dosežena višina"]
    } 
    function isGroupSelected(groups: string[], selectedGroups: Set<string>) {
        if (useLevelsAsGroups) {
            for (const g1 of groups) {
                for (const g2 of selectedGroups) {
                    if (g1.includes(g2)) {
                        return true;
                    }
                }
            }
            return false;
        }
        return groups.some((group) => selectedGroups.has(group));
    }
    onMount(fetchGibitEncData);
    let levels = ["osnovna", "rekreativna 1", "rekreativna 2", "nadaljevalna"]
    let useLevelsAsGroups = true;
    let groups: [string, boolean][];
    $: groups = useLevelsAsGroups?levels.map(v => [v, true]):Array.from(new Set(data.flatMap(v => v.groups))).map(v => [v, true]);
    $: selectedGroups = groups.filter(([_, v]) => v).map(([v]) => v);
    $: selectedColors = colors.filter((_, i) => groups[i]?.at(1));
    $: selectedGroupsSet = new Set(selectedGroups);
    $: filteredData = data.filter(v => isGroupSelected(v.groups, selectedGroupsSet));
    $: histogramData = makeHistograms(filteredData, selectedGroups, selectedColors);
    $: totalHistogram = makeHistograms(unify(filteredData, selectedExercises.map(([_, v]) => v), normalizers), selectedGroups, selectedColors, true);
    $: normalizers = exercises.map((_, i) => normalizer(data.map(v => v.vals[i])));
    let selectedPeople: [number, boolean][] = [];
    let sortedPeople: [number, boolean][] = [];
    let tab = 0;
    $: {
        if (tab === 2) {
            sortedPeople = data.map((_, i) => [i, isGroupSelected(data[i].groups, selectedGroupsSet)]);
        } else {
            sortedPeople = [...selectedPeople]
        }
        sortedPeople.sort((i, j) => data[j[0]].vals.reduce((a, b, i) => a + (selectedExercises[i][1]?normalizers[i](b):0), 0) - data[i[0]].vals.reduce((a, b, i) => a + (selectedExercises[i][1]?normalizers[i](b):0), 0));
    }

    function footer(tooltipItems: any) {
        const ti = tooltipItems as {dataset: {footer: string[]}, dataIndex: number}[];
        return ti.map(({dataset, dataIndex}) => dataset.footer?.at(dataIndex)).join("\n");
    }
    function findColors(groups: string[], groupsList: [string, boolean][], colors: string[]) {
        return groupsList.map((_, i) => colors[i%colors.length]).filter((_, i) => groups.some(g => g.includes(groupsList[i][0])));
    }

</script>
<h1>Gibit analiza</h1>
<div class="tabs">
    <button class:active={tab === 0} on:click={() => tab = 0}>Skupine</button>
    <button class:active={tab === 1} on:click={() => tab = 1}>Posamezniki</button>
    <button class:active={tab === 2} on:click={() => tab = 2}>Tabela</button>
</div>
<div class="check-group">
    <Picker allTxt="Vse vaje" bind:values={selectedExercises} />
</div>
<label><input type="checkbox" bind:checked={useLevelsAsGroups} /> Uporabi stopnje kot skupine</label>
<div class="check-group">
    <Picker allTxt="Vse skupine" bind:values={groups} alt={1} colors={tab===1?null:colors}/>
</div>
{#if tab === 0}
    <h2>Skupna ocena</h2>
    <div class="chart">
        <Chart config={{type: 'bar', data: totalHistogram[0], options: {plugins:{legend:{display:false}, tooltip: {callbacks: {footer: footer}}}, scales: {x:{stacked: true}, y: {stacked: true}}}}} />
    </div>
    {#each selectedExercises as [name, visible], i}
        {#if visible}
        <h2>{name}</h2>
        <div class="chart">
            <Chart config={{type: 'bar', data: histogramData[i], options: {plugins:{legend:{display:false}, tooltip: {callbacks: {footer: footer}}},scales: {x:{stacked: true}, y: {stacked: true, ticks: {precision: 0}}}}}} />
        </div>
        {/if}
    {/each}
{/if}
{#if tab === 1}
    <div class="check-group">
        <Picker allTxt="Vsi izbrani" bind:values={selectedPeople} labels={selectedPeople.map(([idx]) => data[idx].name)} alt={2} colors={colors}/>
    </div>
    <div class="check-group">
        <PeopleSearch list={data.map(v => v.name)} disallow={selectedPeople.map(([v]) => v)} onclick={idx => selectedPeople = [...selectedPeople, [idx, true]]} />
    </div>

    <h2>Primerjava ljudi</h2>
    <div class="chart">
        <Chart config={{type: 'line', data: {labels: selectedExercises.filter(([_, v])=>v).map(([v]) => v), datasets: selectedPeople.filter(([_, v]) => v).map(([i]) => ({label: data[i].name, data: data[i].vals.map((v, j) => normalizers[j](v)).filter((_, i) => selectedExercises[i][1])}))}, options: {plugins:{legend:{display:false}, tooltip: {callbacks: {footer: footer}}},scales: {x:{stacked: true}, y: {stacked: false}}}}} />
    </div>
{/if}
{#if tab === 1 || tab === 2}
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Ime</th>
                <th>Skupina</th>
                <th>Skupna ocena</th>
                {#each selectedExercises as [name, visible], i}
                    {#if visible}
                    <th>{name}</th>
                    {/if}
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each sortedPeople as [idx, visible], rank}
                {#if visible}
                <tr>
                    <td>{rank+1}.</td>
                    <td>{data[idx].name}</td>
                    <td>
                        {data[idx].groups.join(', ')}
                        <span class="group-colors">
                            {#each findColors(data[idx].groups, groups, colors) as color}
                            <span style="background: {color};"></span>
                            {/each}
                        </span>
                    </td>
                    <td>{scoreToPctTxt(score(data[idx].vals, selectedExercises.map(([_, v]) => v), normalizers))}</td>
                    {#each selectedExercises as [_, visible], i}
                        {#if visible}
                        <td>{data[idx].vals[i]} ({scoreToPctTxt(normalizers[i](data[idx].vals[i]))})</td>
                        {/if}
                    {/each}
                </tr>
                {/if}
            {/each}
        </tbody>
    </table>
{/if}

<h2>TODO</h2>
<ul>
    <li>Poimenovanje osi na grafih</li>
    <li>"Bojan" score</li>
    <li>Relativen score, glede na izbrane skupine</li>
    <li>Grafi spreminjajo velikost, ko spreminjas nastavitve</li>
</ul>
<style>
    .tabs {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
    }
    .tabs button {
        padding: 0.5em;
        width: 100%;
        margin: 1em 0;
        background: none;
        border: none;
        font-size: large;
    }
    .tabs button.active {
        border-bottom: green 3px solid;
    }
    .check-group {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }
    .group-colors {
        display: flex;
    }
    .group-colors span {
        /* border: 1px solid black; */
        height: 1em;
        display: inline-block;
        flex: 1;
    }
    .chart {
        max-height: 500px;
    }
    * {
        font-family: sans-serif;
    }
    thead {
        background: #1c93d1;
        color: white;
    }
    tbody tr:nth-child(odd) {
        background: #f0f0f0;
    }

</style>