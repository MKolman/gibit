import CryptoJS from 'crypto-js';

const GOD_KEY_HEX = 'f15ec6cea0ca8d5e5ba3c8ccc14b9dfca03928eee11ba0dd098b8fa43dca051c';
const GOD_IV_HEX = 'c3ef5d01239c9a110f87098a9f9204e2';

// Frontend base64 keys (from fetchData.ts)
const GOD_IV_B64 = 'w+9dASOcmhEPhwmKn5IE4g==';
const GOD_KEY_B64 = Buffer.from(GOD_KEY_HEX, 'hex').toString('base64');

function encryptGodmode(payload) {
  const key = CryptoJS.enc.Hex.parse(GOD_KEY_HEX);
  const iv = CryptoJS.enc.Hex.parse(GOD_IV_HEX);
  const jsonStr = JSON.stringify(payload);
  const encrypted = CryptoJS.AES.encrypt(jsonStr, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString(); // standard base64
}

async function decryptWithWebCrypto(b64Ciphertext) {
  const b64ToBytes = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
  const keyBytes = b64ToBytes(GOD_KEY_B64);
  const ivBytes = b64ToBytes(GOD_IV_B64);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-CBC',
    false,
    ['decrypt']
  );

  const cipherBytes = b64ToBytes(b64Ciphertext);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: ivBytes },
    cryptoKey,
    cipherBytes
  );

  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decryptedText);
}

async function runTest() {
  console.log('Testing CryptoJS encryption & WebCrypto decryption compatibility...');

  const samplePayload = {
    name: 'Nejc Kolman #3941',
    skupnaOcena: 4.73,
    ocenaTrenerja: 4.68,
    ocenaIzVaj: 4.79,
    predlogSkupine: 'V.',
    trener: 'Katarina',
    normSede: 5.0,
    normZgSp: 4.98,
    normDotik: 4.66,
    normVisina: 4.52,
    sprejem: 4.6,
    podaja: 4.5,
    napad: 4.8,
    blok: 4.8,
    servis: 4.7,
    prijavljeneSkupine: 'Ponedeljek - rekreativna 2'
  };

  const encryptedB64 = encryptGodmode(samplePayload);
  console.log('Encrypted Base64:', encryptedB64);

  const decrypted = await decryptWithWebCrypto(encryptedB64);
  console.log('Decrypted Object:', decrypted);

  const match = JSON.stringify(samplePayload) === JSON.stringify(decrypted);
  if (match) {
    console.log('SUCCESS: Decrypted payload perfectly matches original payload!');
  } else {
    console.error('FAILURE: Decrypted payload does not match original!');
    process.exit(1);
  }
}

runTest();
