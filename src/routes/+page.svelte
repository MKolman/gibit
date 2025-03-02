<script lang="ts">
	import { onMount } from "svelte";
    import {makeHistograms, unify, normalizer, type Data, score, scoreToPctTxt, bojanScoreNormalizers, makeCandles } from "$lib/stat"
    import Chart from './Chart.svelte'
    import Picker from './Picker.svelte'
    import Hint from './Hint.svelte'
	import PeopleSearch from "./PeopleSearch.svelte";
	import { page } from "$app/stores";
	import { doesGroupMatch, isGroupSelected, levels, colors, extractGroups, type GroupBreakdown, getGroupColors } from "$lib/groups";
	import Toggle from "./Toggle.svelte";
    import * as persist from "$lib/persist"
	import { mergeDeep } from "$lib/merge";
	import { fetchGibitEncData } from "$lib/fetchData";

    const exercises: string[] = ["Spodnji odboj sede", "Spodnji odboj z dotikom tal", "Zgornji odboj sede", "Zgornji odboj s ploskom", "Zgornji-spodnji odboj", "Spodnji servis", "Zgornji servis", "Napadalni udarec", "Dosežena višina"]
    const exHints: string[] = [
        "Število zaporednih spodnjih odbojev, ki jih lahko narediš v 30 sekundah.",
        "Število zaporednih spodnjih odbojev z vmesnim dotikom tal, ki jih lahko narediš v 60 sekundah.",
        "Število zaporednih zgornjih odbojev, ki jih lahko narediš sede v 30 sekundah.",
        "Število zaporednih zgornjih odbojev z vmesnim ploskom, ki jih lahko narediš v 30 sekundah.",
        "Število zaporednih izmenjujočih zgornjih in spodnjih odbojev, ki jih lahko narediš v 30 sekundah.",
        "Število spodnjih servisov, ki jih po paraleli zadaneš v zadnje 4 metre nasprotnega igrišča v desetih poizkusih.",
        "Število zgornjih servisov, ki jih po paraleli zadaneš v zadnje 4 metre nasprotnega igrišča v desetih poizkusih.",
        "Število napadalnih udarcev za 3m črto po lastnem izmetu, ki jih po paraleli zadaneš v 3m x 3m območje v oddaljenem kotu nasprotnega igrišča v desetih poizkusih.",
        "S prsti dosežena višina v centimetrih pri skoku v višino iz mesta.",
    ]
    let originalExercises: string[] = exercises;
    let selectedExercises: [string, boolean][] = exercises.map(v => [v, true]);
    let data: Data[] = [];

    // Persisted settings
    let useLevelsAsGroups = true;
    let tab = 0;
    let useBojanScore = true;
    let useRelativeScore = false;
    $: persist.useLevelsAsGroups.set($page.url.searchParams, useLevelsAsGroups)
    $: persist.tab.set($page.url.searchParams, tab)
    $: persist.useBojanScore.set($page.url.searchParams, useBojanScore)
    $: persist.useRelativeScore.set($page.url.searchParams, useRelativeScore)

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
    onMount(() => {
        const sp = $page.url.searchParams
        fetchGibitEncData(sp).then(v => {
            if (v) {
                ({exercises: originalExercises, data} = v);
            }
        })
        tab = persist.tab.get(sp)
        useBojanScore = persist.useBojanScore.get(sp)
        useRelativeScore = persist.useRelativeScore.get(sp)
        useLevelsAsGroups = persist.useLevelsAsGroups.get(sp)
    });
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
<h1><img src="/white_rabbit.png" alt="gibit logo">GIBIT ODBOJKARSKI KARTON</h1>
<div class="tabs">
    <button class:active={tab === 0} on:click={() => tab = 0}><img src="/posamezniki.png" alt="Posamezniki" class="pict"> Posamezniki</button>
    <button class:active={tab === 3} on:click={() => tab = 3}><img src="/skupine.png" alt="Skupine" class="pict">Skupine</button>
    <button class:active={tab === 1} on:click={() => tab = 1}><img src="/izbrani.png" alt="Izbrani" class="pict">Izbrani</button>
    <button class:active={tab === 2} on:click={() => tab = 2}><img src="/tabela.png" alt="Tabela" class="pict">Tabela</button>
