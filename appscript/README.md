# OdBit Google Apps Script Backend (V2)

Ta mapa vsebuje kodo za Google Apps Script, ki obdela podatke iz vseh listov **`Zbirni Seznam - <tag>`** (vsak list je eno testiranje in se obdela posebej, brez deduplikacije med listi) in avtomatsko ustvari ter posodobi dva lista:
1. **`Rezultati`**: Interni "godmode" pregled z vsemi izračunanimi ocenami, vajami, ocenami trenerjev in predlogi skupin.
2. **`Javni`**: Javna baza za frontend z anonimiziranimi vzdevki, predlogom skupine, surovimi vajami in **AES-256-CBC šifriranim stolpcem `Godmode`**.

---

## Namestitev v Google Preglednico

1. Odprite vašo preglednico:
   👉 **[OdBit Google Preglednica](https://docs.google.com/spreadsheets/d/11ILBVEzxeYsYaR5sXlDlZliS3z4T7_xmsqDPRRRQ5-M)**
2. V meniju izberite: **Razširitve (Extensions) > Apps Script**.
3. **Dodajte datoteko `CryptoJS.js`**:
   - V levem stolpcu Apps Script editorja kliknite na gumb **`+`** poleg *Files / Datoteke* in izberite **Script** (Skript).
   - Datoteko poimenujte natančno: `CryptoJS` (Apps Script bo sam dodal končnico `.gs`).
   - Vanjo prilepite celotno vsebino iz lokalne datoteke:
     [`appscript/CryptoJS.js`](./CryptoJS.js)
4. **Posodobite datoteko `Code.js`** (ali `Koda.gs`):
   - Odprite obstoječo datoteko `Code.js` (ali `Koda.gs`).
   - Vanjo prilepite celotno posodobljeno vsebino iz:
     [`appscript/Code.js`](./Code.js)
5. Shranite spremembe s klikom na 💾 (**Shrani projekt** / `Ctrl + S`).

---

## Uporaba v Google Preglednici

1. **Osvežite zavihek** s preglednico v brskalniku (`F5`).
2. V orodni vrstici izberite:
   **`OdBit` > `Posodobi Rezultate in Javni list`**.
3. Skripta bo v enem koraku:
    - Združila podvojene vnose znotraj vsakega lista `Zbirni Seznam - <tag>` (isti igralec v različnih testiranjih ostane kot ločena vrstica s stolpcem `Testiranje`).
   - Dodelila vzdevke novim igralcem in jih dopisala v `Vzdevki`.
   - Upoštevala izjeme iz `Izjeme`.
   - Posodobila list **`Rezultati`** z vsemi internimi podrobnostmi.
   - Posodobila list **`Javni`** z javnimi stolpci in enkriptiranim stolpcem `Godmode`.

---

## Struktura lista `Javni`

1. `Vzdevek`: Živalski vzdevek (npr. *Nadarjen Rotvajler*).
2. `Predlog Skupine`: Predlagana skupina (*I.*–*V.*).
3. `Testiranje`: Oznaka testiranja iz imena izvornega lista (`<tag>` iz `Zbirni Seznam - <tag>`).
4. `Spodnji odboj sede`: Surova vrednost vaje.
5. `Zgornji - spodnji odboj`: Surova vrednost vaje.
6. `Spodnji odboj z dotikom tal`: Surova vrednost vaje.
7. `Telesna višina`: Telesna višina (cm).
8. `Godmode`: Kriptiran niz (AES-256-CBC, Base64). Za pooblaščene uporabnike vsebuje šifriran JSON z:
   - Pravim imenom in priimkom igralca
   - Oznako testiranja (`testiranje`)
   - Skupno oceno in oceno trenerja
   - Oceno iz vaj in posameznimi normaliziranimi ocenami vaj
   - Ocenami po kategorijah (sprejem, podaja, napad, blok, servis)
   - Imenom trenerja in prijavljenimi skupinami
