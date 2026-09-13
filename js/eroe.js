/* ==========================================================================
   eroe.js — "Violin Hero": le note del brano cadono e vanno suonate a tempo
   Quattro corsie, una per corda (Sol, Re, La, Mi). Ogni nota cade nella corsia
   della corda su cui si suona davvero, quindi si impara l'associazione
   nota → corda mentre si sta a tempo.

   Il motore non conosce il DOM: costruisce le note e calcola i punteggi.
   Il disegno e le animazioni stanno in `disegna()` e usano il DOM.
   ========================================================================== */
window.Eroe = (function () {
  'use strict';

  const T = window.Theory;

  const FINESTRA_PERFETTO = 0.09;   // secondi
  const FINESTRA_BUONO = 0.19;
  const CADUTA = 2.4;               // secondi che una nota impiega a cadere
  const CONTO_INIZIALE = 4;         // battiti di conteggio prima di suonare

  /* --------------------------------------------------------------- costruttore */
  function Gioco(cfg) {
    cfg = cfg || {};
    this.brano = cfg.brano || null;
    this.modo = cfg.modo || null;
    this.chiaveLivello = cfg.livello || 'ragazzi';
    this.livello = T.LEVELS[this.chiaveLivello] || T.LEVELS.ragazzi;
    this.velocita = cfg.velocita || this.livello.velocitaEroe || 1;
    this.hooks = cfg.hooks || {};
    this.corsie = T.STRINGS.map(function (s) { return s.id; });   // G D A E
    this.nomeGiocatore = (cfg.nomi && cfg.nomi[0]) || (T.getLingua() === 'en' ? 'Player 1' : 'Giocatore 1');

    this.note = this.preparaNote();
    this.stato = 'pronto';        // pronto | conteggio | gioco | fine
    this.punti = 0;
    this.giusti = 0;
    this.sbagli = 0;
    this.serie = 0;
    this.serieMax = 0;
    this.storico = [];
    this.ultimo = null;           // ultimo esito, per il feedback a schermo
    this._raf = null;
    this._t0 = 0;
    this._finestra = null;
  }

  /** Trasforma le note del brano in note che cadono, con corda e tempo. */
  Gioco.prototype.preparaNote = function () {
    if (!this.brano) return [];
    const bpm = (this.brano.bpm || 90) * this.velocita;
    this.battito = 60 / bpm;
    let battiti = 0;
    const self = this;
    return this.brano.note.map(function (n) {
      const nota = T.daNome(n[0]);
      const scelte = T.placementsFor(nota, 1);
      const prima = scelte.length ? scelte[0] : null;
      const voce = {
        nota: nota,
        durata: n[1],
        corda: prima ? prima.pl.stringId : self.corsie[0],
        battito: battiti,
        tempo: 0,                 // riempito all'avvio (in secondi dall'inizio)
        stato: 'attesa',          // attesa | presa | mancata
        esito: null
      };
      battiti += n[1];
      return voce;
    });
  };

  /** Durata totale del brano in secondi, conto iniziale escluso. */
  Gioco.prototype.durata = function () {
    const ultima = this.note.length ? this.note[this.note.length - 1] : null;
    return ultima ? (ultima.battito + ultima.durata) * this.battito : 0;
  };

  /* ----------------------------------------------------------------- avvio */
  Gioco.prototype.collega = function (dom) { this.dom = dom; };

  Gioco.prototype.avvia = function () {
    const ora = performance.now() / 1000;
    this._t0 = ora + CONTO_INIZIALE * this.battito;
    const self = this;
    this.note.forEach(function (n) { n.tempo = self._t0 + n.battito * self.battito; });
    this.inizio = ora;
    this.stato = 'conteggio';
    this._ultimoBattito = -1;
    this._raf = requestAnimationFrame(function () { self.passo(); });
    this.notifica('avvio');
  };

  Gioco.prototype.notifica = function (evento) {
    if (this.hooks.onChange) this.hooks.onChange(this, evento);
  };

  /* ------------------------------------------------------------------ pausa */
  /* Serve al riepilogo degli errori: le note restano ferme dove sono. */
  Gioco.prototype.pausa = function () {
    if (this.stato === 'fine' || this._pausa) return;
    this._pausa = true;
    this._pausaInizio = performance.now() / 1000;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  Gioco.prototype.riprendi = function () {
    if (!this._pausa) return;
    const durata = performance.now() / 1000 - this._pausaInizio;
    this._t0 += durata;
    this.note.forEach(function (n) { n.tempo += durata; });
    this._pausa = false;
    const self = this;
    this._raf = requestAnimationFrame(function () { self.passo(); });
    this.notifica('riprendi');
  };

  /* ------------------------------------------------------------ ciclo di gioco */
  Gioco.prototype.passo = function () {
    const self = this;
    if (this.stato === 'fine') return;
    const ora = performance.now() / 1000;
    this.ora = ora;
    this.disegna();

    if (ora >= this._t0) this.stato = 'gioco';

    // battito di conteggio
    if (this.stato === 'conteggio') {
      const b = Math.floor((ora - (this._t0 - CONTO_INIZIALE * this.battito)) / this.battito);
      if (b !== this._ultimoBattito && b >= 0 && b < CONTO_INIZIALE) {
        this._ultimoBattito = b;
        if (typeof Sound !== 'undefined') Sound.sfx.tick();
      }
    }

    // note non suonate entro la finestra
    this.note.forEach(function (n) {
      if (n.stato !== 'attesa') return;
      if (ora - n.tempo > FINESTRA_BUONO) self.registra(n, false, null);
    });

    if (this.note.every(function (n) { return n.stato !== 'attesa'; })) {
      this.fine();
      return;
    }
    this._raf = requestAnimationFrame(function () { self.passo(); });
  };

  /** Il giocatore preme una corsia. */
  Gioco.prototype.premi = function (corda) {
    const ora = performance.now() / 1000;
    // lo stato si aggiorna anche qui: se il ciclo di disegno è fermo
    // (scheda in secondo piano) la partita deve comunque rispondere
    if (this.stato === 'conteggio' && ora >= this._t0) this.stato = 'gioco';
    if (this.stato !== 'gioco') return null;
    // la nota più vicina nel tempo, in questa corsia
    let scelta = null, migliore = Infinity;
    this.note.forEach(function (n) {
      if (n.stato !== 'attesa' || n.corda !== corda) return;
      const d = Math.abs(n.tempo - ora);
      if (d < migliore) { migliore = d; scelta = n; }
    });
    if (!scelta || migliore > FINESTRA_BUONO) {
      // tocco a vuoto: non toglie punti, ma non interrompe la serie
      if (this.dom) this.lampeggia(corda, false);
      return null;
    }
    const perfetto = migliore <= FINESTRA_PERFETTO;
    this.registra(scelta, true, perfetto, corda);
    if (this.dom) this.lampeggia(corda, true);
    return { perfetto: perfetto, nota: scelta.nota, corda: corda };
  };

  /** Registra l'esito di una nota (presa, mancata). */
  Gioco.prototype.registra = function (n, presa, perfetto, cordaPremuta) {
    n.stato = presa ? 'presa' : 'mancata';
    n.esito = presa ? (perfetto ? 'perfetto' : 'buono') : 'mancato';

    if (presa) {
      this.serie += 1;
      this.serieMax = Math.max(this.serieMax, this.serie);
      const bonus = this.serie >= 10 ? 60 : this.serie >= 5 ? 30 : this.serie >= 3 ? 15 : 0;
      const base = perfetto ? 100 : 50;
      n.punti = base + bonus;
      this.punti += n.punti;
      this.giusti += 1;
      if (typeof Sound !== 'undefined') {
        // si sente la nota del brano: suonando bene si costruisce la melodia
        Sound.playMidi(T.midi(n.nota), 0.9, { gain: perfetto ? 0.95 : 0.8 });
      }
    } else {
      this.serie = 0;
      this.sbagli += 1;
      n.punti = 0;
      if (typeof Sound !== 'undefined') Sound.sfx.wrong();
    }
    this.ultimo = { nota: n.nota, esito: n.esito };
    this.notifica('nota');

    // per il riepilogo degli errori: come se si fosse toccato il manico
    const slot = cordaPremuta ? this.slotDi(cordaPremuta, n) : null;
    this.storico.push({
      numero: this.storico.length + 1,
      tipo: 'posizione',
      nota: n.nota,
      opzioni: [],
      soluzioni: T.placementsFor(n.nota, 1),
      risposta: null,
      slot: slot,
      corretto: !!presa,
      giocatore: 0,
      secondi: 0
    });
  };

  /** Costruisce lo "slot" corrispondente alla corda premuta, per l'analisi. */
  Gioco.prototype.slotDi = function (corda, n) {
    const s = T.stringOf(corda);
    if (!s) return null;
    const openMidi = T.midi(s.open);
    const semis = T.midi(n.nota) - openMidi;
    const scelte = T.placementsFor(n.nota, 1).filter(function (r) { return r.pl.stringId === corda; });
    const prim = scelte.length ? scelte[0] : null;
    return {
      stringId: corda, semis: semis, midi: openMidi + semis,
      primary: prim ? { pl: prim.pl, delta: prim.delta } : null
    };
  };

  /* ------------------------------------------------------------------ fine */
  Gioco.prototype.fine = function () {
    if (this.stato === 'fine') return;
    this.stato = 'fine';
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (typeof Sound !== 'undefined') {
      if (this.giusti > this.sbagli) Sound.sfx.win(); else Sound.sfx.lose();
    }
    this.risultato = this.calcolaRisultato();
    this.notifica('fine');
  };

  Gioco.prototype.interrompi = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this.stato = 'fine';
    this.risultato = this.calcolaRisultato();
    this.notifica('interrotto');
  };

  Gioco.prototype.calcolaRisultato = function () {
    const tot = this.giusti + this.sbagli;
    return {
      modo: this.modo,
      livello: this.chiaveLivello,
      brano: this.brano,
      perGiocatore: false,
      vincitore: 0,
      pareggio: false,
      domande: this.storico.length,
      giocatori: [{
        nome: this.nomeGiocatore,
        punti: this.punti,
        giusti: this.giusti,
        sbagli: this.sbagli,
        serieMax: this.serieMax,
        precisione: tot ? Math.round(this.giusti / tot * 100) : 0
      }]
    };
  };

  /* -------------------------------------------------------------- disegno */
  /** Costruisce la pista e restituisce gli elementi utili all'animazione. */
  function costruisci(contenitore, gioco) {
    const stringhe = gioco.corsie.map(function (id) {
      const s = T.stringOf(id);
      return '<div class="eroe-corsia" data-corda="' + id + '" style="--corda:' + s.color + '">' +
        '<span class="eroe-corda-nome">' + T.nomeCorda(id) + '</span></div>';
    }).join('');
    const tasti = gioco.corsie.map(function (id, i) {
      const s = T.stringOf(id);
      return '<button class="eroe-tasto" data-corda="' + id + '" style="--corda:' + s.color + '">' +
        '<span class="eroe-tasto-corda">' + T.nomeCorda(id) + '</span>' +
        '<span class="eroe-tasto-num">' + (i + 1) + '</span></button>';
    }).join('');
    contenitore.innerHTML =
      '<div class="eroe-hud">' +
      '<span class="eroe-pezzo">' + (gioco.brano ? Brani.titolo(gioco.brano) : '') + '</span>' +
      '<span class="eroe-punti"><b>' + gioco.punti + '</b></span>' +
      '<span class="eroe-serie">🔥 <b>' + gioco.serie + '</b></span>' +
      '</div>' +
      '<div class="eroe-pista" id="eroe-pista">' +
      '<div class="eroe-corsie">' + stringhe + '</div>' +
      '<div class="eroe-linea"></div>' +
      '<div class="eroe-suggerimento" id="eroe-suggerimento"></div>' +
      '</div>' +
      '<div class="eroe-tasti-riga">' + tasti + '</div>';

    gioco._pista = contenitore.querySelector('#eroe-pista');
    gioco._corsie = {};
    gioco.corsie.forEach(function (id) {
      gioco._corsie[id] = contenitore.querySelector('.eroe-corsia[data-corda="' + id + '"]');
    });
    gioco._hud = {
      punti: contenitore.querySelector('.eroe-punti b'),
      serie: contenitore.querySelector('.eroe-serie b'),
      sug: contenitore.querySelector('#eroe-suggerimento')
    };
    // le note cadono come elementi dentro la corsia
    gioco.note.forEach(function (n, i) {
      const el = document.createElement('div');
      el.className = 'eroe-nota';
      el.innerHTML = '<span class="eroe-nota-nome">' + T.solfege(n.nota) + '</span>';
      gioco._corsie[n.corda].appendChild(el);
      n._el = el;
      n._i = i;
    });
    contenitore.querySelectorAll('.eroe-tasto').forEach(function (b) {
      const corda = b.getAttribute('data-corda');
      const premi = function (ev) {
        ev.preventDefault();
        gioco.premi(corda);
        b.classList.add('premuto');
        setTimeout(function () { b.classList.remove('premuto'); }, 90);
      };
      b.addEventListener('pointerdown', premi);
    });
    gioco.dom = contenitore;
    return gioco;
  }

  /** Aggiorna le posizioni: chiamata a ogni fotogramma. */
  Gioco.prototype.disegna = function () {
    const pista = this._pista;
    if (!pista) return;   // nessun disegno (per esempio nei test senza DOM)
    const altezza = pista.clientHeight;
    const linea = altezza - 74;                 // la linea di battuta, dal basso
    const ora = this.ora;
    this.note.forEach(function (n) {
      if (!n._el) return;
      if (n.stato !== 'attesa') {
        if (n._el.style.display !== 'none') {
          n._el.style.display = 'none';
          if (n.stato === 'presa') {
            n._el.classList.add('presa');
          }
        }
        return;
      }
      const dt = n.tempo - ora;
      const y = linea - (dt / CADUTA) * linea;
      n._el.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
      n._el.classList.toggle('vicina', Math.abs(dt) < FINESTRA_BUONO);
    });
    if (this._hud) {
      this._hud.punti.textContent = this.punti;
      this._hud.serie.textContent = this.serie;
      if (this.stato === 'conteggio') {
        this._hud.sug.textContent = Math.max(1, Math.ceil(this._t0 - ora));
      } else if (this.ultimo) {
        this._hud.sug.textContent = this.ultimo.esito === 'perfetto' ? '✓ perfetto' :
          this.ultimo.esito === 'buono' ? '✓ buono' : '✗ ' + T.solfege(this.ultimo.nota);
      }
    }
  };

  Gioco.prototype.lampeggia = function (corda, bene) {
    const c = this._corsie && this._corsie[corda];
    if (!c) return;
    c.classList.add(bene ? 'lampo-bene' : 'lampo-male');
    setTimeout(function () { c.classList.remove('lampo-bene', 'lampo-male'); }, 120);
  };

  /** Crea il gioco dentro un contenitore e avvia il ciclo. */
  function avvia(contenitore, cfg) {
    const g = new Gioco(cfg);
    costruisci(contenitore, g);
    g.avvia();
    return g;
  }

  return { Gioco: Gioco, avvia: avvia, CADUTA: CADUTA };
})();
