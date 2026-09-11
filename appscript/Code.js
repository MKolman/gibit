/**
 * =========================================================================
 * OdBit - Odbojkarski karton v2
 * Google Apps Script za obdelavo podatkov ter pripravo listov:
 * 1. "Rezultati" (interni pregled / godmode)
 * 2. "Javni" (javna baza za frontend z enkriptiranim Godmode stolpcem)
 *
 * Vhod: vsi listi z imenom "Zbirni Seznam - <tag>". Vsak list se obdela
 * posebej (brez deduplikacije med listi), rezultati vseh pa se zberejo
 * v listih "Rezultati" in "Javni" s stolpcem "Testiranje" (<tag>).
 * List "Javni" je mogoče s posebno menijsko postavko prekopirati v ločeno
 * javno preglednico (PUBLIC_SPREADSHEET_ID), ki jo bere frontend.
 * =========================================================================
 */

// Ključa za AES-256-CBC šifriranje Godmode podatkov
const GOD_KEY_HEX = 'f15ec6cea0ca8d5e5ba3c8ccc14b9dfca03928eee11ba0dd098b8fa43dca051c';
const GOD_IV_HEX = 'c3ef5d01239c9a110f87098a9f9204e2';

// ID ciljne javne preglednice, ki jo bere frontend (njen prvi list kot CSV).
// To je ista datoteka, na katero kaže PUBLIC_SHEET_CSV_URL v src/lib/fetchData.ts.
// Po potrebi zamenjajte z ID-jem svoje javne datoteke.
const PUBLIC_SPREADSHEET_ID = '1YtuMO9YFmtLrn4-soOvor7utv9o7OQ1k-6MINFaKY74';

/**
 * Ustvari meni v orodni vrstici Google Preglednic ob odprtju.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('OdBit')
    .addItem('Posodobi Rezultate in Javni list', 'generateRezultati')
    .addItem('Objavi na spletu', 'copyJavniToPublic')
    .addToUi();
}

// -------------------------------------------------------------------------
// 1. Šifriranje s CryptoJS (AES-256-CBC + PKCS7)
// -------------------------------------------------------------------------

/**
 * Šifrira objekt s podatki igralca v Base64 niz za stolpec Godmode.
 */
function encryptGodmode(payload) {
  const cjs = typeof CryptoJS !== 'undefined' ? CryptoJS : this.CryptoJS;
  if (!cjs) {
    throw new Error(
      'Knjižnica CryptoJS ni naložena. Preverite, da je datoteka CryptoJS.js prisotna v projektu Apps Script.'
    );
  }
  const key = cjs.enc.Hex.parse(GOD_KEY_HEX);
  const iv = cjs.enc.Hex.parse(GOD_IV_HEX);
  const jsonStr = JSON.stringify(payload);
  const encrypted = cjs.AES.encrypt(jsonStr, key, {
    iv: iv,
    mode: cjs.mode.CBC,
    padding: cjs.pad.Pkcs7
  });
  return encrypted.toString();
}

// -------------------------------------------------------------------------
// 2. Matematične funkcije za normalizacijo in ocene
// -------------------------------------------------------------------------

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

// Normalizatorji za 4 vaje (preslikava na lestvico 1–5):
// 1. Spodnji odboj sede (30 sek): m=20, s=20
const normSpodnjiSede = (v) => (transformer(20, 20)(v) / 10) * 4 + 1;
// 2. Zgornji-spodnji odboj (30 sek): m=30, s=15
const normZgornjiSpodnji = (v) => (transformer(30, 15)(v) / 10) * 4 + 1;
// 3. Spodnji odboj z dotikom tal (60 sek): m=0, s=20
const normSpodnjiDotikTal = (v) => (transformer(0, 20)(v) / 10) * 4 + 1;
// 4. Telesna višina (cm): m=290, s=20 po linearni preslikavi (v * 2 - 60)
const normVisina = (v) => (heightPreTransform(transformer(290, 20))(v) / 10) * 4 + 1;

