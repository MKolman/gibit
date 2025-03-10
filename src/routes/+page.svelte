<script lang="ts">
	import { onMount } from "svelte";
    import {makeHistograms, unify, normalizer, type Data, score, scoreToPctTxt, odBitScoreNormalizers, makeCandles } from "$lib/stat"
    import Chart from './Chart.svelte'
    import Picker from './Picker.svelte'
    import Hint from './Hint.svelte'
	import PeopleSearch from "./PeopleSearch.svelte";
	import { page } from "$app/stores";
	import { doesGroupMatch, isGroupSelected, levels, colors, extractGroups, type GroupBreakdown, getGroupColors, parseGroups } from "$lib/groups";
	import Toggle from "./Toggle.svelte";
	import Footer from "./Footer.svelte";
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
    let useOdBitScore = true;
    let useRelativeScore = false;
    $: persist.useLevelsAsGroups.set($page.url.searchParams, useLevelsAsGroups)
    $: persist.tab.set($page.url.searchParams, tab)
    $: persist.useOdBitScore.set($page.url.searchParams, useOdBitScore)
    $: persist.useRelativeScore.set($page.url.searchParams, useRelativeScore)

    let groups: [string, boolean][]|[GroupBreakdown, boolean][];
    $: groups = useLevelsAsGroups?levels.map(v => [v, true]):extractGroups(data).map(v => [v, true]);
    $: selectedGroups = groups.filter(([_, v]) => v).map(([v]) => v) as string[] | GroupBreakdown[];
    $: allColors = getGroupColors(groups.map(([v]) => v) as string[] | GroupBreakdown[], true)
    $: selectedColors = groups.map((_, i) => allColors[i]).filter((_, i) => groups[i][1]);
    $: selectedGroupsSet = new Set(selectedGroups.map(v => ((v as GroupBreakdown).name) || v as string));
    $: filteredData = data.filter(v => isGroupSelected(v.groups, selectedGroupsSet, useLevelsAsGroups));
    $: histogramData = makeHistograms(filteredData, selectedGroups, selectedColors);
    $: totalHistogram = makeHistograms(unify(filteredData, selectedExercises.map(([_, v]) => v), normalizers), selectedGroups, selectedColors, !useOdBitScore);
    $: candles = makeCandles(filteredData, selectedGroups, selectedColors);
    $: totalCandles = makeCandles(unify(filteredData, selectedExercises.map(([_, v]) => v), normalizers), selectedGroups, selectedColors, !useOdBitScore);
    $: normalizers = useOdBitScore?odBitScoreNormalizers:exercises.map((_, i) => normalizer((useRelativeScore?filteredData:data).map(v => v.vals[i])));
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
        useOdBitScore = persist.useOdBitScore.get(sp)
        useRelativeScore = persist.useRelativeScore.get(sp)
        useLevelsAsGroups = persist.useLevelsAsGroups.get(sp)
    });
    type Column = number;
    const nameColumn: Column = -1,
          groupsColumn: Column = -2,
          totalColumn: Column = -3;
    let sortColumn: Column = totalColumn;
    let sortAsc = false;
    function setTableSortColumn(column: Column) {
        if (sortColumn === column) {
            sortAsc = !sortAsc
        } else {
            sortColumn = column
            sortAsc = column === nameColumn
        }
    }
    function getMaxGroupIdx(groups: string[]): number {
        const lvls = [
            '- nadaljevalna (',
            'rekreativna 2 / nadaljevalna',
            'rekreativna 2',
            'rekreativna 1 /2',
            '- rekreativna 1',
            'osnovna / rekreativna 1',
            'osnovna',
        ]
        let score = 0
        for (let i = 0; i < lvls.length; i++) {
            if (groups.some(g => g.includes(lvls[i])))
                return lvls.length - i;
        }
        return score
    }
    $: {
        if (tab === 2) {
            sortedPeople = data.map((_, i) => [i, isGroupSelected(data[i].groups, selectedGroupsSet, useLevelsAsGroups)]);
        } else {
            sortedPeople = [...selectedPeople]
        }
        const mul = sortAsc?-1:1;
        switch (sortColumn) {
            case totalColumn:
                sortedPeople.sort((i, j) => mul*data[j[0]].vals.reduce((a, b, i) => a + (selectedExercises[i][1]?normalizers[i](b):0), 0) - mul*data[i[0]].vals.reduce((a, b, i) => a + (selectedExercises[i][1]?normalizers[i](b):0), 0));
                break
            case nameColumn:
                sortedPeople.sort(([i], [j]) => data[i].name < data[j].name?mul:-mul)
                break
            case groupsColumn:
                sortedPeople.sort(([i], [j]) => mul*getMaxGroupIdx(data[i].groups) - mul*getMaxGroupIdx(data[j].groups))
                break
            default:
                sortedPeople.sort(([i], [j]) => mul*data[j].vals[sortColumn] - mul*data[i].vals[sortColumn])
        }
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
        if (useOdBitScore) {
            return score.toFixed(2);
        } else {
            return scoreToPctTxt(score);
        }
    }
    const defaultChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0
        },
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
    <button class:active={tab === 0} on:click={() => tab = 0}>Posamezniki</button>
    <button class:active={tab === 3} on:click={() => tab = 3}>Skupine</button>
    <button class:active={tab === 1} on:click={() => tab = 1}>Izbrani</button>
    <button class:active={tab === 2} on:click={() => tab = 2}>Tabela</button>
