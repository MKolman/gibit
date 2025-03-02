<script lang="ts">
	import { onMount } from "svelte";
    import { normalizer, type Data, score, scoreToPctTxt, bojanScoreNormalizers } from "$lib/stat"
	import { page } from "$app/stores";
	import { isGroupSelected, levels } from "$lib/groups";
	import { fetchGibitEncData } from "$lib/fetchData";

    const exercises: string[] = ["Spodnji odboj sede", "Spodnji odboj z dotikom tal", "Zgornji odboj sede", "Zgornji odboj s ploskom", "Zgornji-spodnji odboj", "Spodnji servis", "Zgornji servis", "Napadalni udarec", "Dosežena višina"]
    const enabled: boolean[] = exercises.map(_ => true)
    let data: Data[] = [];
    let dataPerLevel: Data[][];
    let realPct: boolean = true;
    $: dataPerLevel = [data, ...levels.map(lvl => data.filter(row => isGroupSelected(row.groups, new Set([lvl]), true)))]
    $: dataPerLevelPerExercise = dataPerLevel.map(data => exercises.map((_, i) => data.map(row => row.vals[i])))
    $: bojanScoreDataPerLevel = dataPerLevel.map(data => data.map(row => score(row.vals, enabled, bojanScoreNormalizers)))
    $: normalizersPerLevel = dataPerLevel.map(data => exercises.map((_, i) => normalizer(data.map(row => row.vals[i]))))
    $: bojanRelativeNormalizerPerLevels = dataPerLevel.map(data => normalizer(data.map(row => score(row.vals, enabled, bojanScoreNormalizers))))

    function getRealPct(data: number[], val: number): string {
        let better = data.filter(v => v < val).length;
        return `${(100*better/data.length).toFixed(2)}%`
    }
    onMount(() => {
        const sp = $page.url.searchParams
        fetchGibitEncData(sp).then(v => {
            if (v) {
                ({data} = v);
            }
        })
    })

</script>
{#each data as row}
<table>
    <thead>
        <tr>
            <th colspan="2">{row.name}</th>
            <th colspan="5">Boljši ste od tega % igralcev iz skupine</th>
        </tr>
        <tr>
            <th>Vaja</th>
            <th>Rezultat</th>
            <th>vse skupine</th>
            <th>osnovna</th>
            <th>rekreativna 1</th>
            <th>rekreativna 2</th>
            <th>nadaljevalna</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Skupni "Bojan" score</td>
            <td>{score(row.vals, enabled, bojanScoreNormalizers).toFixed(2)}</td>
            {#if realPct }
                {#each bojanScoreDataPerLevel as data}
                    <td>{getRealPct(data, score(row.vals, enabled, bojanScoreNormalizers))}</td>
                {/each}
            {:else}
                {#each bojanRelativeNormalizerPerLevels as norm}
                    <td>{scoreToPctTxt(norm(score(row.vals, enabled, bojanScoreNormalizers)))}</td>
                {/each}
            {/if}
        </tr>
        {#each row.vals as val, i}
            <tr>
                <td>{exercises[i]}</td>
                <td>{val}</td>
                {#if realPct }
                    {#each dataPerLevelPerExercise as data}
                        <td>{getRealPct(data[i], val)}</td>
                    {/each}
                {:else}
                    {#each normalizersPerLevel as norm}
                        <td>{scoreToPctTxt(norm[i](val))}</td>
                    {/each}
                {/if}
            </tr>
        {/each}
    </tbody>
</table>
{/each}

<style>
    table {
        border-collapse: collapse;
        margin-bottom: 2em;
    }
    th, td {
        border: 1px solid black;
        padding: 0.5em;
        text-align: center;
    }
    th {
        border: 1px solid white;
    }
    th {
        color: white;
        background-color: #1c93d1;
    }
    tbody tr:first-child td {
        color: white;
        background-color: #6cac44;
        font-weight: bold;
    }
    tbody tr td:first-child {
        text-align: right;
    }
</style>