const RANKS = ['I.', 'II.', 'III.', 'IV.', 'V.'];

/**
 * Izračun predloga skupine glede na oceno ali ročne izjeme.
 */
function calculateRank(score, override) {
  if (override !== null && override !== undefined && override !== '') {
    if (typeof override === 'number') {
      return RANKS[override - 1] || '?';
    }
    const num = parseInt(override, 10);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return RANKS[num - 1];
    }
    const trimmed = String(override).trim();
    if (RANKS.includes(trimmed)) {
      return trimmed;
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

/**
 * Pomožna funkcija za pretvorbo številskih vrednosti iz preglednice.
 */
function parseNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim().replace(',', '.');
  if (str === '' || str === '/' || str.toLowerCase() === 'x' || str.toLowerCase() === 'o' || str === '-') {
    return null;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// -------------------------------------------------------------------------
// 3. Iskanje listov in stolpcev (fleksibilno ujemanje)
// -------------------------------------------------------------------------

function getSheetFuzzy(ss, regex, defaultName) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (regex.test(sheets[i].getName())) {
      return sheets[i];
    }
  }
  return defaultName ? ss.getSheetByName(defaultName) : null;
}

function findColIdx(headers, matcher) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').trim().toLowerCase();
    if (matcher(h)) {
      return i;
    }
  }
  return -1;
}

/**
 * Poišče vse izvorne liste po vzorcu "Zbirni Seznam - <tag>".
 * Vrne seznam objektov { sheet, tag }, kjer je tag del imena za vezajem
 * (ohranjen točno tako, kot je zapisan v imenu lista).
 */
function getZbirniSheets(ss) {
  const pattern = /^zbirni\s+seznam\s*-\s*(.+?)\s*$/i;
  const result = [];
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName();
    const m = pattern.exec(name);
    if (m) {
      result.push({ sheet: sheets[i], tag: m[1] });
    }
  }
  return result;
}

// -------------------------------------------------------------------------
// 4. Glavna funkcija: obdelava in posodobitev obeh listov ("Rezultati" in "Javni")
// -------------------------------------------------------------------------

