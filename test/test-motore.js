/* ==========================================================================
   test-motore.js — Verifica automatica della logica (senza browser)
   Si esegue con:  node test/test-motore.js
   Controlla che per ogni livello e ogni gioco:
     - ogni nota delle domande sia davvero suonabile in 1ª posizione
     - ogni nota abbia una pallina cliccabile sul manico (e quindi una risposta)
     - le domande abbiano una sola risposta giusta fra le opzioni
     - una partita completa finisca sempre, con punteggi coerenti
   ========================================================================== */
'use strict';

global.window = global;
require('../js/theory.js');
require('../js/violin.js');
require('../js/games.js');

const T = global.window.Theory;
const V = global.window.Violin;
const G = global.window.Gioco;

let prove = 0, fallite = 0;
function ok(cond, msg) {
  prove++;
  if (!cond) { fallite++; console.log('  ✗ ' + msg); }
}
function titolo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 60 - t.length))); }

/* ---------------------------------------------------- 1. note e pentagramma */
titolo('1. Notazione');
ok(T.midi(T.note('A', 4)) === 69, 'La4 = MIDI 69');
ok(Math.abs(T.freq(T.note('A', 4)) - 440) < 0.001, 'La4 = 440 Hz');
ok(T.staffStep(T.note('E', 4)) === 0, 'Mi4 sulla 1ª riga');
ok(T.staffStep(T.note('F', 5)) === 8, 'Fa5 sulla 5ª riga');
ok(T.staffStep(T.note('C', 4)) === -2, 'Do4 sul primo taglio sotto');
ok(T.staffStep(T.note('G', 3)) === -5, 'Sol3 sotto il 2º taglio');
ok(T.staffStep(T.note('A', 5)) === 10, 'La5 sul 1º taglio sopra');
ok(T.staffStep(T.note('C', 6)) === 12, 'Do6 sul 2º taglio sopra');
ok(T.solfege(T.note('F', 4, 1)) === 'Fa♯', 'nome italiano con diesis');
ok(T.solfege(T.note('B', 3, -1)) === 'Si♭', 'nome italiano con bemolle');
ok(T.key(T.fromMidi(66, false)) === 'F#4', 'da MIDI 66 a Fa♯4');
ok(T.key(T.fromMidi(66, true)) === 'Gb4', 'da MIDI 66 a Sol♭4 (bemolli)');

/* ------------------------------------------------------ 2. diteggiature */
titolo('2. Diteggiature della prima posizione');
const attese = {
  'G:0': 'G3', 'G:1': 'A3', 'G:2': 'B3', 'G:3': 'C4', 'G:4': 'D4',
  'D:0': 'D4', 'D:1': 'E4', 'D:2': 'F4', 'D:3': 'G4', 'D:4': 'A4',
  'A:0': 'A4', 'A:1': 'B4', 'A:2': 'C5', 'A:3': 'D5', 'A:4': 'E5',
  'E:0': 'E5', 'E:1': 'F5', 'E:2': 'G5', 'E:3': 'A5', 'E:4': 'B5'
};
T.allPlacements(1).forEach(function (pl) {
  const k = pl.stringId + ':' + pl.finger;
  if (pl.finger === 0) return;
  ok(T.key(pl.natural) === attese[k], 'prima posizione ' + k + ' = ' + attese[k] +
    ' (trovato ' + T.key(pl.natural) + ')');
});
// note enarmoniche raggiungibili con il dito "basso" o "alto"
ok(T.placementsForMidi(T.midi(T.note('F', 4, 1)), 1).some(function (r) {
  return r.pl.stringId === 'D' && r.pl.finger === 2 && r.delta === 1;
}), 'Fa♯4 = 2º dito alto sulla corda Re');
ok(T.placementsForMidi(T.midi(T.note('B', 4, -1)), 1).some(function (r) {
  return r.pl.stringId === 'A' && r.pl.finger === 1 && r.delta === -1;
}), 'Si♭4 = 1º dito basso sulla corda La');
ok(T.placementsForMidi(T.midi(T.note('D', 4)), 1).length >= 2, 'Re4 suona su due corde (Re vuota e 4º dito Sol)');

