export type Data = {name: string; groups: string[]; vals: number[]};

function stats(vals: number[]): {mean: number; std: number} {
    const mean = vals.reduce((a, b) => a + b) / vals.length;
    const std = Math.sqrt(vals.map(val => Math.pow(val - mean, 2)).reduce((a, b) => a + b) / vals.length);
    return {mean, std}
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

export function makeHistograms(data: Data[], groups: string[], colors: string[], isPct: boolean = false): {datasets: {label: string, data: number[]}[]; labels: string[]}[] {
    if (data.length === 0) {
        return [];
    }
    return data[0].vals.map((_, i) => makeDatasets(data, groups, i, isPct, colors))
}

function calcBuckets(min: number, max: number): {start: number; bucket: number; end: number} {
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
    return result;
}

function makeDatasets(data: Data[], groups: string[], idx: number, isPct: boolean, colors: string[]): {labels: string[], datasets: {label: string, data: number[]}[]} {
    const round = (v: number) => isPct ? scoreToPctTxt(v): v;
    const {start, bucket, end} = calcBuckets(Math.min(...data.map(d => d.vals[idx])), Math.max(...data.map(d => d.vals[idx])));
    data.sort((a, b) => a.vals[idx] - b.vals[idx]);
    const datasets: {label: string, data: number[]}[] = [];
    groups.forEach((g, i) => {
        const set = {label: g, backgroundColor: colors[i], footer: [] as string[], data: [] as number[]};
        const gData = data.filter(d => d.groups.some(gr => gr.includes(g)));
        let prev = start;
        let count = 0;
        let names = [] as string[];
        for (const d of gData) {
            while (d.vals[idx] >= prev + bucket + (prev + bucket === end?0.00001:0)) {
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
    const labels = [];
    for (let i = start; i < end; i += bucket) {
        // labels.push(`[${scoreToPctTxt(i)}, ${scoreToPctTxt(i + bucket)})`);
        labels.push(bucket === 1?`${i}`:`[${i}, ${i + bucket})`);
    }

    return {datasets, labels};
}

export function unify(data: Data[], enabled: boolean[], normalizers: ((v: number) => number)[]): Data[] {
    if (data.length === 0) {
        return [];
    }
    const result = data.map(({name, groups, vals}) => ({name, groups, vals: [score(vals, enabled, normalizers)]}));
    return result
}

export function score(vals: number[], enabled: boolean[], normalizers: ((v: number) => number)[]): number {
    const stddevCorrection = 1/Math.sqrt(enabled.filter(e => e).length);
    return vals.map((v, i) => normalizers[i](v)).filter((_, i) => enabled[i]).reduce((a, b) => a + b, 0) * stddevCorrection;
}

export function scoreToPctTxt(score: number): string {
    return `${(100 * (erf(score/Math.sqrt(2))/2+0.5)).toFixed(2)}%`;
}
// Standard Normal variate using Box-Muller transform.
export function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return Math.round(z * stdev + mean);
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