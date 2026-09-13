/* Misura l'inviluppo d'attacco dei campioni originali VSCO, per capire dove
   tagliare senza rovinare l'attacco dell'archetto. */
const fs = require('fs');

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
  return { rate: fmt.rate, d: d, durata: n / fmt.rate };
}

const file = process.argv[2];
const w = leggi(file);
console.log(file + '  ' + w.durata.toFixed(2) + ' s @ ' + w.rate + ' Hz\n');
console.log('  da      a     RMS      picco   (come cambia il livello)');
const finestre = [[0, 0.02], [0.02, 0.05], [0.05, 0.1], [0.1, 0.2], [0.2, 0.4], [0.4, 0.8], [0.8, 1.5], [1.5, 2.5], [2.5, 4.0]];
let massimo = 0;
finestre.forEach(function (f) {
  const i0 = Math.floor(f[0] * w.rate), i1 = Math.min(w.d.length, Math.floor(f[1] * w.rate));
  let s = 0, p = 0;
  for (let i = i0; i < i1; i++) { s += w.d[i] * w.d[i]; const a = Math.abs(w.d[i]); if (a > p) p = a; }
  const rms = Math.sqrt(s / Math.max(1, i1 - i0));
  if (rms > massimo) massimo = rms;
  const barra = '█'.repeat(Math.round(rms / 0.35 * 40));
  console.log('  ' + f[0].toFixed(2).padStart(5) + '  ' + f[1].toFixed(2).padStart(5) +
    '  ' + rms.toFixed(4) + '  ' + p.toFixed(4) + '  ' + barra);
});
console.log('\nlivello massimo: ' + massimo.toFixed(4));
