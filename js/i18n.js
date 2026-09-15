/* ==========================================================================
   i18n.js — Traduzioni dell'interfaccia (italiano / inglese)
   La lingua scelta viene salvata nel browser; i nomi delle note e le
   descrizioni musicali vivono invece in theory.js e games.js, che ricevono
   la lingua da qui tramite `I18n.onCambia`.
   ========================================================================== */
window.I18n = (function () {
  'use strict';

  const CHIAVE = 'violino.lingua';

  const DIZ = {
    /* ================================================================ IT */
    it: {},
    /* ================================================================ EN */
    en: {}
  };

  /* Italiane ----------------------------------------------------------------- */
  Object.assign(DIZ.it, {
    'lingua.nome': 'Italiano',
    'lingua.breve': 'IT',
    'lingua.cambia': 'Passa all\'inglese',
    'brand.sottotitolo': 'Violino',
    'nav.studia': 'Studia',
    'nav.audio': 'Attiva/disattiva l\'audio',
    'nav.aiuto': 'Come si gioca',

    'home.titolo': 'Impara le note del violino giocando',
    'home.sottotitolo': 'Scegli un gioco, il livello giusto per te e comincia. Puoi giocare da solo, sfidare un amico a turni oppure suonare insieme sullo stesso schermo.',
    'home.scegli': '🎮 Scegli un gioco',
    'home.studia': '📚 Studia le note',
    'home.livello': 'Livello',
    'home.opzioni': 'Opzioni',
    'home.bemolli': 'Usa i bemolli (Si♭) invece dei diesis (La♯)',
    'home.risposte': 'Risposte nelle sfide a due',
    'home.nome1': 'Nome giocatore 1',
    'home.nome2': 'Nome giocatore 2',
    'home.durata': 'Durata sfide a due',
    'home.secondi': '{n} secondi',
    'home.record': 'Record {n} pt',
    'home.dueGiocatori': '2 giocatori',
    'home.domande': '{n} domande',
    'brani.scegli': 'Scegli un brano',
    'brani.ascolta': 'Ascolta',
    'brani.gioca': 'Gioca',
    'brani.note': '{n} note',
    'brani.difficolta': 'Facile',
    'brani.difficolta2': 'Media',
    'brani.tuo': 'tuo',
    'brani.titolo': 'Brano',
    'eroe.pronti': 'Pronti…',
    'eroe.tocca': 'Tocca la corda giusta quando la nota arriva sulla linea',
    'eroe.tempo': 'Tempo',
    'eroe.tempoMeno': 'Rallenta il brano',
    'eroe.tempoPiu': 'Accelera il brano',
    'eroe.tempoVal': '{v}× · {bpm} BPM',
    'nome.giocatore': 'Giocatore {n}',

    'gioco.punti': 'Punti',
    'gioco.serie': 'Serie',
    'gioco.giuste': 'Giuste',
    'gioco.tempo': 'Tempo',
    'gioco.domanda': 'Domanda',
    'gioco.esci': 'Esci',
    'gioco.iniziaTurno': 'Inizia il turno',
    'gioco.toccaA': 'Tocca a <em>{nome}</em>',
    'gioco.turnoPrec': '{nome} ha totalizzato <strong>{punti} punti</strong> ({giuste} giuste, {sbagli} sbagliate).',
    'gioco.turnoTempo': '{n} secondi per rispondere al maggior numero di note.',
    'gioco.chiPrimo': 'chi tocca per primo la risposta giusta?',
    'gioco.round': 'Round',
    'gioco.giuste2': '{n} giuste',
    'gioco.giusto': '<strong>Giusto!</strong> {nota} +{punti} punti',
    'gioco.bonusSerie': 'serie +{n}',
    'gioco.bonusVelocita': 'velocità +{n}',
    'gioco.sbagliato': '<strong>Sbagliato.</strong> Era {nota}',
    'gioco.trovaSulManico': 'Trova sul manico questa nota',
    'gioco.posizione1': '1ª posizione',
    'gioco.posizioni': '1ª–{n}ª posizione',
    'gioco.ascoltaE': 'Ascolta e riconosci la nota',
    'gioco.ascolta': '🔊 Ascolta',
    'gioco.errori': 'Errori',
    'gioco.nessunErrore': 'Nessun errore 🎉',
    'gioco.erroriTitolo': '📋 Riepilogo degli errori',
    'gioco.erroriSommario': '{modo} · {livello} · {sbagliate} su {totale} domande · precisione {precisione}%',
    'gioco.erroreUno': '1 errore',
    'gioco.erroriMolti': '{n} errori',
    'gioco.piuFrequente': 'Errore più frequente: <b>{titolo}</b> ({n} volte)',
    'gioco.tuaRisposta': 'La tua risposta',
    'gioco.rispostaGiusta': 'Risposta giusta',
    'gioco.sulManico': 'Sul manico: {dove}',
    'gioco.ancheSu': 'si può suonare anche: {dove}',
    'gioco.confronta': '🔊 Confronta: {nomi}',
    'gioco.soloGiusta': '🔊 Solo la nota giusta',
    'gioco.chiudi': 'Chiudi',
    'gioco.chiudiRiprendi': 'Chiudi e riprendi',
    'gioco.nessunErroreRivedere': '🎉 Nessun errore da rivedere: complimenti!',

    'esiti.vince': '🏆 Vince {nome}!',
    'esiti.pareggio': '🤝 Pareggio!',
    'esiti.rivincita': '🔁 Rivincita',
    'esiti.rigioca': '🔁 Gioca ancora',
    'esiti.cambiaLivello': '🎚️ Cambia livello',
    'esiti.home': '🏠 Home',
    'esiti.rivediErrori': '📋 Rivedi gli errori',
    'esiti.punti': 'punti',
    'esiti.nuovoRecord': '🎉 Nuovo record personale!',
    'esiti.recordDaBattere': 'Record da battere: {n} punti',
    'esiti.statGiuste': 'Giuste',
    'esiti.statSbagliate': 'Sbagliate',
    'esiti.statPrecisione': 'Precisione',
    'esiti.statSerie': 'Serie migliore',
    'esiti.riga': '{giuste} giuste · {sbagliate} sbagliate · {precisione}% · serie {serie}',

    'setup.annulla': 'Annulla',
    'setup.inizia': 'Inizia la sfida',
    'setup.secondiTurno': 'Secondi per turno',
    'setup.durataSfida': 'Durata della sfida',

    'impara.titolo': 'Studia il manico e il pentagramma',
    'impara.pos1': '1ª posizione',
    'impara.finoA': 'fino alla {n}ª',
    'impara.toccaPallina': 'Tocca una pallina: il numero è il dito, il colore è la corda. I nomi delle note sono quelli italiani (Do, Re, Mi, Fa, Sol, La, Si) e il numero indica l\'ottava: il La4 è il La di riferimento a 440 Hz.',
    'impara.riascolta': '🔊 Riascolta',
    'impara.accordatura': '🎻 Accordatura (Sol Re La Mi)',
    'impara.noteDella': 'Le note della {pos} posizione',
    'impara.vuota': 'vuota',
    'impara.sulManico': 'Sul manico: {dove}',
    'impara.anche': 'Si può suonare anche: {dove}',
    'impara.nonSuonabile': 'non suonabile in questa posizione'
  });

  /* Inglese ------------------------------------------------------------------ */
  Object.assign(DIZ.en, {
    'lingua.nome': 'English',
    'lingua.breve': 'EN',
    'lingua.cambia': 'Switch to Italian',
    'brand.sottotitolo': 'Violin',
    'nav.studia': 'Study',
    'nav.audio': 'Turn the sound on/off',
    'nav.aiuto': 'How to play',

    'home.titolo': 'Learn the violin notes by playing',
    'home.sottotitolo': 'Pick a game and the right level for you. Play on your own, challenge a friend in turns, or play side by side on the same screen.',
    'home.scegli': '🎮 Pick a game',
    'home.studia': '📚 Study the notes',
    'home.livello': 'Level',
    'home.opzioni': 'Options',
    'home.bemolli': 'Use flats (B♭) instead of sharps (A♯)',
    'home.risposte': 'Answers in two-player games',
    'home.nome1': 'Player 1 name',
    'home.nome2': 'Player 2 name',
    'home.durata': 'Length of two-player games',
    'home.secondi': '{n} seconds',
    'home.record': 'Best {n} pts',
    'home.dueGiocatori': '2 players',
    'home.domande': '{n} questions',
    'brani.scegli': 'Choose a piece',
    'brani.ascolta': 'Listen',
    'brani.gioca': 'Play',
    'brani.note': '{n} notes',
    'brani.difficolta': 'Easy',
    'brani.difficolta2': 'Medium',
    'brani.tuo': 'yours',
    'brani.titolo': 'Piece',
    'eroe.pronti': 'Ready…',
    'eroe.tocca': 'Hit the right string when the note reaches the line',
    'eroe.tempo': 'Tempo',
    'eroe.tempoMeno': 'Slow the piece down',
    'eroe.tempoPiu': 'Speed the piece up',
    'eroe.tempoVal': '{v}× · {bpm} BPM',
    'nome.giocatore': 'Player {n}',

    'gioco.punti': 'Points',
    'gioco.serie': 'Streak',
    'gioco.giuste': 'Right',
    'gioco.tempo': 'Time',
    'gioco.domanda': 'Question',
    'gioco.esci': 'Quit',
    'gioco.iniziaTurno': 'Start the turn',
    'gioco.toccaA': '<em>{nome}</em>, your turn',
    'gioco.turnoPrec': '{nome} scored <strong>{punti} points</strong> ({giuste} right, {sbagli} wrong).',
    'gioco.turnoTempo': '{n} seconds to answer as many notes as you can.',
    'gioco.chiPrimo': 'who taps the right answer first?',
    'gioco.round': 'Round',
    'gioco.giuste2': '{n} right',
    'gioco.giusto': '<strong>Right!</strong> {nota} +{punti} points',
    'gioco.bonusSerie': 'streak +{n}',
    'gioco.bonusVelocita': 'speed +{n}',
    'gioco.sbagliato': '<strong>Wrong.</strong> It was {nota}',
    'gioco.trovaSulManico': 'Find this note on the fingerboard',
    'gioco.posizione1': '1st position',
    'gioco.posizioni': '1st–{n}th position',
    'gioco.ascoltaE': 'Listen and name the note',
    'gioco.ascolta': '🔊 Listen',
    'gioco.errori': 'Mistakes',
    'gioco.nessunErrore': 'No mistakes 🎉',
    'gioco.erroriTitolo': '📋 Mistakes in this game',
    'gioco.erroriSommario': '{modo} · {livello} · {sbagliate} of {totale} questions · {precisione}% accuracy',
    'gioco.erroreUno': '1 mistake',
    'gioco.erroriMolti': '{n} mistakes',
    'gioco.piuFrequente': 'Most frequent mistake: <b>{titolo}</b> ({n} times)',
    'gioco.tuaRisposta': 'Your answer',
    'gioco.rispostaGiusta': 'Right answer',
    'gioco.sulManico': 'On the fingerboard: {dove}',
    'gioco.ancheSu': 'you can also play it: {dove}',
    'gioco.confronta': '🔊 Compare: {nomi}',
    'gioco.soloGiusta': '🔊 The right note only',
    'gioco.chiudi': 'Close',
    'gioco.chiudiRiprendi': 'Close and resume',
    'gioco.nessunErroreRivedere': '🎉 Nothing to review: well done!',

    'esiti.vince': '🏆 {nome} wins!',
    'esiti.pareggio': '🤝 A draw!',
    'esiti.rivincita': '🔁 Rematch',
    'esiti.rigioca': '🔁 Play again',
    'esiti.cambiaLivello': '🎚️ Change level',
    'esiti.home': '🏠 Home',
    'esiti.rivediErrori': '📋 Review the mistakes',
    'esiti.punti': 'points',
    'esiti.nuovoRecord': '🎉 New personal best!',
    'esiti.recordDaBattere': 'Best to beat: {n} points',
    'esiti.statGiuste': 'Right',
    'esiti.statSbagliate': 'Wrong',
    'esiti.statPrecisione': 'Accuracy',
    'esiti.statSerie': 'Best streak',
    'esiti.riga': '{giuste} right · {sbagliate} wrong · {precisione}% · streak {serie}',

    'setup.annulla': 'Cancel',
    'setup.inizia': 'Start the game',
    'setup.secondiTurno': 'Seconds per turn',
    'setup.durataSfida': 'Game length',

    'impara.titolo': 'Study the fingerboard and the staff',
    'impara.pos1': '1st position',
    'impara.finoA': 'up to {n}rd',
    'impara.toccaPallina': 'Tap a dot: the number is the finger, the colour is the string. Notes are named with letters (C, D, E, F, G, A, B) and the number is the octave: A4 is the reference A at 440 Hz.',
    'impara.riascolta': '🔊 Play again',
    'impara.accordatura': '🎻 Tuning (G D A E)',
    'impara.noteDella': 'Notes in the {pos} position',
    'impara.vuota': 'open',
    'impara.sulManico': 'On the fingerboard: {dove}',
    'impara.anche': 'You can also play it: {dove}',
    'impara.nonSuonabile': 'not playable in this position'
  });

  let lingua = 'it';
  const ascoltatori = [];

  function normalizza(l) {
    return (String(l || '').toLowerCase().indexOf('it') === 0) ? 'it' : 'en';
  }

  function t(chiave, vars) {
    const d = DIZ[lingua] || DIZ.it;
    let s = d[chiave];
    if (s == null) s = DIZ.it[chiave];
    if (s == null) return chiave;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return s;
  }

  function getLingua() { return lingua; }

  function linguaIniziale() {
    let salvata = null;
    try { salvata = localStorage.getItem(CHIAVE); } catch (e) { }
    if (salvata === 'it' || salvata === 'en') return salvata;
    const nav = (navigator.language || navigator.userLanguage || 'en');
    return normalizza(nav);
  }

  function setLingua(l, silenzioso) {
    const nuova = (l === 'it' || l === 'en') ? l : 'en';
    const cambiata = nuova !== lingua;
    lingua = nuova;
    try { localStorage.setItem(CHIAVE, lingua); } catch (e) { }
    if (document.documentElement) document.documentElement.lang = lingua;
    if (document.body) document.body.setAttribute('data-lingua', lingua);
    if (!silenzioso) {
      ascoltatori.forEach(function (fn) { fn(lingua, cambiata); });
    }
    return lingua;
  }

  function onCambia(fn) { ascoltatori.push(fn); }

  function avvia() {
    return setLingua(linguaIniziale(), true);
  }

  return {
    t: t, getLingua: getLingua, setLingua: setLingua, avvia: avvia,
    onCambia: onCambia, linguaIniziale: linguaIniziale, normalizza: normalizza,
    DIZ: DIZ
  };
})();
