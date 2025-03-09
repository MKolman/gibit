<script lang="ts">
    import { downloadZip } from "client-zip"
    import { toPng } from 'html-to-image';
	import { onMount } from "svelte";
    import { normalizer, type Data, score, scoreToTopPctTxt, odBitScoreNormalizers } from "$lib/stat"
	import { page } from "$app/stores";
	import { isGroupSelected, levels } from "$lib/groups";
	import { fetchGibitEncData } from "$lib/fetchData";

    const exercises: string[] = ["Spodnji odboj sede", "Spodnji odboj z dotikom tal", "Zgornji odboj sede", "Zgornji odboj s ploskom", "Zgornji-spodnji odboj", "Spodnji servis", "Zgornji servis", "Napadalni udarec", "Dosežena višina"]
    const enabled: boolean[] = exercises.map(_ => true)
    let data: Data[] = [];
    let dataPerLevel: Data[][];
    let realPct: boolean = false;
    $: dataPerLevel = [data, ...levels.map(lvl => data.filter(row => isGroupSelected(row.groups, new Set([lvl]), true)))]
    $: dataPerLevelPerExercise = dataPerLevel.map(data => exercises.map((_, i) => data.map(row => row.vals[i])))
    $: odBitScoreDataPerLevel = dataPerLevel.map(data => data.map(row => score(row.vals, enabled, odBitScoreNormalizers)))
    $: normalizersPerLevel = dataPerLevel.map(data => exercises.map((_, i) => normalizer(data.map(row => row.vals[i]))))
    $: bojanRelativeNormalizerPerLevels = dataPerLevel.map(data => normalizer(data.map(row => score(row.vals, enabled, odBitScoreNormalizers))))

    function getRealPct(data: number[], val: number, includesSelf: boolean): string {
        if (val === null) {
            return "/"
        }
        const same = data.filter(v => v === val).length + (+!includesSelf)
        const better = data.filter(v => v !== null && v < val).length;
        const all = data.filter(v => v !== null).length + (+!includesSelf)
        return `${(100 - 100*(better+same/2)/all).toFixed(1)}%`
    }
    onMount(() => {
        const sp = $page.url.searchParams
        fetchGibitEncData(sp).then(v => {
            if (v) {
                ({data} = v);
            }
        })
    })

    let downloadLink: string|null = null;
    let downloadFileName = "";
    function dataURLtoFile(dataurl, filename) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }
    const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))
    async function saveImg() {
        downloadLink = "";
        await sleep(100);
        let files = []
        let processed = 0;
        for (const node of document.getElementsByTagName("table")) {
            processed++
            console.log(processed, node.dataset.name)
            // if (node.dataset.name !== "Mamba") continue
            files.push(toPng(node).then(url => dataURLtoFile(url, node.dataset.name + ".png")))
            // if (files.length > 20) break
            // break
        }
        if (files.length === 1) {
            const f = await files[0]
            console.log(f)
            downloadFileName = f.name
            downloadLink = URL.createObjectURL(f)
        } else {
            downloadFileName = "tabele.zip"
            downloadLink = URL.createObjectURL(await downloadZip(await Promise.all(files)).blob())
        }
    }

</script>
{#each data as row}
<table data-name={row.name}>
    <thead>
        <tr>
            <th colspan="2">{row.name}</th>
            <th colspan="5">Vaš percentil<sup>*</sup> v skupini</th>
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
            <td>Skupna ocena</td>
            <td>{score(row.vals, enabled, odBitScoreNormalizers).toFixed(2)}</td>
            {#if realPct }
                {#each odBitScoreDataPerLevel as data, i}
                    <td>{getRealPct(data, score(row.vals, enabled, odBitScoreNormalizers), dataPerLevel[i].some(r => row.name===r.name))}</td>
                {/each}
            {:else}
                {#each bojanRelativeNormalizerPerLevels as norm}
                    <td>{scoreToTopPctTxt(norm(score(row.vals, enabled, odBitScoreNormalizers)))}</td>
                {/each}
            {/if}
        </tr>
        {#each row.vals as val, i}
            <tr>
                <td>{exercises[i]}</td>
                <td>{val === null ? '/' : val}</td>
                {#if realPct }
                    {#each dataPerLevelPerExercise as data, j}
                        <td>{getRealPct(data[i], val, dataPerLevel[j].some(r => row.name===r.name))}</td>
                    {/each}
                {:else}
                    {#each normalizersPerLevel as norm}
                        <td>{val===null?'/':scoreToTopPctTxt(norm[i](val))}</td>
                    {/each}
                {/if}
            </tr>
        {/each}
        <tr>
            <td colspan="7" style="border:none"><small>*percentili (od 0% do 100% - več je boljše) okvirno povedo kakšen delež populacije ste premagali</small></td>
        </tr>
    </tbody>
</table>
{/each}

{#if downloadLink === null}
    <button on:click={saveImg}>Prenesi zip z vsemi slikami tabel</button>
{:else if downloadLink.length === 0}
    Generating...
{:else}
    <a href={downloadLink} download={downloadFileName}>Prenesi zip z vsemi slikami tabel</a>
{/if}
<style>
    table {
        border-collapse: collapse;
        margin-bottom: 2em;
        background-color: white;
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