</div>
<div class="wrapper">
    <div class="check-group">
        <Picker allTxt="Vse vaje" hint="Za izračun skupne ocene se upoštevajo samo vaje, ki so izbrane. Tako si zlahka odgovorite na vprašanje kako bi vam šlo, če ne bi upoštevali npr. spodnjega servisa ali skoka v višino." bind:values={selectedExercises} />
    </div>
    <Toggle bind:value={useOdBitScore} labels={["Percentili", 'OdBita ocena']}  hint="Percentili vam povedo kolikšen procent ostalih igralcev je slabših od vas. OdBita ocena je z natančno izdelano formulo izračunana iz rezultatov testa."/>
    {#if !useOdBitScore}
        <p>
            Računaj percentile glede na:<br>
            <Toggle bind:value={useRelativeScore} labels={["vse skupine", "izbrane skupine"]} hint="Ali naj se percentili računajo glede na vse igralce, ali samo tiste, ki so v skupinah, ki so izbrane spodaj."/>
        </p>
    {:else}
        <br>
        <br>
    {/if}
    <Toggle bind:value={useLevelsAsGroups} labels={["Skupine", "Stopnje"]} hint="Stopnje so le štiri - od osnovne do nadaljevalne. Za bolj natančen pregled pa lahko primerjate posamične vadbene skupine točno po stopnji, dnevu vadbe in lokaciji."/>
    <div class="check-group">
        <Picker allTxt="Vse skupine" bind:values={groups} alt={1} colors={tab===1?null:allColors} sections={!useLevelsAsGroups && tab !== 1}/>
    </div>
    {#if tab === 0}
        <h2>Skupna ocena <Hint message="Absolutna ocena, kot jo določi OdBita ocena. Ali relativna ocena merjena v standarnih odmikih od povprečja."/></h2>
        <div class="chart">
            <Chart config={{type: 'bar', data: totalHistogram[0], options: makeOptions({scales:{x:{title:{text:useOdBitScore?'OdBita ocena':'Odmik od povprečja [σ]'}}}})}} />
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
            <Chart config={{type: 'candlestick', data: totalCandles[0], options: makeCandleOptions({scales: {y:{ticks: {precision: 2}, title:{text:useOdBitScore?'OdBita ocena':'Odmik od povprečja [σ]'}}}})}} />
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
            <Chart config={{type: 'line', data: {labels: selectedExercises.filter(([_, v])=>v).map(([v]) => v), datasets: selectedPeople.filter(([_, v]) => v).map(([i], idx) => ({label: data[i].name, borderColor: colors[idx%colors.length], data: data[i].vals.map((v, j) => normalizers[j](v)).filter((_, i) => selectedExercises[i][1])}))}, options: {responsive: true, maintainAspectRatio: false, animation: {duration: 0}, plugins:{legend:{display:false}, tooltip: {callbacks: {footer: footer}}},scales: {x:{stacked: true}, y: {stacked: false}}}}} />
        </div>
    {/if}
</div>
<div class="table-wrapper">
    {#if tab === 1 || tab === 2}
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th on:click={() => setTableSortColumn(nameColumn)} class="{sortColumn === nameColumn && "sorted"} {sortAsc && "asc"}">Ime</th>
                    <th on:click={() => setTableSortColumn(groupsColumn)} class="{sortColumn === groupsColumn && "sorted"} {sortAsc && "asc"}">Skupina</th>
                    <th on:click={() => setTableSortColumn(totalColumn)} class="{sortColumn === totalColumn && "sorted"} {sortAsc && "asc"}">Skupna ocena</th>
                    {#each selectedExercises as [name, visible], i}
                        {#if visible}
                        <th on:click={() => setTableSortColumn(i)} class="{sortColumn === i && "sorted"} {sortAsc && "asc"}">{name}</th>
                        {/if}
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each sortedPeople as [idx, visible]}
                    {#if visible}
                    {@const shortGroups = parseGroups(data[idx].groups)}
                    <tr>
                        <td>.</td>
                        <td>{data[idx].name}</td>
                        <td>
                            <span class="group-colors">
                                {#each findColors(data[idx].groups, groups) as color, i}
                                <span style="background: {color};" title={data[idx].groups[i]}>{shortGroups[i].shortName}</span>
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
    <Footer />
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
        color: white;
        display: inline-block;
        flex: 1;
        text-align: center;
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
        position: relative;
        cursor: pointer;
    }
    table thead th.sorted::after {
        content: '▼';
        position: absolute;
        right: 0;
        height: 1em;
        line-height: 1em;
        top: calc(50% - 0.5em)

    }
    table thead th.sorted.asc::after {
        content: '▲';

    }
    tbody tr {
        counter-increment: rowNumber;
    }
    tbody tr td:first-child::before {
        content: counter(rowNumber);
        min-width: 1em;
    }
    td:nth-child(2), th:nth-child(2) {
        position: sticky;
        left: 0;
        z-index: 10;
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