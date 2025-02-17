<script lang="ts">
	import { onMount } from "svelte";
    import {makeHistograms, unify, normalizer, type Data, score, scoreToPctTxt, bojanScoreNormalizers, makeCandles } from "$lib/stat"
    import Chart from './Chart.svelte'
    import Picker from './Picker.svelte'
	import PeopleSearch from "./PeopleSearch.svelte";
	import { page } from "$app/stores";
	import { doesGroupMatch, isGroupSelected, levels, colors, extractGroups, type GroupBreakdown, getGroupColors } from "$lib/groups";
	import Toggle from "./Toggle.svelte";
	import { mergeDeep } from "$lib/merge";
	import { fetchGibitEncData } from "$lib/fetchData";

    const exercises: string[] = ["Spodnji odboj sede", "Spodnji odboj z dotikom tal", "Zgornji odboj sede", "Zgornji odboj s ploskom", "Zgornji-spodnji odboj", "Spodnji servis", "Zgornji servis", "Napadalni udarec", "Dosežena višina"]
    let originalExercises: string[] = exercises;
    let selectedExercises: [string, boolean][];
    $: selectedExercises = exercises.map(v => [v, true]);
    let data: Data[] = [];
    onMount(() => {
        fetchGibitEncData($page.url.searchParams).then(v => {
            if (v) {
                ({exercises: originalExercises, data} = v);
            }
        })
    });
    let useLevelsAsGroups = true;
    let groups: [string, boolean][]|[GroupBreakdown, boolean][];
    $: groups = useLevelsAsGroups?levels.map(v => [v, true]):extractGroups(data).map(v => [v, true]);
    $: selectedGroups = groups.filter(([_, v]) => v).map(([v]) => v) as string[] | GroupBreakdown[];
    $: allColors = getGroupColors(groups.map(([v]) => v) as string[] | GroupBreakdown[], true)
    $: selectedColors = groups.map((_, i) => allColors[i]).filter((_, i) => groups[i][1]);
    $: selectedGroupsSet = new Set(selectedGroups.map(v => ((v as GroupBreakdown).name) || v as string));
    $: filteredData = data.filter(v => isGroupSelected(v.groups, selectedGroupsSet, useLevelsAsGroups));
    $: histogramData = makeHistograms(filteredData, selectedGroups, selectedColors);
    $: totalHistogram = makeHistograms(unify(filteredData, selectedExercises.map(([_, v]) => v), normalizers), selectedGroups, selectedColors, !useBojanScore);
    $: candles = makeCandles(filteredData, selectedGroups, selectedColors);
    $: totalCandles = makeCandles(unify(filteredData, selectedExercises.map(([_, v]) => v), normalizers), selectedGroups, selectedColors, !useBojanScore);
    $: normalizers = useBojanScore?bojanScoreNormalizers:exercises.map((_, i) => normalizer((useRelativeScore?filteredData:data).map(v => v.vals[i])));
    let selectedPeople: [number, boolean][] = [];
    let sortedPeople: [number, boolean][] = [];
    let tab = 0;
    let useBojanScore = true;
    let useRelativeScore = false;
    $: {
        if (tab === 2) {
            sortedPeople = data.map((_, i) => [i, isGroupSelected(data[i].groups, selectedGroupsSet, useLevelsAsGroups)]);
        } else {
            sortedPeople = [...selectedPeople]
        }
        sortedPeople.sort((i, j) => data[j[0]].vals.reduce((a, b, i) => a + (selectedExercises[i][1]?normalizers[i](b):0), 0) - data[i[0]].vals.reduce((a, b, i) => a + (selectedExercises[i][1]?normalizers[i](b):0), 0));
    }

    function footer(tooltipItems: any) {
        const ti = tooltipItems as {dataset: {footer: string[]}, dataIndex: number}[];
        return ti.map(({dataset, dataIndex}) => dataset.footer?.at(dataIndex)).join("\n");
    }
    function titleLabel(tooltipItems: any) {
        const ti = tooltipItems as {dataset: {titles: string[]}, dataIndex: number}[];
        return ti.map(({dataset, dataIndex}) => dataset.titles?.at(dataIndex)).join("\n");
    }
    function dataLabel(tooltipItem: any) {
        const ti = tooltipItem as {dataset: {dataLabel: string[]}, dataIndex: number};
        return ti.dataset.dataLabel?.at(ti.dataIndex);
    }
    function findColors(groups: string[], groupsList: [string, boolean][]|[GroupBreakdown, boolean][]) {
        return getGroupColors(groups.map((group) => 
            (groupsList.find(([g]) => doesGroupMatch(group, (g as GroupBreakdown).name || g as string))||["red"])[0] as any as string
        ), false) as string[]
    }
    function formatNormalizedScore(score: number) {
        if (useBojanScore) {
            return score.toFixed(2);
        } else {
            return scoreToPctTxt(score);
        }
    }
    const defaultChartOptions = {
        plugins: {
            legend: {
                display:false
            },
            tooltip: {
                callbacks: {footer, label: dataLabel, title: titleLabel},
            }
        },
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text:"Vrednost",
                },
                grid: {
                    offset: false,
                    tickBorderDashOffset: 5,
                }
            },
            y: {
                title: {
                    display: true,
                    text:"Število ljudi"
                },
                stacked: true,
                ticks: {
                    precision: 0
                },
            }
        }
    }
    function makeOptions(opts: object) {
        return mergeDeep({}, defaultChartOptions, opts);
    }

    function makeCandleOptions(opts: object) {
        return mergeDeep({}, defaultChartOptions, {scales: {x: {type: "category", title: {display: false}, ticks: {autoSkip: false, maxRotation: 90, padding: 10}}}}, opts);
    }

