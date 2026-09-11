import fs from 'fs';
import path from 'path';

function transformer(m, s) {
  const zero = Math.tanh(m / s);
  return function (v) {
    return 10 * (Math.tanh((v - m) / s) + zero) / (1 + zero);
  };
}

function heightPreTransform(fn) {
  return function (v) {
    return fn(v * 2 - 60);
  };
}

const normSpodnjiSede = (v) => (transformer(20, 20)(v) / 10) * 4 + 1;
const normZgornjiSpodnji = (v) => (transformer(30, 15)(v) / 10) * 4 + 1;
const normSpodnjiDotikTal = (v) => (transformer(0, 20)(v) / 10) * 4 + 1;
const normVisina = (v) => (heightPreTransform(transformer(290, 20))(v) / 10) * 4 + 1;

const normalizers = [normSpodnjiSede, normZgornjiSpodnji, normSpodnjiDotikTal, normVisina];
const RANKS = ["I.", "II.", "III.", "IV.", "V."];

function calculateRank(score, override) {
  if (override !== null && override !== undefined && override !== '') {
    if (typeof override === 'number') {
      return RANKS[override - 1] || '?';
    }
    const num = parseInt(override, 10);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return RANKS[num - 1];
    }
    if (RANKS.includes(override)) {
      return override;
    }
  }
  if (score === null || score === undefined || isNaN(score)) {
    return '?';
  }
  if (score < 1.705) return 'I.';
  if (score < 2.405) return 'II.';
  if (score < 3.305) return 'III.';
  if (score < 4.005) return 'IV.';
  return 'V.';
}

function parseNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim().replace(',', '.');
  if (str === '' || str === '/' || str.toLowerCase() === 'x' || str.toLowerCase() === 'o' || str.toLowerCase() === '-') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  const header = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j] !== undefined ? values[j] : '';
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const rawDataPath = path.resolve('data/data_mivka_2026_09_09.csv');
const expectedPath = path.resolve('data/odbit_odbojkarski_karton_mivka_september_2026_rezultati2.csv');
const exceptionsPath = path.resolve('data/izjeme_2026_05_08.csv');

const rawRows = parseCSV(fs.readFileSync(rawDataPath, 'utf8'));
const expectedRows = parseCSV(fs.readFileSync(expectedPath, 'utf8'));
const exceptionsRows = parseCSV(fs.readFileSync(exceptionsPath, 'utf8'));
const exceptions = {};
for (const r of exceptionsRows) {
  if (r['Ime']) exceptions[r['Ime'].trim()] = r['Skupina'].trim();
}

const grouped = {};
for (const row of rawRows) {
  const name = (row['Ime in priimek'] || '').trim();
  if (!name) continue;
  if (!grouped[name]) grouped[name] = [];
  grouped[name].push(row);
}

const coachCategories = ['sprejem - obramba', 'podaja', 'napad', 'blok', 'servis'];
const exerciseKeys = [
  'Spodnji odboj sede (30 sek.)',
  'Zgornji - spodnji odboj (30 sek.)',
  'Spodnji odboj z dotikom tal (1 min)',
  'Telesna višina'
];

let checkedCount = 0;
let matchCount = 0;

for (const exp of expectedRows) {
  const name = exp['Ime'];
  const entries = grouped[name];
  if (!entries) continue;

  const hasRawEx = entries.some(e => 
    parseNumber(e[exerciseKeys[0]]) !== null ||
    parseNumber(e[exerciseKeys[1]]) !== null ||
    parseNumber(e[exerciseKeys[2]]) !== null
  );

  const hasExpectedEx = parseNumber(exp['Spodnji odboj sede']) !== null;
  if (!hasRawEx && hasExpectedEx) {
    continue;
  }

  checkedCount++;

  // 1. Coach scores
  const coachAverages = {};
  for (const cat of coachCategories) {
    const scores = entries.map(e => parseNumber(e[cat])).filter(v => v !== null);
    coachAverages[cat] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  }
  let coachAvg = entries.map(e => parseNumber(e['POVPREČNA OCENA:'])).filter(v => v !== null);
  let finalCoachScore = coachAvg.length ? coachAvg.reduce((a, b) => a + b, 0) / coachAvg.length : null;
  if (finalCoachScore === null) {
    const allCatScores = Object.values(coachAverages).filter(v => v !== null);
    if (allCatScores.length === 5) {
      finalCoachScore = allCatScores.reduce((a, b) => a + b, 0) / 5;
    }
  }

  // 2. Exercises - best attempt
  let bestEntry = entries[0];
  if (entries.length > 1) {
    let bestMissing = 999;
    let bestSum = -1;
    for (const e of entries) {
      const exs = [exerciseKeys[0], exerciseKeys[1], exerciseKeys[2]].map(k => parseNumber(e[k]));
      const missing = exs.filter(v => v === null).length;
      const sum = exs.filter(v => v !== null).reduce((a, b) => a + b, 0);
      if (missing < bestMissing || (missing === bestMissing && sum > bestSum)) {
        bestMissing = missing;
        bestSum = sum;
        bestEntry = e;
      }
    }
  }

  const heightValCandidate = entries.map(e => parseNumber(e['Telesna višina'])).find(v => v !== null);
  const heightVal = heightValCandidate !== undefined ? heightValCandidate : null;
  const exVals = [
    parseNumber(bestEntry[exerciseKeys[0]]),
    parseNumber(bestEntry[exerciseKeys[1]]),
    parseNumber(bestEntry[exerciseKeys[2]]),
    heightVal
  ];

  const exNorms = exVals.map((v, i) => v !== null ? normalizers[i](v) : null);
  const presentNorms = exNorms.filter(v => v !== null);
  const exAvgScore = presentNorms.length ? presentNorms.reduce((a, b) => a + b, 0) / presentNorms.length : null;

  const coachWeight = (finalCoachScore !== null ? finalCoachScore : 0) * 5;
  const sumEx = presentNorms.reduce((a, b) => a + b, 0);
  const finalTotalScore = (coachWeight + sumEx) / (5 + presentNorms.length);

  const override = exceptions[name] || null;
  const assignedRank = calculateRank(finalTotalScore, override);

  const expRank = exp['Skupina'];
  const expTotal = parseNumber(exp['Skupna Ocena']);
  const expCoach = parseNumber(exp['Ocena Trenerja']);
  const expEx = parseNumber(exp['Ocena iz vaj']);

  let ok = true;
  if (expRank && expRank !== assignedRank) {
    console.error(`Rank mismatch for ${name}: expected ${expRank}, got ${assignedRank}`);
    ok = false;
  }
  if (expTotal !== null && finalTotalScore !== null && Math.abs(expTotal - finalTotalScore) > 0.02) {
    console.error(`Total mismatch for ${name}: expected ${expTotal}, got ${finalTotalScore.toFixed(2)}`);
    ok = false;
  }
  if (expCoach !== null && finalCoachScore !== null && Math.abs(expCoach - finalCoachScore) > 0.02) {
    console.error(`Coach mismatch for ${name}: expected ${expCoach}, got ${finalCoachScore.toFixed(2)}`);
    ok = false;
  }
  if (ok) matchCount++;
}

console.log(`Parity results for non-legacy players: ${matchCount}/${checkedCount} matched!`);
