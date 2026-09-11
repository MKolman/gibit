# Volleyball players analysis

This repository contains a data analysis project focused on volleyball players. Colleting of data is outside the scope of this project, but the data is stored, transformed, analyzed, presented and visualized within this repository.

The data and its analysis flow as follows:

1. Each player gets five scores given by their coaches.
2. Optionally they might also have a score given by their execution of 3 volleyball drills and their height.

# Coach scores

These are fve different skills that coaches evaluate players on, each on a scale from 1 to 5. The skills are:

## sprejem-obramba

1. Težave ima že pri lažjih žogah. Pogosto jih ne uspe kontrolirano sprejeti oziroma jih usmeri izven igrišča.
2. Lažje žoge v polju večinoma uspe sprejeti nazaj v igro, vendar nenatančno. Pri močnejših servisih in udarcih ima velike težave.
3. Lažje žoge v polju sprejema razmeroma natančno, pri močnejših servisih in napadih pa je uspešnost še precej nižja.
4. Večino močnejših servisov in napadov uspe sprejeti, vendar sprejem še ni dovolj natančen za zelo kakovostno nadaljevanje akcije.
5. Tudi močne servise in napade sprejema zanesljivo in natančno ter žogo pogosto usmeri tako, da omogoči kakovostno nadaljevanje napada.

## podaja

1. Tudi pri lepem sprejemu in krajši razdalji so podaje nenatančne, prenizke ali previsoke; pogosto gredo tudi čez mrežo. Pri slabšem sprejemu praviloma ne uspe priti do žoge.
2. Pri idealnem sprejemu in na krajši razdalji uspe podati v približno pravo smer, vendar mora do žoge pogosto veliko popravljati gibanje. Podaje še niso dovolj natančne in stabilne, pri slabšem sprejemu pa praviloma ne uspe pripraviti uporabne žoge za napad. Ne zna še podaje nazaj.
3. Pri lepem sprejemu večino žog poda uporabno za napad. Tudi podajo nazaj. Pri slabšem sprejemu težje pride pravočasno pod žogo, jo ne uspe podati s prsti oziroma podaja izgubi natančnost in ni več primerna za napad/udarec.
4. Pri lepem sprejemu poda natančno tudi na daljši razdalji. Pri slabšem sprejemu se do žoge večinoma dobro postavi in še vedno pripravi uporabno podajo, vendar še ne more redno podati visoke korekcijske žoge čez celo igrišče.
5. Zna podati lepo žogo tudi po slabšem sprejemu, se dobro prilagodi zahtevnim situacijam in lahko poda tudi visoko, natančno korekcijsko žogo čez celo igrišče.

## napad

1. Napadalnega udarca še ne obvlada. Žogo večinoma le vrača čez mrežo s prsti ali z nežnim udarcem, brez prave koordinacije, zaleta in timinga.
2. Osnovni zalet in gibanje za napad že pozna. Pri idealni podaji lahko žogo udari čez mrežo, vendar je udarec še nezanesljiv, šibek ali tehnično nepravilen. Pri slabši podaji napada praviloma ne uspe kakovostno zaključiti.
3. Pri lepi podaji zanesljivo napada na ženski mreži. Pri slabših podajah je uspešnost napada manjša, na moški mreži pa napad še ni dovolj učinkovit oziroma stabilen.
4. Pri lepi podaji zanesljivo napada tudi na moški mreži. Pri slabših ali korekcijskih podajah napad še ni povsem zanesljiv, vendar vseeno pride do žoge in skuša napadati.
5. Tudi pri neidealni podaji zna uspešno in zanesljivo napadati na moški mreži. Udarec je dovolj nadzorovan, da lahko žogo usmerja in napad taktično uporablja.

## blok

1. Osnov bloka še ne obvlada. Ne zna se pravilno postaviti, ima slab timing skoka, roke niso pravilno postavljene in v igri bloka praktično ne uporablja.
2. Osnovno idejo bloka že razume, vendar je izvedba še zelo nezanesljiva. Pri solo bloku pogosto zamuja s skokom, roke niso pravilno postavljene in blok redko učinkovito zapre prostor nad mrežo.
3. Na ženski mreži že zna postaviti soliden blok, pravilneje postavlja roke in ima kar dober timing. Na moški mreži blok še ni dovolj visok oziroma učinkovit.
4. Na moški mreži ima pri solo bloku že dober timing in pravilno postavitev rok. Pri priključevanju dvojnemu bloku pa ima še nekaj težav z usklajevanjem gibanja in pravočasnim zapiranjem prostora.
5. Na moški mreži zanesljivo postavi učinkovit solo blok in se zna pravočasno ter pravilno priključiti tudi dvojnemu bloku. Ima dober timing, pravilno postavitev rok in dobro razumevanje prostora v bloku.

