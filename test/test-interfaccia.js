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

const http = require('http');

/* Il fetch di Node (undici) può andare in assert se il server chiude la
   connessione: per i test parlo direttamente con http.get. */
function scarica(url) {
  return new Promise(function (res, rej) {
    const u = new URL(url);
    const req = http.get({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: 8000
    }, function (r) {
      let d = '';
      r.setEncoding('utf8');
      r.on('data', function (c) { d += c; });
      r.on('end', function () { res({ ok: r.statusCode >= 200 && r.statusCode < 300, status: r.statusCode, testo: d }); });
    });
    req.on('error', rej);
    req.on('timeout', function () { req.destroy(new Error('timeout')); });
  });
}

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
    const r = await scarica(URL_APP);
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
      expression: '(function(){' + espr + '})()', returnByValue: true, awaitPromise: true
    });
    if (r.exceptionDetails) {
      return 'ECCEZIONE: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description);
    }
    return r.result.value;
  }

  /** Aspetta che una condizione nella pagina diventi vera (invece di un'attesa fissa). */
  async function attendiStato(condizione, maxMs) {
    const fine = Date.now() + (maxMs || 10000);
    while (Date.now() < fine) {
      if (await valuta('return !!(' + condizione + ');') === true) return true;
      await attesa(200);
    }
    return false;
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
  function ok(nome, condizione, dettaglio) {
    prove++;
    if (!condizione) problemi++;
    console.log((condizione ? '  ok  ' : '  ✗   ') + nome.padEnd(46) + (dettaglio == null ? '' : dettaglio));
  }
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
        const j = JSON.parse((await scarica('http://127.0.0.1:' + PORTA + '/json/list')).testo);
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
    await invia('Network.enable');
    await invia('Network.setCacheDisabled', { cacheDisabled: true });
    await invia('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await invia('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__errori=[];window.addEventListener("error",function(e){window.__errori.push((e.error&&e.error.stack)||e.message);});' +
        // la lingua dipende dal browser: per il test la fissiamo all'italiano
        'try{localStorage.setItem("violino.lingua","it");}catch(e){}'
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
    check('opzione cliccabile', await sopra('#screen-play .tastiera .tasto-nota'), 'libero');
    await clickVero('#screen-play .tastiera .tasto-nota:nth-child(1)');
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
    await attendiStato('window.App && App.sessione', 12000);
    await attesa(300);
    check('velo sparito dopo il conto', await valuta('return getComputedStyle(document.getElementById("overlay")).display;'), 'none');
    check('schermata del turno', await valuta('return App.sessione.fase;'), 'turno');
    await clickVero('#btn-turno');
    await attesa(500);
    check('turno iniziato', await valuta('return App.sessione.fase;'), 'domanda');
    check('opzioni del turno cliccabili', await sopra('#screen-play .tastiera .tasto-nota'), 'libero');

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
    await attendiStato('window.App && App.sessione && App.sessione.fase === "domanda"', 12000);
    for (let i = 0; i < 3; i++) {                          // tre errori di proposito
      await valuta('var s=App.sessione,q=s.domanda,m=Theory.midi(q.nota);' +
        'var b=Array.from(document.querySelectorAll("#screen-play .tasto-nota")).filter(function(e){' +
        '  return +e.getAttribute("data-midi")!==m; })[0];' +
        'b.click(); return true;');
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

    /* Il pulsante della lingua deve tradurre davvero tutta l'interfaccia. */
    console.log('── Pulsante della lingua (italiano ⇄ inglese) ' + '─'.repeat(16));
    await invia('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await invia('Page.navigate', { url: URL_APP });
    await attesa(1100);
    check('parte in italiano', await valuta('return I18n.getLingua();'), 'it');
    check('pulsante mostra la lingua di arrivo', await valuta('return document.getElementById("btn-lingua").textContent.trim();'), '🌐 EN');
    check('titolo in italiano', await valuta('return document.querySelector(".hero h1").textContent;'), 'Impara le note del violino giocando');
    check('livelli in italiano', await valuta('return Array.from(document.querySelectorAll(".liv-nome")).map(function(e){return e.textContent;}).join(",");'), 'Bambini,Ragazzi,Adulti,Maestri');
    await clickVero('#btn-lingua');
    await attesa(500);
    check('passa all\'inglese', await valuta('return I18n.getLingua();'), 'en');
    check('titolo in inglese', await valuta('return document.querySelector(".hero h1").textContent;'), 'Learn the violin notes by playing');
    check('livelli in inglese', await valuta('return Array.from(document.querySelectorAll(".liv-nome")).map(function(e){return e.textContent;}).join(",");'), 'Kids,Teens,Adults,Masters');
    check('giochi in inglese', await valuta('return document.querySelector(".card-nome").textContent;'), 'Read the note');
    check('pulsante mostra IT', await valuta('return document.getElementById("btn-lingua").textContent.trim();'), '🌐 IT');
    check('lingua salvata', await valuta('return localStorage.getItem("violino.lingua");'), 'en');
    check('lingua del documento', await valuta('return document.documentElement.lang + "/" + document.body.getAttribute("data-lingua");'), 'en/en');
    check('aiuto in inglese', await valuta(
      'document.getElementById("btn-help").click();' +
      'var v=Array.from(document.querySelectorAll("#screen-help [data-lingua-solo=\'en\']")).filter(function(e){return e.getClientRects().length;});' +
      'var i=Array.from(document.querySelectorAll("#screen-help [data-lingua-solo=\'it\']")).filter(function(e){return e.getClientRects().length;});' +
      'return v.length>0 && i.length===0;'), true);
    await valuta('document.getElementById("btn-help").click(); return true;');
    await attesa(300);

    console.log('── Note in inglese nel gioco ' + '─'.repeat(34));
    await clickVero('[data-modo="leggi"]');
    await attesa(700);
    check('tastiera con lettere', await valuta(
      'var n=Array.from(document.querySelectorAll("#screen-play .tn-nome")).map(function(e){return e.textContent;});' +
      'return n.length===7 && n.every(function(x){return /^[A-G][♯♭]?$/.test(x);});'), true);
    check('nessun nome italiano fra le opzioni', await valuta(
      'var n=Array.from(document.querySelectorAll("#screen-play .tn-nome")).map(function(e){return e.textContent;});' +
      'return n.filter(function(x){return /Do|Re|Mi|Fa|Sol|La|Si/.test(x);}).length;'), 0);
    check('descrizione estesa in inglese', await valuta(
      'var t=Array.from(document.querySelectorAll("#screen-play .tasto-nota")).map(function(e){return e.getAttribute("title");});' +
      'return t.every(function(x){return /^[A-G]( sharp| flat)?$/.test(x);});'), true);
    check('HUD in inglese', await valuta('return document.querySelector(".hud-k").textContent;'), 'Points');
    check('nessun errore JavaScript', await valuta('return window.__errori || [];'), []);

    console.log('── Manico e tabella in inglese ' + '─'.repeat(32));
    await clickVero('#btn-esci');
    await attesa(400);
    await clickVero('#btn-nav-impara');
    await attesa(600);
    check('corde con lettere', await valuta(
      'return Array.from(document.querySelectorAll("#learn-violin .v-string-label")).map(function(e){return e.textContent;}).join("");'), 'GDAE');
    check('etichetta della corda in inglese', await valuta(
      'return document.querySelector("#learn-violin .v-string-roman").textContent;'), 'IV string');
    check('tabella con lettere', await valuta(
      'var n=Array.from(document.querySelectorAll("#learn-table .chip-nome")).map(function(e){return e.textContent;});' +
      'return n.length>10 && n.every(function(x){return /^[A-G][♯♭]?$/.test(x);});'), true);
    check('suggerimento pallina in inglese', await valuta(
      'var g=document.querySelector("#learn-violin .v-slot title"); return /open G string|on the [GDAE] string/.test(g.textContent);'), true);
    check('descrizione della nota in inglese', await valuta(
      'var d=document.querySelector("#learn-nota .nota-dove"); return /On the fingerboard/.test(d.textContent);'), true);
    check('nessun errore JavaScript', await valuta('return window.__errori || [];'), []);

    // si torna all'italiano restando sulla schermata attiva (Studia)
    await clickVero('#btn-lingua');
    await attesa(500);
    check('torna all\'italiano', await valuta('return I18n.getLingua();'), 'it');
    check('Studia di nuovo in italiano', await valuta(
      'var d=document.querySelector("#learn-nota .nota-dove"); return /Sul manico/.test(d.textContent);'), true);
    check('corde di nuovo in italiano', await valuta(
      'return Array.from(document.querySelectorAll("#learn-violin .v-string-label")).map(function(e){return e.textContent;}).join("");'), 'SolReLaMi');
    await clickVero('#btn-home');
    await attesa(500);
    check('home di nuovo in italiano', await valuta('return document.querySelector(".hero h1").textContent;'), 'Impara le note del violino giocando');
    await clickVero('[data-modo="leggi"]');
    await attesa(700);
    check('HUD di nuovo in italiano', await valuta('return document.querySelector(".hud-k").textContent;'), 'Punti');
    check('note di nuovo in italiano', await valuta(
      'var n=Array.from(document.querySelectorAll("#screen-play .tn-nome")).map(function(e){return e.textContent;});' +
      'return n.every(function(x){return /^(Do|Re|Mi|Fa|Sol|La|Si)[♯♭]?$/.test(x);});'), true);
    await clickVero('#btn-esci');
    await attesa(400);

    console.log('── Violino campionato nell\'app ' + '─'.repeat(35));
    check('campioni caricati dopo i primi tocchi', await valuta('return Sound.statoCampioni();'), 'pronto');
    check('campioni previsti', await valuta('return Sound.CAMPIONI.length;'), 11);
    check('i file audio sono raggiungibili', await valuta(
      'return fetch("sounds/arco-A4.wav").then(function (r) { return r.ok; });'), true);

    console.log('── Brani classici ' + '─'.repeat(45));
    await invia('Page.navigate', { url: URL_APP });
    await attesa(1100);
    check('dieci giochi in home', await valuta('return document.querySelectorAll(".modo").length;'), 10);
    await clickVero('[data-modo="brano"]');
    await attesa(500);
    check('si sceglie il brano', await valuta('return document.querySelectorAll(".brano-riga").length;'), 7);
    check('i brani hanno titolo e autore', await valuta(
      'var b=document.querySelector(".brano-riga"); return b.querySelector(".brano-info b").textContent.length > 3 &&' +
      ' b.querySelector(".brano-info small").textContent.length > 3;'), true);
    await clickVero('[data-scegli="martino"]');
    await attesa(700);
    check('parte il brano scelto', await valuta('return App.sessione.brano.chiave;'), 'martino');
    check('il titolo del brano è in alto', await valuta(
      'return document.querySelector(".brano-nome").textContent.indexOf("Fra Martino") >= 0;'), true);
    check('le note sono in ordine (Do, Re, Mi)', await valuta(
      'var s=App.sessione; return [1,2,3].map(function(i){ s.indice=i-1; return Theory.solfege(s.creaDomanda().nota); }).join(",");'),
      'Do,Re,Mi');
    check('il totale è quello del brano', await valuta('return App.sessione.totale;'), 32);
    check('si vede tutto lo spartito del brano', await valuta(
      'return document.querySelectorAll("#screen-play .partitura-riga .st-head").length;'), 32);
    check('il brano è scritto su più righe', await valuta(
      'return document.querySelectorAll("#screen-play .partitura-riga").length;'), 3);
    check('la nota da indovinare è evidenziata', await valuta(
      'return document.querySelectorAll("#screen-play .st-evidenza").length;'), 1);
    check('si vedono anche le note successive', await valuta(
      'return document.querySelectorAll("#screen-play .st-head").length > 10;'), true);
    check('all\'inizio nessuna nota è ancora fatta', await valuta(
      'return document.querySelectorAll("#screen-play .st-head.st-fatta").length;'), 0);
    const doveEvidenza = await valuta(
      'var e=document.querySelector("#screen-play .st-evidenza");' +
      'var righe=Array.from(document.querySelectorAll("#screen-play .partitura-riga"));' +
      'var riga=righe.filter(function(r){return r.contains(e);})[0];' +
      'return righe.indexOf(riga) + ":" + e.getAttribute("cx");');
    await clickVero('#screen-play .tastiera .tasto-nota:nth-child(1)');
    await attesa(500);
    check('si risponde e si avanza', await valuta('return App.sessione.storico.length;'), 1);
    check('la nota indovinata diventa verde', await valuta(
      'return document.querySelectorAll("#screen-play .st-head.st-fatta").length >= 1;'), true);
    ok('l\'evidenziazione passa alla nota dopo', (await valuta(
      'var e=document.querySelector("#screen-play .st-evidenza");' +
      'var righe=Array.from(document.querySelectorAll("#screen-play .partitura-riga"));' +
      'var riga=righe.filter(function(r){return r.contains(e);})[0];' +
      'return righe.indexOf(riga) + ":" + e.getAttribute("cx");')) !== doveEvidenza,
      'prima ' + doveEvidenza);
    await clickVero('#btn-esci');
    await attesa(400);

    console.log('── Violin Hero ' + '─'.repeat(49));
    await clickVero('[data-modo="eroe"]');
    await attesa(500);
    await clickVero('[data-scegli="gioia"]');
    await attesa(800);
    check('quattro corsie, una per corda', await valuta('return document.querySelectorAll(".eroe-corsia").length;'), 4);
    check('le corde sono Sol Re La Mi', await valuta(
      'return Array.from(document.querySelectorAll(".eroe-corda-nome")).map(function(e){return e.textContent;}).join(",");'),
      'Sol,Re,La,Mi');
    check('una nota cadente per ogni nota del brano', await valuta(
      'return document.querySelectorAll(".eroe-nota").length;'), 30);
    // le note devono davvero cadere: è il difetto che si vedeva come "non si muove nulla"
    const pos1 = await valuta(
      'return Array.from(document.querySelectorAll(".eroe-nota")).map(function(e){return e.style.transform;}).join("|");');
    await attesa(500);
    const pos2 = await valuta(
      'return Array.from(document.querySelectorAll(".eroe-nota")).map(function(e){return e.style.transform;}).join("|");');
    ok('le note cadono (le posizioni cambiano)', pos1 !== pos2 && pos2.indexOf('translateY') >= 0,
      'prima ' + String(pos1).slice(0, 18) + '… poi ' + String(pos2).slice(0, 18) + '…');
    check('quattro pulsanti per suonare', await valuta('return document.querySelectorAll(".eroe-tasto").length;'), 4);
    check('il brano è indicato in alto', await valuta(
      'return document.querySelector(".eroe-pezzo").textContent.indexOf("Inno alla Gioia") >= 0;'), true);
    check('ogni nota mostra il suo nome', await valuta(
      'var n=document.querySelector(".eroe-nota-nome").textContent; return n.length > 1;'), true);
    // si suona la prima nota esattamente quando arriva sulla linea
    const colpita = await valuta(
      'var g=App.eroe, n=g.note[0];' +
      'var attesa = Math.max(0, (n.tempo - performance.now()/1000) * 1000);' +
      'return new Promise(function(res){ setTimeout(function(){' +
      '  var esito = g.premi(n.corda);' +
      '  res(esito ? (esito.perfetto ? "perfetto" : "buono") : "nullo"); }, attesa); });');
    check('una nota presa a tempo vale "perfetto"', colpita, 'perfetto');
    check('il punteggio sale', await valuta('return App.eroe.punti > 0;'), true);
    check('esiste il pulsante degli errori', await valuta('return !!document.getElementById("btn-errori");'), true);
    await clickVero('#btn-esci');
    await attesa(400);
    check('si esce dal gioco Eroe', await valuta('return document.getElementById("screen-home").classList.contains("is-active");'), true);
    check('nessun errore JavaScript', await valuta('return window.__errori || [];'), []);

    console.log('── Tastiera delle note fissa ' + '─'.repeat(36));
    await invia('Page.navigate', { url: URL_APP });
    await attesa(1100);
    await clickVero('[data-modo="leggi"]');
    await attesa(800);
    const ordine1 = await valuta(
      'return Array.from(document.querySelectorAll("#screen-play .tn-nome")).map(function(e){return e.textContent;}).join(" ");');
    ok('le note sono in ordine musicale (Do Re Mi…)', ordine1 === 'Do Re Mi Fa Sol La Si', ordine1);
    ok('i tasti numerati sono 1..7', await valuta(
      'return Array.from(document.querySelectorAll("#screen-play .tn-tasto")).map(function(e){return e.textContent;}).join("");'),
      '1234567');
    // si risponde a tre domande di seguito: le note devono restare dove sono
    for (let i = 0; i < 3; i++) {
      await valuta(
        'var s=App.sessione, m=Theory.midi(s.domanda.nota);' +
        'document.querySelector(\'#screen-play .tasto-nota[data-midi="\'+m+\'"]\').click(); return true;');
      await attesa(1200);
    }
    const ordine2 = await valuta(
      'return Array.from(document.querySelectorAll("#screen-play .tn-nome")).map(function(e){return e.textContent;}).join(" ");');
    ok('dopo tre domande le note non si sono spostate', ordine1 === ordine2, ordine2);
    // il tasto preme la nota giusta: 1 = Do
    await valuta('document.querySelector("#screen-play .tasto-nota").click(); return true;');
    await attesa(400);
    check('il primo tasto è Do', await valuta(
      'var s=App.sessione, u=s.giocatori[0].ultimo; return u ? Theory.solfege(u.scelta || u.domanda.nota) : "nessuno";'), 'Do');
    // con le alterazioni la tastiera si allarga ma resta ordinata
    await clickVero('#btn-esci');
    await attesa(400);
    await clickVero('[data-liv="adulti"]');
    await attesa(300);
    await clickVero('[data-modo="leggi"]');
    await attesa(800);
    const ordine3 = await valuta(
      'return Array.from(document.querySelectorAll("#screen-play .tn-nome")).map(function(e){return e.textContent;}).join(" ");');
    ok('con le alterazioni compaiono 12 note in ordine',
      ordine3 === 'Do Do♯ Re Re♯ Mi Fa Fa♯ Sol Sol♯ La La♯ Si', ordine3);
    await clickVero('#btn-esci');
    await attesa(400);
    await clickVero('[data-liv="ragazzi"]');
    await attesa(300);

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
          'var q=s.domanda, m=Theory.midi(q.nota);' +
          'var b=document.querySelector(\'#screen-play .tasto-nota[data-midi="\'+m+\'"]\');' +
          'if(!q||!b) return "no"; b.click(); return "ok";');
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
