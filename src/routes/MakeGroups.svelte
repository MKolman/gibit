<script lang="ts">
	import { score } from "$lib/stat";

type Player = {name: string, score: number}
export let players: Player[];
export let numGroupsManual: number|null = null;
let numGroups: number;
$: numGroups = numGroupsManual === null ? Math.round(players.length/6) : numGroupsManual;
let groups: Player[][] = [];
$: if (groups.length != numGroups || groups.reduce((total, g) => total+g.length, 0) != players.length) {
    groups = makeBestGroups(players, numGroups, 1)
}
let worstScore: number
$: {
    const ps = [...players];
    const gSize = Math.floor(ps.length/numGroups)
    ps.sort((a, b) => a.score - b.score)
    worstScore = scoreGroup(ps.slice(undefined, gSize)) / scoreGroup(ps.slice(ps.length-gSize))
}
let groupScore: number
$: {
    const scores = groups.map(scoreGroup)
    groupScore = (Math.min(...scores) / Math.max(...scores) - worstScore) / (1-worstScore)
}

function getGroupLimits(numPlayers: number, numGroups: number): number[] {
    const smallGroupSize = Math.floor(numPlayers/numGroups)
    const numSmallGroups = numGroups - (numPlayers % numGroups)
    return new Array(numGroups+1).fill(0).map((_, i) => i * smallGroupSize + Math.max(0, i-numSmallGroups))
}

function shuffle<T>(array: T[]) {
    for (let idx = array.length; idx > 0; idx--) {
        let randomIndex = Math.floor(Math.random() * idx);
        [array[idx-1], array[randomIndex]] = [array[randomIndex], array[idx-1]];
    }
}

function scoreGroup(group: Player[]): number {
    return group.reduce((sum, player) => sum + player.score, 0)/group.length
}

function getScore(players: Player[], groupLimits: number[]): number {
    let max = -Infinity
    let min = Infinity
    let sum = 0
    let groupIdx = 1
    players.forEach((p, idx) => {
        if (idx === groupLimits[groupIdx]) {
            const score = sum/(idx - groupLimits[groupIdx-1])
            max = Math.max(max, score)
            min = Math.min(min, score)
            sum = 0
            groupIdx += 1
        }
        sum += p.score
    })
    const score = sum/(groupLimits[groupIdx] - groupLimits[groupIdx-1])
    max = Math.max(max, score)
    min = Math.min(min, score)
    return max - min
}
function swapAround(groups: Player[][]) {
    for (let iter = 0; iter < groups.length*10; iter++) {
        groups.sort((g1, g2) => scoreGroup(g2) - scoreGroup(g1))
        const [best, worst] = [groups[0], groups[groups.length-1]];
        let bestSwap: [number, number] | null = null
        let bestScore = scoreGroup(best) - scoreGroup(worst)
        for (let i = 0; i < best.length; i++) {
            for (let j = 0; j < worst.length; j++) {
                [best[i], worst[j]] = [worst[j], best[i]]
                const newScore = Math.abs(scoreGroup(best) - scoreGroup(worst));
                [best[i], worst[j]] = [worst[j], best[i]]
                if (newScore < bestScore) {
                    bestScore = newScore
                    bestSwap = [i, j]
                }
            }
        }
        if (bestSwap !== null) {
            const [i, j] = bestSwap;
            [best[i], worst[j]] = [worst[j], best[i]]
        }
    }
    groups.sort((g1, g2) => scoreGroup(g2) - scoreGroup(g1))
    groups.forEach(g => g.sort((a, b) => b.score - a.score))
}
function makeBestGroups(players: Player[], numGroups: number, effort: number): Player[][] {
    if (numGroups === 0) {
        return []
    }
    if (numGroups > players.length) {
        throw new Error(`cannot create ${numGroups} groups from ${players.length} players`)
    }
    const groupLimits = getGroupLimits(players.length, numGroups)
    let bestScore = Infinity;
    let bestOrder: Player[] = [];
    for (let i = 0; i < effort; i++) {
        shuffle(players)
        const score = getScore(players, groupLimits)
        if (score < bestScore) {
            bestScore = score;
            bestOrder = [...players]
        }
    }
    const result = groupLimits.slice(1).map((v, i) => bestOrder.slice(groupLimits[i], v));
    swapAround(result)
    return result
}

</script>

<h1>{(groupScore*100).toFixed(1)}%</h1>
{#each [1, 10, 100, 1000, 10000, 100000, 1000000] as effort}
    <button on:click={() => (groups = makeBestGroups(players, numGroups, effort))}>Preračunaj {effort}</button>
{/each}
<br>
{#each groups as group, i}
    <div>
        <h2>Ekipa {i+1}<br><small>{scoreGroup(group).toFixed(2)}</small></h2>
        <br>
        {#each group as player}
            <span>{player.name}<br>{player.score.toFixed(1)}</span>
        {/each}
    </div>
{/each}


<style>
    div {
        background-color: #1c93d1;
        color: white;
        display: inline-block;
        max-width: 500px;
        margin: 1em;
        padding: 1em;
        border-radius: 5px;

    }
    span {
        display: inline-block;
        padding: 1em;
    }
</style>