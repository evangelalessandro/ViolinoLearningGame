/* ==========================================================================
   prepara-campioni.js — Scarica e prepara i campioni di violino per l'app.

   Sorgente: VSCO 2 Community Edition (licenza CC0 1.0 Universal, dominio
   pubblico) — https://github.com/sgossner/VSCO-2-CE
   File originali: Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_<nota>_p.wav
                   Strings/Solo Violin/Pizz/LLVln_Pizz_<nota>_p.wav

   Cosa fa per ogni campione:
     · prende un estratto di 2,0 s a partire da 0,06 s (salta il primissimo
       transiente ma tiene l'attacco dell'archetto)
     · mischia i due canali in mono
     · ricampiona da 44100 a 22050 Hz con filtro anti-aliasing (sinc finestrato)
     · normalizza il picco, applica una breve dissolvenza in entrata e in uscita
     · scrive un WAV PCM 16 bit mono

   Si esegue con:   node tools/prepara-campioni.js
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/Strings/Solo%20Violin/';
const DEST = path.join(__dirname, '..', 'sounds');

const ARCO = ['G3', 'A3', 'C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'G5', 'A5', 'C6'];
const PIZZ = ['A4'];

const RATE_OUT = 22050;
const PICCO = 0.9;

/* Parametri per i due tipi di campione.
   Arco: si tiene l'ATTACCO naturale (i primi 20 ms sono quasi silenzio, poi il
   livello sale in circa 0,15 s: è quello che fa sembrare il suono "ad arco" e
   non "pizzicato") e si prende un estratto lungo dal corpo stabile della nota,
   così la nota può durare quanto serve senza essere tagliata.
   Pizzicato: corto, l'attacco È il suono. */
const ARCO_OPZ = { inizio: 0.0, durata: 3.5, fadeIn: 0.005, fadeOut: 0.6 };
const PIZZ_OPZ = { inizio: 0.0, durata: 1.1, fadeIn: 0.001, fadeOut: 0.25 };

/* ------------------------------------------------------------------ WAV --- */
function leggiWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('non è un file WAV');
  }
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4);
    const sz = buf.readUInt32LE(p + 4);
    const corpo = p + 8;
    if (id === 'fmt ') {
      fmt = {
        formato: buf.readUInt16LE(corpo),
        canali: buf.readUInt16LE(corpo + 2),
        rate: buf.readUInt32LE(corpo + 4),
        bit: buf.readUInt16LE(corpo + 14)
      };
    } else if (id === 'data') {
      data = { inizio: corpo, lunghezza: Math.min(sz, buf.length - corpo) };
      break;
    }
    p = corpo + sz + (sz % 2);
  }
  if (!fmt || !data) throw new Error('WAV senza fmt o data');
  if (fmt.formato !== 1 && fmt.formato !== 3) throw new Error('formato WAV non gestito: ' + fmt.formato);

  const bytePerCampione = fmt.bit / 8;
  const n = Math.floor(data.lunghezza / (bytePerCampione * fmt.canali));
  const canali = [];
  for (let ch = 0; ch < fmt.canali; ch++) canali.push(new Float32Array(n));

  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < fmt.canali; ch++) {
      const off = data.inizio + (i * fmt.canali + ch) * bytePerCampione;
      let v;
      if (fmt.formato === 3) v = buf.readFloatLE(off);
      else if (fmt.bit === 16) v = buf.readInt16LE(off) / 32768;
      else if (fmt.bit === 24) v = (buf.readIntLE(off, 3) | 0) / 8388608;
      else if (fmt.bit === 32) v = buf.readInt32LE(off) / 2147483648;
      else throw new Error('bit depth non gestita: ' + fmt.bit);
      canali[ch][i] = v;
    }
  }
  return { rate: fmt.rate, canali: canali };
}

function scriviWav(percorso, campioni, rate) {
  const n = campioni.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(1, 22);          // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let v = Math.max(-1, Math.min(1, campioni[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(percorso, buf);
  return buf.length;
}