/* ---------------------------------------------------------- 3. livelli */
titolo('3. Livelli: note suonabili e trovabili sul manico');
T.LEVEL_ORDER.forEach(function (lv) {
  const L = T.LEVELS[lv];
  [false, true].forEach(function (bemolli) {
    const pool = T.notePool(lv, bemolli);
    const etichetta = lv + (bemolli ? ' (bemolli)' : '');
    ok(pool.length >= 5, etichetta + ': almeno 5 note (' + pool.length + ')');
    const slots = V.slotMappa({ maxPosition: L.maxPosition, naturalsOnly: !L.accidentals });
    const midis = new Set(slots.map(function (s) { return s.midi; }));
    let nonTrovabili = [];
    pool.forEach(function (n) {
      if (!T.placementsFor(n, L.maxPosition).length) nonTrovabili.push('non suonabile ' + T.solfege(n));
      if (!midis.has(T.midi(n))) nonTrovabili.push('senza pallina ' + T.solfege(n));
    });
    ok(nonTrovabili.length === 0, etichetta + ': ' + nonTrovabili.join(', '));
    // le palline devono stare tutte sulla corda giusta
    slots.forEach(function (s) {
      const open = T.midi(T.stringOf(s.stringId).open);
      ok(open + s.semis === s.midi, 'pallina ' + s.stringId + s.semis + ' coerente con la corda');
    });
    console.log('  · ' + etichetta.padEnd(18) + ' note=' + String(pool.length).padStart(3) +
      '  palline=' + String(slots.length).padStart(3) +
      '  (' + T.solfege(pool[0]) + '…' + T.solfege(pool[pool.length - 1]) + ')');
  });
});

/* --------------------------------------------------- 4. generazione domande */
titolo('4. Generazione delle domande');
let domande = 0;
G.ORDINE.forEach(function (modo) {
  T.LEVEL_ORDER.forEach(function (lv) {
    const s = new G.Sessione({ modo: modo, livello: lv, numOpzioni: 4 });
    for (let i = 0; i < 120; i++) {
      const q = s.creaDomanda();
      domande++;
      if (q.tipo === 'posizione') {
        ok(q.soluzioni && q.soluzioni.length > 0, modo + '/' + lv + ': soluzione presente');
      } else {
        ok(q.opzioni.length === 4, modo + '/' + lv + ': quattro opzioni');
        const giuste = q.opzioni.filter(function (o) { return T.midi(o) === T.midi(q.nota); });
        ok(giuste.length === 1, modo + '/' + lv + ': una sola risposta giusta');
        ok(q.indiceGiusto >= 0 && q.indiceGiusto < q.opzioni.length, modo + '/' + lv + ': indice valido');
        const chiavi = new Set(q.opzioni.map(function (o) { return T.midi(o); }));
        ok(chiavi.size === q.opzioni.length, modo + '/' + lv + ': opzioni tutte diverse');
        // i nomi devono essere distinti: due "Sol" (Sol3 e Sol4) darebbero due
        // pulsanti identici e una domanda impossibile
        const nomi = new Set(q.opzioni.map(function (o) { return o.letter + '|' + o.alter; }));
        ok(nomi.size === q.opzioni.length, modo + '/' + lv + ': nomi delle opzioni tutti diversi');
      }
    }
  });
});
console.log('  · ' + domande + ' domande generate');

/* ------------------------------------------------------- 5. partite complete */
titolo('5. Partite complete (simulazione)');

let finto = 0;
global.performance = { now: function () { return finto; } };

