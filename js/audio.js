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
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') { ctx.resume(); }
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = volume;

    // limitatore morbido: protegge dai picchi quando suonano più note insieme
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -10;
    lim.knee.value = 6;
    lim.ratio.value = 4;
    lim.attack.value = 0.004;
    lim.release.value = 0.18;
    master.connect(lim);

    const dry = ctx.createGain();
    dry.gain.value = 1;
    lim.connect(dry).connect(ctx.destination);

    // Riverbero a convoluzione con impulso generato (sala piccola)
    const conv = ctx.createConvolver();
    conv.buffer = creaImpulso(ctx, 1.8, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    lim.connect(conv).connect(wet).connect(ctx.destination);

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
    const t0 = opt.delay || 0;
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
    const t0 = opt.delay || 0;
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

  /* ------------------------------------------------------------- riproduzione */
  /**
   * Suona un'altezza MIDI con timbro di violino.
   * @param {number} m    MIDI
   * @param {number} dur  durata in secondi
   * @param {object} opt  { delay, gain, pizzicato, arco, cassa }
   */
  function playMidi(m, dur, opt) {
    const c = init();
    if (!c || !enabled) return;
    opt = opt || {};
    dur = dur || 1.1;
    const v = opt.pizzicato
      ? vocePizzicato(c, m, dur, { delay: opt.delay, gain: opt.gain, cassa: opt.cassa, destinazione: master })
      : voceArco(c, m, dur, {
        delay: opt.delay, gain: opt.gain, cassa: opt.cassa, arco: opt.arco,
        armoniche: opt.armoniche, vibrato: opt.vibrato, destinazione: master
      });

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
    playMidi(T.midi(s.open), 2.1, { gain: 1 });
  }
  function accordaturaCompleta() {
    T.STRINGS.slice().reverse().forEach(function (s, i) {  // Mi, La, Re, Sol
      playMidi(T.midi(s.open), 1.7, { delay: i * 0.55, gain: 0.9 });
    });
  }

  /* ------------------------------------------------------- rendering offline */
  /**
   * Renderizza una nota fuori dal tempo reale: serve ai test per analizzare lo
   * spettro (formanti della cassa, altezza, decadimento) senza poter ascoltare.
   */
  function rendiOffline(m, dur, opt) {
    opt = opt || {};
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('OfflineAudioContext non disponibile'));
    const rate = opt.sampleRate || 44100;
    const lunghezza = Math.ceil(rate * (dur + 1.2));
    const oc = new OAC(1, lunghezza, rate);
    const fuori = oc.createGain();
    fuori.gain.value = 1;
    fuori.connect(oc.destination);
    const config = {
      delay: 0, gain: opt.gain == null ? 1 : opt.gain, arco: opt.arco,
      armoniche: opt.armoniche, cassa: opt.cassa, vibrato: opt.vibrato,
      destinazione: fuori
    };
    if (opt.pizzicato) vocePizzicato(oc, m, dur, config);
    else voceArco(oc, m, dur, config);
    return oc.startRendering();
  }

  return {
    init: init,
    playMidi: playMidi,
    pizzicato: pizzicato,
    playNote: playNote,
    playSequence: playSequence,
    stopAll: stopAll,
    sfx: sfx,
    accorda: accorda,
    accordaturaCompleta: accordaturaCompleta,
    rendiOffline: rendiOffline,
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
