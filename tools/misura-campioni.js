/* Misura l'altezza reale di ogni campione preparato.
   Il vibrato allarga lo spettro, quindi si misura su finestre corte e si prende
   la mediana: è il centro dell'oscillazione, cioè l'intonazione del campione. */
const fs = require('fs');
const path = require('path');

function leggi(p) {
  const b = fs.readFileSync(p);
  let q = 12, fmt = null, dat = null;
  while (q + 8 <= b.length) {
    const id = b.toString('ascii', q, q + 4), sz = b.readUInt32LE(q + 4), c = q + 8;
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(c + 2), rate: b.readUInt32LE(c + 4), bit: b.readUInt16LE(c + 14) };
    else if (id === 'data') { dat = { i: c, n: Math.min(sz, b.length - c) }; break; }
    q = c + sz + (sz % 2);
  }
  const n = Math.floor(dat.n / (fmt.bit / 8 * fmt.ch));
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = dat.i + (i * fmt.ch) * (fmt.bit / 8);
    d[i] = fmt.bit === 16 ? b.readInt16LE(o) / 32768 : b.readIntLE(o, 3) / 8388608;
  }
  return { rate: fmt.rate, d: d };
}

function goertzel(d, rate, f, i0, i1) {
  const N = i1 - i0;
  const k = 2 * Math.cos(2 * Math.PI * f / rate);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < N; i++) {
    const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const s0 = d[i0 + i] * w + k * s1 - s2;
    s2 = s1; s1 = s0;
  }
  const re = s1 - s2 * Math.cos(2 * Math.PI * f / rate);
  const im = s2 * Math.sin(2 * Math.PI * f / rate);
  return Math.sqrt(re * re + im * im) * 2 / N;
}

/** Stima l'altezza su più finestre corte: mediana delle stime. */
function stima(w, atteso) {
  const rate = w.rate, d = w.d;
  const lung = Math.floor(0.35 * rate);
  const stime = [];
  for (let inizio = 0.25; inizio + 0.35 <= d.length / rate; inizio += 0.3) {
    const i0 = Math.floor(inizio * rate), i1 = i0 + lung;
    let best = -1, bf = 0;
    for (let f = atteso * 0.96; f <= atteso * 1.04; f += 0.1) {
      const v = goertzel(d, rate, f, i0, i1);
      if (v > best) { best = v; bf = f; }
    }
    stime.push(bf);
  }
  stime.sort(function (a, b) { return a - b; });
  return stime[Math.floor(stime.length / 2)];
}

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freqAttesa(nota) {
  const m = nota.match(/^([A-G])(#|b)?(\d)$/);
  const midi = 12 * (parseInt(m[3], 10) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const dir = path.join(__dirname, '..', 'sounds');
const files = fs.readdirSync(dir).filter(function (f) { return /\.wav$/.test(f); }).sort();
console.log('campione        atteso Hz   misurato Hz   cent    MIDI  file');
const tabella = [];
files.forEach(function (f) {
  const nota = f.replace(/^(arco|pizz)-/, '').replace('.wav', '');
  const attesa = freqAttesa(nota);
  const w = leggi(path.join(dir, f));
  const mis = stima(w, attesa);
  const cent = 1200 * Math.log2(mis / attesa);
  tabella.push({ file: f, nota: nota, midi: Math.round(69 + 12 * Math.log2(mis / 440) * 100) / 100, freq: Math.round(mis * 100) / 100 });
  console.log(f.padEnd(15) + attesa.toFixed(1).padStart(9) + mis.toFixed(1).padStart(13) +
    cent.toFixed(0).padStart(7) + '   ' + tabella[tabella.length - 1].midi.toFixed(2).padStart(6) + '  ' + f);
});
console.log('\nTabella per audio.js (nota dichiarata e frequenza reale misurata):');
tabella.filter(function (t) { return t.file.indexOf('arco') === 0; }).forEach(function (t) {
  console.log("  { nota: '" + t.nota + "', file: 'sounds/" + t.file + "', hz: " + t.freq + " },");
});
