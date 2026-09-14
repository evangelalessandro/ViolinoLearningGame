/* ==========================================================================
   games.js — Motore di gioco
   Contiene la logica di tutti i giochi (senza toccare il DOM): generazione
   delle domande, punteggi, tempi, turni e sfide fra due giocatori.
   L'interfaccia grafica vive in app.js.
   ========================================================================== */
window.Gioco = (function () {
  'use strict';

  const T = window.Theory;

  /* ------------------------------------------------------------ definizione */
  const MODI = {
    leggi: {
      chiave: 'leggi', nome: 'Leggi la nota', nomeEn: 'Read the note', icona: '🎼', tipo: 'nome', layout: 'solo',
      domande: 10, giocatori: 1, grandi: true,
      desc: 'Guarda la nota sul pentagramma e scegli il suo nome.',
      descEn: 'Look at the note on the staff and choose its name.',
      aiuto: 'Sul pentagramma in chiave di violino la 1ª riga in basso è il Mi4.',
      aiutoEn: 'On the treble staff the bottom line is E4.'
    },
    trova: {
      chiave: 'trova', nome: 'Trova la posizione', nomeEn: 'Find the position', icona: '🎻', tipo: 'posizione', layout: 'solo',
      domande: 10, giocatori: 1, grandi: true,
      desc: 'Leggi il nome della nota e toccala al posto giusto sul manico.',
      descEn: 'Read the note name and tap the right spot on the fingerboard.',
      aiuto: 'Tocca la pallina giusta: il numero è il dito che usa il violinista.',
      aiutoEn: 'Tap the right dot: the number is the finger the violinist uses.'
    },
    orecchio: {
      chiave: 'orecchio', nome: 'Orecchio musicale', nomeEn: 'Ear training', icona: '👂', tipo: 'orecchio', layout: 'solo',
      domande: 10, giocatori: 1, grandi: true,
      desc: 'Ascolta la nota del violino e indovina che nome ha.',
      descEn: 'Listen to the violin note and guess its name.',
      aiuto: 'Puoi riascoltare la nota quante volte vuoi con il pulsante Ascolta.',
      aiutoEn: 'You can play the note again as many times as you like.'
    },
    tempo: {
      chiave: 'tempo', nome: 'Sfida a tempo', nomeEn: 'Time challenge', icona: '⏱️', tipo: 'misto', layout: 'solo',
      secondi: 60, giocatori: 1, grandi: true,
      desc: 'Sessanta secondi per leggere più note possibili. Ogni errore costa tempo!',
      descEn: 'Sixty seconds to read as many notes as you can. Every mistake costs time!',
      aiuto: 'Le domande mescolano lettura sul pentagramma e ascolto.',
      aiutoEn: 'Questions mix staff reading and listening.'
    },
    tastiera: {
      chiave: 'tastiera', nome: 'Tastiera a tempo', nomeEn: 'Fingerboard race', icona: '🔥', tipo: 'posizione', layout: 'solo',
      secondi: 60, giocatori: 1, grandi: true,
      desc: 'Trova il maggior numero di note sul manico in sessanta secondi.',
      descEn: 'Find as many notes on the fingerboard as you can in sixty seconds.',
      aiuto: 'Le note compaiono come nome: tu toccale sulla corda giusta.',
      aiutoEn: 'Notes appear as a name: tap them on the right string.'
    },
    duello: {
      chiave: 'duello', nome: 'Duello a turni', nomeEn: 'Turn-based duel', icona: '⚔️', tipo: 'nome', layout: 'turni',
      secondi: 30, giocatori: 2, grandi: true,
      desc: 'Due giocatori a turno: trenta secondi ciascuno, vince chi segna di più.',
      descEn: 'Two players in turns: thirty seconds each, the highest score wins.',
      aiuto: 'Prima gioca il Giocatore 1, poi passa il dispositivo al Giocatore 2.',
      aiutoEn: 'Player 1 goes first, then pass the device to Player 2.'
    },
    contemporanea: {
      chiave: 'contemporanea', nome: 'Sfida contemporanea', nomeEn: 'Side-by-side challenge', icona: '👥', tipo: 'nome', layout: 'split',
      secondi: 60, giocatori: 2, grandi: true,
      desc: 'Due giocatori insieme sullo stesso schermo: ognuno ha le sue note e i suoi tasti.',
      descEn: 'Two players at the same time on one screen: each has their own notes and keys.',
      aiuto: 'Giocatore 1 usa A S D F, Giocatore 2 usa J K L ò. Si può giocare anche toccando.',
      aiutoEn: 'Player 1 uses A S D F, Player 2 uses J K L ò. You can also just tap.'
    },
    testa: {
      chiave: 'testa', nome: 'Testa a testa', nomeEn: 'Head to head', icona: '🏁', tipo: 'nome', layout: 'race',
      secondi: 60, giocatori: 2, grandi: true,
      desc: 'Stessa nota per tutti: chi risponde per primo vince il punto.',
      descEn: 'The same note for both: whoever answers first wins the point.',
      aiuto: 'Chi sbaglia resta bloccato fino alla nota successiva.',
      aiutoEn: 'A wrong answer locks you out until the next note.'
    },
    brano: {
      chiave: 'brano', nome: 'Brani classici', nomeEn: 'Classical pieces', icona: '🎼', tipo: 'brano', layout: 'solo',
      giocatori: 1, grandi: true, brano: true,
      desc: 'Scegli un brano famoso e indovina le sue note una per una sul pentagramma.',
      descEn: 'Pick a famous piece and name its notes one by one from the staff.',
      aiuto: 'Puoi ascoltare tutto il brano prima di cominciare: le note sono in ordine.',
      aiutoEn: 'You can listen to the whole piece first: the notes come in order.'
    },
    eroe: {
      chiave: 'eroe', nome: 'Violin Hero', nomeEn: 'Violin Hero', icona: '🎸', tipo: 'eroe', layout: 'eroe',
      giocatori: 1, grandi: true, brano: true,
      desc: 'Le note del brano cadono dall\'alto: tocca la corda giusta a tempo!',
      descEn: 'The notes of the piece fall from the top: hit the right string in time!',
      aiuto: 'Ogni corsia è una corda: Sol, Re, La, Mi. Tasti 1 2 3 4 oppure tocca i pulsanti.',
      aiutoEn: 'Each lane is a string: G, D, A, E. Keys 1 2 3 4 or just tap the buttons.'
    }
  };
  const ORDINE = ['leggi', 'trova', 'orecchio', 'tempo', 'tastiera', 'duello', 'contemporanea', 'testa', 'brano', 'eroe'];

  function nomeModo(m) { return (T.getLingua() === 'en' && m.nomeEn) ? m.nomeEn : m.nome; }
  function descModo(m) { return (T.getLingua() === 'en' && m.descEn) ? m.descEn : m.desc; }
  function aiutoModo(m) { return (T.getLingua() === 'en' && m.aiutoEn) ? m.aiutoEn : m.aiuto; }

  const TASTI = [
    ['a', 's', 'd', 'f', 'g', 'h'],
    ['j', 'k', 'l', 'ò', 'à', 'ù']
  ];

  function nuovoGiocatore(nome) {
    return {
      nome: nome, punti: 0, giusti: 0, sbagli: 0, serie: 0, serieMax: 0,
      bloccato: false, ultimo: null, domanda: null, ultimoErrato: null,
      fase: 'domanda'   // nella sfida contemporanea ogni giocatore ha il suo stato
    };
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* --------------------------------------------------------------- sessione */
  function Sessione(cfg) {
    cfg = cfg || {};
    this.modo = MODI[cfg.modo] || MODI.leggi;
    this.chiaveLivello = cfg.livello || 'ragazzi';
    this.livello = T.LEVELS[this.chiaveLivello] || T.LEVELS.ragazzi;
    this.preferFlats = !!cfg.preferFlats;
    this.numOpzioni = clamp(cfg.numOpzioni || 4, 2, 6);
    this.pool = T.notePool(this.chiaveLivello, this.preferFlats);
    if (cfg.veloce) this.modo = Object.assign({}, this.modo, { domande: 5, secondi: 20 });
    if (cfg.secondi) this.modo = Object.assign({}, this.modo, { secondi: cfg.secondi });
    if (cfg.domande) this.modo = Object.assign({}, this.modo, { domande: cfg.domande });

    const nomi = cfg.nomi || [];
    const predefinito = (T.getLingua() === 'en') ? 'Player ' : 'Giocatore ';
    this.giocatori = [];
    for (let i = 0; i < (this.modo.giocatori || 1); i++) {
      this.giocatori.push(nuovoGiocatore(nomi[i] || (predefinito + (i + 1))));
    }

    this.perGiocatore = this.modo.layout === 'split';
    this.hooks = cfg.hooks || {};
    this.secondi = this.modo.secondi || 0;
    this.totale = this.modo.domande || 0;
    // brano scelto (giochi "Brani classici" e "Violin Hero")
    this.brano = null;
    if (cfg.brano && typeof window !== 'undefined' && window.Brani) {
      this.brano = window.Brani.perChiave(cfg.brano);
    }
    if (this.modo.tipo === 'brano') {
      // se non è stato indicato un brano si usa il primo: così la partita
      // ha comunque un inizio e una fine
      if (!this.brano && typeof window !== 'undefined' && window.Brani) {
        this.brano = window.Brani.BRANI[0];
      }
      if (this.brano) this.totale = this.brano.note.length;
    }
    this.tempo = this.secondi;
    this.trascorso = 0;
    this.indice = 0;
    this.turno = 0;
    this.fase = 'pronto';          // pronto | attesa | domanda | feedback | turno | fine
    this.domanda = null;
    this.storico = [];
    this.ultimaNota = null;
    this._timer = null;
    this._attese = [];          // azioni programmate (avanzamento, cambio round…)
    this._atteseSospese = [];
    this.inPausa = false;
    this._pausaInizio = 0;
    this._t0 = 0;
    this._ultimoTick = 0;
  }

  Sessione.prototype.notifica = function (evento) {
    if (this.hooks.onChange) this.hooks.onChange(this, evento);
  };

  /* ---------------------------------------------------------------- domande */
  Sessione.prototype.tipoDomanda = function () {
    const t = this.modo.tipo;
    if (t === 'misto') return Math.random() < 0.55 ? 'nome' : 'orecchio';
    return t;
  };

  Sessione.prototype.estraiNota = function () {
    const pool = this.pool;
    if (!pool.length) return T.note('A', 4, 0);
    for (let i = 0; i < 20; i++) {
      const n = pool[Math.floor(Math.random() * pool.length)];
      if (!this.ultimaNota || T.midi(n) !== T.midi(this.ultimaNota) || pool.length < 3) return n;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };

  Sessione.prototype.creaDomanda = function () {
    const tipo = this.tipoDomanda();
    let nota;
    if (tipo === 'brano' && this.brano && this.brano.note.length) {
      // le note del brano, in ordine: si legge la musica come sta scritta
      const i = Math.min(this.indice, this.brano.note.length - 1);
      nota = T.daNome(this.brano.note[i][0]) || this.estraiNota();
    } else {
      nota = this.estraiNota();
    }
    this.ultimaNota = nota;
    const q = { tipo: tipo === 'brano' ? 'brano' : tipo, nota: nota, opzioni: [], risposta: null };
    if (tipo !== 'posizione') {
      // le opzioni hanno nomi tutti diversi: "Sol3" e "Sol4" si chiamano
      // entrambi "Sol" e non si potrebbero distinguere fra i pulsanti
      const perNome = T.nomeUnici(this.pool);
      const altri = T.distractors(nota, perNome, this.numOpzioni - 1);
      let opz = [nota].concat(altri);
      // se il pool è piccolo riempie con note vicine (sempre nomi diversi)
      while (opz.length < this.numOpzioni) {
        const cand = perNome[Math.floor(Math.random() * perNome.length)];
        if (!opz.some(function (x) { return x.letter === cand.letter && x.alter === cand.alter; })) opz.push(cand);
        else break;
      }
      opz = T.shuffle(opz);
      q.opzioni = opz;
      q.indiceGiusto = opz.findIndex(function (x) { return T.midi(x) === T.midi(nota); });
    } else {
      q.soluzioni = T.placementsFor(nota, this.livello.maxPosition);
    }
    return q;
  };

  Sessione.prototype.domandaDi = function (i) {
    return this.perGiocatore ? this.giocatori[i].domanda : this.domanda;
  };

  Sessione.prototype.nuovaDomanda = function (i) {
    const q = this.creaDomanda();
    if (this.perGiocatore) {
      this.giocatori[i].domanda = q;
      this.giocatori[i].ultimo = null;
      this.giocatori[i].ultimoErrato = null;
      this.giocatori[i].fase = 'domanda';
      this.giocatori[i].bloccato = false;
    } else {
      this.domanda = q;
      this.giocatori.forEach(function (g) {
        g.ultimo = null; g.ultimoErrato = null; g.fase = 'domanda'; g.bloccato = false;
      });
    }
    this.fase = 'domanda';
    this.inizioDomanda = performance.now();
    if (q.tipo === 'orecchio') this.riproduci(q);
    this.notifica('domanda');
    return q;
  };

  Sessione.prototype.riproduci = function (q) {
    const dom = q || this.domandaDi(0);
    if (!dom) return;
    if (typeof Sound !== 'undefined' && Sound.playNote) {
      Sound.playNote(dom.nota, 1.8);
    }
  };

  /* ----------------------------------------------------------------- avvio */
  Sessione.prototype.avvia = function () {
    this.fase = 'domanda';
    this.indice = 0;
    this.giocatori.forEach(function (g) {
      g.punti = 0; g.giusti = 0; g.sbagli = 0; g.serie = 0; g.serieMax = 0;
      g.bloccato = false; g.ultimo = null; g.domanda = null;
    });
    this.turno = 0;
    if (this.modo.layout === 'turni') {
      this.fase = 'turno';
      this.notifica('turno');
      return;
    }
    this.avviaTimer();
    if (this.perGiocatore) {
      this.giocatori.forEach((g, i) => this.nuovaDomanda(i));
      this.fase = 'domanda';
      this.notifica('domanda');
    } else {
      this.nuovaDomanda(0);
    }
  };

  Sessione.prototype.avviaTurno = function (indice) {
    this.turno = indice;
    this.indice = 0;
    this.tempo = this.secondi;
    this.fase = 'domanda';
    const g = this.giocatori[indice];
    g.punti = 0; g.giusti = 0; g.sbagli = 0; g.serie = 0; g.bloccato = false; g.ultimo = null;
    this.avviaTimer();
    this.nuovaDomanda(0);
  };

  Sessione.prototype.avviaTimer = function () {
    this.fermaTimer();
    this._t0 = performance.now();
    const self = this;
    this._timer = setInterval(function () { self.tick(); }, 90);
  };

  Sessione.prototype.fermaTimer = function () {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this.annullaAttese();
  };

  /* ------------------------------------------------------- azioni programmate */
  /** Programma un'azione fra `ms` millisecondi (tracciata, così si può sospendere). */
  Sessione.prototype.programma = function (ms, azione) {
    const self = this;
    const voce = { scad: performance.now() + ms, azione: azione, t: null };
    voce.t = setTimeout(function () {
      self._attese = self._attese.filter(function (x) { return x !== voce; });
      azione();
    }, Math.max(0, ms));
    this._attese.push(voce);
    return voce;
  };

  Sessione.prototype.annullaAttese = function () {
    this._attese.forEach(function (v) { clearTimeout(v.t); v.t = null; });
    this._attese = [];
  };

  /* ---------------------------------------------------------------- pausa */
  /** Ferma orologio e avanzamento: serve per consultare il riepilogo errori. */
  Sessione.prototype.pausa = function () {
    if (this.inPausa || this.fase === 'fine') return;
    this.inPausa = true;
    this._pausaInizio = performance.now();
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._atteseSospese = this._attese.map(function (v) {
      return { scad: v.scad, azione: v.azione };
    });
    this.annullaAttese();
    this.notifica('pausa');
  };

  Sessione.prototype.riprendi = function () {
    if (!this.inPausa) return;
    const durata = performance.now() - this._pausaInizio;
    this.inPausa = false;
    this._t0 += durata;                            // l'orologio di gioco ignora la pausa
    if (this.inizioDomanda) this.inizioDomanda += durata;
    const ora = performance.now();
    const sospese = this._atteseSospese;
    this._atteseSospese = [];
    const self = this;
    sospese.forEach(function (v) { self.programma(Math.max(0, v.scad - ora), v.azione); });
    if (this.secondi && this.fase !== 'fine') {
      this._timer = setInterval(function () { self.tick(); }, 90);
    }
    this.notifica('riprendi');
  };

  Sessione.prototype.tick = function () {
    if (!this.secondi) return;
    const ora = performance.now();
    this.tempo = Math.max(0, this.secondi - (ora - this._t0) / 1000);
    if (Math.ceil(this.tempo) !== this._ultimoTick) {
      const nuovo = Math.ceil(this.tempo);
      if (nuovo <= 3 && nuovo > 0 && this._ultimoTick > nuovo && typeof Sound !== 'undefined') Sound.sfx.tick();
      this._ultimoTick = nuovo;
      this.notifica('tick');
    }
    if (this.tempo <= 0) {
      if (this.modo.layout === 'turni' && this.turno < this.giocatori.length - 1) {
        this.fermaTimer();
        this.turno += 1;
        this.fase = 'turno';
        this.notifica('turno');
      } else {
        this.fine();
      }
    }
  };

  /** Tempo trascorso dall'inizio della domanda (secondi). */
  Sessione.prototype.tempoRisposta = function () {
    return (performance.now() - (this.inizioDomanda || performance.now())) / 1000;
  };

  /* --------------------------------------------------------------- risposte */
  Sessione.prototype.calcolaPunti = function (g, secondi) {
    let bonus = 0;
    if (g.serie >= 5) bonus = 10; else if (g.serie >= 3) bonus = 5;
    const veloce = Math.max(0, Math.round((8 - secondi * 1.6)));
    return { base: 10, serie: bonus, veloce: veloce, totale: 10 + bonus + veloce };
  };

  /**
   * Registra una risposta.
   * @param {number} i indice giocatore
   * @param {object} risposta {tipo:'nome', valore:note} | {tipo:'posizione', slot}
   * @returns {object} esito {corretto, domanda, giusto, punti, ...}
   */
  Sessione.prototype.rispondi = function (i, risposta) {
    const q = this.domandaDi(i);
    if (!q || this.fase === 'feedback' || this.fase === 'fine') return null;
    const g = this.giocatori[i];
    // il "blocco" dopo un errore vale solo nel testa a testa
    if (g.fase !== 'domanda') return null;
    if (g.bloccato && this.modo.layout === 'race') return null;

    let corretto = false;
    if (risposta.tipo === 'nome') {
      corretto = T.midi(risposta.valore) === T.midi(q.nota);
    } else if (risposta.tipo === 'posizione') {
      corretto = risposta.slot && risposta.slot.midi === T.midi(q.nota);
    }

    const dt = this.tempoRisposta();
    const esito = { corretto: corretto, domanda: q, giocatore: i, tempo: dt, punti: 0 };

    if (corretto) {
      g.serie += 1;
      g.serieMax = Math.max(g.serieMax, g.serie);
      const p = this.calcolaPunti(g, dt);
      g.punti += p.totale;
      g.giusti += 1;
      esito.punti = p;
      if (typeof Sound !== 'undefined') {
        if (g.serie >= 3) Sound.sfx.streak(g.serie); else Sound.sfx.correct();
      }
    } else {
      g.serie = 0;
      g.sbagli += 1;
      g.bloccato = true;
      if (typeof Sound !== 'undefined') Sound.sfx.wrong();
    }
    g.ultimo = esito;
    g.fase = 'feedback';
    // lo storico tiene tutto il necessario per spiegare l'errore a fine partita
    this.storico.push({
      numero: this.storico.length + 1,
      tipo: q.tipo,
      nota: q.nota,
      opzioni: q.opzioni,
      soluzioni: q.soluzioni || null,
      risposta: risposta.tipo === 'nome' ? risposta.valore : null,
      slot: risposta.tipo === 'posizione' ? risposta.slot : null,
      corretto: corretto,
      giocatore: i,
      secondi: Math.round(dt * 10) / 10
    });
    esito.giusto = q.tipo === 'posizione'
      ? q.soluzioni.map(function (r) { return T.describePlacement(r.pl, r.delta); })
      : T.solfegeOttava(q.nota);

    if (this.modo.layout === 'race') {
      const tuttiBloccati = this.giocatori.every(function (x) { return x.bloccato; });
      esito.fineRound = corretto || tuttiBloccati;
      if (esito.fineRound) {
        this.fase = 'feedback';
        const self = this;
        this.programma(1500, function () { self.prossimoRound(); });
      }
      this.notifica('risposta');
    } else if (this.perGiocatore) {
      // ogni giocatore procede per conto suo: la risposta di uno non ferma l'altro
      this.notifica('risposta');
      const attesa = corretto ? 480 : 1000;
      const self = this;
      this.programma(attesa, function () { self.prossima(i); });
    } else {
      this.fase = 'feedback';
      this.notifica('risposta');
      const attesa = corretto ? (this.secondi ? 420 : 900) : (this.secondi ? 900 : 1400);
      const self = this;
      this.programma(attesa, function () { self.prossima(i); });
    }
    return esito;
  };

  /** Avanza dopo un feedback (solo layout non-race). */
  Sessione.prototype.prossima = function (i) {
    if (this.fase === 'fine' || this.inPausa) return;
    this.fase = 'domanda';
    if (this.totale) {
      if (this.perGiocatore) {
        this.giocatori[i].domanda = null;
      } else {
        this.indice += 1;
        if (this.indice >= this.totale) return this.fine();
      }
      this.nuovaDomanda(i);
    } else {
      this.nuovaDomanda(i);
    }
  };

  /** Usata dal layout "testa a testa" per passare al round successivo. */
  Sessione.prototype.prossimoRound = function () {
    if (this.fase === 'fine' || this.inPausa) return;
    this.giocatori.forEach(function (g) { g.bloccato = false; g.ultimo = null; });
    this.indice += 1;
    this.nuovaDomanda(0);
    this.notifica('round');
  };

  /* ------------------------------------------------------------------- fine */
  Sessione.prototype.fine = function () {
    if (this.fase === 'fine') return;
    this.fase = 'fine';
    this.fermaTimer();
    this.risultato = this.calcolaRisultato();
    if (typeof Sound !== 'undefined') Sound.sfx.win();
    this.notifica('fine');
  };

  Sessione.prototype.interrompi = function () {
    this.fermaTimer();
    this.fase = 'fine';
    this.risultato = this.calcolaRisultato();
    this.notifica('interrotto');
  };

  Sessione.prototype.calcolaRisultato = function () {
    const gs = this.giocatori.map(function (g) {
      const tot = g.giusti + g.sbagli;
      return {
        nome: g.nome, punti: g.punti, giusti: g.giusti, sbagli: g.sbagli,
        serieMax: g.serieMax, precisione: tot ? Math.round(g.giusti / tot * 100) : 0
      };
    });
    let vincitore = 0, pareggio = false;
    if (gs.length > 1) {
      const ord = gs.slice().sort(function (a, b) {
        return (b.punti - a.punti) || (b.giusti - a.giusti);
      });
      pareggio = ord[0].punti === ord[1].punti && ord[0].giusti === ord[1].giusti;
      vincitore = pareggio ? -1 : gs.indexOf(ord[0]);
    }
    return {
      modo: this.modo, livello: this.chiaveLivello, giocatori: gs,
      vincitore: vincitore, pareggio: pareggio, perGiocatore: this.perGiocatore,
      domande: this.storico.length
    };
  };

  Sessione.prototype.stato = function () {
    return {
      modo: this.modo, fase: this.fase, tempo: this.tempo, secondi: this.secondi,
      indice: this.indice, totale: this.totale, turno: this.turno,
      giocatori: this.giocatori, domanda: this.domanda, perGiocatore: this.perGiocatore
    };
  };

  /* ---------------------------------------------------------------- medaglie */
  function medaglia(precisione, punti) {
    const it = T.getLingua() !== 'en';
    if (precisione >= 95 && punti >= 120) {
      return { n: 3, nome: it ? 'Violino d\'oro' : 'Gold violin', icona: '🥇' };
    }
    if (precisione >= 80) {
      return { n: 2, nome: it ? 'Violino d\'argento' : 'Silver violin', icona: '🥈' };
    }
    if (precisione >= 55) {
      return { n: 1, nome: it ? 'Violino di bronzo' : 'Bronze violin', icona: '🥉' };
    }
    return { n: 0, nome: it ? 'Ancora un po\' di studio' : 'A little more practice', icona: '🎯' };
  }

  /* ------------------------------------------------- riepilogo degli errori */
  /* Analizza ogni risposta sbagliata e prova a spiegare che tipo di sbaglio è
     stato: ottava, alterazione, riga del pentagramma, corda, dito… */
  const CATEGORIE = {
    it: {
      ottava: {
        titolo: 'Stesso nome, ottava diversa',
        rimedio: 'Il nome è giusto ma la nota è più acuta o più grave: guarda quanto in alto sta la testa della nota sul pentagramma.'
      },
      alterazione: {
        titolo: 'Alterazione sbagliata',
        rimedio: 'Il ♯ alza di un semitono e il ♭ lo abbassa: sul violino il dito si sposta appena, restando sulla stessa corda.'
      },
      pentagramma: {
        titolo: 'Riga o spazio sbagliato',
        rimedio: 'Conta righe e spazi partendo dal Mi4, che sta sulla 1ª riga in basso: ogni gradino è una riga o uno spazio.'
      },
      semitono: {
        titolo: 'Nota a un semitono di distanza',
        rimedio: 'Sono due note vicinissime: sul manico le separa una sola pallina.'
      },
      lontana: {
        titolo: 'Nota molto diversa',
        rimedio: 'Prima di rispondere guarda dove sta la nota sul pentagramma, poi decidi il nome.'
      },
      corda: {
        titolo: 'Corda sbagliata',
        rimedio: 'Le corde sono Sol, Re, La, Mi: dalla più grave alla più acuta si sale di cinque note.'
      },
      dito: {
        titolo: 'Dito sbagliato',
        rimedio: 'Ogni pallina è un semitono: conta i semitoni dalla corda vuota fino alla nota.'
      }
    },
    en: {
      ottava: {
        titolo: 'Same name, different octave',
        rimedio: 'The name is right but the note is higher or lower: check how high the note head sits on the staff.'
      },
      alterazione: {
        titolo: 'Wrong accidental',
        rimedio: 'A ♯ raises the note by a semitone and a ♭ lowers it: on the violin the finger moves only slightly, on the same string.'
      },
      pentagramma: {
        titolo: 'Wrong line or space',
        rimedio: 'Count lines and spaces starting from E4 on the bottom line: every step is one line or one space.'
      },
      semitono: {
        titolo: 'A semitone away',
        rimedio: 'These two notes are very close: on the fingerboard only one dot separates them.'
      },
      lontana: {
        titolo: 'A very different note',
        rimedio: 'Before answering, look at where the note sits on the staff, then decide its name.'
      },
      corda: {
        titolo: 'Wrong string',
        rimedio: 'The strings are G, D, A, E: from the lowest to the highest you go up by five notes.'
      },
      dito: {
        titolo: 'Wrong finger',
        rimedio: 'Every dot is a semitone: count the semitones from the open string up to the note.'
      }
    }
  };

  const NOMI_TIPO = {
    it: { nome: 'Leggi la nota', posizione: 'Trova la posizione', orecchio: 'Orecchio musicale', brano: 'Brani classici', eroe: 'Violin Hero' },
    en: { nome: 'Read the note', posizione: 'Find the position', orecchio: 'Ear training', brano: 'Classical pieces', eroe: 'Violin Hero' }
  };

  /* Frasi delle spiegazioni, per lingua. */
  const FRASI = {
    it: {
      nonSuonabile: 'non suonabile in questa posizione',
      nessunaRisposta: 'nessuna risposta',
      nonToccato: 'Non hai toccato nessun punto del manico.',
      nonScelto: 'Non hai scelto nessun nome.',
      puntoImprecisato: 'punto imprecisato',
      corda: function (c, nota, cg, dove) {
        return 'Hai toccato la corda ' + c + ', ma ' + nota + ' si suona sulla corda ' + cg + ' (' + dove + ').';
      },
      dito: function (nota, dove, scelto) {
        return 'Corda giusta, punto sbagliato: ' + nota + ' si suona con il ' + dove +
          ', mentre tu hai toccato il ' + scelto + '.';
      },
      ottava: function (scelta, giusta, dove) {
        return 'Hai scelto ' + scelta + ' invece di ' + giusta + ': stesso nome, ottava diversa. ' +
          giusta + ' si suona con ' + dove + '.';
      },
      alterazioneManca: function (alter) {
        return 'mancava l\'alterazione (' + alter + ').';
      },
      alterazioneExtra: function () { return 'l\'alterazione non ci voleva.'; },
      alterazione: function (scelta, giusta, pezzo, dove) {
        return 'Hai scelto ' + scelta + ' invece di ' + giusta + ': ' + pezzo + ' ' + giusta +
          ' si suona con ' + dove + '.';
      },
      pentagramma: function (scelta, giusta, alto, dove) {
        return 'Hai letto ' + scelta + ' invece di ' + giusta + ': sono su riga e spazio vicini. ' +
          giusta + ' sta ' + (alto ? 'un gradino più in alto' : 'un gradino più in basso') +
          ' e si suona con ' + dove + '.';
      },
      semitono: function (scelta, giusta, n, dove) {
        return 'Hai scelto ' + scelta + ' invece di ' + giusta + ': ' +
          (n === 1 ? 'un semitono' : 'due semitoni') + ' di differenza. ' + giusta +
          ' si suona con ' + dove + '.';
      },
      lontana: function (scelta, giusta, n, dove) {
        return 'Hai scelto ' + scelta + ' invece di ' + giusta + ' (' + n + ' semitoni di distanza). ' +
          giusta + ' si suona con ' + dove + '.';
      }
    },
    en: {
      nonSuonabile: 'not playable in this position',
      nessunaRisposta: 'no answer',
      nonToccato: 'You did not tap any spot on the fingerboard.',
      nonScelto: 'You did not choose a name.',
      puntoImprecisato: 'an unclear spot',
      corda: function (c, nota, cg, dove) {
        return 'You tapped the ' + c + ' string, but ' + nota + ' is played on the ' + cg +
          ' string (' + dove + ').';
      },
      dito: function (nota, dove, scelto) {
        return 'Right string, wrong spot: ' + nota + ' is played with the ' + dove +
          ', but you tapped the ' + scelto + '.';
      },
      ottava: function (scelta, giusta, dove) {
        return 'You chose ' + scelta + ' instead of ' + giusta + ': same name, different octave. ' +
          giusta + ' is played with ' + dove + '.';
      },
      alterazioneManca: function (alter) {
        return 'the accidental was missing (' + alter + ').';
      },
      alterazioneExtra: function () { return 'there should be no accidental.'; },
      alterazione: function (scelta, giusta, pezzo, dove) {
        return 'You chose ' + scelta + ' instead of ' + giusta + ': ' + pezzo + ' ' + giusta +
          ' is played with ' + dove + '.';
      },
      pentagramma: function (scelta, giusta, alto, dove) {
        return 'You read ' + scelta + ' instead of ' + giusta + ': they sit on a neighbouring line and space. ' +
          giusta + ' is one step ' + (alto ? 'higher' : 'lower') +
          ' and is played with ' + dove + '.';
      },
      semitono: function (scelta, giusta, n, dove) {
        return 'You chose ' + scelta + ' instead of ' + giusta + ': ' +
          (n === 1 ? 'one semitone' : 'two semitones') + ' apart. ' + giusta +
          ' is played with ' + dove + '.';
      },
      lontana: function (scelta, giusta, n, dove) {
        return 'You chose ' + scelta + ' instead of ' + giusta + ' (' + n + ' semitones apart). ' +
          giusta + ' is played with ' + dove + '.';
      }
    }
  };

  function frasi() { return FRASI[T.getLingua()] || FRASI.it; }

  function categoria(nome) {
    const tab = CATEGORIE[T.getLingua()] || CATEGORIE.it;
    return tab[nome] || tab.lontana;
  }

  /** Descrizione breve del dito: "2º dito alto", "corda vuota" / "2nd finger high". */
  function ditoCompatto(pl, delta) {
    const it = T.getLingua() !== 'en';
    if (!pl || pl.open) return T.fingerName(0);
    const variante = delta > 0 ? (it ? ' alto' : ' high') : delta < 0 ? (it ? ' basso' : ' low') : '';
    const pos = pl.position > 1 ? ' — ' + T.posizioneTesto(pl.position) : '';
    return (it ? pl.finger + 'º dito' : T.dita()[pl.finger]) + variante + pos;
  }

  function analizzaErrore(v, s) {
    const F = frasi();
    const L = T.LEVELS[s.chiaveLivello] || T.LEVELS.ragazzi;
    const giusta = v.nota;
    const pls = T.placementsFor(giusta, L.maxPosition);
    const dove = pls.length ? T.describePlacement(pls[0].pl, pls[0].delta) : F.nonSuonabile;
    const altrove = pls.slice(1, 3).map(function (r) { return T.describePlacement(r.pl, r.delta); });

    const voce = {
      numero: v.numero,
      tipo: v.tipo,
      tipoNome: (NOMI_TIPO[T.getLingua()] || NOMI_TIPO.it)[v.tipo] || v.tipo,
      nota: giusta,
      nomeGiusto: T.solfege(giusta),
      nomeGiustoOttava: T.solfegeOttava(giusta),
      nomeGiustoEsteso: T.solfegeEsteso(giusta),
      dove: dove,
      altrove: altrove,
      frequenzaGiusta: Math.round(T.freq(giusta) * 10) / 10,
      notaScelta: null,
      tuaRisposta: null,
      categoria: 'lontana',
      titolo: categoria('lontana').titolo,
      spiegazione: '',
      rimedio: categoria('lontana').rimedio,
      ascolta: [T.midi(giusta)],
      ascoltaNomi: [T.solfegeOttava(giusta)]
    };

    /* ---- errore sul manico: corda o dito ---- */
    if (v.tipo === 'posizione') {
      const scelto = v.slot;
      if (!scelto) {
        voce.categoria = 'dito';
        voce.tuaRisposta = F.nessunaRisposta;
        voce.spiegazione = F.nonToccato;
      } else {
        const cordaScelta = T.stringOf(scelto.stringId);
        const cordaGiusta = pls.length ? T.stringOf(pls[0].pl.stringId) : null;
        const ditoScelto = scelto.primary ? ditoCompatto(scelto.primary.pl, scelto.primary.delta) : F.puntoImprecisato;
        voce.tuaRisposta = T.solfege(T.fromMidi(scelto.midi, false)) + ' (' + ditoScelto + ')';
        voce.notaScelta = T.fromMidi(scelto.midi, false);
        voce.frequenzaScelta = Math.round(T.freqMidi(scelto.midi) * 10) / 10;
        voce.ascolta = [T.midi(giusta), scelto.midi];
        voce.ascoltaNomi = [T.solfegeOttava(giusta), T.solfege(T.fromMidi(scelto.midi, false))];
        if (cordaGiusta && scelto.stringId !== cordaGiusta.id) {
          voce.categoria = 'corda';
          voce.spiegazione = F.corda(T.nomeCorda(cordaScelta), T.solfegeOttava(giusta),
            T.nomeCorda(cordaGiusta), dove);
        } else {
          voce.categoria = 'dito';
          voce.spiegazione = F.dito(T.solfegeOttava(giusta), dove, ditoScelto);
        }
      }
      voce.titolo = categoria(voce.categoria).titolo;
      voce.rimedio = categoria(voce.categoria).rimedio;
      return voce;
    }

    /* ---- errore di nome (letto o ascoltato) ---- */
    const scelta = v.risposta;
    if (!scelta) {
      voce.tuaRisposta = F.nessunaRisposta;
      voce.spiegazione = F.nonScelto;
      return voce;
    }
    voce.tuaRisposta = T.solfege(scelta);
    voce.notaScelta = scelta;
    voce.frequenzaScelta = Math.round(T.freq(scelta) * 10) / 10;
    if (T.midi(scelta) !== T.midi(giusta)) {
      voce.ascolta = [T.midi(giusta), T.midi(scelta)];
      voce.ascoltaNomi = [T.solfegeOttava(giusta), T.solfegeOttava(scelta)];
    }

    const stessaLettera = scelta.letter === giusta.letter;
    if (stessaLettera && scelta.alter === giusta.alter) {
      voce.categoria = 'ottava';
      voce.spiegazione = F.ottava(T.solfegeOttava(scelta), T.solfegeOttava(giusta), dove);
    } else if (stessaLettera) {
      voce.categoria = 'alterazione';
      const manca = (giusta.alter !== 0 && scelta.alter === 0);
      const alter = T.getLingua() === 'en'
        ? (giusta.alter > 0 ? '♯ sharp' : '♭ flat')
        : (giusta.alter > 0 ? '♯ diesis' : '♭ bemolle');
      voce.spiegazione = F.alterazione(T.solfege(scelta), T.solfegeOttava(giusta),
        manca ? F.alterazioneManca(alter) : F.alterazioneExtra(), dove);
    } else {
      const distanza = Math.abs(T.midi(giusta) - T.midi(scelta));
      const gradini = Math.abs(T.staffStep(giusta) - T.staffStep(scelta));
      if (gradini === 1) {
        voce.categoria = 'pentagramma';
        voce.spiegazione = F.pentagramma(T.solfege(scelta), T.solfegeOttava(giusta),
          T.staffStep(giusta) > T.staffStep(scelta), dove);
      } else if (distanza <= 2) {
        voce.categoria = 'semitono';
        voce.spiegazione = F.semitono(T.solfege(scelta), T.solfegeOttava(giusta), distanza, dove);
      } else {
        voce.categoria = 'lontana';
        voce.spiegazione = F.lontana(T.solfege(scelta), T.solfegeOttava(giusta), distanza, dove);
      }
    }
    voce.titolo = categoria(voce.categoria).titolo;
    voce.rimedio = categoria(voce.categoria).rimedio;
    return voce;
  }

  /**
   * Riepilogo degli errori di una sessione, pronto da mostrare.
   * @returns {object} {totale, giuste, sbagliate, precisione, piuFrequente, voci[]}
   */
  function riepilogaErrori(sessione) {
    if (!sessione) return null;
    const tutte = sessione.storico || [];
    const errori = tutte.filter(function (v) { return !v.corretto; });
    const voci = errori.map(function (v) { return analizzaErrore(v, sessione); });

    const conteggio = {};
    voci.forEach(function (v) { conteggio[v.categoria] = (conteggio[v.categoria] || 0) + 1; });
    let piuFrequente = null;
    Object.keys(conteggio).forEach(function (k) {
      if (conteggio[k] < 2) return;   // con un solo caso non è "il più frequente"
      if (!piuFrequente || conteggio[k] > piuFrequente.conteggio) {
        piuFrequente = { chiave: k, titolo: categoria(k).titolo, rimedio: categoria(k).rimedio, conteggio: conteggio[k] };
      }
    });

    const giuste = tutte.length - errori.length;
    return {
      totale: tutte.length,
      giuste: giuste,
      sbagliate: errori.length,
      precisione: tutte.length ? Math.round(giuste / tutte.length * 100) : 0,
      piuFrequente: piuFrequente,
      voci: voci,
      modo: sessione.modo,
      livello: sessione.chiaveLivello
    };
  }

  return {
    MODI: MODI, ORDINE: ORDINE, TASTI: TASTI,
    Sessione: Sessione, medaglia: medaglia,
    riepilogaErrori: riepilogaErrori, CATEGORIE: CATEGORIE,
    nomeModo: nomeModo, descModo: descModo, aiutoModo: aiutoModo
  };
})();
