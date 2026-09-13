/* ==========================================================================
   test-audio.js — Verifica del timbro del violino analizzando lo spettro
   Non potendo ascoltare, il suono viene renderizzato con OfflineAudioContext e
   analizzato con la trasformata di Goertzel.

   Nota di metodo: un segnale con vibrato è modulato in frequenza, quindi una
   misura coerente a frequenza fissa non è affidabile. Lo spettro "pulito" si
   misura perciò con `vibrato: false`, mentre il vibrato si verifica a parte
   guardando quanta energia c'è ai lati della fondamentale.

   Come si usa (serve Chrome e l'app servita via HTTP):
       python -m http.server 8899
       node test/test-audio.js
   ========================================================================== */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
function arg(nome, predefinito) {
  const i = args.indexOf('--' + nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : predefinito;
}
const URL_APP = arg('url', 'http://127.0.0.1:8899/index.html');
const PORTA = parseInt(arg('porta', '9342'), 10);

function trovaChrome() {
  const candidati = [
    arg('chrome', ''), process.env.CHROME_PATH || '',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  for (const c of candidati) { if (fs.existsSync(c)) return c; }
  return null;
}

const CHROME = trovaChrome();
if (!CHROME) {
  console.log('⚠  Chrome/Edge non trovato: salto la verifica del suono.');
  process.exit(0);
}

/* Analisi eseguita DENTRO la pagina: restituisce solo numeri. */
const STRUMENTI = `
window.__audio = (function () {
  function goertzel(d, rate, freq, i0, i1) {
    const N = i1 - i0;
    const k = 2 * Math.cos(2 * Math.PI * freq / rate);
    let s1 = 0, s2 = 0;
    for (let i = 0; i < N; i++) {
      const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
      const s0 = d[i0 + i] * w + k * s1 - s2;
      s2 = s1; s1 = s0;
    }
    const re = s1 - s2 * Math.cos(2 * Math.PI * freq / rate);
    const im = s2 * Math.sin(2 * Math.PI * freq / rate);
    return Math.sqrt(re * re + im * im) * 2 / N;
  }
  function rms(d, rate, a, b) {
    const i0 = Math.max(0, Math.floor(a * rate));
    const i1 = Math.min(d.length, Math.floor(b * rate));
    let s = 0;
    for (let i = i0; i < i1; i++) s += d[i] * d[i];
    return Math.sqrt(s / Math.max(1, i1 - i0));
  }
  function piccoDi(d) {
    let p = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > p) p = a; }
    return p;
  }
  function nonNulli(d) {
    let n = 0;
    for (let i = 0; i < d.length; i++) { if (Math.abs(d[i]) > 1e-5) n++; }
    return n;
  }
  return {
    analizza: function (midi, dur, opt) {
      return Sound.rendiOffline(midi, dur, opt || {}).then(function (buf) {
        const d = buf.getChannelData(0);
        const rate = buf.sampleRate;
        const f = Theory.freqMidi(midi);
        const i0 = Math.floor(0.45 * rate);
        const i1 = Math.floor(Math.min(dur + 0.15, 1.15) * rate);
        const magn = function (freq) { return goertzel(d, rate, freq, i0, i1); };
        let migliore = -1, fStimata = 0;
        for (let ff = f * 0.94; ff <= f * 1.06; ff += 0.5) {
          const v = magn(ff);
          if (v > migliore) { migliore = v; fStimata = ff; }
        }
        const armoniche = [];
        for (let n = 1; n <= 14; n++) armoniche.push(+magn(f * n).toFixed(7));
        let num = 0, den = 0;
        armoniche.forEach(function (v, i) { num += v * f * (i + 1); den += v; });
        let picco = 0;
        for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > picco) picco = a; }
        return {
          f: +f.toFixed(2), fStimata: fStimata, armoniche: armoniche,
          fianco: +magn(f * 1.016).toFixed(7),   // ~7 Hz sopra la fondamentale
          centroide: den ? Math.round(num / den) : 0,
          rmsInizio: +rms(d, rate, 0.15, 0.35).toFixed(5),
          rmsMeta: +rms(d, rate, 0.5, 0.7).toFixed(5),
          rmsFine: +rms(d, rate, 1.0, 1.2).toFixed(5),
          picco: +picco.toFixed(4)
        };
      });
    },
    /* La stessa misura ma attraverso tutta la catena di uscita
       (volume, limitatore, riverbero): è il percorso che sente l'utente */
    analizzaCatena: function (midi, dur, opt) {
      const o = Object.assign({}, opt || {}, { catena: true });
      return Sound.rendiOffline(midi, dur, o).then(function (buf) {
        const d = buf.getChannelData(0);
        const rate = buf.sampleRate;
        return {
          rms: +rms(d, rate, 0.1, Math.min(dur, 1.0)).toFixed(5),
          rmsFine: +rms(d, rate, 1.0, 1.2).toFixed(5),
          picco: +piccoDi(d).toFixed(4),
          campioniNonZero: nonNulli(d)
        };
      });
    },
    /* Nota programmata quando il contesto è già avviato da N secondi:
       è il caso reale del browser (dove currentTime non è mai 0). */
    analizzaTardiva: function (midi, dur, avviaDopo, opt) {
      const o = Object.assign({}, opt || {}, { avviaDopo: avviaDopo });
      return Sound.rendiOffline(midi, dur, o).then(function (buf) {
        const d = buf.getChannelData(0);
        const rate = buf.sampleRate;
        return {
          prima: +rms(d, rate, 0.1, Math.max(0.2, avviaDopo - 0.3)).toFixed(5),
          dopo: +rms(d, rate, avviaDopo + 0.2, avviaDopo + 0.5).toFixed(5),
          picco: +piccoDi(d).toFixed(4)
        };
      });
    }
  };
})();
return 'pronto';
`;

let ws = null, seq = 0;
const attese = new Map();
const attesa = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
function invia(method, params) {
  const id = ++seq;
  ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
  return new Promise(function (res, rej) {
    attese.set(id, { res: res, rej: rej });
    setTimeout(function () { if (attese.has(id)) { attese.delete(id); rej(new Error('timeout ' + method)); } }, 40000);
  });
}
async function valuta(espr) {
  const r = await invia('Runtime.evaluate', {
    expression: '(function(){' + espr + '})()', returnByValue: true, awaitPromise: true
  });
  if (r.exceptionDetails) {
    return { __errore: r.exceptionDetails.text + ' :: ' +
      (r.exceptionDetails.exception && r.exceptionDetails.exception.description) };
  }
  return r.result.value;
}

let prove = 0, problemi = 0;
function ok(nome, condizione, dettaglio) {
  prove++;
  if (!condizione) problemi++;
  console.log((condizione ? '  ok  ' : '  ✗   ') + nome.padEnd(52) + (dettaglio == null ? '' : dettaglio));
}
function sezione(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length))); }

