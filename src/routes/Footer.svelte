<script lang="ts">
    let about: HTMLDialogElement;

</script>
<hr>
<button type="button" on:click={() => about.showModal()}>Metodologija</button>
<br>
Kontakt: <a href="mailto:info@gibit.si">info@gibit.si</a>
<br>
Analizo pripravil: <a href="mailto:maks@kolman.si">Maks Kolman</a>
<br>
<br>

<dialog bind:this={about}>
    <!-- <button on:click={() => about.close()}>Zapri</button> -->
    <h2>Podatki</h2>
    <p>Vsi podatki so iz testiranj, ki so bila opravljena med OdBit odbojkarskimi treningi Novembra 2024.</p>
    <h2>OdBita ocena</h2>
    <p>OdBita ocena je osnovana na formuli, ki jo je iznašel trener Bojan Kristan. Formula iz rezultatov vseh vaj poda enotno oceno, ki zajema vse odbojkarske veščine.</p>
    <p>OdBita ocena je povprečna vrednost spodnjih vrednosti:</p>
    <ul>
        <li>(Spodnji odboj sede) / 5
        <li>(Spodnji odboj z dotikom tal) / 3
        <li>(Zgornji odboj sede) / 8
        <li>(Zgornji odboj s ploskom) / 3
        <li>(Zgornji-spodnji odboj) / 4
        <li>Spodnji servis
        <li>Zgornji servis
        <li>Napadalni udarec
        <li>(Dosežena višina) / 5
    </ul>
    <h2>Percentili</h2>
    <p>Percentili so v grobem merilo za delež populacije, ki je pod vami. Na primer biti v 80. percentilu pomeni, biti nad 80% ljudmi v populaciji in pod 20% ljudmi.</p>
    <p>Za izračun percentilov predpostavljamo normalno porazdelitev podatkov in za celotno populacijo izračunamo povprečje in standarno deviacijo.</p>
    <p>Na podlagi tega lahko ocenimo konkreten rezultat tako da pogledamo koliko standardnih deviacij je odmaknjen od povprečja. Primeri:</p>
    <ul>
        <li>odmik +3 standardne deviacije pomeni 99.9%</li>
        <li>odmik +1 standardne deviacije pomeni 84%</li>
        <li>odmik 0 standardnih deviacij pomeni 50%</li>
        <li>odmik -1 standardne deviacije pomeni 16%</li>
        <li>odmik -3 standardne deviacije pomeni 0.1%</li>
    </ul>
    <h2>Živalski vzdevki</h2>
    <p>Zaradi zagotavljanja anonimnosti so vsi rezultati anonimizirani in objavljeni pod živalskimi šiframi.</p>
    <p>Če ste bili novembra testirani, bi morali dobiti vašo šifro po emailu. Če je niste, nam pišite na <a href="mailto:info@gibit.si">info@gibit.si</a>.</p>
    <button on:click={() => about.close()}>Zapri</button>
</dialog>

<style>
    a {
        color: #1c93d1;
    }
    button {
        font-size: inherit;
        font-family: inherit;
        background: none;
        border: none;
        color: #1c93d1;
        text-decoration: underline;
    }
    dialog {
        text-align: left;
    }
    dialog button {
        float: right;
    }
</style>