</div>
<div class="wrapper">
    <div class="check-group">
        <Picker allTxt="Vse vaje" bind:values={selectedExercises} />
    </div>
    <Toggle bind:value={useBojanScore} labels={["Percentili", '"Bojan" score']}  hint="Percentili vam povedo kolikšen procent ostalih igralcev je slabših od vas. 'Bojan' score je natančno izdelana absolutna formula, ki ti iz rezultatov testa poda oceno tvojih sposobnosti neodvisno od ostalih igralcev."/>
    {#if !useBojanScore}
        <br>
        <p>
            Računaj percentile glede na:<br>
            <Toggle bind:value={useRelativeScore} labels={["vse skupine", "izbrane skupine"]} hint="Ali naj se percentili računajo glede na vse igralce, ali samo tiste, ki so v skupinah, ki so izbrane spodaj."/>
        </p>
    {/if}
    <br>
    <Toggle bind:value={useLevelsAsGroups} labels={["Skupine", "Stopnje"]} hint="Stopnje so le štiri - od osnovne do nadaljevalne. Za bolj natančen pregled pa lahko primerjate posamične vadbene skupine točno po stopnji, dnevu vadbe in lokaciji."/>
    <div class="check-group">
        <Picker allTxt="Vse skupine" bind:values={groups} alt={1} colors={tab===1?null:allColors} sections={!useLevelsAsGroups && tab !== 1}/>
    </div>
    {#if tab === 0}
        <h2>Skupna ocena <Hint message="Absolutna ocena, kot jo določi 'Bojan' score. Ali relativna ocena merjena v standarnih odmikih od povprečja."/></h2>
        <div class="chart">
            <Chart config={{type: 'bar', data: totalHistogram[0], options: makeOptions({scales:{x:{title:{text:useBojanScore?'"Bojan" score':'Odmik od povprečja [σ]'}}}})}} />
        </div>
        {#each selectedExercises as [name, visible], i}
            {#if visible}
            <h2>{name} <Hint message={exHints[i]}/></h2>
            <div class="chart">
                <Chart config={{type: 'bar', data: histogramData[i], options: makeOptions({scales:{x:{title:{text:name}}}})}} />
            </div>
            {/if}
        {/each}
    {/if}
    {#if tab === 3}
        <h2>Skupna ocena <Hint message="skupaj"/></h2>
        <div class="chart">
            <Chart config={{type: 'candlestick', data: totalCandles[0], options: makeCandleOptions({scales: {y:{ticks: {precision: 2}, title:{text:useBojanScore?'"Bojan" score':'Odmik od povprečja [σ]'}}}})}} />
        </div>
        {#each selectedExercises as [name, visible], i}
            {#if visible}
            <h2>{name} <Hint message={exHints[i]}/></h2>
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
</div>
<div class="table-wrapper">
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
        <li>FEAT: Lepše oblikuj nastavitve</li>
        <li>FEAT: Spremeni velikost slik v tabih.</li>
        <li>BUG: Seznam imen na grafu se konča na dnu grafa in lahko odreže spodnja imena</li>
    </ul>
</div>
<style>
    :global(body) {
        margin: 0;
    }
    :global(body) * {
        font-family: "Ubuntu", sans;
    }
    h1 {
        background-color: #1c93d1;
        margin: 0;
        padding: 0.5em;
        color: white;
        text-align: center;
    }
    h2 {
        margin-top: 1.5em;
    }
    .wrapper {
        max-width: 1050px;
        margin: auto;
    }
    .table-wrapper {
        text-align: center;
    }
    @media only screen and (min-width: 600px) {
        .wrapper {
            padding-left: 2em;
            padding-right: 2em;
        }
        .table-wrapper {
            padding-left: 1em;
            padding-right: 1em;
        }
    }
    .tabs {
        display: flex;
        flex-direction: row;
        justify-content: center;
    }
    .tabs button {
        padding: 0.5em;
        width: 100%;
        max-width: 200pt;
        margin: 1em 0;
        background: none;
        border: none;
        font-size: large;
    }
    .tabs button.active {
        border-bottom: #6cac44 3px solid;
    }
    .pict {
        height: 1em;
        margin-right: 0.5em;
    }
    .check-group {
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        margin-bottom: 1em;
        margin-top: 1em;
    }
    .group-colors {
        display: flex;
    }
    .group-colors span {
        border: 1px solid black;
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
        margin-top: 3em;
        max-width: 100%;
        display: inline-block;
        overflow-x: auto;
    }
    table thead th {
        padding: 0.8em;
        font-weight: normal;
    }
    td:nth-child(2), th:nth-child(2) {
        position: sticky;
        left: 0;
    }
    td {
        text-align: left;
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