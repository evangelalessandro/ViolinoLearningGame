/* ==========================================================================
   violin.js — Manico del violino interattivo (SVG)
   Le palline sono "tasti" virtuali: ogni semitono sopra la corda vuota ha la
   sua posizione, quindi cliccare una pallina identifica una nota senza
   ambiguità. Il numero dentro la pallina è il dito che la suona.
   ========================================================================== */
window.Violin = (function () {
  'use strict';

  const T = window.Theory;

  const W = 340, H = 550;
  const XS = { G: 124, D: 156, A: 188, E: 220 };
  const NUT = 132;          // y del capotasto
  const UNIT = 26;          // px per semitono
  const MAX_SEMIS = 11;
  const FB_BOTTOM = 430;
  const ORDER = ['G', 'D', 'A', 'E'];
  const SPESSORE = { G: 5.6, D: 4.3, A: 3.2, E: 2.2 };

  function yOf(semis) { return NUT + semis * UNIT; }

  /** Tutte le palline possibili, con i diti che le possono suonare. */
  function slotMappa(opt) {
    const maxP = Math.max(1, opt.maxPosition || 1);
    const naturals = !!opt.naturalsOnly;
    const out = [];
    ORDER.forEach(function (id) {
      const s = T.stringOf(id);
      const openMidi = T.midi(s.open);
      for (let semis = 0; semis <= MAX_SEMIS; semis++) {
        const midi = openMidi + semis;
        const note = T.fromMidi(midi, false);
        if (naturals && note.alter !== 0) continue;
        let pls = T.placementsForMidi(midi, maxP).filter(function (r) {
          return r.pl.stringId === id;   // solo i diti di QUESTA corda
        });
        // per i più piccoli si nasconde il 4º dito "allungato": è una posizione
        // di comodo che non fa parte della prima posizione insegnata
        if (naturals) {
          pls = pls.filter(function (r) { return !(r.delta === 1 && r.pl.finger === 4); });
        }
        if (!pls.length) continue;
        const diti = [];
        pls.forEach(function (r) {
          if (diti.indexOf(r.pl.finger) === -1) diti.push(r.pl.finger);
        });
        const prim = pls[0];
        out.push({
          stringId: id, semis: semis, midi: midi, note: note,
          fingers: diti, primary: prim,
          x: XS[id], y: yOf(semis)
        });
      }
    });
    return out;
  }

  function corde() {
    let out = '';
    ORDER.forEach(function (id) {
      const s = T.stringOf(id);
      const x = XS[id];
      const w = SPESSORE[id];
      out += '<line class="v-string" x1="' + x + '" y1="' + NUT + '" x2="' + x + '" y2="' + (H - 6) + '" ' +
        'stroke="' + s.color + '" stroke-width="' + w + '" stroke-linecap="round"/>';
      out += '<line class="v-string-gloss" x1="' + (x - w * 0.22) + '" y1="' + NUT + '" x2="' + (x - w * 0.22) +
        '" y2="' + (H - 6) + '" stroke="rgba(255,255,255,.45)" stroke-width="' + Math.max(0.7, w * 0.22) + '"/>';
    });
    return out;
  }

  function strumento() {
    let out = '';
    out += '<defs>' +
      '<linearGradient id="vWood" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#5c3c22"/><stop offset="0.42" stop-color="#3b2515"/>' +
      '<stop offset="1" stop-color="#22140a"/></linearGradient>' +
      '<linearGradient id="vBody" x1="0" y1="0" x2="0.6" y2="1">' +
      '<stop offset="0" stop-color="#dda063"/><stop offset="0.55" stop-color="#b9773f"/>' +
      '<stop offset="1" stop-color="#8a5628"/></linearGradient>' +
      '<linearGradient id="vPeg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#4a2f1b"/><stop offset="1" stop-color="#2a1a0e"/></linearGradient>' +
      '</defs>';
    // corpo (accenno della parte superiore)
    out += '<path class="v-body" d="M 128 430 C 96 442, 74 462, 70 492 C 66 518, 78 538, 94 548 ' +
      'L 246 548 C 262 538, 274 518, 270 492 C 266 462, 244 442, 212 430 Z"/>';
    // ponticello
    out += '<rect class="v-bridge" x="132" y="452" width="76" height="7" rx="3"/>';
    // tastiera
    out += '<polygon class="v-fb" points="120,132 220,132 232,430 108,430"/>';
    // corde
    out += corde();
    // capotasto
    out += '<rect class="v-nut" x="112" y="120" width="116" height="12" rx="4"/>';
    // cassa dei piroli
    out += '<polygon class="v-pegbox" points="120,120 224,120 206,56 138,56"/>';
    // piroli
    out += '<ellipse class="v-peg" cx="126" cy="74" rx="11" ry="5.5" transform="rotate(-12 126 74)"/>';
    out += '<ellipse class="v-peg" cx="218" cy="74" rx="11" ry="5.5" transform="rotate(12 218 74)"/>';
    out += '<ellipse class="v-peg" cx="128" cy="103" rx="11" ry="5.5" transform="rotate(-12 128 103)"/>';
    out += '<ellipse class="v-peg" cx="216" cy="103" rx="11" ry="5.5" transform="rotate(12 216 103)"/>';
    // riccio
    out += '<circle class="v-scroll" cx="172" cy="32" r="21"/>';
    out += '<path class="v-scroll-in" d="M 172 46 C 158 46, 152 34, 160 26 C 167 19, 179 24, 178 33 ' +
      'C 177 40, 168 41, 165 36"/>';
    return out;
  }

  function etichette() {
    let out = '';
    ORDER.forEach(function (id) {
      const s = T.stringOf(id);
      out += '<text class="v-string-label" x="' + XS[id] + '" y="' + (H - 44) + '">' + s.solfege + '</text>';
      out += '<text class="v-string-roman" x="' + XS[id] + '" y="' + (H - 26) + '">' + s.roman + ' corda</text>';
    });
    return out;
  }

  function palline(slots, opt) {
    let out = '';
    slots.forEach(function (sl) {
      const r = 11.5;
      const prim = sl.primary;
      const dito = prim.pl.finger;
      const variante = prim.pl.open ? 'vuota' : (prim.delta > 0 ? 'alto' : prim.delta < 0 ? 'basso' : 'naturale');
      const descr = T.describePlacement(prim.pl, prim.delta);
      const nome = T.solfege(sl.note);
      const nomeEsteso = T.solfegeOttava(sl.note);
      const altre = sl.fingers.length > 1 ? ' Altro dito possibile: ' + sl.fingers.join(' o ') + '.' : '';
      const hl = opt.highlight && opt.highlight.stringId === sl.stringId && opt.highlight.semis === sl.semis;
      const wr = opt.wrong && opt.wrong.stringId === sl.stringId && opt.wrong.semis === sl.semis;
      const cls = 'v-slot v-dito-' + variante + (hl ? ' is-right' : '') + (wr ? ' is-wrong' : '');
      out += '<g class="' + cls + '" data-string="' + sl.stringId + '" data-semis="' + sl.semis + '" ' +
        'data-midi="' + sl.midi + '" tabindex="' + (opt.interactive ? '0' : '-1') + '" role="button" ' +
        'aria-label="' + nomeEsteso + ' sulla corda ' + T.stringOf(sl.stringId).solfege + ', ' + descr + '">';
      out += '<title>' + nomeEsteso + ' — ' + descr + '.' + altre + '</title>';
      out += '<circle class="v-hit" cx="' + sl.x + '" cy="' + sl.y + '" r="' + (r + 1.5) + '"/>';
      out += '<circle class="v-dot" cx="' + sl.x + '" cy="' + sl.y + '" r="' + r + '" ' +
        'style="--corda:' + T.stringOf(sl.stringId).color + '"/>';
      out += '<text class="v-dot-num" x="' + sl.x + '" y="' + (sl.y + 4.4) + '">' + dito + '</text>';
      if (opt.showNames) {
        out += '<text class="v-dot-name" x="' + (sl.x + r + 6) + '" y="' + (sl.y + 4) + '">' + nome + '</text>';
      }
      out += '</g>';
    });
    return out;
  }

  /**
   * @param {object} o {maxPosition, naturalsOnly, showNames, interactive, highlight, wrong, onPick}
   */
  function renderTo(el, o) {
    if (!el) return [];
    o = o || {};
    if (o.interactive == null) o.interactive = true;
    const slots = slotMappa(o);
    el.innerHTML =
      '<svg class="violin-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" ' +
      'role="img" aria-label="Manico del violino">' +
      '<g class="v-strumento">' + strumento() + '</g>' +
      '<g class="v-palline">' + palline(slots, o) + '</g>' +
      '<g class="v-nomi">' + etichette() + '</g>' +
      '</svg>';

    if (o.interactive) {
      const svg = el.querySelector('svg');
      svg.classList.add('is-interactive');
      const attiva = function (ev) {
        const g = ev.target.closest ? ev.target.closest('.v-slot') : null;
        if (!g) return;
        ev.preventDefault();
        const stringId = g.getAttribute('data-string');
        const semis = parseInt(g.getAttribute('data-semis'), 10);
        const slot = slots.filter(function (s) { return s.stringId === stringId && s.semis === semis; })[0];
        if (slot && o.onPick) o.onPick(slot);
      };
      svg.addEventListener('click', attiva);
      svg.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') attiva(ev);
      });
    }
    return slots;
  }

  /** Slot corrispondente a una nota (per evidenziare la soluzione). */
  function slotOf(midi, opt) {
    const slots = slotMappa(opt || { maxPosition: 3, naturalsOnly: false });
    return slots.filter(function (s) { return s.midi === midi; });
  }

  return { renderTo: renderTo, slotMappa: slotMappa, slotOf: slotOf, XS: XS, ORDER: ORDER };
})();
