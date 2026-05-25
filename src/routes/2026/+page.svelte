<script lang="ts">
	import { onMount } from "svelte";
    import {makeHistograms, unify, normalizer, type Data, score, scoreToPctTxt, odBitScoreNormalizers, makeCandles } from "$lib/stat"
    import Chart from '../Chart.svelte'
    import Picker from '../Picker.svelte'
    import Hint from '../Hint.svelte'
	import PeopleSearch from "../PeopleSearch.svelte";
	import { page } from "$app/stores";
	import { doesGroupMatch, isGroupSelected, levels, colors, extractGroups, type GroupBreakdown, getGroupColors, parseGroups } from "$lib/groups";
	import Toggle from "../Toggle.svelte";
	import Footer from "../Footer.svelte";
    import * as persist from "$lib/persist"
	import { mergeDeep } from "$lib/merge";
	import { fetchGibitEncData } from "$lib/fetchData";

    const exercises: string[] = ["Spodnji odboj sede", "Zgornji-spodnji odboj", "Spodnji odboj z dotikom tal", "Telesna višina"]
    const exHints: string[] = [
        "Število zaporednih spodnjih odbojev, ki jih lahko narediš sede v 30 sekundah.",
        "Število zaporednih spodnjih odbojev z vmesnim dotikom tal, ki jih lahko narediš v 60 sekundah.",
        "Število zaporednih izmenjujočih zgornjih in spodnjih odbojev, ki jih lahko narediš v 30 sekundah.",
        "Telesna višina od glave do pet.",
    ]
    let originalExercises: string[] = exercises;
    let selectedExercises: [string, boolean][] = exercises.map(v => [v, true]);
    let data: Data[] = [];

    const godmode = $page.url.searchParams.has("godmode");
    // Persisted settings
    let useLevelsAsGroups = true;
    let tab = 2;
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
    // $: filteredData = data.filter(v => isGroupSelected(v.groups, selectedGroupsSet, useLevelsAsGroups));
    $: filteredData = data;
    // $: histogramData = makeHistograms(filteredData, selectedGroups, selectedColors);
    // $: totalHistogram = makeHistograms(unify(filteredData, selectedExercises.map(([_, v]) => v), normalizers), selectedGroups, selectedColors, !useOdBitScore);
    // $: candles = makeCandles(filteredData, selectedGroups, selectedColors);
    // $: totalCandles = makeCandles(unify(filteredData, selectedExercises.map(([_, v]) => v), normalizers), selectedGroups, selectedColors, !useOdBitScore);
    const heightPreTransform = (fn: (v: number) => number) => (v: number) => fn(v*2-60)
    let normalizers = [odBitScoreNormalizers[0], odBitScoreNormalizers[4], odBitScoreNormalizers[1], heightPreTransform(odBitScoreNormalizers[8])].map(fn => (v: number) => fn(v)/10*4+1);
    let selectedPeople: [number, boolean][] = [];
    let sortedPeople: [number, boolean][] = [];
    onMount(() => {
        const sp = $page.url.searchParams
        fetchGibitEncData(sp, "2").then(v => {
            console.log(v)
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
          coachColumn: Column = -5,
          exColumn: Column = -4,
          totalColumn: Column = -3,
          rankColumn: Column = -6;
    let sortColumn: Column = rankColumn;
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
            if (groups.includes(lvls[i]))
                return lvls.length - i;
        }
        return score
    }

    const ranks = ["I.", "II.", "III.", "IV.", "V."]
    function rank(i: number): string {
        if (data[i].override) {
            return ranks[data[i].override-1] || "?";
        }
        const score = score2(i)
        if (score < 1.705) {
            return "I."
        } else if (score < 2.405) {
            return "II."
        } else if (score < 3.305) {
            return "III."
        } else if (score < 4.005) {
            return "IV."
        } else {
            return "V."
        }
    }
    function score2(i: number): number {
        const coach = data[i].vals[5]*5
        const exs = data[i].vals.slice(6).map((v, i) => ({norm: normalizers[i], v})).filter(({v}) => v !== null).map(({norm, v}) => norm(v))
        return (coach + exs.reduce((a, b) => a + b, 0))/(5 + exs.length)
    }
    function score3(i: number): number {
        const exs = data[i].vals.slice(6).map((v, i) => ({norm: normalizers[i], v})).filter(({v}) => v !== null).map(({norm, v}) => norm(v))
        if (exs.length === 0) {
            return null;
        }
        return exs.reduce((a, b) => a + b, 0)/exs.length
    }
    $: {
        if (tab === 2 || tab === 4) {
            sortedPeople = data.map((_, i) => [i, true]);
        } else {
            sortedPeople = [...selectedPeople]
        }
        const mul = sortAsc?-1:1;
        switch (sortColumn) {
            case totalColumn:
                // sortedPeople.sort(([i], [j]) => mul*score(data[j].vals, selectedExercises.map(([_, v]) => v), normalizers) - mul*score(data[i].vals, selectedExercises.map(([_, v]) => v), normalizers) )
                sortedPeople.sort(([i], [j]) => mul*score2(j)- mul*score2(i))
                break
            case rankColumn:
                sortedPeople.sort(([i], [j]) => mul*score2(j)- mul*score2(i))
                const rankScore = (idx: number) => ranks.indexOf(rank(idx))
                sortedPeople.sort(([i], [j]) => mul*rankScore(j) - mul*rankScore(i))
                break
            case exColumn:
                sortedPeople.sort(([i], [j]) => mul*score3(j)- mul*score3(i))
                break
            case nameColumn:
                sortedPeople.sort(([i], [j]) => data[i].name < data[j].name?mul:-mul)
                break
            case groupsColumn:
                sortedPeople.sort(([i], [j]) => mul*getMaxGroupIdx(data[i].groups) - mul*getMaxGroupIdx(data[j].groups))
                break
            case coachColumn:
                sortedPeople.sort(([i], [j]) => data[i].coach < data[j].coach?mul:-mul)
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
        return getGroupColors([groups].map((group) => 
            (groupsList.find(([g]) => doesGroupMatch(group, (g as GroupBreakdown).name || g as string))||["red"])[0] as any as string
        ), false) as string[]
    }
    function formatNormalizedScore(score: number) {
        if (score === null) {
            return "/"
        }
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

    function exportTableCSV(): string {
        const enabled = selectedExercises.map(([_, en]) => en)
        const filterEn = <T>(vals: T[]):T[] => vals.filter((_, i) => enabled[i])
        let result = `Ime,Sifra,Skupina,Skupna Ocena,Ocena Trenerja,Ocena iz vaj,Trener`;
        for (const e of exercises) {
            result += `,${e},${e} (ocena)`
        }
        result += ",sprejem-obramba,podaja,napad,blok,servis\n";

        for (const [idx, visible] of sortedPeople) {
            const p = data[idx];
            p.vals.slice(6, 10)
            result += `${p.name},${p.sifra},${rank(idx)},${formatNormalizedScore(score2(idx))},${formatNormalizedScore(p.vals[5])},${formatNormalizedScore(score3(idx))},"${p.coach}"`
            for (let i = 6; i < 10; i++) {
                if (p.vals[i] === null) {
                    result += `,/,/`
                    continue;
                }
                result += `,${p.vals[i]},${formatNormalizedScore(normalizers[i-6](p.vals[i]))}`
            }
            for (let i = 0; i < 5; i++) {
                result += `,${p.vals[i] === null?"/":p.vals[i]}`
            }
            result += "\n"
        }
        return result
    }

    function downloadTable() {
        // Create element with <a> tag
        const link = document.createElement("a");

        // Create a blog object with the file content which you want to add to the file
        const file = new Blob([exportTableCSV()], { type: 'text/plain' });

        // Add file content in the object URL
        link.href = URL.createObjectURL(file);

        // Add file name
        link.download = "odbit_odbojkarski_karton.csv";

        // Add click event to <a> tag to save file.
        link.click();
        URL.revokeObjectURL(link.href);
    }

</script>
<h1><img src="/white_rabbit.png" alt="gibit logo">ODBIT ODBOJKARSKI KARTON</h1>
<!-- <div class="tabs">
    <button class:active={tab === 0} on:click={() => tab = 0}>Posamezniki</button>
    <button class:active={tab === 3} on:click={() => tab = 3}>Skupine</button>
    <button class:active={tab === 1} on:click={() => tab = 1}>Izbrani</button>
    <button class:active={tab === 2} on:click={() => tab = 2}>Tabela</button>
</div> -->
<!-- <div class="wrapper"> -->
    <!-- <div class="check-group">
        <Picker allTxt="Vse vaje" hint="Za izračun skupne ocene se upoštevajo samo vaje, ki so izbrane. Tako si zlahka odgovorite na vprašanje kako bi vam šlo, če ne bi upoštevali npr. spodnjega servisa ali skoka v višino." bind:values={selectedExercises} />
    </div>
    <Toggle bind:value={useOdBitScore} labels={["Percentili", 'OdBita ocena']}  hint="Percentili vam povedo kolikšen procent ostalih igralcev je slabših od vas. OdBita ocena je z natančno izdelano formulo izračunana iz rezultatov testa."/> -->
    <!-- {#if !useOdBitScore}
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
    </div> -->
    <!-- {#if tab === 0}
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
    {/if} -->
    <!-- {#if tab === 3}
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
    {/if} -->
<!-- </div> -->
<div class="table-wrapper">
    {#if tab === 1 || tab === 2}
        <table>
            <thead>
                <tr>
        
                    <th>
                        {#if godmode}
                        <button style="cursor:pointer; border:none; background: none" on:click={downloadTable}><img src="/download.svg" alt="Prenesi" style="height:1em"></button>
                        {/if}
                    </th>
                    <th on:click={() => setTableSortColumn(nameColumn)} class="{sortColumn === nameColumn && "sorted"} {sortAsc && "asc"}">Ime</th>
                    {#if godmode}
                    <th>Šifra</th>
                    {/if}
                    <th on:click={() => setTableSortColumn(rankColumn)} class="{sortColumn === rankColumn && "sorted"} {sortAsc && "asc"}">Predlog skupine</th>
                    {#if godmode}
                    <th on:click={() => setTableSortColumn(totalColumn)} class="{sortColumn === totalColumn && "sorted"} {sortAsc && "asc"}">Skupna ocena</th>
                    <th on:click={() => setTableSortColumn(5)} class="{sortColumn === 5 && "sorted"} {sortAsc && "asc"}">Ocena trenerja</th>
                    <th on:click={() => setTableSortColumn(exColumn)} class="{sortColumn === exColumn && "sorted"} {sortAsc && "asc"}">Ocena iz vaj</th>
                    {/if}
                    {#each selectedExercises as [name, visible], i}
                        {#if visible}
                        <th on:click={() => setTableSortColumn(i+6)} class="{sortColumn === i+6 && "sorted"} {sortAsc && "asc"}">{name}</th>
                        {/if}
                    {/each}
                    {#if godmode}
                    
                    {#each ["sprejem-obramba","podaja","napad","blok","servis"] as ex, i}
                        <th on:click={() => setTableSortColumn(i)} class="{sortColumn === i && "sorted"} {sortAsc && "asc"}">{ex}</th>
                    {/each}
                    <th on:click={() => setTableSortColumn(coachColumn)} class="{sortColumn === coachColumn && "sorted"} {sortAsc && "asc"}">Trener</th>
                    {/if}
                </tr>
            </thead>
            <tbody>
                {#each sortedPeople as [idx, visible]}
                    {#if visible}
                    {@const shortGroups = parseGroups(data[idx].groups)}
                    <tr>
                        <td>.</td>
                        <td>
                            {#if godmode && data[idx].vals[5] && score3(idx) && Math.abs(data[idx].vals[5] - score3(idx)) > 1}<span class="alert" title="Ocena trenerja odstopa za več kot 1">!!!!</span>{/if}
                            {data[idx].name}
                        </td>
                        {#if godmode}
                        <td>{data[idx].sifra}</td>
                        {/if}
                        <td>{rank(idx)}</td>
                        {#if godmode}
                        <td>{formatNormalizedScore(score2(idx))} </td>
                        <td>{data[idx].vals[5]}</td>
                        <td>
                            {formatNormalizedScore(score3(idx))}
                            {#if data[idx].legacy_data }
                                (2024)
                            {/if}
                        </td>
                        {/if}
                        {#each [6, 7, 8, 9] as i}
                            <td>
                                {#if data[idx].vals[i] !== null}
                                    {data[idx].vals[i]}
                                    {#if godmode}
                                    ({formatNormalizedScore(normalizers[i-6](data[idx].vals[i]))})
                                    {/if}
                                    {#if !godmode && data[idx].legacy_data }
                                        (2024)
                                    {/if}
                                {:else}
                                    /
                                {/if}
                            </td>
                        {/each}
                        {#if godmode}
                        {#each ["sprejem-obramba","podaja","napad","blok","servis"] as _, i}
                            <td>{data[idx].vals[i] === null?"/":data[idx].vals[i]}</td>
                        {/each}
                        <td>{data[idx].coach}</td>
                        {/if}
                        <!-- <td>{data[idx].vals[6]}</td>
                        <td>{data[idx].vals[7]}</td>
                        <td>{data[idx].vals[8]}</td>
                        <td>{data[idx].vals[9]}</td> -->
                        <!-- {#each selectedExercises as [_, visible], i}
                            {#if visible}
                            <td>
                                {#if data[idx].vals[i] !== null}
                                    {data[idx].vals[i]} ({formatNormalizedScore(normalizers[i](data[idx].vals[i]))})
                                {:else}
                                    /
                                {/if}
                            </td>
                            {/if}
                        {/each} -->
                    </tr>
                    {/if}
                {/each}
            </tbody>
        </table>
    {/if}
    <!-- {#if tab === 4}
        <MakeGroups players={[...data.slice(0, 43), ...data.slice(130)].map(player => ({name: player.name, score: score(player.vals, selectedExercises.map(([_, v]) => v), normalizers)}))} />
    {/if} -->
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
    .alert {
        color: red;
        font-weight: bold;
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