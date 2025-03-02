import { doesGroupMatch, type GroupBreakdown } from "./groups";
export type Data = {name: string; groups: string[]; vals: number[]};

function stats(vals: number[]): {mean: number; std: number, max: number, min: number} {
    const mean = vals.reduce((a, b) => a + b) / vals.length;
    const std = Math.sqrt(vals.map(val => Math.pow(val - mean, 2)).reduce((a, b) => a + b) / vals.length);
    return {mean, std, max: Math.max(...vals), min: Math.min(...vals)};
}

export function normalizer(vals: number[]): (val: number) => number {
    if (vals.length === 0) {
        return identity;
    }
    const {mean, std} = stats(vals);
    return (val: number) => (val - mean) / std;
}

function identity(val: number): number {
    return val;
}

export const bojanScoreNormalizers = [
    (val: number) => val/5,
    (val: number) => val/3,
    (val: number) => val/8,
    (val: number) => val/3,
    (val: number) => val/4,
    identity,
    identity,
    identity,
    (val: number) => val/5,
]

export function makeHistograms(data: Data[], groups: string[]|GroupBreakdown[], colors: string[], isPct: boolean = false): {datasets: {label: string, data: number[]}[]; labels: string[]}[] {
    if (data.length === 0) {
        return [];
    }
    return data[0].vals.map((_, i) => makeDatasets(data, groups.map(v => ((v as GroupBreakdown).name || v as string)), i, isPct, colors))
}

function calcBuckets(data: number[]): {start: number; bucket: number; end: number} {
    const min = Math.min(...data);
    const max = Math.max(...data);
    let result = {start: min, bucket: 1, end: max};
    let bestScore = 1000;
    for (const bucket of [0.1, 0.5, 1, 2, 5, 10]) {
        const start = Math.floor(min / bucket) * bucket;
        const end = Math.ceil(max / bucket) * bucket;
        const numBuckets = (end - start) / bucket;
        const score = Math.abs(numBuckets - 10)
        if (score < bestScore) {
            bestScore = score;
            result = {start, bucket, end};
        }
    }
    if (result.end === max) {
        result.end += result.bucket;
    }
    return result;
}

function makeDatasets(data: Data[], groups: string[], idx: number, isPct: boolean, colors: string[]): {labels: string[], datasets: {label: string, data: number[]}[]} {
    const round = (v: number) => isPct ? scoreToPctTxt(v): v % 1 == 0?v:v.toFixed(2);
    data = data.filter(d => d.vals[idx] !== null);
    const {start, bucket, end} = calcBuckets(data.map(d => d.vals[idx]));
    data.sort((a, b) => a.vals[idx] - b.vals[idx]);
    const datasets: {label: string, data: number[]}[] = [];
    groups.forEach((g, i) => {
        const set = {label: g, backgroundColor: colors[i], footer: [] as string[], data: [] as number[]};
        const gData = data.filter(d => d.groups.some(gr => doesGroupMatch(gr, g)));
        let prev = start;
        let count = 0;
        let names = [] as string[];
        for (const d of gData) {
            while (d.vals[idx] >= prev + bucket) {
                set.data.push(count);
                set.footer.push(names.join("\n"));
                prev += bucket;
                count = 0;
                names = [];
            }
            count += 1;
            names.push(`${d.name} (${round(d.vals[idx])})`);
        }
        for (;prev < end; prev += bucket) {
            set.data.push(count);
            set.footer.push(names.join("\n"));
            prev += bucket;
            count = 0;
            names = [];
        }
        datasets.push(set);
    });
    const isIntData = data.every(d => Number.isInteger(d.vals[idx]));
    const labels = [];
    for (let i = start; i < end; i += bucket) {
        labels.push(bucket === 1 && isIntData?`${i}`:`[${i}, ${i + bucket})`);
    }

    return {datasets, labels};
}

export function makeCandles(data: Data[], groups: string[]|GroupBreakdown[], colors: string[], isPct: boolean = false) {
    if (data.length === 0) {
        return [];
    }
    const fmt = (v: number) => isPct ? scoreToPctTxt(v): Number.isInteger(v)?v:v.toFixed(2);
    return data[0].vals.map((_, i) => {
        let dataset = makeGroupCandleDataset(data, groups, i);
        const combinedValues = dataset.map((d, i) => ({d, c:colors[i], n: (groups[i] as GroupBreakdown).name || groups[i] as string}))
        combinedValues.sort((a, b) => a.d.mean - b.d.mean)

        dataset = combinedValues.map(({d}) => d)
        const titles = combinedValues.map(({n}) => n)
        const backgroundColors = combinedValues.map(({c}) => ({up:c}))
        return {labels: dataset.map(v => v.group), datasets: [{
            data: dataset.map((vals, x) => {
                return {x, l: vals.min, o: vals.mean - vals.std, c: vals.mean + vals.std, h: vals.max, };
            }),
            titles,
            dataLabel: dataset.map(v => `${fmt(v.mean - v.std)} - ${fmt(v.mean + v.std)}`),
            footer: dataset.map(v => `Povp.: ${fmt(v.mean)}\nMin: ${fmt(v.min)}\nMax: ${fmt(v.max)}` + (isPct?'':`\nStd: ${v.std.toFixed(2)}`)),
            backgroundColors,
            backgroundColor: backgroundColors.map(({up}) => up),
            borderColors: backgroundColors,
        }]}
    });
}

type GroupCandle = {group: string; mean: number; std: number; min: number; max: number; ppl: {score: number, name: string}[]};
function makeGroupCandleDataset(data: Data[], groups: string[]|GroupBreakdown[], idx: number): GroupCandle[] {
    data = data.filter(d => d.vals[idx] !== null);
    const result: GroupCandle[] = [];
    for (const group of groups) {
        const gData = data.filter(d => d.groups.some(gr => doesGroupMatch(gr, (group as GroupBreakdown).name || group as string)));
        const vals = gData.map(d => d.vals[idx]);
        const row = {group: (group as GroupBreakdown).shortName || group as string, ...stats(vals), ppl: gData.map(d => ({score: d.vals[idx], name: d.name}))};
        result.push(row);
    }
    return result;
}

export function unify(data: Data[], enabled: boolean[], normalizers: ((v: number) => number)[]): Data[] {
    if (data.length === 0) {
        return [];
    }
    const result = data.map(({name, groups, vals}) => ({name, groups, vals: [score(vals, enabled, normalizers)]}));
    return result
}

export function score(vals: number[], enabled: boolean[], normalizers: ((v: number) => number)[]): number {
    const nvs = vals.map((val, i) => ({norm: normalizers[i], val})).filter(({val}, i) => enabled[i] && val !== null);
    return nvs.map(({norm, val}) => norm(val)).reduce((a, b) => a + b, 0) / nvs.length;
}

export function scoreToPctTxt(score: number): string {
    return `${(100 * (erf(score/Math.sqrt(2))/2+0.5)).toFixed(2)}%`;
}

function erf(x: number) {
    if (x == 0) return 0;
    const ERF_A = 0.147; 
    let sign = x > 0 ? 1 : -1;

    let one_plus_axsqrd = 1 + ERF_A * x * x;
    let four_ovr_pi_etc = 4/Math.PI + ERF_A * x * x;
    let ratio = four_ovr_pi_etc / one_plus_axsqrd;
    ratio *= x * -x;
    let expofun = Math.exp(ratio);
    let radical = Math.sqrt(1-expofun);
    return radical * sign;
}