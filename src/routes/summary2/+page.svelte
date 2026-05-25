<script lang="ts">
    import { downloadZip } from "client-zip"
    import { toPng } from 'html-to-image';
	import { onMount } from "svelte";
    import { normalizer, type Data, score, scoreToTopPctTxt, odBitScoreNormalizers } from "$lib/stat"
	import { page } from "$app/stores";
	import { isGroupSelected, levels } from "$lib/groups";
	import { fetchGibitEncData } from "$lib/fetchData";

    const exercises: string[] = ["sprejem-obramba", "podaja", "napad", "blok", "servis"]
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
<!-- {#each data as row} -->
<table data-name="Tadej">
    <tbody>
        <tr>
            <th>OdBita ocena</th>
            <th>4.35</th>
        </tr>
        <tr>
            <th>Ocena trenerja</th>
            <th>4.2</th>
        </tr>
        <tr>
            <td>Sprejem/obramba</td>
            <td>4</td>
        </tr>
        <tr>
            <td>Podaja</td>
            <td>4</td>
        </tr>
        <tr>
            <td>Napad</td>
            <td>4.5</td>
        </tr>
        <tr>
            <td>Blok</td>
            <td>4.5</td>
        </tr>
        <tr>
            <td>Servis</td>
            <td>4</td>
        </tr>
        <tr>
            <th>Ocena iz vaj</th>
            <th>4.6</th>
        </tr>
        <tr>
            <td>Spodnji <br>odboj sede</td>
            <td>4.9 <br>(55)</td>
        </tr>
        <tr>
            <td>Zgornji-spodnji <br> odboj</td>
            <td>4.6 <br>(47)</td>
        </tr>
        <tr>
            <td>Spodnji odboj <br>z dotikom tal</td>
            <td>4.3<br>(23)</td>
        </tr>
    </tbody>
</table>
<!-- {/each} -->

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
        text-align: left;
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
        /* text-align: right; */
        padding-left:2em;
    }
</style>