function simula(modo, lv, bravura) {
  const s = new G.Sessione({ modo: modo, livello: lv });
  s.avvia();
  s.fermaTimer();
  let passi = 0;
  while (s.fase !== 'fine' && passi < 4000) {
    passi++;
    if (s.modo.layout === 'turni' && s.fase === 'turno') {
      s.avviaTurno(s.turno); s.fermaTimer(); finto += 100; continue;
    }
    const giocatori = s.perGiocatore ? [0, 1] : [0];
    giocatori.forEach(function (i) {
      if (s.fase === 'fine') return;
      const q = s.domandaDi(i);
      if (!q) return;
      const giusto = Math.random() < bravura;
      let risposta;
      if (q.tipo === 'posizione') {
        const r = giusto ? q.soluzioni[0] : null;
        const scelta = r || { pl: { stringId: 'E', baseMidi: 0 }, delta: 0 };
        const stringId = r ? r.pl.stringId : (q.soluzioni[0].pl.stringId === 'G' ? 'E' : 'G');
        const midi = r ? (r.pl.baseMidi + r.delta) : (T.midi(q.nota) + 1);
        risposta = { tipo: 'posizione', slot: { stringId: stringId, midi: midi } };
      } else {
        risposta = {
          tipo: 'nome',
          valore: giusto ? q.nota : q.opzioni[(q.indiceGiusto + 1) % q.opzioni.length]
        };
      }
      const esito = s.rispondi(i, risposta);
      if (esito && esito.corretto !== giusto && q.tipo !== 'posizione') {
        ok(false, modo + '/' + lv + ': esito incoerente');
      }
      s.fermaTimer();
      finto += 1500;
      s.tick();
      if (s.fase === 'fine') return;
      if (s.modo.layout === 'race') {
        if (esito && esito.fineRound) { s.prossimoRound(); s.fermaTimer(); }
      } else if (s.perGiocatore) {
        s.prossima(i); s.fermaTimer();
      } else {
        s.prossima(i); s.fermaTimer();
      }
    });
    // le modalità a tempo finiscono quando scade l'orologio
    if (s.secondi) { finto += 1200; s.tick(); if (s.fase === 'fine') break; }
    if (!s.perGiocatore || true) { finto += 200; }
  }
  const r = s.calcolaRisultato();
  ok(s.fase === 'fine', modo + '/' + lv + ': la partita termina (passi=' + passi + ')');
  ok(r.giocatori.length === (s.modo.giocatori || 1), modo + '/' + lv + ': numero giocatori');
  r.giocatori.forEach(function (g) {
    ok(g.punti >= 0 && g.giusti >= 0 && g.precisione >= 0 && g.precisione <= 100,
      modo + '/' + lv + ': statistiche sensate per ' + g.nome);
  });
  if (r.giocatori.length === 2) {
    ok(r.vincitore === -1 || (r.vincitore >= 0 && r.vincitore < 2), modo + '/' + lv + ': vincitore valido');
  }
  return { modo: modo, lv: lv, passi: passi, r: r };
}

const riepilogo = [];
G.ORDINE.forEach(function (modo) {
  T.LEVEL_ORDER.forEach(function (lv) {
    const esito = simula(modo, lv, 0.75);
    riepilogo.push(esito);
  });
});
riepilogo.forEach(function (e) {
  const g = e.r.giocatori.map(function (x) { return x.nome + ' ' + x.punti + 'pt(' + x.giusti + '✓/' + x.sbagli + '✗)'; });
  console.log('  · ' + (e.modo + '/' + e.lv).padEnd(24) + g.join('  vs  ') + '   passi=' + e.passi);
});