(async function () {
  try {
    const r = await fetch(URL_APP);
    if (!r.ok) throw new Error('HTTP ' + r.status);
  } catch (e) {
    console.log('⚠  App non raggiungibile su ' + URL_APP);
    console.log('   Avvia prima il server:  python -m http.server 8899');
    process.exit(1);
  }

  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-crash-reporter', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(os.tmpdir(), 'imparanote-audio-' + PORTA), 'about:blank'
  ], { stdio: 'ignore' });

  try {
    let wsUrl = null;
    for (let i = 0; i < 60 && !wsUrl; i++) {
      try {
        const j = await (await fetch('http://127.0.0.1:' + PORTA + '/json/list')).json();
        const p = j.filter(function (t) { return t.type === 'page'; })[0];
        if (p) wsUrl = p.webSocketDebuggerUrl;
      } catch (e) { /* Chrome non ancora pronto */ }
      if (!wsUrl) await attesa(250);
    }
    if (!wsUrl) throw new Error('Chrome non risponde');
    ws = new WebSocket(wsUrl);
    await new Promise(function (res) { ws.onopen = res; });
    ws.onmessage = function (ev) {
      const m = JSON.parse(ev.data);
      if (m.id && attese.has(m.id)) {
        const a = attese.get(m.id); attese.delete(m.id);
        if (m.error) a.rej(new Error(JSON.stringify(m.error))); else a.res(m.result);
      }
    };
    await invia('Runtime.enable');
    await invia('Page.enable');
    await invia('Page.navigate', { url: URL_APP });
    await attesa(1200);

    const prep = await valuta(STRUMENTI);
    if (prep !== 'pronto') { console.log('ERRORE preparazione: ' + JSON.stringify(prep)); process.exit(1); }

    const BETA = 0.12;   // punto di contatto dell'archetto: deve combaciare con audio.js
    const teoria = function (n) { return (1 / n) * Math.abs(Math.sin(n * Math.PI * BETA)); };

    /* ---------------------------------------- 0. l'uscita produce suono ----- */
    sezione('0. Il suono esce davvero dalla catena di uscita');
    const uscita = await valuta('return window.__audio.analizzaCatena(69, 1.0, {});');
    if (uscita.__errore) throw new Error(uscita.__errore);
    ok('la catena volume→limitatore→riverbero produce segnale',
      uscita.rms > 0.01, 'rms ' + uscita.rms);
    ok('il segnale dura per tutta la nota', uscita.rmsFine > 0.004,
      'rms 1,0-1,2s = ' + uscita.rmsFine);
    ok('nessun campione fuori scala', uscita.picco <= 1 && uscita.picco > 0.05,
      'picco ' + uscita.picco);
    ok('il campione non è tutto silenzio', uscita.campioniNonZero > 20000,
      uscita.campioniNonZero + ' campioni non nulli');

    /* Il caso che nel browser rendeva tutto muto: la nota viene programmata
       quando il contesto è già avviato da un po' (currentTime > 0). */
    const tardiva = await valuta('return window.__audio.analizzaTardiva(69, 1.0, 1.5, {});');
    if (tardiva.__errore) throw new Error('analizzaTardiva: ' + tardiva.__errore);
    ok('silenzio prima che la nota parta', tardiva.prima < 0.005, 'rms ' + tardiva.prima);
    ok('la nota suona anche se il contesto è già avviato', tardiva.dopo > 0.01,
      'rms dopo l\'avvio = ' + tardiva.dopo);
    const tardivaPizz = await valuta('return window.__audio.analizzaTardiva(69, 0.9, 2.2, {pizzicato:true});');
    ok('anche il pizzicato suona a contesto avviato', tardivaPizz.dopo > 0.005,
      'rms = ' + tardivaPizz.dopo);

    /* ---------------------------------------- 1. la corda sfregata ---------- */
    sezione('1. Spettro della corda sfregata (senza cassa armonica)');
    const nudo = await valuta('return window.__audio.analizza(69, 1.2, {cassa: 0, vibrato: false, arco: false});');
    if (nudo.__errore) throw new Error(nudo.__errore);
    const rapporti = nudo.armoniche.map(function (v, i) { return v / teoria(i + 1); });
    const maxR = Math.max.apply(null, rapporti);
    const minR = Math.min.apply(null, rapporti);
    ok('lo spettro segue 1/n·|sin(n·π·β)|', maxR / minR < 1.05,
      'rapporto reso/teorico fra ' + minR.toFixed(3) + ' e ' + maxR.toFixed(3) + ' (costante)');
    const h = nudo.armoniche;
    ok('"buco" dell\'archetto sull\'8ª armonica (corda toccata a 1/8)',
      h[7] < h[6] * 0.35 && h[7] < h[8] * 0.7,
      'h7=' + h[6].toFixed(5) + '  h8=' + h[7].toFixed(5) + '  h9=' + h[8].toFixed(5));
    ok('le prime armoniche sono le più forti', h[0] > h[2] && h[2] > h[5],
      h[0].toFixed(4) + ' > ' + h[2].toFixed(4) + ' > ' + h[5].toFixed(4));

    /* ---------------------------------------- 2. la cassa armonica --------- */
    sezione('2. Colore della cassa armonica');
    const conCassa = await valuta('return window.__audio.analizza(69, 1.2, {vibrato: false, arco: false});');
    const guadagno = h.map(function (v, i) { return conCassa.armoniche[i] / v; });
    const g = function (n) { return guadagno[n - 1]; };
    ok('B1 (~480 Hz) rinforza la fondamentale', g(1) > g(3) * 1.5 && g(1) > 1.8,
      'h1 ×' + g(1).toFixed(2) + '  contro h3 ×' + g(3).toFixed(2));
    const massimoAcuto = Math.max(g(6), g(7), g(8), g(9));
    const massimoMedio = Math.max(g(3), g(4), g(5));
    ok('"bridge hill" (~3 kHz) rinforza l\'acuto', massimoAcuto > massimoMedio * 1.3 && g(7) > 1.8,
      'h6-h9 fino a ×' + massimoAcuto.toFixed(2) + '  contro h3-h5 ×' + massimoMedio.toFixed(2));
    ok('la cassa non stravolge le armoniche basse',
      guadagno.slice(0, 4).every(function (v) { return v > 0.5 && v < 6; }),
      guadagno.slice(0, 4).map(function (v) { return v.toFixed(2); }).join(', '));

    /* ---------------------------------------- 3. altezza e vibrato --------- */
    sezione('3. Altezza, vibrato e sostegno');    const conVib = await valuta('return window.__audio.analizza(69, 1.2, {});');
    ok('La4 intonato anche col vibrato', Math.abs(conVib.fStimata - 440) <= 6,
      conVib.fStimata.toFixed(1) + ' Hz');
    ok('il vibrato allarga lo spettro ai lati della fondamentale',
      conVib.fianco > conCassa.fianco * 4 && conVib.fianco > 0.002,
      'con vibrato ' + conVib.fianco.toFixed(5) + '  senza ' + conCassa.fianco.toFixed(5));
    ok('suono ad arco sostenuto', conVib.rmsFine > conVib.rmsMeta * 0.5,
      'rms 0,5-0,7s=' + conVib.rmsMeta + '  rms 1,0-1,2s=' + conVib.rmsFine);
    ok('nessun clipping', conVib.picco < 0.95, 'picco ' + conVib.picco + ' (max 1,0 senza limitatore)');

    /* ---------------------------------------- 4. le quattro corde ---------- */
    sezione('4. Le quattro corde');
    const sol3 = await valuta('return window.__audio.analizza(55, 1.0, {});');
    const re4 = await valuta('return window.__audio.analizza(62, 1.0, {});');
    const la4 = await valuta('return window.__audio.analizza(69, 1.0, {});');
    const mi5 = await valuta('return window.__audio.analizza(76, 1.0, {});');
    ok('Sol3 = 196,0 Hz', Math.abs(sol3.fStimata - 196.00) <= 4, sol3.fStimata.toFixed(1) + ' Hz');
    ok('Re4 = 293,7 Hz', Math.abs(re4.fStimata - 293.66) <= 4, re4.fStimata.toFixed(1) + ' Hz');
    ok('La4 = 440,0 Hz', Math.abs(la4.fStimata - 440.00) <= 6, la4.fStimata.toFixed(1) + ' Hz');
    ok('Mi5 = 659,3 Hz', Math.abs(mi5.fStimata - 659.26) <= 8, mi5.fStimata.toFixed(1) + ' Hz');
    ok('le corde acute sono più brillanti delle gravi',
      mi5.centroide > la4.centroide && la4.centroide > re4.centroide && re4.centroide > sol3.centroide,
      'Sol3 ' + sol3.centroide + ' < Re4 ' + re4.centroide + ' < La4 ' + la4.centroide +
      ' < Mi5 ' + mi5.centroide + ' Hz');

    /* ---------------------------------------- 5. pizzicato ----------------- */
    sezione('5. Pizzicato');
    const pizz = await valuta('return window.__audio.analizza(69, 0.9, {pizzicato:true, vibrato:false});');
    ok('il pizzicato decade', pizz.rmsFine < pizz.rmsMeta * 0.5,
      'rms 0,5-0,7s=' + pizz.rmsMeta + '  rms 1,0-1,2s=' + pizz.rmsFine);
    ok('il pizzicato è più forte all\'attacco', pizz.rmsInizio > pizz.rmsMeta * 2,
      'inizio=' + pizz.rmsInizio + '  metà=' + pizz.rmsMeta);
    ok('pizzicato intonato', Math.abs(pizz.fStimata - 440) <= 6, pizz.fStimata.toFixed(1) + ' Hz');
    ok('il pizzicato è più brillante dell\'arco', pizz.centroide > la4.centroide,
      'pizzicato ' + pizz.centroide + ' Hz > arco ' + la4.centroide + ' Hz');

    /* ---------------------------------------- 6. note vicine distinte ------ */
    sezione('6. Le note restano distinguibili');
    const do4 = await valuta('return window.__audio.analizza(60, 1.0, {});');
    const fa4 = await valuta('return window.__audio.analizza(65, 1.0, {});');
    const faD = await valuta('return window.__audio.analizza(66, 1.0, {});');
    ok('Do4 = 261,6 Hz', Math.abs(do4.fStimata - 261.63) <= 4, do4.fStimata.toFixed(1) + ' Hz');
    ok('Fa4 = 349,2 Hz', Math.abs(fa4.fStimata - 349.23) <= 4, fa4.fStimata.toFixed(1) + ' Hz');
    ok('Fa♯4 = 370,0 Hz e distinto da Fa4',
      Math.abs(faD.fStimata - 369.99) <= 4 && Math.abs(faD.fStimata - fa4.fStimata) > 15,
      faD.fStimata.toFixed(1) + ' Hz contro ' + fa4.fStimata.toFixed(1) + ' Hz');

    /* ---------------------------------------- 7. campioni registrati ------- */
    sezione('7. Campioni di violino registrati (VSCO 2 CE, CC0)');
    const caricati = await valuta(
      'return Sound.caricaCampioni().then(function (ok) {' +
      '  return { ok: ok, stato: Sound.statoCampioni(), quanti: Sound.CAMPIONI.length };' +
      '});');
    if (caricati.__errore) throw new Error('caricamento campioni: ' + caricati.__errore);
    ok('i campioni si caricano dal server', caricati.ok === true, 'stato: ' + caricati.stato);
    ok('ci sono tutti i campioni previsti', caricati.quanti === 11, caricati.quanti + ' campioni ad arco');

    const uscitaCampione = await valuta(
      'return Sound.rendiCampioneOffline(69, 1.4, {}).then(function (buf) {' +
      '  var d = buf.getChannelData(0), rate = buf.sampleRate;' +
      '  var p = 0; for (var i = 0; i < d.length; i++) { var a = Math.abs(d[i]); if (a > p) p = a; }' +
      '  var r = 0, n = 0; for (var i = Math.floor(0.6*rate); i < Math.floor(0.9*rate); i++) { r += d[i]*d[i]; n++; }' +
      '  return { picco: +p.toFixed(4), rms: +Math.sqrt(r/n).toFixed(5) };' +
      '});');
    ok('il campione suona', uscitaCampione.rms > 0.02, 'rms ' + uscitaCampione.rms);
    ok('il campione non distorce', uscitaCampione.picco <= 1.01, 'picco ' + uscitaCampione.picco);

    /* La nota suonata dal campione dev'essere intonata. Il campione ha vibrato
       vero, quindi si misura come in tools/misura-campioni.js: si cerca il picco
       su finestre corte e si prende la mediana (il centro dell'oscillazione). */
    for (const caso of [{ m: 69, nome: 'La4', hz: 440 }, { m: 62, nome: 'Re4', hz: 293.66 },
    { m: 55, nome: 'Sol3', hz: 196 }, { m: 84, nome: 'Do6', hz: 1046.5 }]) {
      const misura = await valuta(
        'return Sound.rendiCampioneOffline(' + caso.m + ', 1.5, {}).then(function (buf) {' +
        '  var d = buf.getChannelData(0), rate = buf.sampleRate, f = ' + caso.hz + ';' +
        '  function g(freq, i0, i1) {' +
        '    var N = i1 - i0, k = 2*Math.cos(2*Math.PI*freq/rate), s1 = 0, s2 = 0;' +
        '    for (var i = 0; i < N; i++) {' +
        '      var w = 0.5 - 0.5*Math.cos(2*Math.PI*i/(N-1));' +
        '      var s0 = d[i0+i]*w + k*s1 - s2; s2 = s1; s1 = s0; }' +
        '    var re = s1 - s2*Math.cos(2*Math.PI*freq/rate), im = s2*Math.sin(2*Math.PI*freq/rate);' +
        '    return Math.sqrt(re*re + im*im)*2/N; }' +
        '  var lung = Math.floor(0.35*rate), stime = [];' +
        '  for (var inizio = 0.2; inizio + 0.35 <= 1.4; inizio += 0.3) {' +
        '    var i0 = Math.floor(inizio*rate), i1 = i0 + lung, best = -1, bf = 0;' +
        '    for (var x = f*0.96; x <= f*1.04; x += 0.1) { var v = g(x, i0, i1); if (v > best) { best = v; bf = x; } }' +
        '    stime.push(bf); }' +
        '  stime.sort(function (a, b) { return a - b; });' +
        '  var med = stime[Math.floor(stime.length/2)];' +
        '  return { hz: med, cent: 1200*Math.log2(med/f) };' +
        '});');
      if (misura.__errore) throw new Error('misura campione: ' + misura.__errore);
      ok('campione intonato su ' + caso.nome,
        Math.abs(misura.cent) < 20,
        misura.hz.toFixed(1) + ' Hz (' + misura.cent.toFixed(0) + ' cent)');
    }

    /* Anche il suono di risposta giusta dev'essere un campione di violino. */
    const pizzCampione = await valuta(
      'return Sound.rendiCampioneOffline(76, 0.8, {pizzicato:true}).then(function (buf) {' +
      '  var d = buf.getChannelData(0), rate = buf.sampleRate, p = 0;' +
      '  for (var i = 0; i < d.length; i++) { var a = Math.abs(d[i]); if (a > p) p = a; }' +
      '  var inizio = 0, fine = 0, n = 0;' +
      '  for (var i = Math.floor(0.02*rate); i < Math.floor(0.15*rate); i++) inizio += d[i]*d[i];' +
      '  for (var i = Math.floor(0.6*rate); i < Math.floor(0.75*rate); i++) { fine += d[i]*d[i]; n++; }' +
      '  return { picco: +p.toFixed(4), inizio: Math.sqrt(inizio/(0.13*rate)), fine: Math.sqrt(fine/n) };' +
      '});');
    ok('il pizzicato registrato suona', pizzCampione.picco > 0.05, 'picco ' + pizzCampione.picco);
    ok('il pizzicato decade', pizzCampione.fine < pizzCampione.inizio * 0.4,
      'inizio ' + pizzCampione.inizio.toFixed(4) + ' → fine ' + pizzCampione.fine.toFixed(4));

    console.log('\n' + '═'.repeat(68));
    console.log(problemi === 0
      ? '✅ TIMBRO DEL VIOLINO VERIFICATO (' + prove + ' controlli)'
      : '❌ ' + problemi + ' problemi su ' + prove + ' controlli');
  } catch (e) {
    console.log('ERRORE: ' + e.message);
    problemi++;
  } finally {
    try { ws && ws.close(); } catch (e) { }
    chrome.kill();
    setTimeout(function () { process.exit(problemi ? 1 : 0); }, 200);
  }
})();
