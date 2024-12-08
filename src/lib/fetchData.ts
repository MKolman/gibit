
function b64ToBytes(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
export async function fetchGibitEncData(search: URLSearchParams): Promise<{exercises: any, data: any}|undefined> {
    if (search.has("godmode")) {
        if (search.has("removegodpass")) {
            localStorage.removeItem("godpass");
        }
        let godPass = localStorage.getItem("godpass");
        if (!godPass) {
            godPass = prompt("Vnesi geslo za dostop");
            if (godPass) {
                localStorage.setItem("godpass", godPass);
            }
        }
        const res = await fetch("gibit_z_imeni.json.enc");
        return await loadGibitData(res, godPass, 'w+9dASOcmhEPhwmKn5IE4g==')
    } else {
        const res = await fetch("gibit_zivali.json.enc");
        return await loadGibitData(res, search.get("pass"), 'VoTyZIYxSqocdn6H/THSXw==')
    }
}
async function loadGibitData(dataEnc: Response, keyB64: string|null, ivB64: string): Promise<{exercises: any, data: any}|undefined> {
    const ecncrypted = await dataEnc.arrayBuffer();
    if (!keyB64) {
        console.error("No password provided");
        alert("No password provided");
        return;
    }
    const key = await crypto.subtle.importKey("raw", b64ToBytes(keyB64), "AES-CBC", false, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt({name: "AES-CBC", iv: b64ToBytes(ivB64)}, key, ecncrypted);
    return JSON.parse(new TextDecoder().decode(decrypted));

}