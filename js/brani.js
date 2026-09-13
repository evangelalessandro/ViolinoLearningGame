/* ==========================================================================
   brani.js — Brani per i giochi "Violin Hero" e "Brani classici"
   Ogni brano è una melodia di pubblico dominio scritta come sequenza di
   [nota, durata in battiti]. Le note usano i nomi internazionali (C4, F#4…)
   e vengono convertite nel modello di teoria con Theory.daNome().

   Tutte le melodie stanno nella prima posizione del violino (Sol3–Do6) e sono
   verificabili con `node test/test-motore.js`.
   ========================================================================== */
window.Brani = (function () {
  'use strict';

  const T = window.Theory;

  const BRANI = [
    {
      chiave: 'gioia',
      titolo: 'Inno alla Gioia',
      titoloEn: 'Ode to Joy',
      autore: 'Ludwig van Beethoven',
      autoreEn: 'Ludwig van Beethoven',
      bpm: 100,
      difficolta: 1,
      note: [
        ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1],
        ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
        ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1],
        ['E4', 1.5], ['D4', 0.5], ['D4', 2],
        ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1],
        ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
        ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1],
        ['D4', 1.5], ['C4', 0.5], ['C4', 2]
      ]
    },
    {
      chiave: 'elisa',
      titolo: 'Per Elisa (inizio)',
      titoloEn: 'Für Elise (opening)',
      autore: 'Ludwig van Beethoven',
      autoreEn: 'Ludwig van Beethoven',
      bpm: 92,
      difficolta: 2,
      note: [
        ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1.5],
        ['C4', 0.5], ['E4', 0.5], ['A4', 0.5], ['B4', 1.5],
        ['E4', 0.5], ['G#4', 0.5], ['B4', 0.5], ['C5', 1.5],
        ['E4', 0.5], ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['D#5', 0.5], ['E5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1.5]
      ]
    },
    {
      chiave: 'pachelbel',
      titolo: 'Canone di Pachelbel (tema)',
      titoloEn: 'Pachelbel\'s Canon (theme)',
      autore: 'Johann Pachelbel',
      autoreEn: 'Johann Pachelbel',
      bpm: 84,
      difficolta: 2,
      note: [
        ['E5', 1], ['D5', 1], ['C5', 1], ['B4', 1],
        ['A4', 1], ['G4', 1], ['A4', 1], ['B4', 1]
      ]
    },
    {
      chiave: 'martino',
      titolo: 'Fra Martino',
      titoloEn: 'Frère Jacques',
      autore: 'Canzone tradizionale',
      autoreEn: 'Traditional',
      bpm: 96,
      difficolta: 1,
      note: [
        ['C4', 1], ['D4', 1], ['E4', 1], ['C4', 1],
        ['C4', 1], ['D4', 1], ['E4', 1], ['C4', 1],
        ['E4', 1], ['F4', 1], ['G4', 2],
        ['E4', 1], ['F4', 1], ['G4', 2],
        ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['E4', 1], ['C4', 1],
        ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F4', 0.5], ['E4', 1], ['C4', 1],
        ['C4', 1], ['G3', 1], ['C4', 2],
        ['C4', 1], ['G3', 1], ['C4', 2]
      ]
    },
    {
      chiave: 'stella',
      titolo: 'Brillante stella',
      titoloEn: 'Twinkle, Twinkle, Little Star',
      autore: 'Melodia tradizionale francese',
      autoreEn: 'Traditional French melody',
      bpm: 100,
      difficolta: 1,
      note: [
        ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2],
        ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2],
        ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 2],
        ['G4', 1], ['G4', 1], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 2],
        ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2],
        ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2]
      ]
    },
    {
      chiave: 'jingle',
      titolo: 'Jingle Bells',
      titoloEn: 'Jingle Bells',
      autore: 'James Lord Pierpont',
      autoreEn: 'James Lord Pierpont',
      bpm: 108,
      difficolta: 1,
      note: [
        ['E4', 1], ['E4', 1], ['E4', 2],
        ['E4', 1], ['E4', 1], ['E4', 2],
        ['E4', 1], ['G4', 1], ['C4', 1], ['D4', 1], ['E4', 4],
        ['F4', 1], ['F4', 1], ['F4', 1], ['F4', 1],
        ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
        ['E4', 1], ['D4', 1], ['D4', 1], ['E4', 1], ['D4', 2], ['G4', 2]
      ]
    },
    {
      chiave: 'scale',
      titolo: 'Scala e arpeggio di Do',
      titoloEn: 'C major scale and arpeggio',
      autore: 'Esercizio',
      autoreEn: 'Exercise',
      bpm: 88,
      difficolta: 1,
      note: [
        ['C4', 1], ['D4', 1], ['E4', 1], ['F4', 1], ['G4', 1], ['A4', 1], ['B4', 1], ['C5', 1],
        ['C5', 1], ['B4', 1], ['A4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1], ['C4', 1],
        ['C4', 1], ['E4', 1], ['G4', 1], ['C5', 1], ['G4', 1], ['E4', 1], ['C4', 2]
      ]
    }
  ];

  const PER_CHIAVE = {};
  BRANI.forEach(function (b) { PER_CHIAVE[b.chiave] = b; });

  function titolo(b) { return T.getLingua() === 'en' ? (b.titoloEn || b.titolo) : b.titolo; }
  function autore(b) { return T.getLingua() === 'en' ? (b.autoreEn || b.autore) : b.autore; }
  function perChiave(k) { return PER_CHIAVE[k] || null; }
  /** Numero totale di battiti del brano. */
  function durata(b) {
    return b.note.reduce(function (s, n) { return s + n[1]; }, 0);
  }
  /** Le note del brano come note del modello di teoria. */
  function noteDi(b) {
    return b.note.map(function (n) { return T.daNome(n[0]); });
  }

  return {
    BRANI: BRANI, perChiave: perChiave, titolo: titolo, autore: autore,
    durata: durata, noteDi: noteDi
  };
})();
