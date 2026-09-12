/* ==========================================================================
   app.js — Interfaccia, schermate e collegamento con il motore di gioco
   ========================================================================== */
(function () {
  'use strict';

  const T = window.Theory;
  const TASTI_LABEL = ['1', '2', '3', '4', '5', '6'];
  const TASTI_P1 = ['a', 's', 'd', 'f', 'g', 'h'];
  const TASTI_P2 = ['j', 'k', 'l', 'ò', 'à', 'ù'];

  const App = {
    schermata: 'home',
    sessione: null,
    ultimaScelta: null,
    setup: null,
    opt: {
      livello: 'ragazzi',
      audio: true,
      preferFlats: false,
      numOpzioni: 4,
      nomi: ['Giocatore 1', 'Giocatore 2'],
      secondiDue: 60,
      posizioneStudio: 1
    },
    best: {},
    imparaLivello: 'ragazzi',
    notaStudio: null
  };
  window.App = App;

  const el = function (id) { return document.getElementById(id); };
  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ------------------------------------------------------------ preferenze */
  function caricaPreferenze() {
    try {
      const o = JSON.parse(localStorage.getItem('violino.opt') || 'null');
      if (o) Object.assign(App.opt, o);
      const b = JSON.parse(localStorage.getItem('violino.best') || 'null');
      if (b) App.best = b;
    } catch (e) { /* storage non disponibile */ }
    App.imparaLivello = App.opt.livello;
  }
  function salvaPreferenze() {
    try { localStorage.setItem('violino.opt', JSON.stringify(App.opt)); } catch (e) { }
  }
  function salvaBest() {
    try { localStorage.setItem('violino.best', JSON.stringify(App.best)); } catch (e) { }
  }
  function chiaveBest(modo, livello) { return modo + '|' + livello; }
  function leggiBest(modo, livello) { return App.best[chiaveBest(modo, livello)] || null; }
  function aggiornaBest(ris) {
    if (ris.giocatori.length !== 1) return null;
    const k = chiaveBest(ris.modo.chiave, ris.livello);
    const g = ris.giocatori[0];
    const prec = leggiBest(ris.modo.chiave, ris.livello);
    if (!prec || g.punti > prec.punti) {
      App.best[k] = { punti: g.punti, giusti: g.giusti, precisione: g.precisione };
      salvaBest();
      return App.best[k];
    }
    return prec;
  }

  function livello() { return T.LEVELS[App.opt.livello]; }

  /* --------------------------------------------------------------- utility */
  function toast(msg, tipo) {
    const t = el('toast');
    t.textContent = msg;
    t.className = 'toast' + (tipo ? ' ' + tipo : '');
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2200);
  }

  function mostraSchermata(nome) {
    App.schermata = nome;
    ['home', 'learn', 'play', 'results', 'help'].forEach(function (s) {
      const n = el('screen-' + s);
      if (n) n.classList.toggle('is-active', s === nome);
    });
    window.scrollTo(0, 0);
  }

  function contaAllaRovescia(n, fatto) {
    const ov = el('overlay');
    ov.hidden = false;
    ov.className = 'overlay';
    ov.innerHTML = '<div class="countdown">' + n + '</div>';
    let k = n;
    const step = function () {
      if (k <= 0) {
        ov.hidden = true;
        ov.innerHTML = '';
        fatto();
        return;
      }
      ov.innerHTML = '<div class="countdown">' + k + '</div>';
      if (typeof Sound !== 'undefined') Sound.sfx.countdown();
      k -= 1;
      setTimeout(step, 700);
    };
    step();
  }

  /* =============================================================== HOME === */
  function renderHome() {
    const L = livello();
    const livelli = T.LEVEL_ORDER.map(function (k) {
      const lv = T.LEVELS[k];
      return '<button class="liv-btn' + (k === App.opt.livello ? ' is-on' : '') + '" data-liv="' + k + '">' +
        '<span class="liv-icona">' + lv.icona + '</span>' +
        '<span class="liv-nome">' + lv.name + '</span></button>';
    }).join('');

    const cards = Gioco.ORDINE.map(function (k) {
      const m = Gioco.MODI[k];
      const b = leggiBest(k, App.opt.livello);
      const record = b ? '<span class="card-record">Record ' + b.punti + ' pt</span>' : '';
      const badge = m.giocatori > 1 ? '<span class="card-badge">2 giocatori</span>' : '';
      const durata = m.secondi ? m.secondi + '"' : (m.domande ? m.domande + ' domande' : '');
      return '<button class="card modo" data-modo="' + k + '">' +
        '<span class="card-top"><span class="card-icona">' + m.icona + '</span>' + badge + '</span>' +
        '<span class="card-nome">' + m.nome + '</span>' +
        '<span class="card-desc">' + m.desc + '</span>' +
        '<span class="card-foot"><span class="card-durata">' + durata + '</span>' + record + '</span>' +
        '</button>';
    }).join('');

    el('screen-home').innerHTML =
      '<div class="hero">' +
      '<h1>Impara le note del violino giocando</h1>' +
      '<p>Scegli un gioco, il livello giusto per te e comincia. Puoi giocare da solo, ' +
      'sfidare un amico a turni oppure suonare insieme sullo stesso schermo.</p>' +
      '<div class="hero-azioni">' +
      '<button class="btn primario grande" id="btn-vai-gioca">🎮 Scegli un gioco</button>' +
      '<button class="btn grande" id="btn-vai-impara">📚 Studia le note</button>' +
      '</div>' +
      '</div>' +
      '<div class="panel">' +
      '<div class="panel-titolo">Livello <span class="pill">' + L.icona + ' ' + L.name + '</span></div>' +
      '<div class="livelli">' + livelli + '</div>' +
      '<p class="liv-desc">' + L.desc + '</p>' +
      '</div>' +
      '<div class="modi">' + cards + '</div>' +
      '<div class="panel opzioni-rapide">' +
      '<div class="panel-titolo">Opzioni</div>' +
      '<label class="switch"><input type="checkbox" id="opt-bemolli"' + (App.opt.preferFlats ? ' checked' : '') + '>' +
      '<span>Usa i bemolli (Si♭) invece dei diesis (La♯)</span></label>' +
      '<label class="switch"><span>Risposte fra cui scegliere</span>' +
      '<select id="opt-opzioni">' +
      [3, 4, 5, 6].map(function (n) {
        return '<option value="' + n + '"' + (n === App.opt.numOpzioni ? ' selected' : '') + '>' + n + '</option>';
      }).join('') +
      '</select></label>' +
      '<div class="nomi">' +
      '<label>Nome giocatore 1 <input id="nome-1" type="text" maxlength="14" value="' + esc(App.opt.nomi[0]) + '"></label>' +
      '<label>Nome giocatore 2 <input id="nome-2" type="text" maxlength="14" value="' + esc(App.opt.nomi[1]) + '"></label>' +
      '<label>Durata sfide a due <select id="opt-durata">' +
      [30, 45, 60, 90].map(function (s) {
        return '<option value="' + s + '"' + (s === App.opt.secondiDue ? ' selected' : '') + '>' + s + ' secondi</option>';
      }).join('') + '</select></label>' +
      '</div></div>';

    el('screen-home').querySelectorAll('[data-liv]').forEach(function (b) {
      b.addEventListener('click', function () {
        App.opt.livello = b.getAttribute('data-liv');
        App.imparaLivello = App.opt.livello;
        salvaPreferenze();
        renderLevelPicker();
        renderHome();
        click();
      });
    });
    el('screen-home').querySelectorAll('[data-modo]').forEach(function (b) {
      b.addEventListener('click', function () { avviaModo(b.getAttribute('data-modo')); });
    });
    const chk = el('opt-bemolli');
    if (chk) chk.addEventListener('change', function () {
      App.opt.preferFlats = chk.checked; salvaPreferenze();
    });
    const sel = el('opt-opzioni');
    if (sel) sel.addEventListener('change', function () {
      App.opt.numOpzioni = parseInt(sel.value, 10); salvaPreferenze();
    });
    const dur = el('opt-durata');
    if (dur) dur.addEventListener('change', function () {
      App.opt.secondiDue = parseInt(dur.value, 10); salvaPreferenze();
    });
    ['nome-1', 'nome-2'].forEach(function (id, i) {
      const inp = el(id);
      if (inp) inp.addEventListener('change', function () {
        App.opt.nomi[i] = inp.value.trim() || ('Giocatore ' + (i + 1));
        salvaPreferenze();
      });
    });

    // I pulsanti grandi vanno riagganciati ogni volta: renderHome ricostruisce l'HTML
    el('btn-vai-gioca').addEventListener('click', function () {
      const m = document.querySelector('.modi');
      if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el('btn-vai-impara').addEventListener('click', function () {
      renderLearn(); mostraSchermata('learn');
    });
  }

  function renderLevelPicker() {
    el('level-picker').innerHTML = T.LEVEL_ORDER.map(function (k) {
      const lv = T.LEVELS[k];
      return '<button class="pill-btn' + (k === App.opt.livello ? ' is-on' : '') + '" data-liv="' + k + '" ' +
        'title="' + esc(lv.desc) + '"><span class="pi-icona">' + lv.icona + '</span>' +
        '<span class="pi-nome">' + lv.name + '</span></button>';
    }).join('');
    el('level-picker').querySelectorAll('[data-liv]').forEach(function (b) {
      b.addEventListener('click', function () {
        App.opt.livello = b.getAttribute('data-liv');
        App.imparaLivello = App.opt.livello;
        salvaPreferenze();
        renderLevelPicker();
        if (App.schermata === 'home') renderHome();
        if (App.schermata === 'learn') renderLearn();
        click();
      });
    });
  }

  function click() { if (typeof Sound !== 'undefined' && Sound.isEnabled()) Sound.sfx.click(); }

  /* ============================================================== LEARN === */
  function renderLearn() {
    const lv = T.LEVELS[App.imparaLivello];
    const posScelte = [1, 2, 3].filter(function (p) { return p <= lv.maxPosition; });
    const selPos = Math.min(App.opt.posizioneStudio || 1, lv.maxPosition);

    el('screen-learn').innerHTML =
      '<div class="panel">' +
      '<div class="panel-titolo">Studia il manico e il pentagramma</div>' +
      '<div class="learn-grid">' +
      '<div class="learn-violino"><div id="learn-violin"></div>' +
      '<div class="pos-scelta">' + posScelte.map(function (p) {
        return '<button class="pill-btn' + (p === selPos ? ' is-on' : '') + '" data-pos="' + p + '">' +
          (p === 1 ? '1ª posizione' : 'fino alla ' + p + 'ª') + '</button>';
      }).join('') + '</div>' +
      '<p class="mini">Tocca una pallina: il numero è il dito, il colore è la corda. ' +
      'I nomi delle note sono quelli italiani (Do, Re, Mi, Fa, Sol, La, Si) e il numero ' +
      'indica l\'ottava: il La4 è il La di riferimento a 440 Hz.</p>' +
      '</div>' +
      '<div class="learn-pent">' +
      '<div class="learn-staff" id="learn-staff"></div>' +
      '<div class="learn-nota" id="learn-nota"></div>' +
      '<div class="learn-azioni">' +
      '<button class="btn" id="btn-ripeti">🔊 Riascolta</button>' +
      '<button class="btn ghost" id="btn-accorda">🎻 Accordatura (Sol Re La Mi)</button>' +
      '</div>' +
      '</div>' +
      '</div></div>' +
      '<div class="panel"><div class="panel-titolo">Le note della ' + (selPos === 1 ? '1ª' : selPos + 'ª') +
      ' posizione</div><div id="learn-table"></div></div>';

    const optViolino = {
      maxPosition: selPos,
      naturalsOnly: !lv.accidentals,
      showNames: true,
      interactive: true,
      onPick: function (slot) {
        App.notaStudio = slot.note;
        mostraNotaStudio(slot);
        if (typeof Sound !== 'undefined') Sound.playMidi(slot.midi, 1.4);
      },
      highlight: null
    };
    Violin.renderTo(el('learn-violin'), optViolino);

    if (!App.notaStudio) App.notaStudio = T.STRINGS[1].open;
    mostraNotaStudio(null);

    el('screen-learn').querySelectorAll('[data-pos]').forEach(function (b) {
      b.addEventListener('click', function () {
        App.opt.posizioneStudio = parseInt(b.getAttribute('data-pos'), 10);
        salvaPreferenze();
        renderLearn();
      });
    });
    el('btn-ripeti').addEventListener('click', function () {
      if (typeof Sound !== 'undefined') Sound.playNote(App.notaStudio, 1.4);
    });
    el('btn-accorda').addEventListener('click', function () {
      if (typeof Sound !== 'undefined') Sound.accordaturaCompleta();
    });
    renderTabella(lv);
  }

  function mostraNotaStudio(slot) {
    const n = App.notaStudio;
    Staff.renderTo(el('learn-staff'), { notes: [n], labels: false });
    const pls = T.placementsFor(n, 3);
    const prim = pls[0];
    const dove = prim ? T.describePlacement(prim.pl, prim.delta) : 'non suonabile in 1ª posizione';
    const alterTxt = n.alter > 0 ? ' (' + T.solfegeLetter(n) + ' diesis)'
      : n.alter < 0 ? ' (' + T.solfegeLetter(n) + ' bemolle)' : '';
    el('learn-nota').innerHTML =
      '<div class="nota-grande">' + T.solfege(n) + '</div>' +
      '<div class="nota-sub">' + T.solfegeOttava(n) + alterTxt + ' · ' +
      (Math.round(T.freq(n) * 10) / 10).toLocaleString('it-IT') + ' Hz</div>' +
      '<div class="nota-dove">' + (prim ? 'Sul manico: ' + dove : dove) + '</div>' +
      (pls.length > 1 ? '<div class="nota-alt">Si può suonare anche: ' +
        pls.slice(1, 3).map(function (r) { return T.describePlacement(r.pl, r.delta); }).join(', ') + '</div>' : '');
  }

  function renderTabella(lv) {
    const cont = el('learn-table');
    if (!cont) return;
    cont.innerHTML = T.STRINGS.map(function (s) {
      const note = T.notesOnString(s.id, lv.maxPosition).filter(function (x) {
        if (!lv.accidentals && x.note.alter !== 0) return false;
        return true;
      });
      const chips = note.map(function (x) {
        const pl = x.placements[0];
        const dito = pl.pl.finger;
        return '<button class="chip" data-midi="' + T.midi(x.note) + '" style="--corda:' + s.color + '">' +
          '<span class="chip-nome">' + T.solfege(x.note) + '</span>' +
          '<span class="chip-dito">' + (dito === 0 ? 'vuota' : dito + 'º') + '</span></button>';
      }).join('');
      return '<div class="tc-riga">' +
        '<div class="tc-nome" style="--corda:' + s.color + '">' + s.solfege +
        ' <small>' + s.roman + '</small></div>' +
        '<div class="tc-note">' + chips + '</div></div>';
    }).join('');
    cont.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () {
        const m = parseInt(b.getAttribute('data-midi'), 10);
        App.notaStudio = T.fromMidi(m, App.opt.preferFlats);
        mostraNotaStudio(null);
        if (typeof Sound !== 'undefined') Sound.playMidi(m, 1.4);
      });
    });
  }

  /* =============================================================== PLAY === */
  function avviaModo(chiave) {
    const modo = Gioco.MODI[chiave];
    if (!modo) return;
    if (modo.giocatori > 1) return apriSetup(chiave);
    partePartita(chiave, {});
  }

  function apriSetup(chiave) {
    const modo = Gioco.MODI[chiave];
    const ov = el('overlay');
    ov.hidden = false;
    ov.className = 'overlay';
    ov.innerHTML =
      '<div class="modal">' +
      '<h2>' + modo.icona + ' ' + modo.nome + '</h2>' +
      '<p class="mini">' + modo.desc + '</p>' +
      '<label>Nome giocatore 1<input id="s-nome-1" type="text" maxlength="14" value="' + esc(App.opt.nomi[0]) + '"></label>' +
      '<label>Nome giocatore 2<input id="s-nome-2" type="text" maxlength="14" value="' + esc(App.opt.nomi[1]) + '"></label>' +
      (modo.layout === 'turni'
        ? '<label>Secondi per turno<select id="s-durata">' +
        [20, 30, 45, 60].map(function (s) {
          return '<option value="' + s + '"' + (s === App.opt.secondiDue ? ' selected' : '') + '>' + s + ' secondi</option>';
        }).join('') + '</select></label>'
        : '<label>Durata della sfida<select id="s-durata">' +
        [30, 45, 60, 90].map(function (s) {
          return '<option value="' + s + '"' + (s === App.opt.secondiDue ? ' selected' : '') + '>' + s + ' secondi</option>';
        }).join('') + '</select></label>') +
      '<div class="modal-azioni">' +
      '<button class="btn ghost" id="s-annulla">Annulla</button>' +
      '<button class="btn primario" id="s-inizia">Inizia la sfida</button>' +
      '</div></div>';
    el('s-annulla').addEventListener('click', function () { ov.hidden = true; ov.innerHTML = ''; });
    el('s-inizia').addEventListener('click', function () {
      const n1 = el('s-nome-1').value.trim() || 'Giocatore 1';
      const n2 = el('s-nome-2').value.trim() || 'Giocatore 2';
      const dur = parseInt(el('s-durata').value, 10);
      App.opt.nomi = [n1, n2];
      App.opt.secondiDue = dur;
      salvaPreferenze();
      ov.hidden = true; ov.innerHTML = '';
      partePartita(chiave, { nomi: [n1, n2], secondi: dur });
    });
  }

  function partePartita(chiave, extra) {
    const modo = Gioco.MODI[chiave];
    const bisognoConteggio = !!modo.secondi;
    const inizia = function () {
      App.sessione = new Gioco.Sessione({
        modo: chiave,
        livello: App.opt.livello,
        preferFlats: App.opt.preferFlats,
        numOpzioni: App.opt.numOpzioni,
        nomi: extra.nomi || App.opt.nomi,
        secondi: extra.secondi,
        hooks: {
          onChange: function (s, evento) { onCambio(s, evento); }
        }
      });
      mostraSchermata('play');
      App.sessione.avvia();
    };
    if (bisognoConteggio) contaAllaRovescia(3, inizia); else inizia();
  }

  function onCambio(s, evento) {
    if (evento === 'fine') return mostraRisultati(s);
    if (evento === 'tick') return aggiornaTimer(s);
    renderPlay();
  }

  /** Aggiornamento leggero (solo orologio) per non ridisegnare i pulsanti. */
  function aggiornaTimer(s) {
    const sc = el('screen-play');
    if (!sc || !sc.classList.contains('is-active')) return;
    const t = sc.querySelector('[data-tempo]');
    if (t) {
      t.textContent = Math.max(0, Math.ceil(s.tempo)) + '"';
      t.classList.toggle('critico', s.tempo <= 10);
    }
    const b = sc.querySelector('[data-barra]');
    if (b) b.style.width = Math.round(Math.max(0, s.tempo) / s.secondi * 100) + '%';
  }

  /* ------------------------------------------------------- schermata di gioco */
  function renderPlay() {
    const s = App.sessione;
    if (!s) return;
    el('level-picker').classList.add('is-hidden');
    const sc = el('screen-play');

    if (s.fase === 'turno') {
      const g = s.giocatori[s.turno];
      const prec = s.turno > 0 ? s.giocatori[s.turno - 1] : null;
      sc.innerHTML =
        '<div class="card turno">' +
        '<div class="turno-icona">🎻</div>' +
        '<h2>Tocca a <em>' + esc(g.nome) + '</em></h2>' +
        (prec ? '<p class="turno-prec">' + esc(prec.nome) + ' ha totalizzato <strong>' + prec.punti + ' punti</strong> (' +
          prec.giusti + ' giuste, ' + prec.sbagli + ' sbagliate).</p>' : '<p class="mini">' + s.secondi +
          ' secondi per rispondere al maggior numero di note.</p>') +
        '<button class="btn primario grande" id="btn-turno">Inizia il turno</button>' +
        '<button class="btn ghost" id="btn-esci-2">Esci</button>' +
        '</div>';
      el('btn-turno').addEventListener('click', function () { s.avviaTurno(s.turno); });
      el('btn-esci-2').addEventListener('click', function () { esci(); });
      return;
    }

    if (s.modo.layout === 'split') return renderSplit(s);
    if (s.modo.layout === 'race') return renderRace(s);
    return renderSolo(s);
  }

  function hudHTML(s, giocatore) {
    const g = giocatore || s.giocatori[0];
    const tempo = s.secondi ? Math.max(0, Math.ceil(s.tempo)) : 0;
    const prog = s.totale ? Math.min(1, (s.indice + (s.fase === 'feedback' ? 1 : 0)) / s.totale) : 0;
    const barra = s.secondi
      ? (s.tempo / s.secondi)
      : prog;
    const critico = s.secondi && s.tempo <= 10;
    return '<div class="hud">' +
      '<div class="hud-item"><span class="hud-k">Punti</span><span class="hud-v">' + g.punti + '</span></div>' +
      '<div class="hud-item"><span class="hud-k">Serie</span><span class="hud-v">' + (g.serie >= 2 ? '🔥 ' + g.serie : g.serie) + '</span></div>' +
      '<div class="hud-item"><span class="hud-k">Giuste</span><span class="hud-v"><b class="ok">' + g.giusti + '</b>/<b class="ko">' + g.sbagli + '</b></span></div>' +
      (s.secondi
        ? '<div class="hud-item"><span class="hud-k">Tempo</span><span class="hud-v' + (critico ? ' critico' : '') + '" data-tempo>' + tempo + '"</span></div>'
        : '<div class="hud-item"><span class="hud-k">Domanda</span><span class="hud-v">' + Math.min(s.indice + 1, s.totale) + '/' + s.totale + '</span></div>') +
      '</div>' +
      '<div class="barra' + (critico ? ' critico' : '') + '"><i data-barra style="width:' + Math.round(barra * 100) + '%"></i></div>';
  }

  function opzioniHTML(q, scelta) {
    return '<div class="opzioni num-' + q.opzioni.length + '">' + q.opzioni.map(function (n, i) {
      let cls = 'opt';
      if (scelta != null) {
        if (i === q.indiceGiusto) cls += ' giusta';
        else if (T.midi(n) === T.midi(scelta)) cls += ' sbagliata';
      }
      return '<button class="' + cls + '" data-i="' + i + '"' + (scelta != null ? ' disabled' : '') +
        ' title="' + T.solfegeEsteso(n) + '" aria-label="' + T.solfegeEsteso(n) + '">' +
        '<span class="opt-nome">' + T.solfege(n) + '</span>' +
        '<span class="opt-tasto">' + TASTI_LABEL[i] + '</span></button>';
    }).join('') + '</div>';
  }

  function feedbackHTML(s) {
    if (s.fase !== 'feedback') return '';
    const g = s.giocatori[0];
    const u = g.ultimo;
    if (!u) return '';
    const giusto = u.corretto;
    const testo = giusto
      ? '<strong>Giusto!</strong> ' + T.solfege(u.domanda.nota) + ' +' + u.punti.totale + ' punti' +
      (u.punti.serie ? ' <span class="tag">serie +' + u.punti.serie + '</span>' : '') +
      (u.punti.veloce ? ' <span class="tag">velocità +' + u.punti.veloce + '</span>' : '')
      : '<strong>Sbagliato.</strong> Era ' + (Array.isArray(u.giusto) ? u.giusto[0] : u.giusto);
    return '<div class="feedback ' + (giusto ? 'ok' : 'ko') + '">' + testo + '</div>';
  }

  function renderSolo(s) {
    const q = s.domanda;
    if (!q) return;
    const sc = el('screen-play');
    const lv = s.livello;
    const ultimo = s.giocatori[0].ultimo;
    const scelta = s.fase === 'feedback' && ultimo ? ultimo.scelta : null;
    let palco = '';

    if (q.tipo === 'posizione') {
      // il pentagramma rende la richiesta inequivocabile: "Sol3" e "Sol4" hanno
      // lo stesso nome ma stanno in due punti diversi del manico
      palco = '<div class="card richiesta pos">' +
        '<div class="etichetta">Trova sul manico questa nota</div>' +
        '<div class="req-corpo">' +
        '<div class="req-staff">' + Staff.build({ notes: [q.nota] }) + '</div>' +
        '<div class="req-nome">' +
        '<div class="nota-grande">' + T.solfegeOttava(q.nota) + '</div>' +
        '<div class="nota-sub">' + T.solfegeEsteso(q.nota) + ' · ' +
        (lv.maxPosition > 1 ? '1ª–' + lv.maxPosition + 'ª posizione' : '1ª posizione') + '</div>' +
        '</div></div></div>' +
        '<div class="violino-box" id="violino"></div>';
    } else if (q.tipo === 'orecchio') {
      const rivela = s.fase === 'feedback';
      palco = '<div class="card ascolto">' +
        '<div class="etichetta">Ascolta e riconosci la nota</div>' +
        '<button class="btn grande" id="btn-ascolta">🔊 Ascolta</button>' +
        (rivela ? '<div class="staff-wrap piccolo">' + Staff.build({ notes: [q.nota] }) + '</div>' : '') +
        '</div>';
    } else {
      palco = '<div class="staff-wrap">' + Staff.build({ notes: [q.nota] }) + '</div>';
    }

    sc.innerHTML =
      hudHTML(s) +
      '<div class="palco">' + palco + '</div>' +
      (q.tipo === 'posizione' ? '' : opzioniHTML(q, scelta)) +
      feedbackHTML(s) +
      '<div class="piede"><button class="btn ghost" id="btn-esci">Esci</button>' +
      pulsanteErrori(s) +
      '<span class="mini">' + esc(s.modo.aiuto) + '</span></div>';

    if (q.tipo === 'posizione') {
      const hl = s.fase === 'feedback' ? q.soluzioni[0] : null;
      const wrong = s.fase === 'feedback' ? (s.giocatori[0].ultimoErrato || null) : null;
      Violin.renderTo(el('violino'), {
        maxPosition: lv.maxPosition,
        naturalsOnly: !lv.accidentals,
        showNames: false,
        interactive: s.fase !== 'feedback',
        highlight: hl ? { stringId: hl.pl.stringId, semis: semisSullaCorda(hl.pl, q.nota) } : null,
        wrong: wrong,
        onPick: function (slot) { rispondiPosizione(0, slot); }
      });
    }
    const ba = el('btn-ascolta');
    if (ba) ba.addEventListener('click', function () { s.riproduci(q); });
    wireOpzioni(s, 0);
    el('btn-esci').addEventListener('click', function () { esci(); });
    agganciaPulsanteErrori(sc);
  }

  /** Semitoni fra la corda vuota e la nota da trovare (posizione della pallina). */
  function semisSullaCorda(pl, nota) {
    const open = T.midi(T.stringOf(pl.stringId).open);
    return T.midi(nota) - open;
  }

  function wireOpzioni(s, giocatore) {
    const q = s.domandaDi(giocatore);
    if (!q || !q.opzioni) return;
    document.querySelectorAll('.opzioni .opt').forEach(function (b) {
      b.addEventListener('click', function () {
        const i = parseInt(b.getAttribute('data-i'), 10);
        rispondiNome(giocatore, q.opzioni[i]);
      });
    });
  }

  /** Si può rispondere? Nella sfida contemporanea conta lo stato del singolo giocatore. */
  function puoRispondere(s, i) {
    if (s.fase !== 'domanda' || s.inPausa) return false;
    const g = s.giocatori[i];
    if (!g || g.fase !== 'domanda') return false;
    if (g.bloccato && s.modo.layout === 'race') return false;
    return true;
  }

  /* ------------------------------------------------ riepilogo degli errori */
  function quantiErrori(s) {
    if (!s) return 0;
    return (s.storico || []).filter(function (v) { return !v.corretto; }).length;
  }

  function pulsanteErrori(s) {
    const n = quantiErrori(s);
    return '<button class="btn errori-btn' + (n ? '' : ' pulito') + '" id="btn-errori">' +
      '📋 ' + (n ? 'Errori <span class="contatore">' + n + '</span>' : 'Nessun errore 🎉') + '</button>';
  }

  function apriRiepilogo(contesto) {
    const s = App.sessione;
    if (!s) return;
    const rip = Gioco.riepilogaErrori(s);
    if (!rip) return;
    App.riepilogoAperto = true;
    if (s.fase !== 'fine') s.pausa();

    const testata = '<div class="rie-testata">' +
      '<h2>📋 Riepilogo degli errori</h2>' +
      '<p class="mini">' + esc(rip.modo.nome) + ' · ' + T.LEVELS[rip.livello].name + ' · ' +
      rip.sbagliate + (rip.sbagliate === 1 ? ' errore' : ' errori') + ' su ' + rip.totale +
      ' domande · precisione ' + rip.precisione + '%</p>' +
      (rip.piuFrequente
        ? '<div class="rie-frequente">Errore più frequente: <b>' + rip.piuFrequente.titolo +
        '</b> (' + rip.piuFrequente.conteggio + ' volte)<br><span class="mini">' +
        esc(rip.piuFrequente.rimedio) + '</span></div>'
        : '') +
      '</div>';

    const voci = rip.voci.length ? rip.voci.map(function (v) {
      const freq = (v.frequenzaScelta != null && v.notaScelta)
        ? '<div class="rie-freq">' + T.solfegeOttava(v.nota) + ' = ' +
        v.frequenzaGiusta.toLocaleString('it-IT') + ' Hz · ' +
        T.solfegeOttava(v.notaScelta) + ' = ' +
        v.frequenzaScelta.toLocaleString('it-IT') + ' Hz</div>'
        : '';
      return '<div class="rie-voce">' +
        '<div class="rie-testa"><span class="rie-num">Domanda ' + v.numero + '</span>' +
        '<span class="rie-tipo">' + esc(v.tipoNome) + '</span>' +
        '<span class="rie-cat">' + esc(v.titolo) + '</span></div>' +
        '<div class="rie-corpo">' +
        '<div class="rie-staff">' + Staff.build({ notes: [v.nota] }) + '</div>' +
        '<div class="rie-testi">' +
        '<div class="rie-riga"><span class="rie-k">La tua risposta</span><b class="ko">' +
        esc(v.tuaRisposta) + '</b></div>' +
        '<div class="rie-riga"><span class="rie-k">Risposta giusta</span><b class="ok">' +
        v.nomeGiustoOttava + '</b>' +
        (v.nota.alter ? ' <em>(' + v.nomeGiustoEsteso + ')</em>' : '') + '</div>' +
        '<p class="rie-spiega">' + esc(v.spiegazione) + '</p>' +
        '<p class="rie-dove">Sul manico: ' + esc(v.dove) +
        (v.altrove.length ? ' <span class="mini">· si può suonare anche: ' + esc(v.altrove.join(', ')) + '</span>' : '') +
        '</p>' + freq +
        '</div></div>' +
        '<div class="rie-azioni">' +
        '<button class="btn piccolo" data-ascolta="' + v.ascolta.join(',') + '">🔊 Confronta: ' +
        esc(v.ascoltaNomi.join(' poi ')) + '</button>' +
        '<button class="btn piccolo ghost" data-ascolta="' + T.midi(v.nota) + '">🔊 Solo la nota giusta</button>' +
        '</div></div>';
    }).join('') : '<p class="rie-vuoto">🎉 Nessun errore da rivedere: complimenti!</p>';

    const ov = el('overlay');
    ov.hidden = false;
    ov.className = 'overlay lungo';
    ov.innerHTML = '<div class="modal riepilogo" role="dialog" aria-label="Riepilogo degli errori">' +
      testata + '<div class="rie-lista">' + voci + '</div>' +
      '<div class="rie-piede"><button class="btn primario" id="rie-chiudi">' +
      (s.fase === 'fine' ? 'Chiudi' : 'Chiudi e riprendi') + '</button></div></div>';

    ov.querySelectorAll('[data-ascolta]').forEach(function (b) {
      b.addEventListener('click', function () {
        const midis = b.getAttribute('data-ascolta').split(',').map(Number);
        if (typeof Sound === 'undefined') return;
        Sound.stopAll();
        midis.forEach(function (m, i) {
          Sound.playMidi(m, 1.1, { delay: i * 1.25, gain: 0.9 });
        });
      });
    });
    el('rie-chiudi').addEventListener('click', function () { chiudiRiepilogo(); });
  }

  function chiudiRiepilogo() {
    App.riepilogoAperto = false;
    const ov = el('overlay');
    ov.hidden = true;
    ov.className = 'overlay';
    ov.innerHTML = '';
    if (typeof Sound !== 'undefined') Sound.stopAll();
    const s = App.sessione;
    if (s && s.fase !== 'fine') s.riprendi();
  }

  function agganciaPulsanteErrori(radice) {
    const b = (radice || document).querySelector('#btn-errori');
    if (b) b.addEventListener('click', function () { apriRiepilogo('gioco'); });
  }

  function rispondiNome(i, nota) {
    const s = App.sessione;
    if (!s) return;
    const q = s.domandaDi(i);
    if (!q || !puoRispondere(s, i)) return;
    const esito = s.rispondi(i, { tipo: 'nome', valore: nota });
    if (esito) {
      esito.scelta = nota;
      if (!esito.corretto) s.giocatori[i].ultimoErrato = { valore: nota };
    }
    // il passaggio al round successivo (testa a testa) è programmato dal motore,
    // così si mette in pausa insieme al resto quando si apre il riepilogo
    renderPlay();
  }

  function rispondiPosizione(i, slot) {
    const s = App.sessione;
    if (!s) return;
    const q = s.domandaDi(i);
    if (!q || !puoRispondere(s, i)) return;
    const esito = s.rispondi(i, { tipo: 'posizione', slot: slot });
    if (esito && !esito.corretto) {
      s.giocatori[i].ultimoErrato = { stringId: slot.stringId, semis: slot.semis };
    }
    renderPlay();
  }

  function renderSplit(s) {
    const colonne = s.giocatori.map(function (g, i) {
      const q = g.domanda;
      if (!q) return '';
      const attesa = g.fase !== 'domanda';
      const u = g.ultimo;
      const fb = attesa && u ? '<div class="feedback mini-fb ' + (u.corretto ? 'ok' : 'ko') + '">' +
        (u.corretto ? '✔ +' + u.punti.totale : '✘ ' + T.solfege(u.domanda.nota)) + '</div>' : '';
      return '<div class="colonna p' + (i + 1) + (attesa && u ? (u.corretto ? ' flash-ok' : ' flash-ko') : '') + '">' +
        '<div class="col-testata"><span class="col-nome">' + esc(g.nome) + '</span>' +
        '<span class="col-punti">' + g.punti + '</span></div>' +
        '<div class="col-staff">' + Staff.build({ notes: [q.nota] }) + '</div>' +
        fb + opzioniSplit(q, i, g) +
        '</div>';
    }).join('');

    el('screen-play').innerHTML =
      '<div class="hud sfida">' +
      '<div class="hud-item"><span class="hud-k">Tempo</span><span class="hud-v' +
      (s.tempo <= 10 ? ' critico' : '') + '" data-tempo>' + Math.max(0, Math.ceil(s.tempo)) + '"</span></div>' +
      '<div class="hud-item"><span class="hud-k">Giocatore 1</span><span class="hud-v">' + s.giocatori[0].giusti + ' giuste</span></div>' +
      '<div class="hud-item"><span class="hud-k">Giocatore 2</span><span class="hud-v">' + s.giocatori[1].giusti + ' giuste</span></div>' +
      '</div>' +
      '<div class="barra' + (s.tempo <= 10 ? ' critico' : '') + '"><i data-barra style="width:' +
      Math.round(s.tempo / s.secondi * 100) + '%"></i></div>' +
      '<div class="split">' + colonne + '</div>' +
      '<div class="piede"><button class="btn ghost" id="btn-esci">Esci</button>' +
      pulsanteErrori(s) +
      '<span class="mini">' + esc(s.modo.aiuto) + '</span></div>';

    el('screen-play').querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        const col = parseInt(b.getAttribute('data-col'), 10);
        const i = parseInt(b.getAttribute('data-i'), 10);
        const q = s.giocatori[col].domanda;
        rispondiNome(col, q.opzioni[i]);
      });
    });
    el('btn-esci').addEventListener('click', function () { esci(); });
    agganciaPulsanteErrori(el('screen-play'));
  }

  function opzioniSplit(q, col, g) {
    const attesa = g.fase !== 'domanda';
    const scelta = attesa && g.ultimo && !g.ultimo.corretto ? g.ultimo.scelta : null;
    return '<div class="opzioni mini num-' + q.opzioni.length + '">' + q.opzioni.map(function (n, i) {
      let cls = 'opt';
      if (attesa) {
        if (i === q.indiceGiusto) cls += ' giusta';
        else if (scelta && T.midi(n) === T.midi(scelta)) cls += ' sbagliata';
      }
      return '<button class="' + cls + '" data-col="' + col + '" data-i="' + i + '"' +
        (attesa ? ' disabled' : '') + ' title="' + T.solfegeEsteso(n) + '" ' +
        'aria-label="' + T.solfegeEsteso(n) + '">' +
        '<span class="opt-nome">' + T.solfege(n) + '</span>' +
        '<span class="opt-tasto">' + (col === 0 ? TASTI_P1[i] : TASTI_P2[i]).toUpperCase() + '</span></button>';
    }).join('') + '</div>';
  }

  function renderRace(s) {
    const q = s.domanda;
    if (!q) return;
    const chiuso = s.fase === 'feedback';
    const pads = s.giocatori.map(function (g, i) {
      const u = g.ultimo;
      const scelta = u && !u.corretto && u.scelta ? u.scelta : null;
      return '<div class="pads p' + (i + 1) + (g.bloccato ? ' bloccato' : '') + '">' +
        '<div class="col-testata"><span class="col-nome">' + esc(g.nome) + '</span>' +
        '<span class="col-punti">' + g.punti + '</span></div>' +
        '<div class="opzioni mini num-' + q.opzioni.length + '">' + q.opzioni.map(function (n, k) {
          let cls = 'opt';
          if (chiuso || g.bloccato) {
            if (k === q.indiceGiusto && chiuso) cls += ' giusta';
            else if (scelta && T.midi(n) === T.midi(scelta)) cls += ' sbagliata';
          }
          return '<button class="' + cls + '" data-col="' + i + '" data-i="' + k + '"' +
            (g.bloccato || chiuso ? ' disabled' : '') +
            ' title="' + T.solfegeEsteso(n) + '" aria-label="' + T.solfegeEsteso(n) + '">' +
            '<span class="opt-nome">' + T.solfege(n) + '</span>' +
            '<span class="opt-tasto">' + (i === 0 ? TASTI_P1[k] : TASTI_P2[k]).toUpperCase() + '</span></button>';
        }).join('') + '</div></div>';
    }).join('');

    el('screen-play').innerHTML =
      '<div class="hud sfida">' +
      '<div class="hud-item"><span class="hud-k">Tempo</span><span class="hud-v' +
      (s.tempo <= 10 ? ' critico' : '') + '" data-tempo>' + Math.max(0, Math.ceil(s.tempo)) + '"</span></div>' +
      '<div class="hud-item"><span class="hud-k">Punti</span><span class="hud-v">' +
      s.giocatori[0].punti + ' – ' + s.giocatori[1].punti + '</span></div>' +
      '<div class="hud-item"><span class="hud-k">Round</span><span class="hud-v">' + (s.indice + 1) + '</span></div>' +
      '</div>' +
      '<div class="barra' + (s.tempo <= 10 ? ' critico' : '') + '"><i data-barra style="width:' +
      Math.round(s.tempo / s.secondi * 100) + '%"></i></div>' +
      '<div class="staff-wrap centro">' + Staff.build({ notes: [q.nota] }) + '</div>' +
      '<div class="vs">chi tocca per primo la risposta giusta?</div>' +
      '<div class="race-grid">' + pads + '</div>' +
      '<div class="piede"><button class="btn ghost" id="btn-esci">Esci</button>' +
      pulsanteErrori(s) +
      '<span class="mini">' + esc(s.modo.aiuto) + '</span></div>';

    el('screen-play').querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () {
        const col = parseInt(b.getAttribute('data-col'), 10);
        const i = parseInt(b.getAttribute('data-i'), 10);
        rispondiNome(col, q.opzioni[i]);
      });
    });
    el('btn-esci').addEventListener('click', function () { esci(); });
    agganciaPulsanteErrori(el('screen-play'));
  }

  function esci() {
    if (App.sessione) App.sessione.fermaTimer();
    App.sessione = null;
    if (typeof Sound !== 'undefined') Sound.stopAll();
    el('level-picker').classList.remove('is-hidden');
    mostraSchermata('home');
    renderHome();
  }

  /* ============================================================ RISULTATI === */
  function mostraRisultati(s) {
    const ris = s.risultato || s.calcolaRisultato();
    const record = aggiornaBest(ris);
    el('level-picker').classList.remove('is-hidden');
    const sc = el('screen-results');

    if (ris.giocatori.length > 1) {
      const a = ris.giocatori[0], b = ris.giocatori[1];
      const testa = ris.pareggio
        ? '<h1 class="esito">🤝 Pareggio!</h1>'
        : '<h1 class="esito">🏆 Vince ' + esc(ris.giocatori[ris.vincitore].nome) + '!</h1>';
      sc.innerHTML =
        '<div class="card risultato">' +
        testa +
        '<div class="punteggi">' +
        rigaPunteggio(a, ris.vincitore === 0) + rigaPunteggio(b, ris.vincitore === 1) +
        '</div>' +
        '<div class="azioni">' +
        '<button class="btn primario" id="r-rivincita">🔁 Rivincita</button>' +
        ((a.sbagli + b.sbagli) ? '<button class="btn" id="r-errori">📋 Rivedi gli errori <span class="contatore">' +
          (a.sbagli + b.sbagli) + '</span></button>' : '') +
        '<button class="btn" id="r-home">🏠 Home</button>' +
        '</div></div>';
      el('r-rivincita').addEventListener('click', function () {
        partePartita(ris.modo.chiave, { nomi: App.opt.nomi, secondi: App.opt.secondiDue });
      });
      const re2 = el('r-errori');
      if (re2) re2.addEventListener('click', function () { apriRiepilogo('esiti'); });
    } else {
      const g = ris.giocatori[0];
      const med = Gioco.medaglia(g.precisione, g.punti);
      const nuovo = record && record.punti === g.punti;
      sc.innerHTML =
        '<div class="card risultato">' +
        '<div class="medaglia">' + med.icona + '</div>' +
        '<h1 class="esito">' + med.nome + '</h1>' +
        '<p class="mini">' + ris.modo.icona + ' ' + ris.modo.nome + ' · ' + T.LEVELS[ris.livello].name + '</p>' +
        '<div class="punteggio-grande">' + g.punti + '<small>punti</small></div>' +
        (nuovo ? '<div class="record-nuovo">🎉 Nuovo record personale!</div>' :
          (record ? '<div class="mini">Record da battere: ' + record.punti + ' punti</div>' : '')) +
        '<div class="stat-grid">' +
        stat('Giuste', g.giusti) + stat('Sbagliate', g.sbagli) +
        stat('Precisione', g.precisione + '%') + stat('Serie migliore', g.serieMax) +
        '</div>' +
        '<div class="azioni">' +
        '<button class="btn primario" id="r-rigioca">🔁 Gioca ancora</button>' +
        (g.sbagli ? '<button class="btn" id="r-errori">📋 Rivedi gli errori <span class="contatore">' +
          g.sbagli + '</span></button>' : '') +
        '<button class="btn" id="r-livello">🎚️ Cambia livello</button>' +
        '<button class="btn ghost" id="r-home">🏠 Home</button>' +
        '</div></div>';
      el('r-rigioca').addEventListener('click', function () {
        partePartita(ris.modo.chiave, {});
      });
      el('r-livello').addEventListener('click', function () { esci(); });
      const re = el('r-errori');
      if (re) re.addEventListener('click', function () { apriRiepilogo('esiti'); });
    }
    el('r-home').addEventListener('click', function () { esci(); });
    mostraSchermata('results');
  }

  function rigaPunteggio(g, vincitore) {
    return '<div class="riga-punt' + (vincitore ? ' vincitore' : '') + '">' +
      '<span class="rp-nome">' + (vincitore ? '👑 ' : '') + esc(g.nome) + '</span>' +
      '<span class="rp-punti">' + g.punti + '</span>' +
      '<span class="rp-stat">' + g.giusti + ' giuste · ' + g.sbagli + ' sbagliate · ' +
      g.precisione + '% · serie ' + g.serieMax + '</span></div>';
  }
  function stat(k, v) {
    return '<div class="stat"><span class="stat-v">' + v + '</span><span class="stat-k">' + k + '</span></div>';
  }

  /* ================================================================ TASTI === */
  function onKey(ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (App.riepilogoAperto) {
      if (ev.key === 'Escape') { ev.preventDefault(); chiudiRiepilogo(); }
      return;
    }
    const s = App.sessione;
    if (!s || App.schermata !== 'play') {
      if (ev.key === 'Escape' && App.schermata !== 'home') {
        esci();
      }
      return;
    }
    if (s.fase === 'turno') {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); s.avviaTurno(s.turno); }
      return;
    }
    const k = ev.key.toLowerCase();

    if (s.modo.layout === 'split' || s.modo.layout === 'race') {
      let col = -1, idx = -1;
      const i1 = TASTI_P1.indexOf(k), i2 = TASTI_P2.indexOf(k);
      if (i1 >= 0) { col = 0; idx = i1; } else if (i2 >= 0) { col = 1; idx = i2; }
      if (col >= 0) {
        ev.preventDefault();
        const q = s.domandaDi(col);
        if (q && q.opzioni && q.opzioni[idx] && !s.giocatori[col].bloccato && s.fase === 'domanda') {
          rispondiNome(col, q.opzioni[idx]);
        }
      }
      return;
    }

    const q = s.domanda;
    if (!q) return;
    if (q.opzioni && /^[1-9]$/.test(ev.key)) {
      const i = parseInt(ev.key, 10) - 1;
      if (q.opzioni[i]) { ev.preventDefault(); rispondiNome(0, q.opzioni[i]); }
    } else if (ev.key === ' ' || k === 'r') {
      if (q.tipo === 'orecchio') { ev.preventDefault(); s.riproduci(q); }
    } else if (ev.key === 'Enter' && s.fase === 'feedback') {
      s.prossima(0);
    }
  }

  /* ================================================================ AVVIO === */
  function init() {
    caricaPreferenze();
    App.notaStudio = T.STRINGS[1].open;
    renderLevelPicker();
    renderHome();
    mostraSchermata('home');

    el('btn-home').addEventListener('click', function () { esci(); });
    el('btn-help').addEventListener('click', function () {
      if (App.sessione) App.sessione.fermaTimer();
      el('level-picker').classList.remove('is-hidden');
      mostraSchermata(App.schermata === 'help' ? 'home' : 'help');
    });
    const bs = el('btn-sound');
    bs.addEventListener('click', function () {
      App.opt.audio = !App.opt.audio;
      Sound.setEnabled(App.opt.audio);
      bs.textContent = App.opt.audio ? '🔊' : '🔇';
      bs.setAttribute('aria-pressed', String(App.opt.audio));
      salvaPreferenze();
      if (App.opt.audio) { Sound.init(); Sound.sfx.click(); }
    });
    if (!App.opt.audio) { bs.textContent = '🔇'; Sound.setEnabled(false); }
    el('btn-nav-impara').addEventListener('click', function () { renderLearn(); mostraSchermata('learn'); });
    el('help-chiudi').addEventListener('click', function () { mostraSchermata('home'); renderHome(); });
    document.addEventListener('keydown', onKey);
    const sblocca = function () {
      if (typeof Sound !== 'undefined') Sound.init();
      document.removeEventListener('pointerdown', sblocca);
    };
    document.addEventListener('pointerdown', sblocca);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