function generateRezultati() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Poišči vhodne liste
  const zbirniSources = getZbirniSheets(ss);
  if (zbirniSources.length === 0) {
    SpreadsheetApp.getUi().alert('Napaka: Ni bilo mogoče najti nobenega lista z imenom "Zbirni Seznam - <tag>"!');
    return;
  }

  const vzdevkiSheet = getSheetFuzzy(ss, /vzdev/i, 'Vzdevki');
  const zivaliSheet = getSheetFuzzy(ss, /žival|zival/i, 'Živali');
  const pridevnikiSheet = getSheetFuzzy(ss, /pridev/i, 'Pridevniki');
  const izjemeSheet = getSheetFuzzy(ss, /izjem/i, 'Izjeme');

  // 2. Preberi izjeme (overrides)
  const exceptions = {};
  if (izjemeSheet && izjemeSheet.getLastRow() > 1) {
    const izjemeData = izjemeSheet.getDataRange().getValues();
    const izjemeHeaders = izjemeData[0];
    const nameCol = findColIdx(izjemeHeaders, h => h.includes('ime'));
    const groupCol = findColIdx(izjemeHeaders, h => h.includes('skupin') || h.includes('override'));
    const nIdx = nameCol !== -1 ? nameCol : 0;
    const gIdx = groupCol !== -1 ? groupCol : 1;

    for (let r = 1; r < izjemeData.length; r++) {
      const name = String(izjemeData[r][nIdx] || '').trim();
      const val = izjemeData[r][gIdx];
      if (name && val !== undefined && val !== '') {
        exceptions[name] = val;
      }
    }
  }

  // 3. Preberi obstoječe vzdevke
  const nicknameMap = {};
  const usedNicknames = new Set();
  let vzdevkiLastRow = 1;
  if (vzdevkiSheet && vzdevkiSheet.getLastRow() >= 1) {
    vzdevkiLastRow = vzdevkiSheet.getLastRow();
    const vData = vzdevkiSheet.getDataRange().getValues();
    if (vData.length > 1) {
      const vHeaders = vData[0];
      const nameCol = findColIdx(vHeaders, h => h.includes('ime'));
      const nickCol = findColIdx(vHeaders, h => h.includes('vzdev') || h.includes('šifr') || h.includes('sifr'));
      const nIdx = nameCol !== -1 ? nameCol : 0;
      const kIdx = nickCol !== -1 ? nickCol : 1;

      for (let r = 1; r < vData.length; r++) {
        const name = String(vData[r][nIdx] || '').trim();
        const nick = String(vData[r][kIdx] || '').trim();
        if (name && nick) {
          nicknameMap[name] = nick;
          usedNicknames.add(nick.toLowerCase());
        }
      }
    }
  }

  // 4. Preberi slovar živali in pridevnikov za generiranje novih vzdevkov
  const animals = []; // { gender: 'M'|'F', name: string }
  if (zivaliSheet && zivaliSheet.getLastRow() >= 1) {
    const zData = zivaliSheet.getDataRange().getValues();
    const startRow = (String(zData[0][0] || '').toLowerCase().includes('spol') ||
                      String(zData[0][0] || '').toLowerCase().includes('žival')) ? 1 : 0;
    for (let r = startRow; r < zData.length; r++) {
      const col0 = String(zData[r][0] || '').trim();
      const col1 = String(zData[r][1] || '').trim();
      if (col0 && col1) {
        animals.push({ gender: col0.toUpperCase().startsWith('F') ? 'F' : 'M', name: col1 });
      } else if (col0) {
        const parts = col0.split(/\s+/);
        if (parts.length >= 2) {
          animals.push({
            gender: parts[0].toUpperCase().startsWith('F') ? 'F' : 'M',
            name: parts.slice(1).join(' ')
          });
        }
      }
    }
  }

  const adjectives = []; // { m: string, f: string }
  if (pridevnikiSheet && pridevnikiSheet.getLastRow() >= 1) {
    const pData = pridevnikiSheet.getDataRange().getValues();
    const startRow = (String(pData[0][0] || '').toLowerCase().includes('mošk') ||
                      String(pData[0][0] || '').toLowerCase().includes('pridev')) ? 1 : 0;
    for (let r = startRow; r < pData.length; r++) {
      const col0 = String(pData[r][0] || '').trim();
      const col1 = String(pData[r][1] || '').trim();
      if (col0 && col1) {
        adjectives.push({ m: col0, f: col1 });
      } else if (col0) {
        const parts = col0.split(/\s+/);
        if (parts.length >= 2) {
          adjectives.push({ m: parts[0], f: parts[1] });
        }
      }
    }
  }

  function generateUniqueNickname() {
    if (animals.length === 0 || adjectives.length === 0) {
      return 'Igralec ' + Math.floor(1000 + Math.random() * 9000);
    }
    let attempts = 0;
    while (attempts < 2000) {
      attempts++;
      const animal = animals[Math.floor(Math.random() * animals.length)];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const adjWord = animal.gender === 'F' ? adj.f : adj.m;
      const candidate = adjWord + ' ' + animal.name;
      if (!usedNicknames.has(candidate.toLowerCase())) {
        usedNicknames.add(candidate.toLowerCase());
        return candidate;
      }
    }
    return 'Igralec ' + Math.floor(1000 + Math.random() * 9000);
  }

  // 5. Preberi in obdelaj vsak izvorni list "Zbirni Seznam - <tag>" posebej.
  // Podvojeni vnosi se združujejo le znotraj istega lista (iste testiranje),
  // rezultati iz vseh listov pa se zberejo v skupni seznam.
  const newNicknamesToAppend = [];
  const processedRows = [];

  for (let s = 0; s < zbirniSources.length; s++) {
    const zbirniSheet = zbirniSources[s].sheet;
    const testiranje = zbirniSources[s].tag;
    const sheetName = zbirniSheet.getName();
    const zbirniValues = zbirniSheet.getDataRange().getValues();
    if (zbirniValues.length <= 1) {
      continue;
    }

    const headers = zbirniValues[0];
    const colName = findColIdx(headers, h => h.includes('ime'));
    const colSprejem = findColIdx(headers, h => h.includes('sprejem') || h.includes('obramba'));
    const colPodaja = findColIdx(headers, h => h.includes('podaj'));
    const colNapad = findColIdx(headers, h => h.includes('napad'));
    const colBlok = findColIdx(headers, h => h.includes('blok'));
    const colServis = findColIdx(headers, h => h.includes('servis'));
    const colPovprecna = findColIdx(headers, h => h.includes('povpre'));
    const colSede = findColIdx(headers, h => h.includes('spodnji') && h.includes('sede'));
    const colZgSp = findColIdx(headers, h => (h.includes('zgornji') && h.includes('spodnji')) || h.includes('izmenjava'));
    const colDotik = findColIdx(headers, h => h.includes('dotik'));
    const colVisina = findColIdx(headers, h => h.includes('višin') || h.includes('visin'));
    const colTrener = findColIdx(headers, h => h.includes('trener'));
    const colSkupina = findColIdx(headers, h => h.includes('skupin'));

    if (colName === -1) {
      SpreadsheetApp.getUi().alert('Opozorilo: V listu "' + sheetName + '" ni bilo mogoče najti stolpca za ime igralca ("Ime in priimek")! List bo preskočen.');
      continue;
    }

    // Združi podvojene vnose po imenu (samo znotraj tega lista)
    const grouped = {};
    for (let r = 1; r < zbirniValues.length; r++) {
      const row = zbirniValues[r];
      const name = String(row[colName] || '').trim();
      if (!name) continue;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(row);
    }

    const coachTopicCols = [
      { key: 'sprejem', idx: colSprejem },
      { key: 'podaja', idx: colPodaja },
      { key: 'napad', idx: colNapad },
      { key: 'blok', idx: colBlok },
      { key: 'servis', idx: colServis }
    ];

    for (const name in grouped) {
      const entries = grouped[name];

      // Vzdevek (pridobi obstoječega ali ustvari novega)
      let nickname = nicknameMap[name];
      if (!nickname) {
        nickname = generateUniqueNickname();
        nicknameMap[name] = nickname;
        newNicknamesToAppend.push([name, nickname]);
      }

      // 1. Ocene trenerja po kategorijah (povprečje veljavnih ocen)
      const coachCategoryAverages = {};
      for (let c = 0; c < coachTopicCols.length; c++) {
        const col = coachTopicCols[c];
        if (col.idx !== -1) {
          const scores = entries.map(e => parseNumber(e[col.idx])).filter(v => v !== null);
          coachCategoryAverages[col.key] = scores.length
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null;
        } else {
          coachCategoryAverages[col.key] = null;
        }
      }

      // Ocena trenerja (iz stolpca "POVPREČNA OCENA:" ali povprečja 5 kategorij)
      let coachFinalAvg = null;
      if (colPovprecna !== -1) {
        const povpScores = entries.map(e => parseNumber(e[colPovprecna])).filter(v => v !== null);
        if (povpScores.length > 0) {
          coachFinalAvg = povpScores.reduce((a, b) => a + b, 0) / povpScores.length;
        }
      }
      if (coachFinalAvg === null) {
        const catScores = Object.values(coachCategoryAverages).filter(v => v !== null);
        if (catScores.length === 5) {
          coachFinalAvg = catScores.reduce((a, b) => a + b, 0) / 5;
        }
      }

      // 2. Vaje - izbira najboljšega poskusa (najmanj manjkajočih, nato najvišja vsota)
      let bestEntry = entries[0];
      if (entries.length > 1) {
        let bestMissing = 999;
        let bestSum = -1;
        for (let e = 0; e < entries.length; e++) {
          const row = entries[e];
          const exVals = [
            colSede !== -1 ? parseNumber(row[colSede]) : null,
            colZgSp !== -1 ? parseNumber(row[colZgSp]) : null,
            colDotik !== -1 ? parseNumber(row[colDotik]) : null
          ];
          const missing = exVals.filter(v => v === null).length;
          const sum = exVals.filter(v => v !== null).reduce((a, b) => a + b, 0);
          if (missing < bestMissing || (missing === bestMissing && sum > bestSum)) {
            bestMissing = missing;
            bestSum = sum;
            bestEntry = row;
          }
        }
      }

      // Telesna višina (prva veljavna številka)
      let heightVal = null;
      if (colVisina !== -1) {
        for (let e = 0; e < entries.length; e++) {
          const hNum = parseNumber(entries[e][colVisina]);
          if (hNum !== null) {
            heightVal = hNum;
            break;
          }
        }
      }

      const rawSede = colSede !== -1 ? parseNumber(bestEntry[colSede]) : null;
      const rawZgSp = colZgSp !== -1 ? parseNumber(bestEntry[colZgSp]) : null;
      const rawDotik = colDotik !== -1 ? parseNumber(bestEntry[colDotik]) : null;
      const rawVisina = heightVal;

      // Normalizirane ocene vaj (1–5)
      const normSedeVal = rawSede !== null ? normSpodnjiSede(rawSede) : null;
      const normZgSpVal = rawZgSp !== null ? normZgornjiSpodnji(rawZgSp) : null;
      const normDotikVal = rawDotik !== null ? normSpodnjiDotikTal(rawDotik) : null;
      const normVisinaVal = rawVisina !== null ? normVisina(rawVisina) : null;

      const presentNorms = [normSedeVal, normZgSpVal, normDotikVal, normVisinaVal].filter(v => v !== null);
      const ocenaIzVaj = presentNorms.length
        ? presentNorms.reduce((a, b) => a + b, 0) / presentNorms.length
        : null;

      // Skupna ocena (formula iz Svelte godmode):
      // (Ocena trenerja * 5 + vsota ocen vaj) / (5 + število vaj)
      const coachWeight = (coachFinalAvg !== null ? coachFinalAvg : 0) * 5;
      const sumEx = presentNorms.reduce((a, b) => a + b, 0);
      const skupnaOcena = (coachWeight + sumEx) / (5 + presentNorms.length);

      // Predlog skupine
      const override = exceptions[name] !== undefined ? exceptions[name] : null;
      const predlogSkupine = calculateRank(skupnaOcena, override);

      // Trenerji in Skupine
      let coachesJoined = '';
      if (colTrener !== -1) {
        const coachSet = new Set(
          entries.map(e => String(e[colTrener] || '').trim()).filter(v => v !== '')
        );
        coachesJoined = Array.from(coachSet).join(', ');
      }

      let groupsJoined = '';
      if (colSkupina !== -1) {
        const groupSet = new Set(
          entries.map(e => String(e[colSkupina] || '').trim()).filter(v => v !== '')
        );
        groupsJoined = Array.from(groupSet).join(', ');
      }

      processedRows.push({
        name: name,
        nickname: nickname,
        testiranje: testiranje,
        predlogSkupine: predlogSkupine,
        skupnaOcena: skupnaOcena,
        ocenaTrenerja: coachFinalAvg,
        ocenaIzVaj: ocenaIzVaj,
        trener: coachesJoined,
        rawSede: rawSede,
        normSede: normSedeVal,
        rawZgSp: rawZgSp,
        normZgSp: normZgSpVal,
        rawDotik: rawDotik,
        normDotik: normDotikVal,
        rawVisina: rawVisina,
        normVisina: normVisinaVal,
        sprejem: coachCategoryAverages['sprejem'],
        podaja: coachCategoryAverages['podaja'],
        napad: coachCategoryAverages['napad'],
        blok: coachCategoryAverages['blok'],
        servis: coachCategoryAverages['servis'],
        prijavljeneSkupine: groupsJoined
      });
    }
  }

  if (processedRows.length === 0) {
    SpreadsheetApp.getUi().alert('Opozorilo: V nobenem izmed listov "Zbirni Seznam - <tag>" ni bilo najdenih podatkov.');
    return;
  }

  // 6. Razvrščanje: najprej po rangu padajoče (V. -> I.), nato po skupni oceni padajoče
  const rankOrder = { 'V.': 5, 'IV.': 4, 'III.': 3, 'II.': 2, 'I.': 1, '?': 0 };
  processedRows.sort((a, b) => {
    const rA = rankOrder[a.predlogSkupine] || 0;
    const rB = rankOrder[b.predlogSkupine] || 0;
    if (rA !== rB) return rB - rA;
    const sA = a.skupnaOcena !== null ? a.skupnaOcena : -1;
    const sB = b.skupnaOcena !== null ? b.skupnaOcena : -1;
    if (sA !== sB) return sB - sA;
    const n = a.name.localeCompare(b.name);
    if (n !== 0) return n;
    return String(a.testiranje || '').localeCompare(String(b.testiranje || ''));
  });

  // 7. Zapiši nove vzdevke v "Vzdevki"
  if (vzdevkiSheet && newNicknamesToAppend.length > 0) {
    if (vzdevkiLastRow === 0 || (vzdevkiLastRow === 1 && vzdevkiSheet.getRange(1, 1).getValue() === '')) {
      vzdevkiSheet.getRange(1, 1, 1, 2).setValues([['Ime', 'Vzdevek']]);
      vzdevkiSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      vzdevkiLastRow = 1;
    }
    vzdevkiSheet
      .getRange(vzdevkiLastRow + 1, 1, newNicknamesToAppend.length, 2)
      .setValues(newNicknamesToAppend);
  }

  // 8. Ustvari ali posodobi list "Rezultati"
  generateRezultatiSheet(ss, processedRows);

  // 9. Ustvari ali posodobi javni list "Javni"
  generateJavniSheet(ss, processedRows);

  // Obvestilo o uspehu
  ss.toast(
    'Uspešno obdelano ' +
      processedRows.length +
      ' vnosov iz ' +
      zbirniSources.length +
      ' testiranj ter posodobljena lista "Rezultati" in "Javni"!',
    'OdBit Uspeh',
    6
  );
}

