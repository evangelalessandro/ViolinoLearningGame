# 🎻 ImparaNote Violino

Applicazione web per **imparare le note del violino giocando**: riconoscere le note sul
pentagramma, trovarle sulle corde, allenare l'orecchio. Pensata per bambini, ragazzi e
adulti, con sfide a tempo per un giocatore, **duelli a turni** e **sfide contemporanee**
per due giocatori sullo stesso schermo.

Disponibile in **italiano e inglese** (cambiano anche i nomi delle note:
Do Re Mi Fa Sol La Si ⇄ C D E F G A B).

Non serve installare nulla, non serve internet: è tutto statico e i suoni del violino
vengono sintetizzati in tempo reale dal browser (Web Audio API).

🇬🇧 [Read this document in English](README.md)

---

## Come si usa

**Modo più semplice:** apri `index.html` con un doppio clic (funziona anche da `file://`).

**Modo consigliato** (per tablet e per un comportamento identico a un sito pubblicato):

```powershell
# dalla cartella del progetto
python -m http.server 8899
# poi apri http://127.0.0.1:8899/
```

L'audio parte al primo tocco/click: è una regola dei browser, non un difetto.
I record personali vengono salvati nel `localStorage` del browser: non esce nessun dato.

---

## I giochi

| Gioco | Cosa si allena |
|---|---|
| 🎼 **Leggi la nota** | Compare una nota sul pentagramma: scegli il suo nome (10 domande) |
| 🎻 **Trova la posizione** | Leggi il nome e tocca il punto giusto sul manico |
| 👂 **Orecchio musicale** | Il violino suona una nota: riconoscila a orecchio (riascoltabile) |
| ⏱️ **Sfida a tempo** | 60 secondi di domande miste fra lettura e ascolto |
| 🔥 **Tastiera a tempo** | 60 secondi per trovare più note possibili sul manico |
| ⚔️ **Duello a turni** | 2 giocatori, un turno a tempo ciascuno: vince chi fa più punti |
| 👥 **Sfida contemporanea** | 2 giocatori **insieme**, schermo diviso, ognuno con le sue note |
| 🏁 **Testa a testa** | Una nota per tutti: chi risponde per primo vince il punto |
| 🎼 **Brani classici** | Scegli un brano famoso e indovina le sue note una per una sul pentagramma |
| 🎸 **Violin Hero** | Le note del brano cadono: tocca la corda giusta a tempo |

### La tastiera delle note

Quando un gioco chiede il nome di una nota, le risposte sono una **tastiera fissa**: le stesse
note nello stesso ordine a ogni domanda — Do Re Mi Fa Sol La Si, più i diesis quando il livello
li usa — così si impara dove sta ogni nota invece di cercare il pulsante ogni volta. I tasti
1…7 (fino a =) le suonano. Nelle sfide a due le risposte restano quattro, perché una
tastiera intera non ci sta due volte su uno schermo.

Ogni tasto è **una nota in una sola ottava**: Sol3 e Sol4 hanno due tasti distinti e ognuno
mostra la sua ottava (Sol3, Do♯5), perché un Sol non è la risposta giusta a una domanda sul Sol
un'ottava più in alto. Nei primi livelli la tastiera contiene solo le note del livello (9 tasti
per *bambini*); quando il brano ne chiede altre (o il livello usa le alterazioni) si allunga e i
tasti si stringono un po' per restare su una riga.

### 🎼 Brani classici

Si sceglie dalla libreria inclusa (js/brani.js: melodie di pubblico dominio, tutte suonabili
in 1ª posizione dal Sol3 al Do6):

| Brano | |
|---|---|
| Inno alla Gioia | Ludwig van Beethoven |
| Per Elisa (inizio) | Ludwig van Beethoven |
| Canone di Pachelbel (tema) | Johann Pachelbel |
| Fra Martino | canzone tradizionale |
| Brillante stella | melodia tradizionale francese |
| Jingle Bells | James Lord Pierpont |
| Scala e arpeggio di Do | esercizio |

