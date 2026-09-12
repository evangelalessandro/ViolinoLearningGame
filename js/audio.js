/* ==========================================================================
   audio.js — Sintesi del suono del violino con la Web Audio API
   Nessun file audio esterno: tutto viene generato in tempo reale.
   ========================================================================== */
window.Sound = (function () {
  'use strict';

  const T = window.Theory;

  let ctx = null;
  let master = null;
  let riverbero = null;
  let enabled = true;
  let volume = 0.8;
  let wave = null;
  const attivi = new Set();

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

    const dry = ctx.createGain();
    dry.gain.value = 1;
    master.connect(dry).connect(ctx.destination);

    // Riverbero a convoluzione con impulso generato (sala piccola)
    const conv = ctx.createConvolver();
    conv.buffer = creaImpulso(1.8, 2.8);
    riverbero = ctx.createGain();
    riverbero.gain.value = 0.24;
    master.connect(conv).connect(riverbero).connect(ctx.destination);

    return ctx;
  }

  function creaImpulso(durata, decadimento) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * durata);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decadimento);
      }
    }
    return buf;
  }

  /** Onda periodica con armoniche "da arco": più ricca del semplice saw. */
  function ondaViolino() {
    if (wave) return wave;
    const n = 26;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    const amps = [0, 1, 0.72, 0.55, 0.42, 0.34, 0.26, 0.21, 0.17, 0.14, 0.115,
      0.095, 0.08, 0.067, 0.056, 0.047, 0.04, 0.034, 0.029, 0.025, 0.021,
      0.018, 0.015, 0.013, 0.011, 0.01];
    for (let i = 1; i < n; i++) imag[i] = amps[i];
    wave = ctx.createPeriodicWave(real, imag);
    return wave;
  }

  /* ------------------------------------------------------------- riproduzione */
  /**
   * Suona un'altezza MIDI con timbro di violino.
   * @param {number} m    MIDI
   * @param {number} dur  durata in secondi
   * @param {object} opt  { delay, gain, vibrato, archi }
   */
  function playMidi(m, dur, opt) {
    const c = init();
    if (!c || !enabled) return;
    opt = opt || {};
    dur = dur || 1.1;
    const t0 = c.currentTime + (opt.delay || 0);
    const f = 440 * Math.pow(2, (m - 69) / 12);

    const g = c.createGain();
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.Q.value = 0.8;
    filtro.frequency.setValueAtTime(Math.min(f * 10, 9500), t0);
    filtro.frequency.setTargetAtTime(Math.min(f * 5.2, 5200), t0 + 0.14, 0.3);

    const picco = 0.3 * (opt.gain == null ? 1 : opt.gain);
    if (picco <= 0) return;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(picco, t0 + 0.065);
    g.gain.setTargetAtTime(picco * 0.8, t0 + 0.1, 0.2);
    g.gain.setTargetAtTime(0.0001, t0 + dur, 0.1);

    g.connect(filtro).connect(master);

    const oscs = [];
    const o1 = c.createOscillator();
    o1.setPeriodicWave(ondaViolino());
    o1.frequency.setValueAtTime(f, t0);
    const o2 = c.createOscillator();
    o2.setPeriodicWave(ondaViolino());
    o2.frequency.setValueAtTime(f, t0);
    o2.detune.setValueAtTime(7, t0);
    oscs.push(o1, o2);
    oscs.forEach(function (o) { o.connect(g); });

    // vibrato progressivo (come un violinista che "scalda" la nota)
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.3;
    const lfoGain = c.createGain();
    lfoGain.gain.setValueAtTime(0, t0);
    lfoGain.gain.linearRampToValueAtTime(6, t0 + 0.35); // cents
    lfo.connect(lfoGain);
    oscs.forEach(function (o) { lfoGain.connect(o.detune); });

    // attacco dell'archetto: brevissimo soffio di rumore
    if (opt.archi !== false) {
      const src = c.createBufferSource();
      src.buffer = rumore(0.09);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(f * 3.2, 6500);
      bp.Q.value = 0.9;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.05 * (opt.gain == null ? 1 : opt.gain), t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
      src.connect(bp).connect(ng).connect(master);
      src.start(t0);
      src.stop(t0 + 0.12);
    }

    const stop = t0 + dur + 1.1;
    oscs.forEach(function (o) { o.start(t0); o.stop(stop); });
    lfo.start(t0); lfo.stop(stop);

    const voce = {
      stop: function (subito) {
        const t = c.currentTime;
        try {
          g.gain.cancelScheduledValues(t);
          g.gain.setTargetAtTime(0.0001, t, subito ? 0.02 : 0.06);
          oscs.forEach(function (o) { o.stop(t + 0.35); });
          lfo.stop(t + 0.35);
        } catch (e) { /* già fermo */ }
      }
    };
    attivi.add(voce);
    o1.onended = function () { attivi.delete(voce); };
  }

  let _rumore = null;
  function rumore(durata) {
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * durata));
    const buf = ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
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
  function blip(f, dur, tipo, gain, delay) {
    const c = init();
    if (!c || !enabled) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    o.type = tipo || 'sine';
    o.frequency.setValueAtTime(f, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function glide(f1, f2, dur, gain) {
    const c = init();
    if (!c || !enabled) return;
    const t0 = c.currentTime;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.16, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  const sfx = {
    click: function () { blip(880, 0.06, 'triangle', 0.06); },
    tick: function () { blip(1500, 0.045, 'square', 0.035); },
    correct: function () {
      playMidi(76, 0.4, { gain: 0.5, archi: false });
      playMidi(81, 0.7, { gain: 0.5, delay: 0.09, archi: false });
    },
    wrong: function () {
      glide(220, 110, 0.32, 0.14);
      blip(150, 0.28, 'sawtooth', 0.05);
    },
    countdown: function () { blip(1046, 0.09, 'square', 0.05); },
    start: function () { playMidi(69, 0.3, { gain: 0.5 }); playMidi(81, 0.5, { delay: 0.16, gain: 0.5 }); },
    win: function () { playSequence([72, 76, 79, 84], 0.14, 0.5); },
    lose: function () { playSequence([72, 69, 65, 60], 0.16, 0.5); },
    streak: function (n) {
      const base = 72 + Math.min(12, Math.max(0, (n - 2) * 2));
      playMidi(base, 0.25, { gain: 0.45, archi: false });
      playMidi(base + 4, 0.35, { delay: 0.08, gain: 0.45, archi: false });
    }
  };

  /* ------------------------------------------------------------------ corde */
  function accorda(stringId) {
    const s = T.stringOf(stringId);
    if (!s) return;
    playMidi(T.midi(s.open), 1.9, { gain: 1 });
  }
  function accordaturaCompleta() {
    T.STRINGS.slice().reverse().forEach(function (s, i) {  // Mi, La, Re, Sol
      playMidi(T.midi(s.open), 1.6, { delay: i * 0.5, gain: 0.9 });
    });
  }

  return {
    init: init,
    playMidi: playMidi,
    playNote: playNote,
    playSequence: playSequence,
    stopAll: stopAll,
    sfx: sfx,
    accorda: accorda,
    accordaturaCompleta: accordaturaCompleta,
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