// -------------------------------------------------------------------------
// 5. Izris lista "Rezultati" (interni pogled z vsemi podatki)
// -------------------------------------------------------------------------

function generateRezultatiSheet(ss, processedRows) {
  let rezultatiSheet = getSheetFuzzy(ss, /^rezultat/i, 'Rezultati');
  if (!rezultatiSheet) {
    rezultatiSheet = ss.insertSheet('Rezultati');
  } else {
    rezultatiSheet.clear();
  }

  const OUTPUT_HEADERS = [
    'Ime',
    'Vzdevek',
    'Testiranje',
    'Predlog skupine',
    'Skupna ocena',
    'Ocena trenerja',
    'Ocena iz vaj',
    'Trener',
    'Spodnji odboj sede',
    'Spodnji odboj sede (ocena)',
    'Zgornji-spodnji odboj',
    'Zgornji-spodnji odboj (ocena)',
    'Spodnji odboj z dotikom tal',
    'Spodnji odboj z dotikom tal (ocena)',
    'Telesna višina',
    'Telesna višina (ocena)',
    'sprejem - obramba',
    'podaja',
    'napad',
    'blok',
    'servis',
    'Prijavljene skupine'
  ];

  const outputValues = [OUTPUT_HEADERS];
  for (let i = 0; i < processedRows.length; i++) {
    const p = processedRows[i];
    outputValues.push([
      p.name,
      p.nickname,
      p.testiranje,
      p.predlogSkupine,
      p.skupnaOcena !== null ? p.skupnaOcena : '',
      p.ocenaTrenerja !== null ? p.ocenaTrenerja : '',
      p.ocenaIzVaj !== null ? p.ocenaIzVaj : '',
      p.trener,
      p.rawSede !== null ? p.rawSede : '',
      p.normSede !== null ? p.normSede : '',
      p.rawZgSp !== null ? p.rawZgSp : '',
      p.normZgSp !== null ? p.normZgSp : '',
      p.rawDotik !== null ? p.rawDotik : '',
      p.normDotik !== null ? p.normDotik : '',
      p.rawVisina !== null ? p.rawVisina : '',
      p.normVisina !== null ? p.normVisina : '',
      p.sprejem !== null ? p.sprejem : '',
      p.podaja !== null ? p.podaja : '',
      p.napad !== null ? p.napad : '',
      p.blok !== null ? p.blok : '',
      p.servis !== null ? p.servis : '',
      p.prijavljeneSkupine
    ]);
  }

  const numRows = outputValues.length;
  const numCols = OUTPUT_HEADERS.length;
  const range = rezultatiSheet.getRange(1, 1, numRows, numCols);
  range.setValues(outputValues);

  // Oblikovanje lista "Rezultati"
  rezultatiSheet.setFrozenRows(1);

  // Glava: krepka pisava, ozadje
  const headerRange = rezultatiSheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8eaed');
  headerRange.setHorizontalAlignment('center');

  // Formatiranje ocen na 2 decimalni mesti
  if (numRows > 1) {
    const scoreCols = [5, 6, 7, 10, 12, 14, 16, 17, 18, 19, 20, 21];
    for (let s = 0; s < scoreCols.length; s++) {
      rezultatiSheet.getRange(2, scoreCols[s], numRows - 1, 1).setNumberFormat('0.00');
    }

    // Poravnava predloga skupine na sredino
    rezultatiSheet.getRange(2, 4, numRows - 1, 1).setHorizontalAlignment('center');

    // Poravnava surovih vaj na desno
    const rawCols = [9, 11, 13, 15];
    for (let r = 0; r < rawCols.length; r++) {
      rezultatiSheet.getRange(2, rawCols[r], numRows - 1, 1).setNumberFormat('0');
    }
  }

  rezultatiSheet.autoResizeColumns(1, numCols);
}