Si può **ascoltare tutto il brano** prima di cominciare (con il suo ritmo); poi l'app mostra le
sue note una per una sul pentagramma: dai il nome, la senti suonare e vedi la melodia crescere
nota dopo nota in alto nello schermo. Gli errori finiscono nel riepilogo come negli altri giochi.

#### Aggiungere un brano tuo (fuori dal repository)

I brani che aggiungi tu stanno in **`js/brani-locali.js`**, un file che **git ignora**: resta sul
tuo computer e non finisce mai su GitHub. Si parte dal modello `js/brani-locali.example.js`
(copialo con il nome `js/brani-locali.js`), si scrivono le note e si ricarica la pagina: i tuoi
brani compaiono in fondo all'elenco, segnati con "tuo", sia in *Brani classici* sia in
*Violin Hero*.

```js
window.Brani.aggiungi({
  chiave: 'mio-brano',                                // nome corto, senza spazi
  titolo: 'Il mio brano',                             // come compare nell'elenco
  autore: 'Io',
  bpm: 76,                                            // si può cambiare mentre giochi
  note: [['Mi4', 1], ['Sol4', 1], ['La4', 2]]         // [nota, battiti]
});
```

Le note si possono scrivere all'italiana (`Do4`, `Fa#4`) o all'inglese (`C4`, `F#4`); i
riferimenti per il violino sono Sol3/Re4/La4/Mi5 (le quattro corde a vuoto) e Do4 per il Do
centrale, e tutto deve restare fra Sol3 e Do6 in 1ª posizione: una nota non suonabile fa
**rifiutare** il brano con un avviso nella console (F12), invece di rompere i giochi.

> ⚠ **Diritto d'autore**: ci vanno solo melodie di pubblico dominio o che hai il diritto di
> usare. Le melodie ancora protette (per esempio la maggior parte dei canti liturgici moderni)
> non vanno pubblicate — tenerle in questo file locale serve esattamente a questo.

### 🎸 Violin Hero

Le note del brano scelto cadono verso una linea, ognuna nella corsia della corda su cui si
suona davvero (Sol, Re, La, Mi). Colpisci la corsia giusta a tempo — tocca i quattro pulsanti
o premi i tasti 1 2 3 4 — e l'app suona quella nota: suonando bene senti la melodia che
si costruisce. Quattro battiti di conteggio e si parte; il tempo perfetto vale doppio, una nota
mancata interrompe la serie, un tocco a vuoto non costa nulla.

