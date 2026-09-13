/* ==========================================================================
   theory.js — Teoria musicale applicata al violino
   Note, pentagramma, corde, diteggiature e posizioni.
   Nessuna dipendenza: gira nel browser (window.Theory) e in Node (require).
   ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Theory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- costanti */
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const SOLFEGE = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
  const SHARP = '\u266F';  // ♯
  const FLAT = '\u266D';   // ♭
  const NATURAL = '\u266E'; // ♮

  /* ------------------------------------------------------- lingua dei nomi */
  /* In italiano le note si chiamano Do Re Mi Fa Sol La Si, in inglese C D E F
     G A B: tutto il testo musicale del modulo passa da qui. */
  let lingua = 'it';

  const DITA = {
    it: ['corda vuota', '1º dito', '2º dito', '3º dito', '4º dito'],
    en: ['open string', '1st finger', '2nd finger', '3rd finger', '4th finger']
  };
  const VARIANTI = {
    it: { '-1': 'basso', '0': 'naturale', '1': 'alto' },
    en: { '-1': 'low', '0': 'normal', '1': 'high' }
  };
  const LIVELLI_EN = {
    bambini: { name: 'Kids', desc: 'Open strings and the first notes in 1st position (G3–A4), naturals only.' },
    ragazzi: { name: 'Teens', desc: 'The whole 1st position with natural notes (G3–E5).' },
    adulti: { name: 'Adults', desc: 'Complete 1st position with sharps and flats, ledger lines.' },
    maestri: { name: 'Masters', desc: '1st–3rd position, accidentals and the high register up to C6.' }
  };

  function setLingua(l) {
    lingua = (l === 'en') ? 'en' : 'it';
    return lingua;
  }
  function getLingua() { return lingua; }
  function dita() { return DITA[lingua]; }
  function varianti() { return VARIANTI[lingua]; }
  /** "1ª" in italiano, "1st" in inglese. */
  function ordinale(n) {
    if (lingua !== 'en') return n + 'ª';
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return n + 'th';
  }
  function posizioneTesto(p) {
    return lingua === 'en' ? ordinale(p) + ' position' : p + 'ª posizione';
  }
  /** Nome della corda: "Sol" oppure "G". */
  function nomeCorda(id) {
    const s = (typeof id === 'string') ? STRING_BY_ID[id] : id;
    if (!s) return '';
    return lingua === 'en' ? s.id : s.solfege;
  }
  /** Etichetta della corda col numero romano: "IV corda" / "IV string". */
  function etichettaCorda(id) {
    const s = (typeof id === 'string') ? STRING_BY_ID[id] : id;
    if (!s) return '';
    return s.roman + (lingua === 'en' ? ' string' : ' corda');
  }
  function nomeLivello(k) {
    const L = LEVELS[k];
    if (!L) return '';
    return (lingua === 'en' && LIVELLI_EN[k]) ? LIVELLI_EN[k].name : L.name;
  }
  function descLivello(k) {
    const L = LEVELS[k];
    if (!L) return '';
    return (lingua === 'en' && LIVELLI_EN[k]) ? LIVELLI_EN[k].desc : L.desc;
  }

  // Indice diatonico (ottava * 7 + lettera) della nota E4 = 1ª riga del
  // pentagramma in chiave di violino. Tutto il disegno parte da qui.
  const E4_DIATONIC = 4 * 7 + 2;

  // Ortografia da altezza MIDI -> lettera (il resto lo calcola fromMidi)
  const SHARP_SPELL = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const FLAT_SPELL = ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'];

  /* ------------------------------------------------------------------ note */
  function note(letter, octave, alter) {
    return { letter: letter, octave: octave, alter: alter || 0 };
  }
  function midi(n) {
    return 12 * (n.octave + 1) + SEMI[n.letter] + (n.alter || 0);
  }
  function diatonic(n) {
    return n.octave * 7 + LETTERS.indexOf(n.letter);
  }
  /** Passo sul pentagramma: 0 = E4 (1ª riga), ogni unità = riga/spazio. */
  function staffStep(n) {
    return diatonic(n) - E4_DIATONIC;
  }
  function freqMidi(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }
  function freq(n) {
    return freqMidi(midi(n));
  }
  function accidentalSymbol(alter) {
    if (alter > 0) return SHARP;
    if (alter < 0) return FLAT;
    return '';
  }
  /** Chiave univoca per la sola altezza (per deduplicare). */
  function key(n) {
    return n.letter + (n.alter > 0 ? '#' : n.alter < 0 ? 'b' : '') + n.octave;
  }
  function midiKey(m) {
    return 'm' + m;
  }
  /** Nome della nota: "Do", "Fa♯" (italiano) oppure "C", "F#" (inglese). */
  function solfege(n, withAccidental) {
    const base = (lingua === 'en') ? n.letter : SOLFEGE[n.letter];
    return base + (withAccidental === false ? '' : accidentalSymbol(n.alter));
  }
  /** Nome parlato, con l'alterazione a parole: "Fa diesis" / "F sharp". */
  function solfegeEsteso(n) {
    const base = (lingua === 'en') ? n.letter : SOLFEGE[n.letter];
    if (n.alter > 0) return base + (lingua === 'en' ? ' sharp' : ' diesis');
    if (n.alter < 0) return base + (lingua === 'en' ? ' flat' : ' bemolle');
    return base;
  }
  /** Nome con l'ottava: "La4", "Fa♯4" / "A4", "F#4". */
  function solfegeOttava(n) {
    return solfege(n) + n.octave;
  }
  function solfegeLetter(n) {
    return (lingua === 'en') ? n.letter : SOLFEGE[n.letter];
  }
  /** Notazione anglosassone: C, D, Eb, F# ... */
  function english(n) {
    return n.letter + (n.alter > 0 ? '#' : n.alter < 0 ? 'b' : '');
  }
  function equals(a, b) {
    return midi(a) === midi(b);
  }
  function fromMidi(m, preferFlats) {
    const pc = ((m % 12) + 12) % 12;
    const octave = Math.floor(m / 12) - 1;
    const letter = (preferFlats ? FLAT_SPELL : SHARP_SPELL)[pc];
    const naturalMidi = 12 * (octave + 1) + SEMI[letter];
    return note(letter, octave, m - naturalMidi);
  }

  /**
   * Da nome internazionale a nota del modello: "C4" → Do4, "F#4" → Fa♯4,
   * "Bb3" → Si♭3. Accetta anche i nomi italiani completi ("Sol3", "Fa♯4").
   */
  function daNome(testo) {
    const t = String(testo).trim();
    let m = t.match(/^([A-Ga-g])([#♯b♭]?)(-?\d)$/);
    if (m) {
      const letter = m[1].toUpperCase();
      const alter = (m[2] === '#' || m[2] === '\u266F') ? 1 : (m[2] === 'b' || m[2] === '\u266D') ? -1 : 0;
      return note(letter, parseInt(m[3], 10), alter);
    }
    m = t.match(/^(Do|Re|Mi|Fa|Sol|La|Si)([#♯b♭]?)(-?\d)$/i);
    if (m) {
      const it = m[1].toLowerCase();
      const letter = Object.keys(SOLFEGE).filter(function (k) {
        return SOLFEGE[k].toLowerCase() === it;
      })[0];
      const alter = (m[2] === '#' || m[2] === '\u266F') ? 1 : (m[2] === 'b' || m[2] === '\u266D') ? -1 : 0;
      return note(letter, parseInt(m[3], 10), alter);
    }
    return null;
  }

  /* ---------------------------------------------------------------- violino */
  // Ordine visivo reale: guardando il proprio violino, da sinistra a destra
  // si vedono Sol, Re, La, Mi.
  const STRINGS = [
    { id: 'G', solfege: 'Sol', roman: 'IV', open: note('G', 3, 0), color: '#8a5a2b' },
    { id: 'D', solfege: 'Re', roman: 'III', open: note('D', 4, 0), color: '#1f7a72' },
    { id: 'A', solfege: 'La', roman: 'II', open: note('A', 4, 0), color: '#2f5fa8' },
    { id: 'E', solfege: 'Mi', roman: 'I', open: note('E', 5, 0), color: '#a8324f' }
  ];
  const STRING_BY_ID = {};
  STRINGS.forEach(function (s) { STRING_BY_ID[s.id] = s; });

  const FINGER_LABEL = ['corda vuota', '1º dito', '2º dito', '3º dito', '4º dito'];
  const DELTA_LABEL = { '-1': 'basso', '0': 'naturale', '1': 'alto' };
  function stringOf(id) {
    return STRING_BY_ID[id];
  }

  /** Aggiunge `steps` gradi diatonici (senza alterazioni) a una nota. */
  function advance(letter, octave, steps) {
    const idx = LETTERS.indexOf(letter) + steps;
    const wrapped = ((idx % 7) + 7) % 7;
    return { letter: LETTERS[wrapped], octave: octave + Math.floor(idx / 7) };
  }

  /* Posizioni sul manico.
     Regola: in posizione P il 1º dito suona il grado diatonico P sopra la
     corda vuota, il dito K suona il grado (P-1)+K. Da qui si ricava la nota
     "naturale" di ogni punto; ogni dito può poi suonare anche un semitono
     sotto (dito basso) o sopra (dito alto): è così che nascono le alterazioni. */
  function placements(maxPosition) {
    const maxP = Math.max(1, maxPosition || 1);
    const out = [];
    STRINGS.forEach(function (s) {
      const openMidi = midi(s.open);
      out.push({
        stringId: s.id, finger: 0, position: 1, baseMidi: openMidi,
        natural: note(s.open.letter, s.open.octave, 0),
        semis: 0, open: true
      });
      for (let p = 1; p <= maxP; p++) {
        for (let k = 1; k <= 4; k++) {
          const a = advance(s.open.letter, s.open.octave, (p - 1) + k);
          const baseMidi = 12 * (a.octave + 1) + SEMI[a.letter];
          out.push({
            stringId: s.id, finger: k, position: p, baseMidi: baseMidi,
            natural: note(a.letter, a.octave, 0),
            semis: baseMidi - openMidi, open: false
          });
        }
      }
    });
    return out;
  }

  const _placementCache = {};
  function allPlacements(maxPosition) {
    const k = maxPosition || 1;
    if (!_placementCache[k]) _placementCache[k] = placements(k);
    return _placementCache[k];
  }

  function placementId(pl) {
    return pl.stringId + ':' + pl.finger + ':' + pl.position;
  }

  /** Tutti i punti (corda+dito) che possono suonare una data altezza MIDI. */
  function placementsForMidi(m, maxPosition) {
    const res = [];
    allPlacements(maxPosition).forEach(function (pl) {
      if (pl.semis > 12) return; // oltre l'ottava non è più prima posizione utile
      const delta = m - pl.baseMidi;
      if (pl.open) {
        if (delta === 0) res.push({ pl: pl, delta: 0 });
        return;
      }
      if (delta >= -1 && delta <= 1) res.push({ pl: pl, delta: delta });
    });
    res.sort(function (a, b) {
      return (a.pl.position - b.pl.position) || (a.pl.finger - b.pl.finger) ||
        (Math.abs(a.delta) - Math.abs(b.delta));
    });
    return res;
  }

  function placementsFor(n, maxPosition) {
    return placementsForMidi(midi(n), maxPosition);
  }

  /** Descrizione di un punto del manico: "2º dito (alto) sulla corda Re" /
      "2nd finger (high) on the D string". */
  function describePlacement(pl, delta) {
    const corda = nomeCorda(pl.stringId);
    const d = delta || 0;
    const v = varianti()[String(d)];
    const pos = pl.position > 1 ? ' — ' + posizioneTesto(pl.position) : '';
    if (pl.open) {
      return lingua === 'en' ? 'open ' + corda + ' string' : 'corda ' + corda + ' a vuoto';
    }
    const dito = dita()[pl.finger];
    const variante = (d !== 0 && v) ? ' (' + v + ')' : '';
    return lingua === 'en'
      ? dito + variante + ' on the ' + corda + ' string' + pos
      : dito + variante + ' sulla corda ' + corda + pos;
  }

  /* --------------------------------------------------------------- livelli */
  const LEVELS = {
    bambini: {
      key: 'bambini', name: 'Bambini', icona: '🧒', maxPosition: 1,
      accidentals: false, minStep: -5, maxStep: 3,
      desc: 'Corde vuote e prime note in 1ª posizione (Sol3–La4), solo note naturali.'
    },
    ragazzi: {
      key: 'ragazzi', name: 'Ragazzi', icona: '🎵', maxPosition: 1,
      accidentals: false, minStep: -5, maxStep: 7,
      desc: 'Tutta la 1ª posizione con note naturali (Sol3–Mi5).'
    },
    adulti: {
      key: 'adulti', name: 'Adulti', icona: '🎼', maxPosition: 1,
      accidentals: true, minStep: -5, maxStep: 9,
      desc: '1ª posizione completa con diesis e bemolli, tagli addizionali.'
    },
    maestri: {
      key: 'maestri', name: 'Maestri', icona: '🏆', maxPosition: 3,
      accidentals: true, minStep: -5, maxStep: 12,
      desc: '1ª–3ª posizione, alterazioni e registro acuto fino al Do6.'
    }
  };
  const LEVEL_ORDER = ['bambini', 'ragazzi', 'adulti', 'maestri'];

  const _poolCache = {};
  /** Note suonabili per un livello (generate dai punti reali sul manico). */
  function notePool(levelKey, preferFlats) {
    const ck = levelKey + '|' + (preferFlats ? 'b' : '#');
    if (_poolCache[ck]) return _poolCache[ck];
    const L = LEVELS[levelKey] || LEVELS.ragazzi;
    const byMidi = new Map();
    allPlacements(L.maxPosition).forEach(function (pl) {
      [-1, 0, 1].forEach(function (delta) {
        const m = pl.baseMidi + delta;
        if (m < 55 || m > 84) return;            // Sol3 … Do6
        const n = fromMidi(m, !!preferFlats);
        if (!L.accidentals && n.alter !== 0) return;
        const st = staffStep(n);
        if (st < L.minStep || st > L.maxStep) return;
        if (!byMidi.has(m)) byMidi.set(m, n);
      });
    });
    const list = Array.from(byMidi.values()).sort(function (a, b) { return midi(a) - midi(b); });
    _poolCache[ck] = list;
    return list;
  }

  /** Tutte le note della 1ª posizione su una corda, in ordine di altezza. */
  function notesOnString(stringId, maxPosition) {
    const map = new Map();
    allPlacements(maxPosition).forEach(function (pl) {
      if (pl.stringId !== stringId || pl.semis > 14) return;
      [-1, 0, 1].forEach(function (delta) {
        if (pl.open && delta !== 0) return; // la corda vuota suona solo se stessa
        // il 4º dito "alto" è una posizione di comodo: non fa parte della
        // prima posizione insegnata, quindi non compare nella tabella
        if (delta === 1 && pl.finger === 4) return;
        const m = pl.baseMidi + delta;
        if (m < 55 || m > 88) return;
        if (!map.has(m)) map.set(m, { note: fromMidi(m, false), placements: [] });
        map.get(m).placements.push({ pl: pl, delta: delta });
      });
    });
    return Array.from(map.values()).sort(function (a, b) { return midi(a.note) - midi(b.note); });
  }

  /** Nome del dito nella lingua attiva. */
  function fingerName(finger) {
    return dita()[finger] || '';
  }

  function isPlayable(n, maxPosition) {
    return placementsFor(n, maxPosition || 3).length > 0;
  }

  /* --------------------------------------------------- utilità per i quiz */
  function shuffle(arr, rng) {
    const a = arr.slice();
    const r = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** Una sola nota per ogni nome (Do, Sol♯…): evita opzioni con la stessa etichetta. */
  function nomeUnici(pool) {
    const visti = new Set();
    return pool.filter(function (n) {
      const k = n.letter + '|' + n.alter;
      if (visti.has(k)) return false;
      visti.add(k);
      return true;
    });
  }

  /** Distrattori: note vicine di nome ma diverse. I nomi restano tutti distinti. */
  function distractors(n, pool, count) {
    const nomeDi = function (x) { return x.letter + '|' + x.alter; };
    const target = nomeDi(n);
    const chosen = [];
    const used = new Set([target]);
    const others = pool.filter(function (x) { return nomeDi(x) !== target; });
    // 1) alterazioni della stessa nota (Fa / Fa♯)
    const sameLetter = others.filter(function (x) { return x.letter === n.letter; });
    // 2) note a distanza di un semitono o due (confusione tipica)
    const nearMidi = others.filter(function (x) { return Math.abs(midi(x) - midi(n)) <= 2; });
    // 3) gradi vicini sul pentagramma
    const nearStep = others.filter(function (x) {
      const d = Math.abs(staffStep(x) - staffStep(n));
      return d > 0 && d <= 2;
    });
    const pool3 = [sameLetter, nearMidi, nearStep, others];
    pool3.forEach(function (p) {
      shuffle(p).forEach(function (cand) {
        if (chosen.length >= count) return;
        const k = nomeDi(cand);
        if (used.has(k)) return;
        used.add(k);
        chosen.push(cand);
      });
    });
    return chosen.slice(0, count);
  }

  return {
    LETTERS: LETTERS, SEMI: SEMI, SOLFEGE: SOLFEGE,
    SHARP: SHARP, FLAT: FLAT, NATURAL: NATURAL,
    STRINGS: STRINGS, FINGER_LABEL: FINGER_LABEL,
    LEVELS: LEVELS, LEVEL_ORDER: LEVEL_ORDER,
    note: note, midi: midi, diatonic: diatonic, staffStep: staffStep,
    freq: freq, freqMidi: freqMidi, accidentalSymbol: accidentalSymbol,
    key: key, midiKey: midiKey, solfege: solfege, solfegeLetter: solfegeLetter,
    solfegeEsteso: solfegeEsteso, solfegeOttava: solfegeOttava,
    setLingua: setLingua, getLingua: getLingua, dita: dita, ordinale: ordinale,
    posizioneTesto: posizioneTesto, nomeCorda: nomeCorda, etichettaCorda: etichettaCorda,
    nomeLivello: nomeLivello, descLivello: descLivello,
    english: english, equals: equals, fromMidi: fromMidi, daNome: daNome,
    stringOf: stringOf, advance: advance,
    placements: placements, allPlacements: allPlacements,
    placementsFor: placementsFor, placementsForMidi: placementsForMidi,
    placementId: placementId, describePlacement: describePlacement,
    notePool: notePool, notesOnString: notesOnString,
    nomeUnici: nomeUnici,
    fingerName: fingerName, isPlayable: isPlayable,
    shuffle: shuffle, distractors: distractors
  };
});