// -------------------------------------------------------------------------
// 6. Izris lista "Javni" (javna baza za frontend z enkriptiranim Godmode stolpcem)
// -------------------------------------------------------------------------

function generateJavniSheet(ss, processedRows) {
  let javniSheet = getSheetFuzzy(ss, /^javn/i, 'Javni');
  if (!javniSheet) {
    javniSheet = ss.insertSheet('Javni');
  } else {
    javniSheet.clear();
  }

  const JAVNI_HEADERS = [
    'Vzdevek',
    'Predlog Skupine',
    'Testiranje',
    'Spodnji odboj sede',
    'Zgornji - spodnji odboj',
    'Spodnji odboj z dotikom tal',
    'Telesna višina',
    'Godmode'
  ];

  const javniValues = [JAVNI_HEADERS];

  for (let i = 0; i < processedRows.length; i++) {
    const p = processedRows[i];

    // Pripravi Godmode JSON payload za šifriranje
    const godmodePayload = {
      name: p.name,
      testiranje: p.testiranje,
      skupnaOcena: p.skupnaOcena !== null ? Math.round(p.skupnaOcena * 100) / 100 : null,
      ocenaTrenerja: p.ocenaTrenerja !== null ? Math.round(p.ocenaTrenerja * 100) / 100 : null,
      ocenaIzVaj: p.ocenaIzVaj !== null ? Math.round(p.ocenaIzVaj * 100) / 100 : null,
      predlogSkupine: p.predlogSkupine,
      trener: p.trener,
      normSede: p.normSede !== null ? Math.round(p.normSede * 100) / 100 : null,
      normZgSp: p.normZgSp !== null ? Math.round(p.normZgSp * 100) / 100 : null,
      normDotik: p.normDotik !== null ? Math.round(p.normDotik * 100) / 100 : null,
      normVisina: p.normVisina !== null ? Math.round(p.normVisina * 100) / 100 : null,
      sprejem: p.sprejem !== null ? Math.round(p.sprejem * 100) / 100 : null,
      podaja: p.podaja !== null ? Math.round(p.podaja * 100) / 100 : null,
      napad: p.napad !== null ? Math.round(p.napad * 100) / 100 : null,
      blok: p.blok !== null ? Math.round(p.blok * 100) / 100 : null,
      servis: p.servis !== null ? Math.round(p.servis * 100) / 100 : null,
      prijavljeneSkupine: p.prijavljeneSkupine
    };

    const encryptedGodmode = encryptGodmode(godmodePayload);

    javniValues.push([
      p.nickname,
      p.predlogSkupine,
      p.testiranje,
      p.rawSede !== null ? p.rawSede : '',
      p.rawZgSp !== null ? p.rawZgSp : '',
      p.rawDotik !== null ? p.rawDotik : '',
      p.rawVisina !== null ? p.rawVisina : '',
      encryptedGodmode
    ]);
  }

  const numRows = javniValues.length;
  const numCols = JAVNI_HEADERS.length;
  const range = javniSheet.getRange(1, 1, numRows, numCols);
  range.setValues(javniValues);

  // Oblikovanje lista "Javni"
  javniSheet.setFrozenRows(1);

  // Glava
  const headerRange = javniSheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8eaed');
  headerRange.setHorizontalAlignment('center');

  if (numRows > 1) {
    // Poravnava predloga skupine na sredino
    javniSheet.getRange(2, 2, numRows - 1, 1).setHorizontalAlignment('center');

    // Poravnava vaj na desno
    javniSheet.getRange(2, 4, numRows - 1, 4).setNumberFormat('0');
  }

  // Samodejna širina stolpcev
  javniSheet.autoResizeColumns(1, numCols);
}

