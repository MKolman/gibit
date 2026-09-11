import fs from 'fs';
import path from 'path';

// 1. Math normalization functions
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

// Quick check against sample rows
console.log('Testing Nejc Kolman calculations:');
const coachScore = (4.6 + 4.5 + 4.8 + 4.8 + 4.7) / 5;
const ex1 = normSpodnjiSede(90);
const ex2 = normZgornjiSpodnji(70);
const ex3 = normSpodnjiDotikTal(31);
const ex4 = normVisina(185);
const exAvg = (ex1 + ex2 + ex3 + ex4) / 4;
const totalScore = (coachScore * 5 + (ex1 + ex2 + ex3 + ex4)) / (5 + 4);
const rank = calculateRank(totalScore);

console.log('Coach score:', coachScore.toFixed(2), '(expected 4.68)');
console.log('Exercise 1:', ex1.toFixed(2), '(expected 5.00)');
console.log('Exercise 2:', ex2.toFixed(2), '(expected 4.98)');
console.log('Exercise 3:', ex3.toFixed(2), '(expected 4.66)');
console.log('Exercise 4:', ex4.toFixed(2), '(expected 4.52)');
console.log('Exercise Avg:', exAvg.toFixed(2), '(expected 4.79)');
console.log('Total score:', totalScore.toFixed(2), '(expected 4.73)');
console.log('Rank:', rank, '(expected V.)');