/* ------------------------------------------------------- filtri e ricampiona */
/** Filtro passa-basso a fase lineare (sinc finestrato con Hamming). */
function passaBasso(campioni, rate, taglio, taps) {
  const n = taps % 2 === 0 ? taps + 1 : taps;
  const meta = (n - 1) / 2;
  const fc = taglio / rate;                 // frequenza normalizzata (0..0,5)
  const h = new Float64Array(n);
  let somma = 0;
  for (let i = 0; i < n; i++) {
    const k = i - meta;
    const sinc = k === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * k) / (Math.PI * k);
    const win = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
    h[i] = sinc * win;
    somma += h[i];
  }
  for (let i = 0; i < n; i++) h[i] /= somma;    // guadagno unitario in continua
  const out = new Float32Array(campioni.length);
  for (let i = 0; i < campioni.length; i++) {
    let acc = 0;
    for (let k = 0; k < n; k++) {
      const j = i + k - meta;
      if (j >= 0 && j < campioni.length) acc += campioni[j] * h[k];
    }
    out[i] = acc;
  }
  return out;
}

/** Da `rateIn` a `rateOut`: filtro anti-aliasing + interpolazione lineare. */
function ricampiona(campioni, rateIn, rateOut) {
  if (rateIn === rateOut) return campioni;
  const filtrato = rateOut < rateIn
    ? passaBasso(campioni, rateIn, rateOut * 0.45, 63)
    : campioni;
  const n = Math.floor(campioni.length * rateOut / rateIn);
  const out = new Float32Array(n);
  const passo = rateIn / rateOut;
  for (let i = 0; i < n; i++) {
    const x = i * passo;
    const i0 = Math.floor(x);
    const i1 = Math.min(filtrato.length - 1, i0 + 1);
    const t = x - i0;
    out[i] = filtrato[i0] * (1 - t) + filtrato[i1] * t;
  }
  return out;
}

/* ------------------------------------------------------------------ main --- */
async function scarica(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' su ' + url);
  return Buffer.from(await r.arrayBuffer());
}

async function prepara(remoto, locale, opz) {
  const url = BASE + encodeURI(remoto);
  const grezzo = await scarica(url);
  const wav = leggiWav(grezzo);

  // mono
  const n = wav.canali[0].length;
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let ch = 0; ch < wav.canali.length; ch++) s += wav.canali[ch][i];
    mono[i] = s / wav.canali.length;
  }

  // estratto
  const da = Math.floor(opz.inizio * wav.rate);
  const a = Math.min(n, da + Math.floor(opz.durata * wav.rate));
  const estratto = mono.slice(da, a);

  // ricampiona
  const ridotto = ricampiona(estratto, wav.rate, RATE_OUT);

  // normalizza
  let picco = 0;
  for (let i = 0; i < ridotto.length; i++) { const v = Math.abs(ridotto[i]); if (v > picco) picco = v; }
  const guadagno = picco > 0 ? PICCO / picco : 1;
  for (let i = 0; i < ridotto.length; i++) ridotto[i] *= guadagno;

  // dissolvenze
  const fi = Math.floor(opz.fadeIn * RATE_OUT);
  const fo = Math.floor(opz.fadeOut * RATE_OUT);
  for (let i = 0; i < fi && i < ridotto.length; i++) ridotto[i] *= i / fi;
  for (let i = 0; i < fo && i < ridotto.length; i++) {
    ridotto[ridotto.length - 1 - i] *= i / fo;
  }

  const file = path.join(DEST, locale + '.wav');
  const byte = scriviWav(file, ridotto, RATE_OUT);
  console.log('  ' + path.basename(file).padEnd(14) +
    (ridotto.length / RATE_OUT).toFixed(2) + ' s  ' +
    String(Math.round(byte / 1024)).padStart(4) + ' KB   (sorgente ' +
    (grezzo.length / 1024 / 1024).toFixed(1) + ' MB)');
  return byte;
}

(async function () {
  fs.mkdirSync(DEST, { recursive: true });
  const lavori = ARCO.map(function (n) {
    return { remoto: 'Arco Vib/LLVln_ArcoVib_' + n + '_f.wav', locale: 'arco-' + n, opz: ARCO_OPZ };
  }).concat(PIZZ.map(function (n) {
    return { remoto: 'Pizz/LLVln_Pizz_' + n + '_f_RR1.wav', locale: 'pizz-' + n, opz: PIZZ_OPZ };
  }));

  console.log('Campioni VSCO 2 CE (CC0) → ' + DEST + '\n');
  let totale = 0, fatti = 0;
  for (const l of lavori) {
    try {
      totale += await prepara(l.remoto, l.locale, l.opz);
      fatti++;
    } catch (e) {
      console.log('  ✗ ' + l.locale + ': ' + e.message);
      process.exitCode = 1;
    }
  }
  console.log('\nTotale: ' + Math.round(totale / 1024) + ' KB in ' + fatti + ' file');
})();
