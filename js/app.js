/* ==========================================================================
   app.js — Interfaccia, schermate e collegamento con il motore di gioco
   ========================================================================== */
(function () {
  'use strict';

  const T = window.Theory;
  const I18n = window.I18n;
  const t = function (k, v) { return I18n.t(k, v); };
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
    // i nomi dei giocatori predefiniti seguono la lingua, quelli scelti a mano no
    const n = App.opt.nomi || [];
    const predefiniti = ['Giocatore 1', 'Giocatore 2', 'Player 1', 'Player 2'];
    if (!n[0] || predefiniti.indexOf(n[0]) >= 0) n[0] = t('nome.giocatore', { n: 1 });
    if (!n[1] || predefiniti.indexOf(n[1]) >= 0) n[1] = t('nome.giocatore', { n: 2 });
    App.opt.nomi = n;
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
      return '<button class="liv-btn' + (k === App.opt.livello ? ' is-on' : '') + '" data-liv="' + k + '">' +
        '<span class="liv-icona">' + T.LEVELS[k].icona + '</span>' +
        '<span class="liv-nome">' + T.nomeLivello(k) + '</span></button>';
    }).join('');

    const cards = Gioco.ORDINE.map(function (k) {
      const m = Gioco.MODI[k];
      const b = leggiBest(k, App.opt.livello);
      const record = b ? '<span class="card-record">' + t('home.record', { n: b.punti }) + '</span>' : '';
      const badge = m.giocatori > 1 ? '<span class="card-badge">' + t('home.dueGiocatori') + '</span>' : '';
      const durata = m.secondi ? m.secondi + '"' : (m.domande ? t('home.domande', { n: m.domande }) : '');
      return '<button class="card modo" data-modo="' + k + '">' +
        '<span class="card-top"><span class="card-icona">' + m.icona + '</span>' + badge + '</span>' +
        '<span class="card-nome">' + Gioco.nomeModo(m) + '</span>' +
        '<span class="card-desc">' + Gioco.descModo(m) + '</span>' +
        '<span class="card-foot"><span class="card-durata">' + durata + '</span>' + record + '</span>' +
        '</button>';
    }).join('');

    el('screen-home').innerHTML =
      '<div class="hero">' +
      '<h1>' + t('home.titolo') + '</h1>' +
      '<p>' + t('home.sottotitolo') + '</p>' +
      '<div class="hero-azioni">' +
      '<button class="btn primario grande" id="btn-vai-gioca">' + t('home.scegli') + '</button>' +
      '<button class="btn grande" id="btn-vai-impara">' + t('home.studia') + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="panel">' +
      '<div class="panel-titolo">' + t('home.livello') + ' <span class="pill">' + L.icona + ' ' +
      T.nomeLivello(App.opt.livello) + '</span></div>' +
      '<div class="livelli">' + livelli + '</div>' +
      '<p class="liv-desc">' + T.descLivello(App.opt.livello) + '</p>' +
      '</div>' +
      '<div class="modi">' + cards + '</div>' +
      '<div class="panel opzioni-rapide">' +
      '<div class="panel-titolo">' + t('home.opzioni') + '</div>' +
      '<label class="switch"><input type="checkbox" id="opt-bemolli"' + (App.opt.preferFlats ? ' checked' : '') + '>' +
      '<span>' + t('home.bemolli') + '</span></label>' +
      '<label class="switch"><span>' + t('home.risposte') + '</span>' +
      '<select id="opt-opzioni">' +
      [3, 4, 5, 6].map(function (n) {
        return '<option value="' + n + '"' + (n === App.opt.numOpzioni ? ' selected' : '') + '>' + n + '</option>';
      }).join('') +
      '</select></label>' +
      '<div class="nomi">' +
      '<label>' + t('home.nome1') + ' <input id="nome-1" type="text" maxlength="14" value="' + esc(App.opt.nomi[0]) + '"></label>' +
      '<label>' + t('home.nome2') + ' <input id="nome-2" type="text" maxlength="14" value="' + esc(App.opt.nomi[1]) + '"></label>' +
      '<label>' + t('home.durata') + ' <select id="opt-durata">' +
      [30, 45, 60, 90].map(function (s) {
        return '<option value="' + s + '"' + (s === App.opt.secondiDue ? ' selected' : '') + '>' +
          t('home.secondi', { n: s }) + '</option>';
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
      return '<button class="pill-btn' + (k === App.opt.livello ? ' is-on' : '') + '" data-liv="' + k + '" ' +
        'title="' + esc(T.descLivello(k)) + '"><span class="pi-icona">' + T.LEVELS[k].icona + '</span>' +
        '<span class="pi-nome">' + T.nomeLivello(k) + '</span></button>';
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
      '<div class="panel-titolo">' + t('impara.titolo') + '</div>' +
      '<div class="learn-grid">' +
      '<div class="learn-violino"><div id="learn-violin"></div>' +
      '<div class="pos-scelta">' + posScelte.map(function (p) {
        return '<button class="pill-btn' + (p === selPos ? ' is-on' : '') + '" data-pos="' + p + '">' +
          (p === 1 ? t('impara.pos1') : t('impara.finoA', { n: p })) + '</button>';
      }).join('') + '</div>' +
      '<p class="mini">' + t('impara.toccaPallina') + '</p>' +
      '</div>' +
      '<div class="learn-pent">' +
      '<div class="learn-staff" id="learn-staff"></div>' +
      '<div class="learn-nota" id="learn-nota"></div>' +
      '<div class="learn-azioni">' +
      '<button class="btn" id="btn-ripeti">' + t('impara.riascolta') + '</button>' +
      '<button class="btn ghost" id="btn-accorda">' + t('impara.accordatura') + '</button>' +
      '</div>' +
      '</div>' +
      '</div></div>' +
      '<div class="panel"><div class="panel-titolo">' +
      t('impara.noteDella', { pos: selPos === 1 ? t('impara.pos1') : T.ordinale(selPos) }) +
      '</div><div id="learn-table"></div></div>';

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
    const dove = prim ? T.describePlacement(prim.pl, prim.delta) : t('impara.nonSuonabile');
    const alterTxt = n.alter ? ' (' + T.solfegeEsteso(n) + ')' : '';
    el('learn-nota').innerHTML =
      '<div class="nota-grande">' + T.solfege(n) + '</div>' +
      '<div class="nota-sub">' + T.solfegeOttava(n) + alterTxt + ' · ' +
      (Math.round(T.freq(n) * 10) / 10).toLocaleString(I18n.getLingua() === 'en' ? 'en-GB' : 'it-IT') + ' Hz</div>' +
      '<div class="nota-dove">' + (prim ? t('impara.sulManico', { dove: dove }) : dove) + '</div>' +
      (pls.length > 1 ? '<div class="nota-alt">' + t('impara.anche', {
        dove: pls.slice(1, 3).map(function (r) { return T.describePlacement(r.pl, r.delta); }).join(', ')
      }) + '</div>' : '');
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
          '<span class="chip-dito">' + (dito === 0 ? t('impara.vuota') : T.ordinale(dito)) + '</span></button>';
      }).join('');
      return '<div class="tc-riga">' +
        '<div class="tc-nome" style="--corda:' + s.color + '">' + T.nomeCorda(s.id) +
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
  /** Il gioco in corso: una Sessione (quiz) oppure un gioco Eroe. */
  function giocoCorrente() { return App.sessione || App.eroe; }
  function finito(s) { return !!s && (s.fase === 'fine' || s.stato === 'fine'); }

  function avviaModo(chiave) {
    const modo = Gioco.MODI[chiave];
    if (!modo) return;
    // i giochi sui brani chiedono prima quale brano
    if (modo.brano) return apriSceltaBrano(chiave);
    if (modo.giocatori > 1) return apriSetup(chiave);
    partePartita(chiave, {});
  }

  /** Fa ascoltare tutto il brano, con il suo ritmo. */
  function ascoltaBrano(b) {
    if (typeof Sound === 'undefined' || !b) return;
    Sound.stopAll();
    const battito = 60 / b.bpm;
    let t = 0;
    b.note.forEach(function (n) {
      const nota = T.daNome(n[0]);
      if (!nota) return;
      Sound.playMidi(T.midi(nota), Math.max(0.35, n[1] * battito * 0.92), { delay: t, gain: 0.9 });
      t += n[1] * battito;
    });
  }

  /** Finestra di scelta del brano, con anteprima. */
  function apriSceltaBrano(chiave) {
    const modo = Gioco.MODI[chiave];
    const ov = el('overlay');
    ov.hidden = false;
    ov.className = 'overlay';
    ov.innerHTML =
      '<div class="modal brani">' +
      '<h2>' + modo.icona + ' ' + Gioco.nomeModo(modo) + '</h2>' +
      '<p class="mini">' + Gioco.descModo(modo) + '</p>' +
      '<div class="brani-lista">' + Brani.BRANI.map(function (b) {
        return '<div class="brano-riga">' +
          '<div class="brano-info"><b>' + esc(Brani.titolo(b)) + '</b>' +
          '<small>' + esc(Brani.autore(b)) + ' · ' + t('brani.note', { n: b.note.length }) +
          ' · ' + (b.difficolta > 1 ? t('brani.difficolta2') : t('brani.difficolta')) + '</small></div>' +
          '<button class="btn piccolo" data-ascolta="' + b.chiave + '" title="' + t('brani.ascolta') + '">🎧</button>' +
          '<button class="btn piccolo primario" data-scegli="' + b.chiave + '">' + t('brani.gioca') + '</button>' +
          '</div>';
      }).join('') + '</div>' +
      '<div class="modal-azioni"><button class="btn ghost" id="brani-annulla">' +
      t('setup.annulla') + '</button></div></div>';

    ov.querySelectorAll('[data-ascolta]').forEach(function (b) {
      b.addEventListener('click', function () {
        ascoltaBrano(Brani.perChiave(b.getAttribute('data-ascolta')));
      });
    });
    ov.querySelectorAll('[data-scegli]').forEach(function (b) {
      b.addEventListener('click', function () {
        const scelto = b.getAttribute('data-scegli');
        if (typeof Sound !== 'undefined') Sound.stopAll();
        ov.hidden = true;
        ov.innerHTML = '';
        partePartita(chiave, { brano: scelto });
      });
    });
    el('brani-annulla').addEventListener('click', function () {
      if (typeof Sound !== 'undefined') Sound.stopAll();
      ov.hidden = true;
      ov.innerHTML = '';
    });
  }

  function apriSetup(chiave) {
    const modo = Gioco.MODI[chiave];
    const ov = el('overlay');
    ov.hidden = false;
    ov.className = 'overlay';
    ov.innerHTML =
      '<div class="modal">' +
      '<h2>' + modo.icona + ' ' + Gioco.nomeModo(modo) + '</h2>' +
      '<p class="mini">' + Gioco.descModo(modo) + '</p>' +
      '<label>' + t('home.nome1') + '<input id="s-nome-1" type="text" maxlength="14" value="' + esc(App.opt.nomi[0]) + '"></label>' +
      '<label>' + t('home.nome2') + '<input id="s-nome-2" type="text" maxlength="14" value="' + esc(App.opt.nomi[1]) + '"></label>' +
      (modo.layout === 'turni'
        ? '<label>' + t('setup.secondiTurno') + '<select id="s-durata">' +
        [20, 30, 45, 60].map(function (s) {
          return '<option value="' + s + '"' + (s === App.opt.secondiDue ? ' selected' : '') + '>' +
            t('home.secondi', { n: s }) + '</option>';
        }).join('') + '</select></label>'
        : '<label>' + t('setup.durataSfida') + '<select id="s-durata">' +
        [30, 45, 60, 90].map(function (s) {
          return '<option value="' + s + '"' + (s === App.opt.secondiDue ? ' selected' : '') + '>' +
            t('home.secondi', { n: s }) + '</option>';
        }).join('') + '</select></label>') +
      '<div class="modal-azioni">' +
      '<button class="btn ghost" id="s-annulla">' + t('setup.annulla') + '</button>' +
      '<button class="btn primario" id="s-inizia">' + t('setup.inizia') + '</button>' +
      '</div></div>';
    el('s-annulla').addEventListener('click', function () { ov.hidden = true; ov.innerHTML = ''; });
    el('s-inizia').addEventListener('click', function () {
      const n1 = el('s-nome-1').value.trim() || t('nome.giocatore', { n: 1 });
      const n2 = el('s-nome-2').value.trim() || t('nome.giocatore', { n: 2 });
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

    // "Violin Hero" ha un motore suo: le note cadono e si suonano a tempo
    if (modo.layout === 'eroe') {
      mostraSchermata('play');
      el('level-picker').classList.add('is-hidden');
      el('screen-play').innerHTML =
        '<div class="eroe-wrap">' +
        '<div class="eroe" id="eroe"></div>' +
        '<div class="piede" id="eroe-piede"></div>' +
        '</div>';
      App.eroe = Eroe.avvia(el('eroe'), {
        brano: Brani.perChiave(extra.brano) || Brani.BRANI[0],
        modo: modo,
        livello: App.opt.livello,
        nomi: App.opt.nomi,
        hooks: {
          onChange: function (g, evento) {
            if (evento === 'fine') mostraRisultati(g);
            else if (evento === 'nota') aggiornaPulsanteErrori(g);
          }
        }
      });
      el('eroe-piede').innerHTML =
        '<button class="btn ghost" id="btn-esci">' + t('gioco.esci') + '</button>' +
        pulsanteErrori(App.eroe) +
        '<span class="mini">' + esc(Gioco.aiutoModo(modo)) + '</span>';
      el('btn-esci').addEventListener('click', function () { esci(); });
      agganciaPulsanteErrori(el('eroe-piede'));
      return;
    }

    const bisognoConteggio = !!modo.secondi;
    const inizia = function () {
      App.sessione = new Gioco.Sessione({
        modo: chiave,
        livello: App.opt.livello,
        preferFlats: App.opt.preferFlats,
        numOpzioni: App.opt.numOpzioni,
        nomi: extra.nomi || App.opt.nomi,
        secondi: extra.secondi,
        brano: extra.brano,
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
        '<h2>' + t('gioco.toccaA', { nome: esc(g.nome) }) + '</h2>' +
        (prec ? '<p class="turno-prec">' + t('gioco.turnoPrec', {
          nome: esc(prec.nome), punti: prec.punti, giuste: prec.giusti, sbagli: prec.sbagli
        }) + '</p>' : '<p class="mini">' + t('gioco.turnoTempo', { n: s.secondi }) + '</p>') +
        '<button class="btn primario grande" id="btn-turno">' + t('gioco.iniziaTurno') + '</button>' +
        '<button class="btn ghost" id="btn-esci-2">' + t('gioco.esci') + '</button>' +
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
      '<div class="hud-item"><span class="hud-k">' + t('gioco.punti') + '</span><span class="hud-v">' + g.punti + '</span></div>' +
      '<div class="hud-item"><span class="hud-k">' + t('gioco.serie') + '</span><span class="hud-v">' + (g.serie >= 2 ? '🔥 ' + g.serie : g.serie) + '</span></div>' +
      '<div class="hud-item"><span class="hud-k">' + t('gioco.giuste') + '</span><span class="hud-v"><b class="ok">' + g.giusti + '</b>/<b class="ko">' + g.sbagli + '</b></span></div>' +
      (s.secondi
        ? '<div class="hud-item"><span class="hud-k">' + t('gioco.tempo') + '</span><span class="hud-v' + (critico ? ' critico' : '') + '" data-tempo>' + tempo + '"</span></div>'
        : '<div class="hud-item"><span class="hud-k">' + t('gioco.domanda') + '</span><span class="hud-v">' + Math.min(s.indice + 1, s.totale) + '/' + s.totale + '</span></div>') +
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
      ? t('gioco.giusto', { nota: T.solfege(u.domanda.nota), punti: u.punti.totale }) +
      (u.punti.serie ? ' <span class="tag">' + t('gioco.bonusSerie', { n: u.punti.serie }) + '</span>' : '') +
      (u.punti.veloce ? ' <span class="tag">' + t('gioco.bonusVelocita', { n: u.punti.veloce }) + '</span>' : '')
      : t('gioco.sbagliato', { nota: Array.isArray(u.giusto) ? u.giusto[0] : u.giusto });
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
        '<div class="etichetta">' + t('gioco.trovaSulManico') + '</div>' +
        '<div class="req-corpo">' +
        '<div class="req-staff">' + Staff.build({ notes: [q.nota] }) + '</div>' +
        '<div class="req-nome">' +
        '<div class="nota-grande">' + T.solfegeOttava(q.nota) + '</div>' +
        '<div class="nota-sub">' + T.solfegeEsteso(q.nota) + ' · ' +
        (lv.maxPosition > 1 ? t('gioco.posizioni', { n: lv.maxPosition }) : t('gioco.posizione1')) + '</div>' +
        '</div></div></div>' +
        '<div class="violino-box" id="violino"></div>';
    } else if (q.tipo === 'orecchio') {
      const rivela = s.fase === 'feedback';
      palco = '<div class="card ascolto">' +
        '<div class="etichetta">' + t('gioco.ascoltaE') + '</div>' +
        '<button class="btn grande" id="btn-ascolta">' + t('gioco.ascolta') + '</button>' +
        (rivela ? '<div class="staff-wrap piccolo">' + Staff.build({ notes: [q.nota] }) + '</div>' : '') +
        '</div>';
    } else {
      // pentagramma: da solo, oppure con l'intestazione del brano in lavorazione
      if (q.tipo === 'brano' && s.brano) {
        const fatte = s.storico || [];
        palco = '<div class="card brano-testa">' +
          '<div class="brano-nome">' + esc(Brani.titolo(s.brano)) +
          ' <small>' + esc(Brani.autore(s.brano)) + '</small></div>' +
          '<div class="brano-riga-note">' + fatte.map(function (v, i) {
            const cls = v.corretto ? 'ok' : 'ko';
            return '<span class="brano-nota ' + cls + (i === fatte.length - 1 ? ' attuale' : '') + '">' +
              T.solfege(v.nota) + '</span>';
          }).join('') + '</div>' +
          '<button class="btn piccolo" id="btn-sentibrano">🎧 ' + t('brani.ascolta') + '</button>' +
          '</div>' + '<div class="staff-wrap">' + Staff.build({ notes: [q.nota] }) + '</div>';
      } else {
        palco = '<div class="staff-wrap">' + Staff.build({ notes: [q.nota] }) + '</div>';
      }
    }

    sc.innerHTML =
      hudHTML(s) +
      '<div class="palco">' + palco + '</div>' +
      (q.tipo === 'posizione' ? '' : opzioniHTML(q, scelta)) +
      feedbackHTML(s) +
      '<div class="piede"><button class="btn ghost" id="btn-esci">' + t('gioco.esci') + '</button>' +
      pulsanteErrori(s) +
      '<span class="mini">' + esc(Gioco.aiutoModo(s.modo)) + '</span></div>';

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
    const bs = el('btn-sentibrano');
    if (bs) bs.addEventListener('click', function () { ascoltaBrano(s.brano); });
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
      '📋 ' + (n ? t('gioco.errori') + ' <span class="contatore">' + n + '</span>' : t('gioco.nessunErrore')) +
      '</button>';
  }

  function apriRiepilogo(contesto) {
    const s = giocoCorrente();
    if (!s) return;
    const rip = Gioco.riepilogaErrori(s);
    if (!rip) return;
    App.riepilogoAperto = true;
    if (!finito(s)) s.pausa();
    const locale = I18n.getLingua() === 'en' ? 'en-GB' : 'it-IT';

    const testata = '<div class="rie-testata">' +
      '<h2>' + t('gioco.erroriTitolo') + '</h2>' +
      '<p class="mini">' + t('gioco.erroriSommario', {
        modo: esc(Gioco.nomeModo(rip.modo)), livello: T.nomeLivello(rip.livello),
        sbagliate: rip.sbagliate === 1 ? t('gioco.erroreUno') : t('gioco.erroriMolti', { n: rip.sbagliate }),
        totale: rip.totale, precisione: rip.precisione
      }) + '</p>' +
      (rip.piuFrequente
        ? '<div class="rie-frequente">' + t('gioco.piuFrequente', {
          titolo: rip.piuFrequente.titolo, n: rip.piuFrequente.conteggio
        }) + '<br><span class="mini">' + esc(rip.piuFrequente.rimedio) + '</span></div>'
        : '') +
      '</div>';

    const voci = rip.voci.length ? rip.voci.map(function (v) {
      const freq = (v.frequenzaScelta != null && v.notaScelta)
        ? '<div class="rie-freq">' + T.solfegeOttava(v.nota) + ' = ' +
        v.frequenzaGiusta.toLocaleString(locale) + ' Hz · ' +
        T.solfegeOttava(v.notaScelta) + ' = ' +
        v.frequenzaScelta.toLocaleString(locale) + ' Hz</div>'
        : '';
      return '<div class="rie-voce">' +
        '<div class="rie-testa"><span class="rie-num">' + t('gioco.domanda') + ' ' + v.numero + '</span>' +
        '<span class="rie-tipo">' + esc(v.tipoNome) + '</span>' +
        '<span class="rie-cat">' + esc(v.titolo) + '</span></div>' +
        '<div class="rie-corpo">' +
        '<div class="rie-staff">' + Staff.build({ notes: [v.nota] }) + '</div>' +
        '<div class="rie-testi">' +
        '<div class="rie-riga"><span class="rie-k">' + t('gioco.tuaRisposta') + '</span><b class="ko">' +
        esc(v.tuaRisposta) + '</b></div>' +
        '<div class="rie-riga"><span class="rie-k">' + t('gioco.rispostaGiusta') + '</span><b class="ok">' +
        v.nomeGiustoOttava + '</b>' +
        (v.nota.alter ? ' <em>(' + v.nomeGiustoEsteso + ')</em>' : '') + '</div>' +
        '<p class="rie-spiega">' + esc(v.spiegazione) + '</p>' +
        '<p class="rie-dove">' + t('gioco.sulManico', { dove: esc(v.dove) }) +
        (v.altrove.length ? ' <span class="mini">· ' + t('gioco.ancheSu', { dove: esc(v.altrove.join(', ')) }) + '</span>' : '') +
        '</p>' + freq +
        '</div></div>' +
        '<div class="rie-azioni">' +
        '<button class="btn piccolo" data-ascolta="' + v.ascolta.join(',') + '">' +
        t('gioco.confronta', { nomi: esc(v.ascoltaNomi.join(' → ')) }) + '</button>' +
        '<button class="btn piccolo ghost" data-ascolta="' + T.midi(v.nota) + '">' +
        t('gioco.soloGiusta') + '</button>' +
        '</div></div>';
    }).join('') : '<p class="rie-vuoto">' + t('gioco.nessunErroreRivedere') + '</p>';

    const ov = el('overlay');
    ov.hidden = false;
    ov.className = 'overlay lungo';
    ov.innerHTML = '<div class="modal riepilogo" role="dialog" aria-label="' + t('gioco.erroriTitolo') + '">' +
      testata + '<div class="rie-lista">' + voci + '</div>' +
      '<div class="rie-piede"><button class="btn primario" id="rie-chiudi">' +
      (finito(s) ? t('gioco.chiudi') : t('gioco.chiudiRiprendi')) + '</button></div></div>';

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
    const s = giocoCorrente();
    if (s && !finito(s)) s.riprendi();
  }

  function agganciaPulsanteErrori(radice) {
    const b = (radice || document).querySelector('#btn-errori');
    if (b) b.addEventListener('click', function () { apriRiepilogo('gioco'); });
  }

  /** Aggiorna solo il numero sul pulsante degli errori (partite lunghe). */
  function aggiornaPulsanteErrori(s) {
    const b = document.querySelector('#btn-errori');
    if (!b) return;
    const n = quantiErrori(s);
    b.className = 'btn errori-btn' + (n ? '' : ' pulito');
    b.innerHTML = '📋 ' + (n ? t('gioco.errori') + ' <span class="contatore">' + n + '</span>' : t('gioco.nessunErrore'));
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
      '<div class="hud-item"><span class="hud-k">' + t('gioco.tempo') + '</span><span class="hud-v' +
      (s.tempo <= 10 ? ' critico' : '') + '" data-tempo>' + Math.max(0, Math.ceil(s.tempo)) + '"</span></div>' +
      '<div class="hud-item"><span class="hud-k">' + esc(s.giocatori[0].nome) + '</span><span class="hud-v">' +
      t('gioco.giuste2', { n: s.giocatori[0].giusti }) + '</span></div>' +
      '<div class="hud-item"><span class="hud-k">' + esc(s.giocatori[1].nome) + '</span><span class="hud-v">' +
      t('gioco.giuste2', { n: s.giocatori[1].giusti }) + '</span></div>' +
      '</div>' +
      '<div class="barra' + (s.tempo <= 10 ? ' critico' : '') + '"><i data-barra style="width:' +
      Math.round(s.tempo / s.secondi * 100) + '%"></i></div>' +
      '<div class="split">' + colonne + '</div>' +
      '<div class="piede"><button class="btn ghost" id="btn-esci">' + t('gioco.esci') + '</button>' +
      pulsanteErrori(s) +
      '<span class="mini">' + esc(Gioco.aiutoModo(s.modo)) + '</span></div>';

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
      '<div class="hud-item"><span class="hud-k">' + t('gioco.tempo') + '</span><span class="hud-v' +
      (s.tempo <= 10 ? ' critico' : '') + '" data-tempo>' + Math.max(0, Math.ceil(s.tempo)) + '"</span></div>' +
      '<div class="hud-item"><span class="hud-k">' + t('gioco.punti') + '</span><span class="hud-v">' +
      s.giocatori[0].punti + ' – ' + s.giocatori[1].punti + '</span></div>' +
      '<div class="hud-item"><span class="hud-k">' + t('gioco.round') + '</span><span class="hud-v">' + (s.indice + 1) + '</span></div>' +
      '</div>' +
      '<div class="barra' + (s.tempo <= 10 ? ' critico' : '') + '"><i data-barra style="width:' +
      Math.round(s.tempo / s.secondi * 100) + '%"></i></div>' +
      '<div class="staff-wrap centro">' + Staff.build({ notes: [q.nota] }) + '</div>' +
      '<div class="vs">' + t('gioco.chiPrimo') + '</div>' +
      '<div class="race-grid">' + pads + '</div>' +
      '<div class="piede"><button class="btn ghost" id="btn-esci">' + t('gioco.esci') + '</button>' +
      pulsanteErrori(s) +
      '<span class="mini">' + esc(Gioco.aiutoModo(s.modo)) + '</span></div>';

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
    if (App.eroe) { App.eroe.interrompi(); App.eroe = null; }
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
        ? '<h1 class="esito">' + t('esiti.pareggio') + '</h1>'
        : '<h1 class="esito">' + t('esiti.vince', { nome: esc(ris.giocatori[ris.vincitore].nome) }) + '</h1>';
      sc.innerHTML =
        '<div class="card risultato">' +
        testa +
        '<div class="punteggi">' +
        rigaPunteggio(a, ris.vincitore === 0) + rigaPunteggio(b, ris.vincitore === 1) +
        '</div>' +
        '<div class="azioni">' +
        '<button class="btn primario" id="r-rivincita">' + t('esiti.rivincita') + '</button>' +
        ((a.sbagli + b.sbagli) ? '<button class="btn" id="r-errori">' + t('esiti.rivediErrori') +
          ' <span class="contatore">' + (a.sbagli + b.sbagli) + '</span></button>' : '') +
        '<button class="btn" id="r-home">' + t('esiti.home') + '</button>' +
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
        '<p class="mini">' + ris.modo.icona + ' ' + Gioco.nomeModo(ris.modo) + ' · ' +
        T.nomeLivello(ris.livello) + (ris.brano ? ' · ' + esc(Brani.titolo(ris.brano)) : '') + '</p>' +
        '<div class="punteggio-grande">' + g.punti + '<small>' + t('esiti.punti') + '</small></div>' +
        (nuovo ? '<div class="record-nuovo">' + t('esiti.nuovoRecord') + '</div>' :
          (record ? '<div class="mini">' + t('esiti.recordDaBattere', { n: record.punti }) + '</div>' : '')) +
        '<div class="stat-grid">' +
        stat(t('esiti.statGiuste'), g.giusti) + stat(t('esiti.statSbagliate'), g.sbagli) +
        stat(t('esiti.statPrecisione'), g.precisione + '%') + stat(t('esiti.statSerie'), g.serieMax) +
        '</div>' +
        '<div class="azioni">' +
        '<button class="btn primario" id="r-rigioca">' + t('esiti.rigioca') + '</button>' +
        (g.sbagli ? '<button class="btn" id="r-errori">' + t('esiti.rivediErrori') +
          ' <span class="contatore">' + g.sbagli + '</span></button>' : '') +
        '<button class="btn" id="r-livello">' + t('esiti.cambiaLivello') + '</button>' +
        '<button class="btn ghost" id="r-home">' + t('esiti.home') + '</button>' +
        '</div></div>';
      el('r-rigioca').addEventListener('click', function () {
        partePartita(ris.modo.chiave, { brano: ris.brano ? ris.brano.chiave : undefined });
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
      '<span class="rp-stat">' + t('esiti.riga', {
        giuste: g.giusti, sbagliate: g.sbagli, precisione: g.precisione, serie: g.serieMax
      }) + '</span></div>';
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
    // Violin Hero: 1 2 3 4 (oppure A S D F) per le quattro corde
    if (App.eroe && App.schermata === 'play') {
      if (ev.key === 'Escape') { esci(); return; }
      const mappa = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, s: 1, d: 2, f: 3 };
      const i = mappa[String(ev.key).toLowerCase()];
      if (i !== undefined && App.eroe.corsie[i]) {
        ev.preventDefault();
        App.eroe.premi(App.eroe.corsie[i]);
      }
      return;
    }
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
  function applicaLingua() {
    document.body.setAttribute('data-lingua', I18n.getLingua());
    const b = el('btn-lingua');
    if (b) {
      // il pulsante mostra la lingua verso cui si passa
      b.textContent = '🌐 ' + (I18n.getLingua() === 'it' ? 'EN' : 'IT');
      b.title = I18n.t('lingua.cambia');
      b.setAttribute('aria-label', I18n.t('lingua.cambia'));
    }
    document.title = I18n.t('home.titolo') + ' · ImparaNote Violino';
    const nav = el('btn-nav-impara');
    if (nav) nav.innerHTML = '📚 <span class="pi-nome">' + I18n.t('nav.studia') + '</span>';
    const su = el('btn-sound');
    if (su) su.title = I18n.t('nav.audio');
    const ai = el('btn-help');
    if (ai) ai.title = I18n.t('nav.aiuto');
  }

  function cambiaLingua() {
    I18n.setLingua(I18n.getLingua() === 'it' ? 'en' : 'it');
  }

  function ridisegna() {
    applicaLingua();
    renderLevelPicker();
    if (App.sessione && App.schermata === 'play') renderPlay();
    else if (App.schermata === 'learn') renderLearn();
    else if (App.schermata === 'results' && App.sessione) mostraRisultati(App.sessione);
    else renderHome();
  }

  function init() {
    // la lingua va decisa prima di tutto: nomi delle note e testi dipendono da lei
    I18n.onCambia(function (l) {
      T.setLingua(l);
      ridisegna();
    });
    I18n.avvia();
    T.setLingua(I18n.getLingua());
    caricaPreferenze();
    App.notaStudio = T.STRINGS[1].open;
    applicaLingua();
    renderLevelPicker();
    renderHome();
    mostraSchermata('home');

    el('btn-lingua').addEventListener('click', function () { cambiaLingua(); click(); });
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
    ['help-chiudi', 'help-chiudi-en'].forEach(function (id) {
      const b = el(id);
      if (b) b.addEventListener('click', function () { mostraSchermata('home'); renderHome(); });
    });
    document.addEventListener('keydown', onKey);
    const sblocca = function () {
      if (typeof Sound !== 'undefined') {
        Sound.init();
        // i campioni registrati si scaricano al primo tocco: fino ad allora
        // (o se il browser blocca i file, es. da file://) suona la sintesi
        if (Sound.caricaCampioni) Sound.caricaCampioni();
      }
      document.removeEventListener('pointerdown', sblocca);
    };
    document.addEventListener('pointerdown', sblocca);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