/* ------------------------------------------------- 6. riepilogo degli errori */
titolo('6. Riepilogo degli errori');
(function () {
  const s = new G.Sessione({ modo: 'leggi', livello: 'ragazzi' });
  const N = T.note;
  const pos = function (stringId, semis, midi, finger, delta) {
    return { stringId: stringId, semis: semis, midi: midi, primary: { pl: { stringId: stringId, finger: finger, position: 1, open: false, baseMidi: midi - delta }, delta: delta } };
  };
  s.storico = [
    { numero: 1, tipo: 'nome', nota: N('F', 4, 1), opzioni: [], risposta: N('F', 4, 0), corretto: false, giocatore: 0, slot: null },
    { numero: 2, tipo: 'nome', nota: N('G', 4, 0), opzioni: [], risposta: N('G', 3, 0), corretto: false, giocatore: 0, slot: null },
    { numero: 3, tipo: 'nome', nota: N('E', 4, 0), opzioni: [], risposta: N('D', 4, 0), corretto: false, giocatore: 0, slot: null },
    { numero: 4, tipo: 'nome', nota: N('C', 5, 0), opzioni: [], risposta: N('A', 4, 0), corretto: false, giocatore: 0, slot: null },
    { numero: 5, tipo: 'nome', nota: N('D', 4, 0), opzioni: [], risposta: N('D', 4, 0), corretto: true, giocatore: 0, slot: null },
    { numero: 6, tipo: 'posizione', nota: N('A', 3, 0), opzioni: [], soluzioni: [], risposta: null, corretto: false, giocatore: 0, slot: pos('E', 5, 81, 3, 0) },
    { numero: 7, tipo: 'posizione', nota: N('F', 4, 1), opzioni: [], soluzioni: [], risposta: null, corretto: false, giocatore: 0, slot: pos('D', 3, 65, 2, -1) }
  ];
  const r = G.riepilogaErrori(s);
  ok(r.totale === 7, 'totale domande');
  ok(r.giuste === 1 && r.sbagliate === 6, 'conteggio giuste/sbagliate');
  ok(r.precisione === 14, 'precisione calcolata');
  ok(r.voci.length === 6, 'una voce per ogni errore');
  const categorie = r.voci.map(function (v) { return v.categoria; });
  ok(categorie.join(',') === 'alterazione,ottava,pentagramma,lontana,corda,dito',
    'categorie riconosciute: ' + categorie.join(','));
  ok(r.piuFrequente === null, 'con un solo caso per tipo non c\'è un "più frequente"');
  r.voci.forEach(function (v) {
    ok(v.spiegazione && v.spiegazione.length > 25, 'spiegazione presente per la domanda ' + v.numero);
    ok(v.rimedio && v.rimedio.length > 15, 'rimedio presente per la domanda ' + v.numero);
    ok(v.titolo && v.dove, 'titolo e posizione sul manico per la domanda ' + v.numero);
    ok(v.ascolta.length >= 1 && v.ascolta.every(function (m) { return m > 20 && m < 110; }),
      'altezze da ascoltare valide per la domanda ' + v.numero);
  });
  // il "più frequente" compare quando un tipo si ripete
  s.storico.push({ numero: 8, tipo: 'nome', nota: N('F', 4, 1), opzioni: [], risposta: N('F', 4, 0), corretto: false, giocatore: 0, slot: null });
  const r2 = G.riepilogaErrori(s);
  ok(r2.piuFrequente && r2.piuFrequente.chiave === 'alterazione' && r2.piuFrequente.conteggio === 2,
    'errore più frequente individuato');
  ok(G.riepilogaErrori(null) === null, 'sessione assente gestita');
})();

/* ------------------------------------------------------------ 7. la pausa */
titolo('7. Pausa e ripresa (per consultare il riepilogo)');
(function () {
  finto = 0;
  const s = new G.Sessione({ modo: 'tempo', livello: 'ragazzi' });
  s.avvia(); s.fermaTimer();
  finto = 10000; s.tick();
  const prima = s.tempo;
  ok(Math.abs(prima - 50) < 0.01, 'dopo 10 secondi ne restano 50 (' + prima.toFixed(1) + ')');
  s.pausa();
  finto = 30000;
  s.riprendi();
  s.tick();
  ok(Math.abs(s.tempo - prima) < 0.01, 'la pausa non consuma tempo di gioco (' + s.tempo.toFixed(1) + ')');
  ok(s.inPausa === false, 'la sessione è di nuovo attiva');
  s.fermaTimer();

  const s2 = new G.Sessione({ modo: 'leggi', livello: 'ragazzi' });
  s2.avvia(); s2.fermaTimer();
  const q = s2.domanda;
  s2.rispondi(0, { tipo: 'nome', valore: q.nota });
  ok(s2._attese.length === 1, 'avanzamento programmato dopo la risposta');
  s2.pausa();
  ok(s2._attese.length === 0 && s2._atteseSospese.length === 1, 'avanzamento sospeso dalla pausa');
  ok(s2.prossima(0) === undefined && s2.fase === 'feedback', 'mentre è in pausa non si avanza');
  s2.riprendi();
  ok(s2._attese.length === 1, 'avanzamento riprogrammato alla ripresa');
  s2.fermaTimer();
})();

/* ------------------------------------------------------------------ esito */
console.log('\n' + '═'.repeat(64));
console.log(fallite === 0
  ? '✅ TUTTI I CONTROLLI SUPERATI (' + prove + ' verifiche)'
  : '❌ ' + fallite + ' controlli falliti su ' + prove);
process.exit(fallite === 0 ? 0 : 1);
