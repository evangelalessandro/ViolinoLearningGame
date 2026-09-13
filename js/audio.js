/* ==========================================================================
   audio.js — Sintesi del suono del violino con la Web Audio API
   Nessun file audio esterno: arco, pizzicato e accordatura sono generati in
   tempo reale da un modello fisico semplificato:

     1. la corda produce un'onda periodica con lo spettro di una corda sfregata:
        ampiezza dell'armonica n ∝ (1/n)·|sin(n·π·β)|, dove β è il punto in cui
        l'archetto tocca la corda (circa 1/8): è da lì che nasce il "buco"
        caratteristico sull'8ª armonica;
     2. il rumore dell'archetto (crini sulle corde) si somma all'attacco;
     3. la cassa armonica colora il suono con le sue risonanze fisse
        (A0 ≈ 285 Hz, B1 ≈ 480 Hz, "bridge hill" ≈ 3 kHz): è questa parte che
        fa sembrare il suono un violino e non un organo.
   ========================================================================== */
window.Sound = (function () {
  'use strict';

  const T = window.Theory;

  /* Risonanze della cassa armonica: [frequenza, Q, guadagno in dB] */
  const CASSA = [
    [285, 2.4, 7],    // risonanza dell'aria (A0)
    [480, 3.4, 9],    // modo "firma" del violino (B1)
    [950, 2.6, 4],    // B2/B3
    [1700, 2.2, 2],
    [3000, 1.6, 10]   // bridge hill: la brillantezza del violino
  ];
  const BETA_ARCO = 0.12;   // punto di contatto dell'archetto sulla corda

  let ctx = null;
  let master = null;
  let enabled = true;
  let volume = 0.8;
  const attivi = new Set();
  const cacheOnde = new WeakMap();   // una cache per contesto (anche offline)

  /* ------------------------------------------------------------- contesto */
  /**
   * Catena di uscita: volume → limitatore → (diretto + riverbero) → destinazione.
   * È una funzione a sé perché i test la costruiscono dentro un contesto offline
   * e ne misurano l'uscita (un errore di collegamento qui azzera tutto il suono).
   */
  function catena(c, vol) {
    const ingresso = c.createGain();
    ingresso.gain.value = (vol == null ? 1 : vol);

    // limitatore morbido: protegge dai picchi quando suonano più note insieme
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -10;
    lim.knee.value = 6;
    lim.ratio.value = 4;
    lim.attack.value = 0.004;
    lim.release.value = 0.18;
    ingresso.connect(lim);

    const dry = c.createGain();
    dry.gain.value = 1;
    lim.connect(dry).connect(c.destination);

    // Riverbero a convoluzione con impulso generato (sala piccola)
    const conv = c.createConvolver();
    conv.buffer = creaImpulso(c, 1.8, 2.8);
    const wet = c.createGain();
    wet.gain.value = 0.22;
    lim.connect(conv).connect(wet).connect(c.destination);

    return { ingresso: ingresso, lim: lim, dry: dry, wet: wet };
  }

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') { ctx.resume(); }
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = catena(ctx, volume).ingresso;
    return ctx;
  }

  function creaImpulso(c, durata, decadimento) {
    const rate = c.sampleRate;
    const len = Math.floor(rate * durata);
    const buf = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decadimento);
      }
    }
    return buf;
  }

  /* --------------------------------------------------------------- sorgenti */
  /** Onda della corda sfregata, con il "buco" dovuto al punto dell'archetto. */
  function ondaArco(c, nArm) {
    const n = Math.max(4, Math.min(48, nArm));
    let mappa = cacheOnde.get(c);
    if (!mappa) { mappa = {}; cacheOnde.set(c, mappa); }
    if (mappa[n]) return mappa[n];
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let h = 1; h < n; h++) {
      const comb = Math.abs(Math.sin(h * Math.PI * BETA_ARCO));
      imag[h] = (1 / h) * comb;
    }
    mappa[n] = c.createPeriodicWave(real, imag);
    return mappa[n];
  }

  /** Numero di armoniche utili per una certa frequenza (senza superare Nyquist). */
  function armonicheUtili(c, f, massimo) {
    const limite = Math.floor((c.sampleRate / 2) / f);
    return Math.max(4, Math.min(massimo || 40, limite));
  }

  /** Catena di filtri della cassa armonica (con `quanto: 0` la esclude). */
  function cassa(c, quanto) {
    const primo = c.createBiquadFilter();
    if (quanto === 0) {          // usato dai test: corda "nuda", senza cassa
      primo.type = 'allpass';
      primo.frequency.value = 1000;
      return { entrata: primo, uscita: primo };
    }
    primo.type = 'highpass';
    primo.frequency.value = 170;
    primo.Q.value = 0.6;
    let nodo = primo;
    CASSA.forEach(function (r) {
      const f = c.createBiquadFilter();
      f.type = 'peaking';
      f.frequency.value = r[0];
      f.Q.value = r[1];
      f.gain.value = r[2] * (quanto == null ? 1 : quanto);
      nodo.connect(f);
      nodo = f;
    });
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 9500;
    lp.Q.value = 0.7;
    nodo.connect(lp);
    return { entrata: primo, uscita: lp };
  }

  /** Soffio dell'archetto (rumore filtrato). */
  function rumore(c, durata) {
    const rate = c.sampleRate;
    const len = Math.max(1, Math.floor(rate * durata));
    const buf = c.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ------------------------------------------------------- voce "ad arco" */
  /**
   * Costruisce una nota ad arco dentro un contesto qualsiasi (anche offline).
   * @returns {object} { uscita, sorgenti[] }
   */
  function voceArco(c, m, dur, opt) {
    opt = opt || {};
    // ATTENZIONE: il tempo va preso da currentTime, non da zero. In un contesto
    // già avviato (quello del browser) programmare l'inviluppo a partire da 0 lo
    // metterebbe tutto nel passato e la nota resterebbe muta.
    const t0 = c.currentTime + (opt.delay || 0);
    const f = T.freqMidi(m);
    const picco = Math.max(0.0002, 0.24 * (opt.gain == null ? 1 : opt.gain));

    const inv = c.createGain();
    // attacco: l'archetto "aggancia" la corda, poi il suono si apre
    inv.gain.setValueAtTime(0.0001, t0);
    inv.gain.exponentialRampToValueAtTime(picco * 0.55, t0 + 0.035);
    inv.gain.exponentialRampToValueAtTime(picco, t0 + 0.13);
    inv.gain.linearRampToValueAtTime(picco * 0.86, t0 + dur * 0.75);
    inv.gain.setTargetAtTime(0.0001, t0 + dur, 0.075);

    const corpo = cassa(c, opt.cassa);
    corpo.uscita.connect(opt.destinazione);

    const sorgenti = [];
    const nArm = armonicheUtili(c, f, opt.armoniche || 40);

    // una sola corda che vibra: lo spessore lo danno le armoniche, la cassa
    // armonica, il vibrato e il rumore dell'archetto (niente effetto "coro")
    const o1 = c.createOscillator();
    o1.setPeriodicWave(ondaArco(c, nArm));
    o1.frequency.setValueAtTime(f, t0);
    o1.connect(inv);
    sorgenti.push(o1);

    // vibrato: nasce dopo l'attacco, con due velocità per non sembrare meccanico
    const conVibrato = opt.vibrato !== false;
    const lfo1 = c.createOscillator();
    lfo1.frequency.value = 5.6;
    const lfo2 = c.createOscillator();
    lfo2.frequency.value = 4.3;
    const prof = c.createGain();          // quanto vibrato, nel tempo
    prof.gain.setValueAtTime(0, t0);
    prof.gain.linearRampToValueAtTime(conVibrato ? 1 : 0, t0 + 0.4);
    const lfoMix = c.createGain();
    lfoMix.gain.value = 1;
    const lfo2g = c.createGain();
    lfo2g.gain.value = 0.45;
    lfo1.connect(lfoMix);
    lfo2.connect(lfo2g).connect(lfoMix);
    const cents = c.createGain();
    cents.gain.value = 11;                 // ampiezza del vibrato in cent
    lfoMix.connect(prof).connect(cents);
    cents.connect(o1.detune);
    sorgenti.push(lfo1, lfo2);

    // il vibrato modula anche l'intensità, come fa un violinista
    const ampiezzaVib = c.createGain();
    ampiezzaVib.gain.value = 0.03;
    const invMod = c.createGain();
    invMod.gain.value = 1;
    lfoMix.connect(ampiezzaVib).connect(invMod.gain);
    inv.connect(invMod);
    invMod.connect(corpo.entrata);
    // rumore dell'archetto: un soffio continuo sotto il suono
    if (opt.arco !== false) {
      const ns = c.createBufferSource();
      ns.buffer = rumore(c, Math.max(0.35, dur + 0.3));
      ns.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600;
      bp.Q.value = 0.6;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.exponentialRampToValueAtTime(picco * 0.16, t0 + 0.05);
      ng.gain.setTargetAtTime(0.0001, t0 + dur, 0.07);
      ns.connect(bp).connect(ng).connect(corpo.entrata);
      ns.start(t0);
      ns.stop(t0 + dur + 0.5);
      sorgenti.push(ns);

      // "stacco" iniziale: brevissimo fruscio all'attacco dell'arco
      const stacco = c.createBufferSource();
      stacco.buffer = rumore(c, 0.06);
      const staccoF = c.createBiquadFilter();
      staccoF.type = 'highpass';
      staccoF.frequency.value = 1800;
      const staccoG = c.createGain();
      staccoG.gain.setValueAtTime(picco * 0.5, t0);
      staccoG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      stacco.connect(staccoF).connect(staccoG).connect(corpo.entrata);
      stacco.start(t0);
      sorgenti.push(stacco);
    }

    const stop = t0 + dur + 0.9;
    sorgenti.forEach(function (s) {
      try { s.start(t0); } catch (e) { /* già avviato */ }
      s.stop(stop);
    });

    return { uscita: inv, sorgenti: sorgenti, stop: stop, t0: t0 };
  }

  /* --------------------------------------------------------- voce pizzicata */
  function vocePizzicato(c, m, dur, opt) {
    opt = opt || {};
    const t0 = c.currentTime + (opt.delay || 0);   // come sopra: mai partire da 0
    const f = T.freqMidi(m);
    const picco = Math.max(0.0002, 0.3 * (opt.gain == null ? 1 : opt.gain));
    const durata = dur || 0.9;

    const inv = c.createGain();
    inv.gain.setValueAtTime(0.0001, t0);
    inv.gain.exponentialRampToValueAtTime(picco, t0 + 0.006);
    inv.gain.exponentialRampToValueAtTime(picco * 0.25, t0 + 0.10);
    inv.gain.setTargetAtTime(0.0001, t0 + 0.12, durata * 0.22);

    const corpo = cassa(c, (opt.cassa == null ? 1 : opt.cassa) * 1.15);
    inv.connect(corpo.entrata);
    corpo.uscita.connect(opt.destinazione);

    // la corda pizzicata è più brillante: più armoniche e pizzico di rumore
    const o = c.createOscillator();
    o.setPeriodicWave(ondaArco(c, armonicheUtili(c, f, 48)));
    o.frequency.setValueAtTime(f, t0);
    o.connect(inv);

    const pizzico = c.createBufferSource();
    pizzico.buffer = rumore(c, 0.05);
    const pf = c.createBiquadFilter();
    pf.type = 'bandpass';
    pf.frequency.value = Math.min(6000, f * 6);
    pf.Q.value = 0.8;
    const pg = c.createGain();
    pg.gain.setValueAtTime(picco * 0.55, t0);
    pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    pizzico.connect(pf).connect(pg).connect(corpo.entrata);

    const sorgenti = [o, pizzico];
    const stop = t0 + durata + 0.6;
    sorgenti.forEach(function (s) { s.start(t0); s.stop(stop); });
    return { uscita: inv, sorgenti: sorgenti, stop: stop, t0: t0 };
  }

  /* ------------------------------------------------------- campioni reali --- */
  /* Violino solo registrato (arco con vibrato e pizzicato) da VSCO 2 Community
     Edition, licenza CC0 1.0 Universal: vedi sounds/LICENSE.md.
     `hz` è l'intonazione REALE misurata di ogni file (tools/misura-campioni.js):
     il playbackRate si calcola da lì, così la nota esce esattamente intonata
     anche se il campione originale è un po' calante o crescente. */
  const CAMPIONI = [
    { nota: 'G3', file: 'sounds/arco-G3.wav', hz: 195.86 },
    { nota: 'A3', file: 'sounds/arco-A3.wav', hz: 219.90 },
    { nota: 'C4', file: 'sounds/arco-C4.wav', hz: 261.86 },
    { nota: 'E4', file: 'sounds/arco-E4.wav', hz: 330.34 },
    { nota: 'G4', file: 'sounds/arco-G4.wav', hz: 392.52 },
    { nota: 'A4', file: 'sounds/arco-A4.wav', hz: 443.00 },
    { nota: 'C5', file: 'sounds/arco-C5.wav', hz: 524.82 },
    { nota: 'E5', file: 'sounds/arco-E5.wav', hz: 657.68 },
    { nota: 'G5', file: 'sounds/arco-G5.wav', hz: 786.53 },
    { nota: 'A5', file: 'sounds/arco-A5.wav', hz: 877.30 },
    { nota: 'C6', file: 'sounds/arco-C6.wav', hz: 1034.44 }
  ];
  const CAMPIONE_PIZZ = { nota: 'A4', file: 'sounds/pizz-A4.wav', hz: 439.40 };

  let campioni = null;          // campioni ad arco decodificati
  let campionePizz = null;      // campione pizzicato (per i suoni dell'interfaccia)
  let caricamento = null;
  let statoCaricamento = 'fermo';   // fermo | in corso | pronto | non-disponibile

  /** Sceglie il campione più vicino in altezza (distanza in cent). */
  function scegliCampione(hz, elenco) {
    let scelto = elenco[0], migliore = Infinity;
    elenco.forEach(function (s) {
      const d = Math.abs(Math.log2(hz / s.hz));
      if (d < migliore) { migliore = d; scelto = s; }
    });
    return scelto;
  }

  /** Scarica e decodifica i campioni. Se non riesce, l'app usa la sintesi. */
  function caricaCampioni() {
    if (caricamento) return caricamento;
    const c = init();
    if (!c || typeof fetch !== 'function') {
      statoCaricamento = 'non-disponibile';
      return Promise.resolve(false);
    }
    statoCaricamento = 'in corso';
    const scarica = function (elenco) {
      return Promise.all(elenco.map(function (s) {
        return fetch(s.file)
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status + ' su ' + s.file);
            return r.arrayBuffer();
          })
          .then(function (buf) {
            return new Promise(function (res, rej) { c.decodeAudioData(buf, res, rej); });
          })
          .then(function (audio) { return { hz: s.hz, buffer: audio }; });
      }));
    };
    caricamento = Promise.all([scarica(CAMPIONI), scarica([CAMPIONE_PIZZ])])
      .then(function (r) {
        campioni = r[0];
        campionePizz = r[1][0];
        statoCaricamento = 'pronto';
        return true;
      })
      .catch(function () {
        campioni = null;
        campionePizz = null;
        statoCaricamento = 'non-disponibile';
        return false;
      });
    return caricamento;
  }

  /** Avvia il caricamento dei campioni (chiamata all'avvio dell'app). */
  function prepara() {
    init();
    return caricaCampioni();
  }

  function campioniPronti() { return statoCaricamento === 'pronto'; }
  function statoCampioni() { return statoCaricamento; }

  /**
   * Voce costruita da un campione registrato: il playbackRate intona la nota.
   * Non passa dalla cassa armonica simulata: la registrazione la contiene già.
   */
  function voceCampione(c, m, dur, opt, elenco, pizz) {
    const hz = T.freqMidi(m);
    const s = scegliCampione(hz, elenco);
    const rate = hz / s.hz;
    const t0 = c.currentTime + (opt.delay || 0);
    const picco = Math.max(0.0002, opt.gain == null ? 1 : opt.gain);

    const src = c.createBufferSource();
    src.buffer = s.buffer;
    src.playbackRate.value = rate;

    const g = c.createGain();
    const durata = s.buffer.duration / rate;      // durata del campione alla nuova altezza
    const tenuta = Math.max(0.1, Math.min(dur, durata - 0.45));
    g.gain.setValueAtTime(0.0001, t0);
    // attacco quasi immediato: l'attacco dell'archetto è già dentro la
    // registrazione, qui serve solo a non far scattare il campione
    g.gain.linearRampToValueAtTime(picco, t0 + 0.006);
    if (tenuta < durata - 0.3) {                  // se serve più corta, si chiude prima
      g.gain.setValueAtTime(picco, t0 + tenuta);
      // rilascio morbido: l'archetto si stacca, non si tronca la nota
      g.gain.setTargetAtTime(0.0001, t0 + tenuta, pizz ? 0.05 : 0.25);
    }
    src.connect(g).connect(opt.destinazione);
    src.start(t0);
    const stop = t0 + durata + 0.3;
    src.stop(stop);
    return { uscita: g, sorgenti: [src], stop: stop, t0: t0, campione: s, rate: rate };
  }

  /* ------------------------------------------------------------- riproduzione */
  /**
   * Suona un'altezza MIDI. Usa i campioni registrati; se non sono disponibili
   * (per esempio aprendo l'app da file://, dove il browser blocca la lettura dei
   * file) ricade sulla sintesi, così il suono c'è comunque.
   * @param {number} m    MIDI
   * @param {number} dur  durata in secondi
   * @param {object} opt  { delay, gain, pizzicato, sintesi, arco, cassa, vibrato }
   */
  function playMidi(m, dur, opt) {
    const c = init();
    if (!c || !enabled) return;
    opt = opt || {};
    dur = dur || 1.1;

    // alla prima nota richiesta si avvia il caricamento dei campioni: così
    // partono anche se il primo tocco non è arrivato (o è arrivato su altro)
    if (statoCaricamento === 'fermo') caricaCampioni();

    const elenco = opt.pizzicato ? (campionePizz ? [campionePizz] : null) : campioni;
    const usaCampioni = !opt.sintesi && !!elenco;
    const v = usaCampioni
      ? voceCampione(c, m, dur, { delay: opt.delay, gain: opt.gain, destinazione: master }, elenco, !!opt.pizzicato)
      : (opt.pizzicato
        ? vocePizzicato(c, m, dur, { delay: opt.delay, gain: opt.gain, cassa: opt.cassa, destinazione: master })
        : voceArco(c, m, dur, {
          delay: opt.delay, gain: opt.gain, cassa: opt.cassa, arco: opt.arco,
          armoniche: opt.armoniche, vibrato: opt.vibrato, destinazione: master
        }));

    const voce = {
      stop: function (subito) {
        const t = c.currentTime;
        try {
          v.uscita.gain.cancelScheduledValues(t);
          v.uscita.gain.setTargetAtTime(0.0001, t, subito ? 0.015 : 0.05);
          v.sorgenti.forEach(function (s) { try { s.stop(t + 0.3); } catch (e) { } });
        } catch (e) { /* già fermo */ }
      }
    };
    attivi.add(voce);
    const primo = v.sorgenti[0];
    if (primo && primo.onended !== undefined) {
      primo.onended = function () { attivi.delete(voce); };
    } else {
      setTimeout(function () { attivi.delete(voce); }, (v.stop - c.currentTime + 1) * 1000);
    }
  }

  /** Pizzicato: utile per i suoni di risposta giusta/sbagliata. */
  function pizzicato(m, dur, opt) {
    opt = opt || {};
    opt.pizzicato = true;
    playMidi(m, dur || 0.8, opt);
  }

  /** Suona una nota del modello Theory. */
  function playNote(n, dur, opt) {
    playMidi(T.midi(n), dur, opt);
  }

  /** Arpeggio/diteggiatura: sequenza di MIDI. */
  function playSequence(midis, gap, dur) {
    gap = gap || 0.35;
    midis.forEach(function (m, i) {
      playMidi(m, dur || Math.max(0.5, gap * 0.95), { delay: i * gap, gain: 0.85 });
    });
  }

  function stopAll() {
    attivi.forEach(function (v) { v.stop(true); });
    attivi.clear();
  }

  /* ----------------------------------------------------------------- effetti */
  /** Colpo sulle corde in pizzicato: due note in sequenza. */
  function duePizzicati(a, b, gap) {
    pizzicato(a, 0.7, { gain: 0.9 });
    pizzicato(b, 0.9, { delay: gap || 0.11, gain: 0.9 });
  }

  /** Doppia corda stonata: due note a un semitono, insieme. */
  function doppiaStonata(a, b) {
    [a, b].forEach(function (m) {
      playMidi(m, 0.42, { gain: 0.42, arco: true, armoniche: 22, cassa: 1.3 });
    });
  }

  const sfx = {
    click: function () { pizzicato(84, 0.25, { gain: 0.35 }); },
    tick: function () { pizzicato(91, 0.2, { gain: 0.28 }); },
    correct: function () { duePizzicati(76, 83, 0.10); },
    wrong: function () { doppiaStonata(58, 59); },
    countdown: function () { pizzicato(79, 0.3, { gain: 0.5 }); },
    start: function () { duePizzicati(69, 81, 0.14); },
    win: function () { playSequence([72, 76, 79, 84], 0.15, 0.55); },
    lose: function () { playSequence([72, 69, 65, 60], 0.17, 0.55); },
    streak: function (n) {
      const base = 72 + Math.min(12, Math.max(0, (n - 2) * 2));
      duePizzicati(base, base + 5, 0.08);
    }
  };

  /* ------------------------------------------------------------------ corde */
  function accorda(stringId) {
    const s = T.stringOf(stringId);
    if (!s) return;
    playMidi(T.midi(s.open), 2.6, { gain: 1 });
  }
  function accordaturaCompleta() {
    T.STRINGS.slice().reverse().forEach(function (s, i) {  // Mi, La, Re, Sol
      playMidi(T.midi(s.open), 2.2, { delay: i * 0.6, gain: 0.9 });
    });
  }

  /* ------------------------------------------------------- rendering offline */
  /**
   * Renderizza una nota fuori dal tempo reale: serve ai test per analizzare lo
   * spettro (formanti della cassa, altezza, decadimento) senza poter ascoltare.
   * Con `catena: true` passa per tutta l'uscita (limitatore e riverbero).
   */
  function rendiOffline(m, dur, opt) {
    opt = opt || {};
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('OfflineAudioContext non disponibile'));
    const rate = opt.sampleRate || 44100;
    const lunghezza = Math.ceil(rate * ((opt.avviaDopo || 0) + dur + 1.2));
    const oc = new OAC(1, lunghezza, rate);
    let destinazione;
    if (opt.catena) {
      destinazione = catena(oc, opt.volume == null ? volume : opt.volume).ingresso;
    } else {
      destinazione = oc.createGain();
      destinazione.gain.value = 1;
      destinazione.connect(oc.destination);
    }
    const config = {
      delay: 0, gain: opt.gain == null ? 1 : opt.gain, arco: opt.arco,
      armoniche: opt.armoniche, cassa: opt.cassa, vibrato: opt.vibrato,
      destinazione: destinazione
    };
    const costruisci = function () {
      if (opt.pizzicato) vocePizzicato(oc, m, dur, config);
      else voceArco(oc, m, dur, config);
    };
    // `avviaDopo` simula un contesto già avviato da un po' (come quello del
    // browser): serve a verificare che la nota parta comunque, invece di
    // programmare l'inviluppo nel passato.
    const avvio = opt.avviaDopo || 0;
    if (avvio > 0) {
      oc.suspend(avvio).then(function () { costruisci(); oc.resume(); });
      return oc.startRendering();
    }
    costruisci();
    return oc.startRendering();
  }

  /**
   * Renderizza una nota suonata da un campione registrato, scaricato e
   * decodificato nello stesso contesto offline. Serve ai test per verificare
   * che il campione esca davvero intonato sulla nota richiesta.
   */
  function rendiCampioneOffline(m, dur, opt) {
    opt = opt || {};
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('OfflineAudioContext non disponibile'));
    const rate = opt.sampleRate || 44100;
    const oc = new OAC(1, Math.ceil(rate * (dur + 1.2)), rate);
    const fuori = oc.createGain();
    fuori.gain.value = 1;
    fuori.connect(oc.destination);
    const elenco = opt.pizzicato ? [CAMPIONE_PIZZ] : CAMPIONI;
    // si scarica solo il campione che verrà davvero usato per questa nota
    const scelto = scegliCampione(T.freqMidi(m), elenco);
    return fetch(scelto.file)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' su ' + scelto.file);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        return new Promise(function (res, rej) { oc.decodeAudioData(buf, res, rej); });
      })
      .then(function (audio) {
        voceCampione(oc, m, dur, { gain: opt.gain == null ? 1 : opt.gain, destinazione: fuori },
          [{ hz: scelto.hz, buffer: audio }], !!opt.pizzicato);
        return oc.startRendering();
      });
  }

  return {
    init: init,
    prepara: prepara,
    caricaCampioni: caricaCampioni,
    campioniPronti: campioniPronti,
    statoCampioni: statoCampioni,
    CAMPIONI: CAMPIONI,
    playMidi: playMidi,
    pizzicato: pizzicato,
    playNote: playNote,
    playSequence: playSequence,
    stopAll: stopAll,
    sfx: sfx,
    accorda: accorda,
    accordaturaCompleta: accordaturaCompleta,
    rendiOffline: rendiOffline,
    rendiCampioneOffline: rendiCampioneOffline,
    isEnabled: function () { return enabled; },
    setEnabled: function (v) {
      enabled = !!v;
      if (!enabled) stopAll();
      if (enabled) init();
    },
    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    },
    getVolume: function () { return volume; }
  };
})();