</script>
<h1>Gibit analiza</h1>
<div class="tabs">
    <button class:active={tab === 0} on:click={() => tab = 0}>Posamezniki</button>
    <button class:active={tab === 3} on:click={() => tab = 3}>Skupine</button>
    <button class:active={tab === 1} on:click={() => tab = 1}>Izbrani</button>
    <button class:active={tab === 2} on:click={() => tab = 2}>Tabela</button>
</div>
<div class="check-group">
    <Picker allTxt="Vse vaje" bind:values={selectedExercises} />
</div>
<Toggle bind:value={useBojanScore} labels={["Percentili", '"Bojan" score']} />
{#if !useBojanScore}
    <br>
    <p>
        Računaj percentile glede na:<br>
        <Toggle bind:value={useRelativeScore} labels={["vse skupine", "izbrane skupine"]} />
    </p>
{/if}
<br>
<Toggle bind:value={useLevelsAsGroups} labels={["Skupine", "Stopnje"]} />
<div class="check-group">
    <Picker allTxt="Vse skupine" bind:values={groups} alt={1} colors={tab===1?null:allColors} sections={!useLevelsAsGroups && tab !== 1}/>
</div>
{#if tab === 0}
    <h2>Skupna ocena</h2>
    <div class="chart">
        <Chart config={{type: 'bar', data: totalHistogram[0], options: makeOptions({scales:{x:{title:{text:useBojanScore?'"Bojan" score':'Odmik od povprečja [σ]'}}}})}} />
    </div>
    {#each selectedExercises as [name, visible], i}
        {#if visible}
        <h2>{originalExercises[i]}</h2>
        <div class="chart">
            <Chart config={{type: 'bar', data: histogramData[i], options: makeOptions({scales:{x:{title:{text:name}}}})}} />
        </div>
        {/if}
    {/each}
{/if}
{#if tab === 3}
    <h2>Skupna ocena</h2>
    <div class="chart">
        <Chart config={{type: 'candlestick', data: totalCandles[0], options: makeCandleOptions({scales: {y:{ticks: {precision: 2}, title:{text:useBojanScore?'"Bojan" score':'Odmik od povprečja [σ]'}}}})}} />
    </div>
    {#each selectedExercises as [name, visible], i}
        {#if visible}
        <h2>{originalExercises[i]}</h2>
        <div class="chart">
            <Chart config={{type: 'candlestick', data: candles[i], options: makeCandleOptions({scales: {y:{title:{text:name}}}})}} />
        </div>
        {/if}
    {/each}
{/if}
{#if tab === 1}
    <div class="check-group">
        <Picker allTxt="Vsi izbrani" bind:values={selectedPeople} labels={selectedPeople.map(([idx]) => data[idx].name)} alt={2} colors={colors}/>
    </div>
    <div class="check-group" style="flex-direction: row">
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
                            {#each findColors(data[idx].groups, groups) as color}
                            <span style="background: {color};"></span>
                            {/each}
                        </span>
                    </td>
                    <td>{formatNormalizedScore(score(data[idx].vals, selectedExercises.map(([_, v]) => v), normalizers))}</td>
                    {#each selectedExercises as [_, visible], i}
                        {#if visible}
                        <td>
                            {#if data[idx].vals[i] !== null}
                                {data[idx].vals[i]} ({formatNormalizedScore(normalizers[i](data[idx].vals[i]))})
                            {:else}
                                /
                            {/if}
                        </td>
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
    <li>FEAT: Poimenovanje osi na vseh grafih</li>
    <li>FEAT: Zapomni si nastavitve in zavihek</li>
    <li>FEAT: Lepše oblikuj nastavitve</li>
    <li>BUG: Grafi spreminjajo velikost, ko spreminjas nastavitve</li>
    <li>BUG: Seznam imen na grafu se konča na dnu grafa in lahko odreže spodnja imena</li>
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
        flex-direction: column;
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
    table {
        max-width: 100%;
        display: block;
        overflow-x: auto;
    }
    td:nth-child(2), th:nth-child(2) {
        position: sticky;
        left: 0;
    }
    thead, thead th:nth-child(2) {
        background: #1c93d1;
        color: white;
    }
    tbody tr:nth-child(even) td:nth-child(2) {
        background: #fff;
    }
    tbody tr:nth-child(odd), tbody tr:nth-child(odd) td:nth-child(2) {
        background: #f0f0f0;
    }

</style>