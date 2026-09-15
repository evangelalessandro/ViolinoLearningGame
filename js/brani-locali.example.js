/* ==========================================================================
   brani-locali.example.js — LE TUE MELODIE (modello da copiare)

   Come si usa
   1. copia questo file con il nome  js/brani-locali.js
      (quel nome è escluso da git: resta sul tuo computer e non finisce mai
      nel repository pubblico / su GitHub)
   2. scrivi le tue note qui sotto
   3. ricarica la pagina con Ctrl+F5: i tuoi brani compaiono in fondo
      all'elenco di "Brani classici" e "Violin Hero", segnati con "tuo"

   Come si scrive una nota
       ['Mi4', 1]        Mi4, un battito
       ['Fa#4', 0.5]     Fa diesis 4, mezzo battito
       ['Sol4', 2]       Sol4, due battiti
   Si può scrivere all'italiana (Do Re Mi Fa Sol La Si) o all'inglese
   (C D E F G A B); le alterazioni con # oppure b. Il secondo numero sono i
   battiti: 1 = un battito, 0.5 = mezzo, 2 = due (metà e doppio si sentono).

   Riferimenti per l'ottava (chiave di violino, 1ª posizione)
       Sol3 = corda Sol a vuoto      Re4 = corda Re a vuoto
       La4 = corda La a vuoto        Mi5 = corda Mi a vuoto
       Do4 = Do centrale (sotto il rigo, 1º taglio)
   Le note devono stare fra Sol3 e Do6 e essere suonabili in 1ª posizione:
   se una nota non va bene il brano non viene aggiunto e la console (F12)
   dice quali note correggere.

   ⚠ Diritto d'autore
   Qui dentro metti solo melodie di pubblico dominio o che hai il diritto di
   usare. Le melodie ancora protette (per esempio i canti liturgici moderni)
   NON vanno pubblicate: tienile solo in questo file locale.

   Il modo più comodo per scrivere: ascolta il brano e appoggia le note sul
   battito, poi prova con il comando Tempo di Violin Hero per rallentare.
   ========================================================================== */
window.Brani.aggiungi({
  chiave: 'esempio-scala',              // nome corto, senza spazi, tutto tuo
  titolo: 'Esempio: scala di Do',       // come compare nell'elenco
  autore: 'Esempio da cancellare',
  bpm: 90,                              // battiti al minuto (si può cambiare in gioco)
  note: [
    ['Do4', 1], ['Re4', 1], ['Mi4', 1], ['Fa4', 1],
    ['Sol4', 1], ['La4', 1], ['Si4', 1], ['Do5', 2]
  ]
});

/* ---------------------------------------------------------------------------
   Il tuo inno / la tua canzone: togli i commenti e scrivi le note al posto
   dei puntini. Le righe possono essere quante vuoi: una per nota, in ordine.

window.Brani.aggiungi({
  chiave: 'tu-sei-la-mia-vita',
  titolo: 'Tu sei la mia vita',
  autore: 'Pierangelo Sequeri (1977)',
  bpm: 76,
  note: [
    ['Mi4', 1], ['Sol4', 1], ['La4', 2],
    // ...e così via fino all'ultima nota
  ]
});
--------------------------------------------------------------------------- */