Il comando **Tempo** sopra le corsie cambia la velocità del brano mentre giochi: trascina il
cursore, usa i pulsanti **−** e **+** oppure i tasti `-` e `+`, e l'etichetta mostra la velocità
e i BPM che ne risultano (`0,8× · 80 BPM` per l'Inno alla Gioia, che è scritto a 100). Le note non saltano mai: quella che sta arrivando
sulla linea resta lì e le altre si stringono o si allargano intorno a lei, così puoi rallentare
un passaggio, impararlo e riaccelerare. La scelta resta memorizzata per la volta dopo
(da 0,5× a 1,6×).

### 📋 Riepilogo degli errori

In ogni gioco c'è il pulsante **📋 Errori** (con il numero di sbagli): apre un pannello che
**mette in pausa** la partita e spiega ogni sbaglio, uno per uno. Lo stesso pannello si
apre alla fine con **"Rivedi gli errori"**.

Per ogni errore il pannello mostra:

* il **pentagramma** con la nota giusta;
* **la tua risposta** e **la risposta giusta**, con la nota scritta per esteso
  ("Fa♯4 — Fa diesis");
* **che tipo di sbaglio è stato**, riconosciuto automaticamente:
  * *Stesso nome, ottava diversa* (Sol3 scambiato per Sol4)
  * *Alterazione sbagliata* (Fa invece di Fa♯)
  * *Riga o spazio sbagliato* (nota letta un gradino sopra o sotto)
  * *Nota a un semitono di distanza*
  * *Corda sbagliata* o *Dito sbagliato* (per i giochi sul manico)
* **una spiegazione concreta** ("Hai toccato la corda Mi, ma La3 si suona sulla corda Sol
  (1º dito)") e **dove si suona** quella nota, più le posizioni alternative;
* il **confronto delle frequenze** (Fa = 349,2 Hz · Fa♯ = 370,0 Hz);
* il pulsante **🔊 Confronta**, che suona prima la nota giusta e poi quella sbagliata, così
  si sente la differenza.

In testa al pannello: quante giuste, quante sbagliate, la precisione e — se un tipo di
errore si ripete — **l'errore più frequente** con il consiglio per non ripeterlo.

### Punteggio

10 punti a risposta corretta, più un bonus **serie** (3 risposte di fila: +5, 5 di fila: +10)
e un bonus **velocità** (fino a +8). Il record di ogni gioco e livello viene salvato.

### I comandi delle sfide a due

Si può giocare **toccando i pulsanti** sullo schermo (perfetto su un tablet fra due
persone) oppure con la tastiera:

| | Tasti |
|---|---|
| Giocatore 1 | `A` `S` `D` `F` |
| Giocatore 2 | `J` `K` `L` `Ò` |

Nel gioco singolo si risponde con `1` `2` `3` `4` (o toccando), `Spazio` riascolta la nota.

---

## Livelli

| Livello | Contenuto |
|---|---|
| 🧒 **Bambini** | Corde vuote e prime note, 1ª posizione, solo note naturali (Sol3–La4) |
| 🎵 **Ragazzi** | Tutta la 1ª posizione con note naturali (Sol3–Mi5) |
| 🎼 **Adulti** | 1ª posizione completa, con diesis e bemolli, tagli addizionali |
| 🏆 **Maestri** | 1ª–3ª posizione, alterazioni, registro acuto fino al Do6 |

La voce **📚 Studia** mostra il manico interattivo (tocca una pallina: senti la nota e la
vedi sul pentagramma), l'accordatura Sol–Re–La–Mi e la tabella delle note di ogni corda.

---

## Il suono del violino

Le note che senti sono **registrazioni reali di violino**, non un tono sintetico.

* **Campioni** — le registrazioni di *Solo Violin* di **VSCO 2 Community Edition**, rilasciate
  con licenza **CC0 1.0 Universal** (dominio pubblico). Undici note ad arco con vibrato vero
  dal Sol3 al Do6 — 3,5 s ciascuna, attacco d'archetto naturale incluso — più un pizzicato per
  i suoni dell'interfaccia. Stanno in `sounds/`, sono WAV mono a 22 050 Hz e pesano circa
  1,7 MB in tutto. Provenienza e lavorazione sono
  documentate in [`sounds/LICENSE.md`](sounds/LICENSE.md) e lo script di preparazione è
  [`tools/prepara-campioni.js`](tools/prepara-campioni.js).
* **Intonazione** — l'altezza reale di ogni registrazione è stata misurata con
  [`tools/misura-campioni.js`](tools/misura-campioni.js) e salvata in `js/audio.js`, così la
  riproduzione viene trasposta esattamente sulla nota richiesta. Una delle note originali è
  23 cent crescente: senza questa correzione suonerebbe scordata.
* **Riproduzione** — ogni nota usa il campione più vicino, trasposto al massimo di due
  semitoni, tenuto per tutta la durata della nota (i campioni sono abbastanza lunghi da non
  troncarla mai) e rilasciato come un archetto che si stacca, attraverso un limitatore
  morbido e un breve riverbero.
* **Ripiego** — se il browser non riesce a leggere i file dei campioni (succede aprendo
  `index.html` direttamente da `file://`, perché la lettura dei file locali è bloccata), l'app
  sintetizza il violino: spettro della corda sfregata `(1/n)·|sin(n·π·β)|`, risonanze della
  cassa (A0 ~285 Hz, B1 ~480 Hz, bridge hill ~3 kHz), rumore dell'archetto, vibrato e un
  modello di pizzicato. Le note si sentono quindi sempre, campionate o sintetizzate.

---

## Come funziona il modello musicale

* **Nomi delle note** — in italiano si chiamano **Do Re Mi Fa Sol La Si**, in inglese
  **C D E F G A B**, con ♯/♭ accanto al nome (e la forma parlata *"Fa diesis"*,
  *"Si bemolle"* nei suggerimenti). Il numero dopo il nome indica l'ottava: **La4** = 440 Hz,
  il La di riferimento.
* **Corda vuota e dita** — in 1ª posizione il *k*-esimo dito suona il grado diatonico
  *k* sopra la corda vuota; ogni dito può poi suonare anche un semitono sotto (dito
  "basso", es. Si♭) o sopra (dito "alto", es. Fa♯). Da qui nascono tutte le alterazioni
  in modo coerente con la diteggiatura reale.
  * Es. corda Re: 0 = Re4, 1º = Mi4, 2º = Fa4/Fa♯4, 3º = Sol4, 4º = La4.
  * Sulla corda Mi il 1º dito è a un semitono (Fa5), non a due.
* **Posizioni** — in posizione *P* il 1º dito suona il grado *P* sopra la corda vuota
  (3ª posizione sulla corda Sol: 1º dito = Do4).
* **La stessa nota su più corde** — Re4 è la corda Re vuota *oppure* il 4º dito sulla
  corda Sol: l'app accetta entrambe e le spiega nel feedback.
* **Nomi uguali in ottave diverse** — Sol3 e Sol4 si chiamano entrambi "Sol": per questo
  le risposte a scelta hanno sempre nomi tutti diversi, e nel gioco *Trova la posizione*
  la richiesta mostra anche il pentagramma e l'ottava, così il punto da toccare è
  inequivocabile.
* **Il pentagramma** — la chiave di violino è un disegno vettoriale allineato
  geometricamente alla riga del Sol (nessuna dipendenza da font musicali installati);
  ogni nota è posizionata contando righe e spazi a partire dal Mi4 (1ª riga), con i
  tagli addizionali calcolati automaticamente.

---

## Struttura del progetto

```
index.html            struttura delle schermate e guida bilingue
css/styles.css        stile (tema chiaro/scuro automatico, responsive)
js/i18n.js            traduzioni dell'interfaccia (italiano / inglese) e cambio lingua
js/theory.js          note, frequenze, corde, diteggiature, posizioni, livelli
js/audio.js           sintesi del violino (Web Audio), effetti, accordatura
js/staff.js           disegno del pentagramma in chiave di violino (SVG)
js/violin.js          manico del violino interattivo (SVG)
js/brani.js           brani di pubblico dominio per i due giochi musicali
js/brani-locali.example.js   modello per le tue melodie (non pubblicate, vedi sopra)
js/games.js           motore di gioco: domande, punteggi, tempi, turni (nessun DOM)
js/eroe.js            motore di Violin Hero: note che cadono, tempi e punteggi
js/app.js             interfaccia, schermate, collegamento con il motore
sounds/               campioni di violino registrati (VSCO 2 CE, CC0) + licenza
tools/                script di preparazione dei campioni e di misura dell'intonazione
test/test-motore.js        verifica automatica della logica
test/test-interfaccia.js   verifica dell'interfaccia con click reali (Chrome)
test/test-audio.js         verifica del timbro (analisi dello spettro, Chrome)
```

Nessuna libreria esterna, nessun passaggio di build.

---

## Verifiche

```powershell
node test/test-motore.js          # logica: note, diteggiature, domande, partite
node test/test-interfaccia.js     # interfaccia: click veri del mouse (serve Chrome)
node test/test-audio.js           # suono: spettro del violino sintetizzato (serve Chrome)
```

`test-motore.js` esegue ~20.700 controlli: nomi e frequenze delle note, diteggiature
della 1ª posizione, coerenza di ogni livello (ogni nota delle domande deve essere davvero
suonabile e avere una pallina cliccabile sul manico), generazione delle domande (una sola
risposta giusta, opzioni con nomi tutti diversi), riconoscimento dei tipi di errore nel
riepilogo, i **nomi inglesi** e la **pausa** (l'orologio non consuma tempo mentre si legge),
più la simulazione di **tutte le 32 combinazioni gioco × livello** fino alla fine della partita.

`test-interfaccia.js` apre l'app in Chrome headless e la usa con **eventi mouse reali**
(cioè passando dal controllo di sovrapposizione degli elementi), verificando che nessun
velo o modale dimenticata copra l'interfaccia, che ogni pulsante risponda davvero, che il
riepilogo degli errori si apra e metta in pausa l'orologio, che il **pulsante della lingua**
traduca tutta l'interfaccia e i nomi delle note, che la tastiera fissa delle risposte abbia
**un tasto distinto per ogni nota di ogni ottava** (così Sol4 risponde davvero a una domanda su
Sol4 e non su Sol3), che il comando **Tempo** di Violin Hero cambi davvero la velocità (cursore,
pulsanti −/+, tasti `-`/`+`, e resti raggiungibile sul telefono), e che non compaia mai la scritta
`undefined` a schermo (sintomo tipico di una proprietà scritta con un nome diverso da quello
usato nell'interfaccia).
Per eseguirlo serve l'app servita via HTTP:

```powershell
python -m http.server 8899
node test/test-interfaccia.js
```

> Perché due test: un click fatto con `element.click()` da JavaScript funziona **anche**
> sotto un velo trasparente, quindi non basta a garantire che l'app sia usabile. Solo un
> click vero se ne accorge.

`test-audio.js` renderizza le note con un `OfflineAudioContext` (quindi senza doverle
suonare) e analizza lo spettro con la trasformata di Goertzel: verifica che l'altezza sia
esatta entro pochi Hz, che la serie armonica sia quella della corda sfregata — compreso il
"buco" sull'8ª armonica — che le risonanze della cassa colorino il suono dove devono, che il
vibrato allarghi lo spettro attorno alla fondamentale, che l'arco sostenga il suono mentre il
pizzicato decade, e che non ci sia clipping.

---

## Note tecniche

* Browser moderni (Chrome, Edge, Firefox, Safari): usa `<script>` classici, quindi
  funziona anche aperto da `file://`.
* Il manico mostra le posizioni come "tasti" virtuali di semitono: cliccare una pallina
  identifica la nota senza ambiguità e il numero dentro è il dito che la suona.
* La sfida contemporanea tiene uno stato separato per ogni giocatore: la risposta di uno
  non blocca l'altro.
* Il tema scuro si attiva automaticamente con le preferenze di sistema.
* La lingua dell'interfaccia viene ricordata in `localStorage`; alla prima visita segue la
  lingua del browser (i browser italiani vedono l'italiano, gli altri l'inglese).

## Crediti

* Campioni di violino: *Solo Violin* di
  [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) di Versilian Studios LLC,
  rilasciati con licenza **CC0 1.0 Universal** (dedica al pubblico dominio). Vedi
  [sounds/LICENSE.md](sounds/LICENSE.md).
* Chiave di violino: disegno vettoriale di **pubblico dominio** ricavato da
  [Treble clef.svg](https://commons.wikimedia.org/wiki/File:Treble_clef.svg)
  (Wikimedia Commons, PD-self). Nel file originale la chiave è disegnata insieme al
  pentagramma, quindi è stato possibile ricavare la trasformazione esatta per allinearla
  alla riga del Sol.
* Tutto il resto (codice, sintesi sonora, grafica del manico, traduzioni) è originale.
