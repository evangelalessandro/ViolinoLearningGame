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
  const BPM_BASE = 90;              // tempo usato se il brano non ne dichiara uno

  /* Il tempo del brano si può cambiare: 1× è il tempo scritto, 0,5× è la metà
     (per studiare le note difficili) e 1,6× è più veloce del tempo scritto. */
  const VEL_MIN = 0.5;
  const VEL_MAX = 1.6;
  const VEL_PASSO = 0.05;
  const VELOCITA = (function () {
    const v = [];
    for (let x = VEL_MIN; x <= VEL_MAX + 1e-9; x += VEL_PASSO) v.push(Math.round(x * 100) / 100);
    return v;
  })();

  /** Riporta una velocità qualsiasi a uno degli scatti consentiti. */
  function normalizzaVelocita(v) {
    const n = Number(v);
    if (!isFinite(n)) return 1;
    const scatti = Math.round(n / VEL_PASSO);
    return Math.min(VEL_MAX, Math.max(VEL_MIN, Math.round(scatti * VEL_PASSO * 100) / 100));
  }

  /** Testo tradotto (i18n.js è caricato prima di questo file). */
  function tr(chiave, vars) {
    return (window.I18n && window.I18n.t) ? window.I18n.t(chiave, vars) : chiave;
  }

  /* --------------------------------------------------------------- costruttore */
  function Gioco(cfg) {
    cfg = cfg || {};
    this.brano = cfg.brano || null;
    this.modo = cfg.modo || null;
    this.chiaveLivello = cfg.livello || 'ragazzi';
    this.livello = T.LEVELS[this.chiaveLivello] || T.LEVELS.ragazzi;
    this.velocita = normalizzaVelocita(cfg.velocita == null
      ? (this.livello.velocitaEroe || 1) : cfg.velocita);
    this.bpmBase = (this.brano && this.brano.bpm) || BPM_BASE;
    this._velocitaAttesa = null;
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
    const bpm = this.bpmBase * this.velocita;
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

  /* -------------------------------------------------------------- velocità */
  /**
   * Cambia il tempo del brano (1 = tempo scritto) senza far saltare le note:
   * si conserva la posizione in battiti, quindi la nota che sta arrivando sulla
   * linea resta lì e le altre si avvicinano o si allontanano in proporzione.
   * @param {number} v velocità desiderata (viene riportata agli scatti previsti)
   * @returns {number} la velocità effettiva
   */
  Gioco.prototype.impostaVelocita = function (v) {
    const nuova = normalizzaVelocita(v);
    // durante la pausa l'orologio è fermo: si applica alla ripresa
    if (this._pausa) {
      this._velocitaAttesa = nuova;
      this.aggiornaTempo();
      return this.velocita;
    }
    if (nuova === this.velocita) {
      this.aggiornaTempo();
      return this.velocita;
    }
    const vecchio = this.battito;
    const ora = performance.now() / 1000;
    const partito = this._t0 > 0 && this.stato !== 'pronto';
    const posizione = partito ? (ora - this._t0) / vecchio : 0;   // in battiti
    this.velocita = nuova;
    this.battito = 60 / (this.bpmBase * nuova);
    if (partito) {
      this._t0 = ora - posizione * this.battito;
      const self = this;
      this.note.forEach(function (n) {
        if (n.stato === 'attesa') n.tempo = self._t0 + n.battito * self.battito;
      });
    }
    this.aggiornaTempo();
    this.notifica('tempo');
    return this.velocita;
  };

  /** Alza o abbassa il tempo di `passi` scatti (per i pulsanti − e +). */
  Gioco.prototype.cambiaVelocita = function (passi) {
    return this.impostaVelocita((this._velocitaAttesa || this.velocita) + passi * VEL_PASSO);
  };

  /** Aggiorna il comando del tempo (cursore ed etichetta), se c'è. */
  Gioco.prototype.aggiornaTempo = function () {
    const h = this._hud;
    if (!h) return;
    const v = this._velocitaAttesa || this.velocita;
    if (h.tempoCursore) h.tempoCursore.value = v;
    if (h.tempoVal) {
      const loc = (T.getLingua() === 'en') ? 'en-GB' : 'it-IT';
      h.tempoVal.textContent = tr('eroe.tempoVal', {
        // 0,75 in italiano e 0.75 in inglese, come il resto dell'app
        v: Number(v.toFixed(2)).toLocaleString(loc, { maximumFractionDigits: 2 }),
        bpm: Math.round(this.bpmBase * v)
      });
    }
  };

  /** Riscrive le etichette della pista quando cambia la lingua (la partita continua). */
  Gioco.prototype.aggiornaTesti = function () {
    if (!this.dom) return;
    const self = this;
    const pezzo = this.dom.querySelector('.eroe-pezzo');
    if (pezzo && this.brano) pezzo.textContent = Brani.titolo(this.brano);
    const nomeT = this.dom.querySelector('.eroe-tempo-nome');
    if (nomeT) nomeT.textContent = tr('eroe.tempo');
    const cursore = this.dom.querySelector('#eroe-tempo');
    if (cursore) {
      cursore.title = tr('eroe.tempo');
      cursore.setAttribute('aria-label', tr('eroe.tempo'));
    }
    this.dom.querySelectorAll('.eroe-tempo-btn').forEach(function (b) {
      const chiave = b.getAttribute('data-passo') === '-1' ? 'eroe.tempoMeno' : 'eroe.tempoPiu';
      b.title = tr(chiave);
      b.setAttribute('aria-label', tr(chiave));
    });
    this.corsie.forEach(function (id) {
      const nome = T.nomeCorda(id);
      const corda = self.dom.querySelector('.eroe-corsia[data-corda="' + id + '"] .eroe-corda-nome');
      if (corda) corda.textContent = nome;
      const tasto = self.dom.querySelector('.eroe-tasto[data-corda="' + id + '"] .eroe-tasto-corda');
      if (tasto) tasto.textContent = nome;
    });
    this.note.forEach(function (n) {
      if (!n._el) return;
      const e = n._el.querySelector('.eroe-nota-nome');
      if (e) e.textContent = T.solfege(n.nota);
    });
    this.aggiornaTempo();
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
    // un tempo scelto durante la pausa si applica adesso
    if (this._velocitaAttesa) {
      const v = this._velocitaAttesa;
      this._velocitaAttesa = null;
      this.impostaVelocita(v);
    }
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
      '<div class="eroe-tempo">' +
      '<span class="eroe-tempo-nome">' + tr('eroe.tempo') + '</span>' +
      '<button type="button" class="eroe-tempo-btn" data-passo="-1" title="' +
      tr('eroe.tempoMeno') + '" aria-label="' + tr('eroe.tempoMeno') + '">−</button>' +
      '<input type="range" class="eroe-tempo-cursore" id="eroe-tempo" min="' + VEL_MIN +
      '" max="' + VEL_MAX + '" step="' + VEL_PASSO + '" value="' + gioco.velocita +
      '" title="' + tr('eroe.tempo') + '" aria-label="' + tr('eroe.tempo') + '">' +
      '<button type="button" class="eroe-tempo-btn" data-passo="1" title="' +
      tr('eroe.tempoPiu') + '" aria-label="' + tr('eroe.tempoPiu') + '">+</button>' +
      '<span class="eroe-tempo-val" id="eroe-tempo-val"></span>' +
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
      sug: contenitore.querySelector('#eroe-suggerimento'),
      tempoCursore: contenitore.querySelector('#eroe-tempo'),
      tempoVal: contenitore.querySelector('#eroe-tempo-val')
    };
    // comando del tempo: cursore e pulsanti − / +
    gioco._hud.tempoCursore.addEventListener('input', function () {
      gioco.impostaVelocita(parseFloat(gioco._hud.tempoCursore.value));
    });
    contenitore.querySelectorAll('.eroe-tempo-btn').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        gioco.cambiaVelocita(parseFloat(b.getAttribute('data-passo')));
      });
    });
    gioco.aggiornaTempo();
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

  return {
    Gioco: Gioco, avvia: avvia, CADUTA: CADUTA,
    VEL_MIN: VEL_MIN, VEL_MAX: VEL_MAX, VEL_PASSO: VEL_PASSO, VELOCITA: VELOCITA,
    normalizzaVelocita: normalizzaVelocita
  };
})();