// -------------------------------------------------------------------------
// 7. Kopiranje lista "Javni" v ločeno javno preglednico (vir za frontend)
// -------------------------------------------------------------------------

/**
 * Prekopira celotno vsebino lista "Javni" v javno preglednico
 * (PUBLIC_SPREADSHEET_ID), ki jo kot CSV bere frontend.
 * V ciljni datoteki prepiše list "Javni" (oziroma njen prvi list, če
 * lista z imenom "Javni" še ni).
 *
 * Opomba: račun, s katerim se izvaja skripta, potrebuje dostop za
 * urejanje ciljne datoteke (openById + pisanje).
 */
function copyJavniToPublic() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const javniSheet = getSheetFuzzy(ss, /^javn/i, 'Javni');
  if (!javniSheet || javniSheet.getLastRow() < 1) {
    SpreadsheetApp.getUi().alert(
      'Napaka: List "Javni" je prazen ali ne obstaja. ' +
      'Najprej zaženite "Posodobi Rezultate in Javni list".'
    );
    return;
  }

  let target;
  try {
    target = SpreadsheetApp.openById(PUBLIC_SPREADSHEET_ID);
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Napaka: Javne preglednice ni bilo mogoče odpreti. ' +
      'Preverite ID (PUBLIC_SPREADSHEET_ID) in dostop do datoteke.\n\n' + e.message
    );
    return;
  }

  let targetSheet = target.getSheetByName('Javni') || target.getSheets()[0];
  if (!targetSheet) {
    targetSheet = target.insertSheet('Javni');
  }

  const values = javniSheet.getDataRange().getValues();
  targetSheet.clear();
  targetSheet.getRange(1, 1, values.length, values[0].length).setValues(values);

  // Osnovno oblikovanje glave, da je javna tabela berljiva tudi v brskalniku
  targetSheet.setFrozenRows(1);
  const headerRange = targetSheet.getRange(1, 1, 1, values[0].length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8eaed');
  headerRange.setHorizontalAlignment('center');
  targetSheet.autoResizeColumns(1, values[0].length);

  ss.toast(
    'List "Javni" uspešno kopiran v javno preglednico (' + values.length + ' vrstic).',
    'OdBit Uspeh',
    6
  );
}
