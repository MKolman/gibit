<script lang="ts">
    let about: HTMLDialogElement;

</script>
<hr>
<button type="button" on:click={() => about.showModal()}>Metodologija</button>
<br>
Kontakt: <a href="mailto:info@gibit.si">info@odbit.si</a>
<br>
Analizo pripravil: <a href="mailto:maks@kolman.si">Maks Kolman</a>
<br>
<br>

<dialog bind:this={about}>
    <!-- <button on:click={() => about.close()}>Zapri</button> -->
    <h2>Podatki</h2>
    <p>Vsi podatki so iz testiranj, ki so bila opravljena med OdBit odbojkarskimi treningi Novembra 2024.</p>
    <h2>OdBita ocena</h2>
    <p>OdBita oceno dobimo tako, da najprej vsako vajo ocenimo od 0 do 10 in nato vzamemo povprečno vrednost vseh devetih ocen. Formula iz rezultatov vseh vaj poda enotno oceno, ki zajema vse odbojkarske veščine.</p>
    <p>Transformacija T<sub>m,s</sub>(x) je funkcija, ki je zasnovana na <a href="https://mathworld.wolfram.com/HyperbolicTangent.html">hiperboličnem tangesu</a> in je namenjena nelinearni preslikavi rezultatov v območje od 0 do 10. </p>
    <p style="text-align: center"> T<sub>m,s</sub>(x) = 10 * <span class="fraction"><span style="border-bottom:1px solid; padding-bottom: 1px;">tanh((x-m)/s)+tanh(m/s)</span><span>1+tanh(m/s)</span></span></p>
    <p>Parametra m in s sta določena za vsako vajo posebej. OdBita ocena je povprečna vrednost spodnjih količin:</p>
    <ul>
        <li>T<sub>20,20</sub>(Spodnji odboj sede) </li>
        <li>T<sub>0,20</sub>(Spodnji odboj z dotikom tal) </li>
        <li>T<sub>30,20</sub>(Zgornji odboj sede) </li>
        <li>T<sub>40,20</sub>(Zgornji odboj s ploskom) </li>
        <li>T<sub>30,15</sub>(Zgornji-spodnji odboj) </li>
        <li>Spodnji servis</li>
        <li>Zgornji servis</li>
        <li>Napadalni udarec</li>
        <li>T<sub>290,20</sub>(Dosežena višina) </li>
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
    <p>Če ste bili novembra testirani, bi morali dobiti vašo šifro po emailu. Če je niste, nam pišite na <a href="mailto:info@odbit.si">info@odbit.si</a>.</p>
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
        cursor: pointer;
    }
    dialog {
        text-align: left;
        max-width: 1100px;
    }
    dialog button {
        float: right;
    }
    .fraction {
        display: inline-flex;
        flex-direction: column;
        text-align: center;
        vertical-align: middle;
    }
</style>