## servis

1. Ne zna ne spodnjega ne zgornjega servisa oziroma je tudi spodnji servis zelo nezanesljiv in gre žoga čez mrežo bolj po sreči.
2. Spodnji servis je dokaj zanesljiv, vendar še ni natančen. Zgornjega servisa še ne zna/obvlada.
3. Spodnji servis je zanesljiv in z njim že lahko usmerja žogo v določen del igrišča. Zgornji servis je še nezanesljiv in pogosto prihaja do napak.
4. Zgornji servis je zanesljiv, z malo napakami, vendar še ni posebej neugoden za sprejem.
5. Zgornji servis je zelo zanesljiv, natančen in neugoden za sprejem. Igralec zna servirati v različne dele igrišča, po potrebi spreminja moč in smer servisa, lahko pa uporablja tudi zahtevnejše različice servisa, kot sta jump float ali skok servis.

# Drill scores

Drill scores are given based on the execution of three volleyball drills. Each drill has a numeric result that is then converted into a score from 1 to 5 based on predefined transformations.

To help with transformations the function T is defined as follows:

T\_{m, s}(X) = 4 \* (tanh((X-m)/s) + tanh(m/s)) / (1 + tanh(m/s)) + 1

The drills are:

## Spodnji odboj sede (30 sek.)

Vadeči sedijo na tleh in si vržejo žogo v zrak ter odbijajo s spodnjim odbojem. Vmes ne smejo vstati ampak zapored odbijati žogo. V kolikor jim žoga pade na tla ali odbijejo s prsti začnejo znova - znova tudi šteti.Upoštevamo višji rezultat. Test izvajajo 30 sekund. Šteje naj jim nekdo drug, ne sami.

### Transformation of drill results into scores:

S = T\_{20,20}(N)

| N   | S    |
| --- | ---- |
| 0   | 1.00 |
| 8   | 1.51 |
| 13  | 1.97 |
| 18  | 2.50 |
| 22  | 2.96 |
| 27  | 3.49 |
| 33  | 4.03 |
| 41  | 4.50 |
| 58  | 4.9  |

## Zgornji - spodnji odboj (30 sek.)

Vadeči si vržejo žogo v zrak in IZMENIČNO odbijajo zgornji in spodnji odboj. V kolikor žoga pade na tla, odbijejo 2x zapored z zgornjim ali spodnjim odbojem se štetje ustavi in zabeleži rezultat. Lahko večkrat poizkusijo, vendar se šteje rezultat zaporednih odbojev.

## Transformation of drill results into scores:

S = T\_{30,15}(N)

| N   | S    |
| --- | ---- |
| 0   | 1.0  |
| 16  | 1.47 |
| 22  | 1.97 |
| 27  | 2.56 |
| 30  | 2.96 |
| 34  | 3.49 |
| 38  | 3.96 |
| 45  | 4.51 |
| 58  | 4.9  |

## Spodnji odboj z dotikom tal (60 sek.)

Vadeči odbija s spodnjim odbojem, med vsakim odbojem pa se mora z roko dotakniti tal. V kolikor kdaj 2x zapored odbije brez dotika tal se štetje ustavi. Vadeči ima lahko več poizkusov znotraj minute, vendar se rezultat šteje le zaporedne odboje.

### Transformation of drill results into scores:

S = T\_{0,20}(N)

| N   | S    |
| --- | ---- |
| 0   | 1.0  |
| 3   | 1.6  |
| 5   | 1.98 |
| 8   | 2.52 |
| 11  | 3.0  |
| 15  | 3.54 |
| 20  | 4.05 |
| 27  | 4.5  |
| 44  | 4.9  |

## Telesna višina

Vsak vadeči pove svojo telesno višino. Na podlagi telesna višine in spola se bo potem izračunala okvirna dosežna višina.

### Transformation of height into scores:

S = T\_{290,20}(H\*2-60)

| H   | S    |
| --- | ---- |
| 141 | 1.0  |
| 165 | 1.48 |
| 169 | 1.93 |
| 172 | 2.42 |
| 175 | 3.0  |
| 178 | 3.58 |
| 181 | 4.07 |
| 185 | 4.52 |
| 194 | 4.91 |

# Final score

The final score is calculated as the average of all the _available_ scores. Using the scores The ranks are assigned as follows:

| Final score | Rank |
| ----------- | ---- |
| 1 - 1.7     | I.   |
| 1.71 - 2.40 | II.  |
| 2.41 - 3.3  | III. |
| 3.31 - 4    | IV.  |
| 4.01 - 5    | V.   |
