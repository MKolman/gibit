export interface GodmodeData {
  name: string;
  testiranje?: string;
  skupnaOcena: number | null;
  ocenaTrenerja: number | null;
  ocenaIzVaj: number | null;
  predlogSkupine: string;
  trener: string;
  normSede: number | null;
  normZgSp: number | null;
  normDotik: number | null;
  normVisina: number | null;
  sprejem: number | null;
  podaja: number | null;
  napad: number | null;
  blok: number | null;
  servis: number | null;
  prijavljeneSkupine: string;
}

export interface PlayerRow {
  vzdevek: string;
  testiranje: string;
  predlogSkupine: string;
  spodnjiOdbojSede: number | null;
  zgornjiSpodnjiOdboj: number | null;
  spodnjiOdbojDotikTal: number | null;
  telesnaVisina: number | null;
  godmodeRaw?: string;
  godmode?: GodmodeData;
}

const PUBLIC_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1YtuMO9YFmtLrn4-soOvor7utv9o7OQ1k-6MINFaKY74/export?format=csv';
const GOD_IV_B64 = 'w+9dASOcmhEPhwmKn5IE4g==';

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      let val = values[j] !== undefined ? values[j] : '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      row[headers[j]] = val;
    }
    rows.push(row);
  }
  return rows;
}

function parseNum(val: string | undefined): number | null {
  if (!val) return null;
  const str = val.trim().replace(',', '.');
  if (str === '' || str === '/' || str.toLowerCase() === 'x') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function decryptGodmode(
  ciphertextB64: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<GodmodeData | null> {
  try {
    const cipherBytes = b64ToBytes(ciphertextB64);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      cipherBytes
    );
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedText);
  } catch (err) {
    console.error('Decryption failed for row:', err);
    return null;
  }
}

export async function fetchPublicSheetData(
  searchParams: URLSearchParams
): Promise<{ data: PlayerRow[]; isGodmode: boolean }> {
  const hasGodmodeParam = searchParams.has('godmode');
  let isGodmode = false;
  let godPass: string | null = null;

  if (hasGodmodeParam) {
    if (searchParams.has('removegodpass')) {
      localStorage.removeItem('godpass');
    }
    godPass = localStorage.getItem('godpass');
    if (!godPass) {
      godPass = prompt('Vnesi geslo za dostop (Godmode)');
      if (godPass) {
        localStorage.setItem('godpass', godPass);
      }
    }
  }

  const res = await fetch(PUBLIC_SHEET_CSV_URL);
  if (!res.ok) {
    throw new Error(`Napaka pri prenosu podatkov: ${res.statusText}`);
  }
  const csvText = await res.text();
  const rawRows = parseCSV(csvText);

  // Pripravi osnovne javne vrstice
  const players: PlayerRow[] = rawRows.map((r) => {
    return {
      vzdevek: r['Vzdevek'] || '',
      testiranje: (r['Testiranje'] || '').trim(),
      predlogSkupine: r['Predlog Skupine'] || '?',
      spodnjiOdbojSede: parseNum(r['Spodnji odboj sede']),
      zgornjiSpodnjiOdboj: parseNum(r['Zgornji - spodnji odboj']),
      spodnjiOdbojDotikTal: parseNum(r['Spodnji odboj z dotikom tal']),
      telesnaVisina: parseNum(r['Telesna višina']),
      godmodeRaw: r['Godmode'] || ''
    };
  });

  // Če je godmode aktiviran in imamo geslo, poskusi z dešifriranjem
  if (hasGodmodeParam && godPass) {
    try {
      const keyBytes = b64ToBytes(godPass);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        'AES-CBC',
        false,
        ['decrypt']
      );
      const iv = b64ToBytes(GOD_IV_B64);

      // Preveri dešifriranje na prvi vrstici z godmodeRaw
      const sampleRow = players.find((p) => p.godmodeRaw);
      if (sampleRow) {
        const testDecrypted = await decryptGodmode(sampleRow.godmodeRaw!, cryptoKey, iv);
        if (!testDecrypted) {
          throw new Error('Napačno geslo');
        }
      }

      // Dešifriraj vse vrstice vzporedno
      await Promise.all(
        players.map(async (player) => {
          if (player.godmodeRaw) {
            const dec = await decryptGodmode(player.godmodeRaw, cryptoKey, iv);
            if (dec) {
              player.godmode = dec;
              // Rezervni vir oznake testiranja, če stolpec v CSV manjka
              if (!player.testiranje && dec.testiranje) {
                player.testiranje = dec.testiranje;
              }
            }
          }
        })
      );

      isGodmode = true;
    } catch (err) {
      console.error('Godmode dostop zavrnjen:', err);
      alert('Napačno geslo za dostop!');
      localStorage.removeItem('godpass');
      isGodmode = false;
    }
  }

  return { data: players, isGodmode };
}

// ---------------------------------------------------------------------------
// Backward-compatibility za stare poti (/summary, /summary2)
// ---------------------------------------------------------------------------

export async function fetchGibitEncData(
  search: URLSearchParams,
  suffix: string | undefined = ''
): Promise<{ exercises: any; data: any } | undefined> {
  if (search.has('godmode')) {
    if (search.has('removegodpass')) {
      localStorage.removeItem('godpass');
    }
    let godPass = localStorage.getItem('godpass');
    if (!godPass) {
      godPass = prompt('Vnesi geslo za dostop');
      if (godPass) {
        localStorage.setItem('godpass', godPass);
      }
    }
    const res = await fetch(`gibit_z_imeni${suffix}.json.enc`);
    return await loadGibitData(res, godPass, 'w+9dASOcmhEPhwmKn5IE4g==');
  } else {
    const res = await fetch(`gibit_zivali${suffix}.json.enc`);
    return await loadGibitData(res, search.get('pass'), 'VoTyZIYxSqocdn6H/THSXw==');
  }
}

async function loadGibitData(
  dataEnc: Response,
  keyB64: string | null,
  ivB64: string
): Promise<{ exercises: any; data: any } | undefined> {
  const ecncrypted = await dataEnc.arrayBuffer();
  if (!keyB64) {
    console.error('No password provided');
    alert('No password provided');
    return;
  }
  const key = await crypto.subtle.importKey('raw', b64ToBytes(keyB64), 'AES-CBC', false, [
    'decrypt'
  ]);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: b64ToBytes(ivB64) },
    key,
    ecncrypted
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}