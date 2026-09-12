/* ==========================================================================
   test-interfaccia.js — Verifica con eventi mouse REALI (non .click() da JS)
   Serve a scoprire elementi che coprono l'interfaccia (veli, overlay, modali
   rimaste aperte): un click vero di JavaScript non se ne accorgerebbe, un
   utente sì.

   Come si usa (serve Chrome e l'app servita via HTTP):
       python -m http.server 8899
       node test/test-interfaccia.js
       node test/test-interfaccia.js --url http://127.0.0.1:9000/ --chrome "C:\...\chrome.exe"
   ========================================================================== */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/* --------------------------------------------------------------- parametri */
const args = process.argv.slice(2);
function arg(nome, predefinito) {
  const i = args.indexOf('--' + nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : predefinito;
}
const URL_APP = arg('url', 'http://127.0.0.1:8899/index.html');
const PORTA = parseInt(arg('porta', '9340'), 10);

function trovaChrome() {
  const candidati = [
    arg('chrome', ''),
    process.env.CHROME_PATH || '',
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
  console.log('⚠  Chrome/Edge non trovato: salto la verifica dell\'interfaccia.');
  console.log('   Indica il percorso con --chrome "C:\\percorso\\chrome.exe"');
  process.exit(0);
}

/* ------------------------------------------------------------ verifica HTTP */
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
    '--disable-crash-reporter', '--mute-audio', '--remote-debugging-port=' + PORTA,
    '--user-data-dir=' + path.join(os.tmpdir(), 'imparanote-test-' + PORTA), 'about:blank'
  ], { stdio: 'ignore' });

  let ws = null, seq = 0;
  const attese = new Map();
  const attesa = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function invia(method, params) {
    const id = ++seq;
    ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
    return new Promise(function (res, rej) {
      attese.set(id, { res: res, rej: rej });
      setTimeout(function () { if (attese.has(id)) { attese.delete(id); rej(new Error('timeout ' + method)); } }, 20000);
    });
  }

  async function valuta(espr) {
    const r = await invia('Runtime.evaluate', {
      expression: '(function(){' + espr + '})()', returnByValue: true
    });
    if (r.exceptionDetails) {
      return 'ECCEZIONE: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description);
    }
    return r.result.value;
  }

  /** Click vero del mouse al centro dell'elemento (passa dal controllo di sovrapposizione). */
  async function clickVero(selettore) {
    const p = await valuta(
      'var e=document.querySelector(' + JSON.stringify(selettore) + '); if(!e) return null;' +
      'e.scrollIntoView({block:"center"}); var b=e.getBoundingClientRect();' +
      'return [Math.round(b.left+b.width/2), Math.round(b.top+b.height/2)];');
    if (!p) return null;
    await invia('Input.dispatchMouseEvent', { type: 'mousePressed', x: p[0], y: p[1], button: 'left', buttons: 1, clickCount: 1 });
    await invia('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p[0], y: p[1], button: 'left', buttons: 0, clickCount: 1 });
    return p;
  }

  /** Che cosa c'è davvero sotto il centro dell'elemento? */
  function sopra(selettore) {
    return valuta(
      'var e=document.querySelector(' + JSON.stringify(selettore) + '); if(!e) return "assente";' +
      'var b=e.getBoundingClientRect();' +
      'var t=document.elementFromPoint(b.left+b.width/2, b.top+b.height/2);' +
      'if (!t) return "nulla";' +
      'return (t === e || e.contains(t)) ? "libero" : ("coperto da " + t.tagName + "." + t.className);');
  }

  let prove = 0, problemi = 0;
  function check(nome, valore, atteso) {
    prove++;
    const buono = JSON.stringify(valore) === JSON.stringify(atteso);
    if (!buono) problemi++;
    console.log((buono ? '  ok  ' : '  ✗   ') + nome.padEnd(46) + JSON.stringify(valore) +
      (buono ? '' : '   (atteso ' + JSON.stringify(atteso) + ')'));
  }

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
    if (!wsUrl) throw new Error('Chrome non risponde sul porto di debug');
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
    await invia('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await invia('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__errori=[];window.addEventListener("error",function(e){window.__errori.push((e.error&&e.error.stack)||e.message);});'
    });

    console.log('── Niente deve coprire l\'interfaccia ' + '─'.repeat(28));
    await invia('Page.navigate', { url: URL_APP });
    await attesa(1100);
    check('velo modale nascosto', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'none');
    check('avviso toast nascosto', await valuta('return getComputedStyle(document.getElementById("toast")).display;'), 'none');
    check('centro schermo non coperto', await valuta(
      'var e=document.elementFromPoint(window.innerWidth/2, window.innerHeight/2);' +
      'return e ? (/overlay|toast/.test(e.className + e.id) ? "COPRE: " + e.className : "libero") : "nulla";'), 'libero');
    check('carta gioco cliccabile', await sopra('[data-modo="leggi"]'), 'libero');
    check('pulsante Studia cliccabile', await sopra('#btn-nav-impara'), 'libero');

    console.log('── Click veri: partita singola ' + '─'.repeat(34));
    await clickVero('[data-modo="leggi"]');
    await attesa(700);
    check('partita avviata', await valuta('return App.sessione && App.sessione.fase;'), 'domanda');
    check('opzione cliccabile', await sopra('#screen-play .opzioni .opt'), 'libero');
    await clickVero('#screen-play .opzioni .opt:nth-child(1)');
    await attesa(400);
    check('click registrato', await valuta('return App.sessione.storico.length;'), 1);
    await clickVero('#btn-esci');
    await attesa(400);
    check('ritorno in home', await valuta('return document.getElementById("screen-home").classList.contains("is-active");'), true);

    console.log('── Click veri: sfida fra due ' + '─'.repeat(37));
    await clickVero('[data-modo="duello"]');
    await attesa(500);
    check('velo visibile per la scelta', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'grid');
    check('pulsante Inizia cliccabile', await sopra('#s-inizia'), 'libero');
    await clickVero('#s-inizia');
    await attesa(400);
    check('conto alla rovescia visibile', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'grid');
    await attesa(3000);
    check('velo sparito dopo il conto', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'none');
    check('schermata del turno', await valuta('return App.sessione.fase;'), 'turno');
    await clickVero('#btn-turno');
    await attesa(500);
    check('turno iniziato', await valuta('return App.sessione.fase;'), 'domanda');
    check('opzioni del turno cliccabili', await sopra('#screen-play .opzioni .opt'), 'libero');

    console.log('── Click veri su telefono ' + '─'.repeat(40));
    await invia('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
    await invia('Page.navigate', { url: URL_APP });
    await attesa(1100);
    check('velo nascosto su telefono', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'none');
    await clickVero('#btn-nav-impara');
    await attesa(500);
    check('Studia si apre', await valuta('return document.getElementById("screen-learn").classList.contains("is-active");'), true);
    check('pallina del manico cliccabile', await sopra('#learn-violin .v-slot'), 'libero');
    await clickVero('#learn-violin .v-slot');
    await attesa(400);
    check('la pallina risponde', await valuta('return document.querySelector("#learn-nota .nota-grande").textContent.length > 0;'), true);

    /* Riepilogo degli errori: si apre, spiega, mette in pausa e riprende. */
    console.log('── Riepilogo degli errori ' + '─'.repeat(39));
    await invia('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await invia('Page.navigate', { url: URL_APP });
    await attesa(1000);
    await clickVero('[data-modo="tempo"]');
    await attesa(3600);                                   // conto alla rovescia
    for (let i = 0; i < 3; i++) {                          // tre errori di proposito
      await valuta('var s=App.sessione,q=s.domanda,o=document.querySelectorAll("#screen-play .opt");' +
        'o[(q.indiceGiusto+1)%o.length].click(); return true;');
      await attesa(1150);
    }
    check('errori contati nel pulsante', await valuta('return document.querySelector("#btn-errori .contatore").textContent;'), '3');
    await clickVero('#btn-errori');
    await attesa(400);
    check('pannello aperto', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'grid');
    check('una voce per ogni errore', await valuta('return document.querySelectorAll(".rie-voce").length;'), 3);
    check('ogni voce ha una spiegazione', await valuta(
      'var s=Array.from(document.querySelectorAll(".rie-spiega"));' +
      'return s.length===3 && s.every(function(e){return e.textContent.trim().length>25;});'), true);
    check('mostra sbaglio e soluzione', await valuta(
      'var v=document.querySelector(".rie-voce");' +
      'var ko=v.querySelector(".rie-riga .ko").textContent.trim();' +
      'var ok=v.querySelector(".rie-riga .ok").textContent.trim();' +
      'return ko.length>0 && ok.length>0 && ko!==ok;'), true);
    check('ogni voce ha il pentagramma', await valuta('return document.querySelectorAll(".rie-voce .st-head").length;'), 3);
    check('ogni voce ha il pulsante di ascolto', await valuta('return document.querySelectorAll(".rie-voce [data-ascolta]").length;'), 6);
    check('sessione messa in pausa', await valuta('return App.sessione.inPausa;'), true);
    const t1 = await valuta('return App.sessione.tempo;');
    await attesa(1500);
    check('orologio fermo mentre si legge', Math.abs((await valuta('return App.sessione.tempo;')) - t1) < 0.5, true);
    await clickVero('#rie-chiudi');
    await attesa(500);
    check('pannello chiuso', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'none');
    check('sessione riattivata', await valuta('return App.sessione.inPausa;'), false);
    const t3 = await valuta('return App.sessione.tempo;');
    await attesa(1300);
    check('orologio di nuovo in corsa', (await valuta('return App.sessione.tempo;')) < t3 - 0.5, true);

    console.log('── Riepilogo dalla schermata degli esiti ' + '─'.repeat(22));
    await valuta('App.sessione.fine(); return true;');
    await attesa(700);
    check('esiti attivi', await valuta('return document.getElementById("screen-results").classList.contains("is-active");'), true);
    check('pulsante "Rivedi gli errori"', await valuta('return !!document.getElementById("r-errori");'), true);
    await clickVero('#r-errori');
    await attesa(400);
    check('riepilogo aperto dagli esiti', await valuta('return document.querySelectorAll(".rie-voce").length;'), 3);
    check('chiusura senza "riprendi"', await valuta('return document.getElementById("rie-chiudi").textContent.trim();'), 'Chiudi');
    await clickVero('#rie-chiudi');
    await attesa(300);
    check('pannello chiuso dagli esiti', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'none');

    console.log('── Riepilogo su telefono ' + '─'.repeat(38));
    await invia('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
    await attesa(400);
    await clickVero('#r-errori');
    await attesa(400);
    check('si apre anche su telefono', await valuta('return document.querySelectorAll(".rie-voce").length;'), 3);
    check('nessuno scorrimento orizzontale', await valuta('return document.documentElement.scrollWidth <= window.innerWidth + 1;'), true);
    check('il pannello si può scorrere', await valuta(
      'var m=document.querySelector(".modal.riepilogo"); return m.scrollHeight > m.clientHeight;'), true);
    check('spiegazione leggibile', await valuta(
      'var e=document.querySelector(".rie-spiega"); var b=e.getBoundingClientRect(); return b.width > 150 && b.height > 20;'), true);
    await clickVero('#rie-chiudi');
    await attesa(300);
    check('chiuso su telefono', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'none');

    /* Nessuna scritta "undefined"/"NaN" dev'essere visibile: è il sintomo tipico
       di una proprietà scritta con un nome diverso da quello usato nell'interfaccia. */
    console.log('── Nessuna scritta "undefined" a schermo ' + '─'.repeat(25));
    const CERCA = 'var trovate=[];' +
      'var w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);var n;' +
      'while(n=w.nextNode()){var t=n.nodeValue||"";' +
      ' if(/undefined|NaN|\\[object/.test(t)){var el=n.parentElement;' +
      '  if(el && el.getClientRects().length){' +
      '   trovate.push(el.tagName.toLowerCase()+(el.className?"."+String(el.className).split(" ").join("."):"")+" → "+t.trim().slice(0,40));}}}' +
      'return trovate;';
    await invia('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const lv of ['bambini', 'ragazzi', 'adulti', 'maestri']) {
      await invia('Page.navigate', { url: URL_APP });
      await attesa(950);
      await clickVero('[data-liv="' + lv + '"]');
      await attesa(250);
      check(lv + ' · home', await valuta(CERCA), []);
      await clickVero('#btn-nav-impara');
      await attesa(400);
      check(lv + ' · studia', await valuta(CERCA), []);
      await clickVero('#btn-home');
      await attesa(300);
      await clickVero('[data-modo="leggi"]');
      await attesa(600);
      check(lv + ' · gioco', await valuta(CERCA), []);
      for (let i = 0; i < 14; i++) {
        const stato = await valuta(
          'var s=window.App&&App.sessione; if(!s) return "no";' +
          'if(s.fase==="fine") return "fine"; if(s.fase!=="domanda") return "attesa";' +
          'var q=s.domanda, o=document.querySelectorAll("#screen-play .opzioni .opt");' +
          'if(!q||!o.length) return "no"; o[q.indiceGiusto].click(); return "ok";');
        if (stato === 'fine') break;
        await attesa(650);
      }
      await attesa(700);
      check(lv + ' · risultati', await valuta(CERCA), []);
    }

    check('nessun errore JavaScript', await valuta('return window.__errori || [];'), []);

    console.log('\n' + '═'.repeat(64));
    console.log(problemi === 0
      ? '✅ INTERFACCIA LIBERA E CLICCABILE (' + prove + ' verifiche)'
      : '❌ ' + problemi + ' problemi su ' + prove + ' verifiche');
  } catch (e) {
    console.log('ERRORE: ' + e.message);
    problemi++;
  } finally {
    try { ws && ws.close(); } catch (e) { }
    chrome.kill();
    setTimeout(function () { process.exit(problemi ? 1 : 0); }, 200);
  }
})();
