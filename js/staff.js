/* ==========================================================================
   staff.js — Disegno del pentagramma in chiave di violino (SVG)
   Il passo sul pentagramma (Theory.staffStep) vale 0 su E4 (1ª riga) e
   cresce di 1 per ogni riga/spazio verso l'alto.
   ========================================================================== */
window.Staff = (function () {
  'use strict';

  const T = window.Theory;

  const S = 16;               // spazio tra due righe
  const W = 360;              // larghezza viewBox
  const H = 264;              // altezza viewBox
  const X0 = 22;              // inizio righe
  const X1 = 338;             // fine righe
  const BOTTOM = 164;         // y della 1ª riga (E4)
  const CX = 232;             // x della testa della nota

  /* Chiave di violino: disegno vettoriale di pubblico dominio
     (Wikimedia Commons, File:Treble_clef.svg, PD-self di Tlusťa), estratto dal
     disegno originale che contiene anche le 5 righe del pentagramma. Nel file
     sorgente le righe stanno a y = 6378…8740 e la riga del Sol (2ª dal basso) a
     y = 8149; la trasformazione qui sotto porta quella riga esattamente sulla
     nostra 2ª riga, così la chiave è allineata senza dipendere da alcun font. */
  const CHIAVE_D = 'M 2002,7851 C 1941,7868 1886,7906 1835,7964 C 1784,8023 1759,8088 1759,8158 ' +
    'C 1759,8202 1774,8252 1803,8305 C 1832,8359 1876,8398 1933,8423 C 1952,8427 1961,8437 1961,8451 ' +
    'C 1961,8456 1954,8461 1937,8465 C 1846,8442 1771,8393 1713,8320 C 1655,8246 1625,8162 1623,8066 ' +
    'C 1626,7963 1657,7867 1716,7779 C 1776,7690 1853,7627 1947,7590 L 1878,7235 ' +
    'C 1724,7363 1599,7496 1502,7636 C 1405,7775 1355,7926 1351,8089 C 1353,8162 1368,8233 1396,8301 ' +
    'C 1424,8370 1466,8432 1522,8489 C 1635,8602 1782,8661 1961,8667 C 2022,8663 2087,8652 2157,8634 ' +
    'L 2002,7851 z M 2074,7841 L 2230,8610 C 2384,8548 2461,8413 2461,8207 C 2452,8138 2432,8076 2398,8021 ' +
    'C 2365,7965 2321,7921 2265,7889 C 2209,7857 2146,7841 2074,7841 z M 1869,6801 ' +
    'C 1902,6781 1940,6746 1981,6697 C 2022,6649 2062,6592 2100,6528 C 2139,6463 2170,6397 2193,6330 ' +
    'C 2216,6264 2227,6201 2227,6143 C 2227,6118 2225,6093 2220,6071 C 2216,6035 2205,6007 2186,5988 ' +
    'C 2167,5970 2143,5960 2113,5960 C 2053,5960 1999,5997 1951,6071 C 1914,6135 1883,6211 1861,6297 ' +
    'C 1838,6384 1825,6470 1823,6557 C 1828,6656 1844,6737 1869,6801 z M 1806,6859 ' +
    'C 1761,6697 1736,6532 1731,6364 C 1732,6256 1743,6155 1764,6061 C 1784,5967 1813,5886 1851,5816 ' +
    'C 1888,5746 1931,5693 1979,5657 C 2022,5625 2053,5608 2070,5608 C 2083,5608 2094,5613 2104,5622 ' +
    'C 2114,5631 2127,5646 2143,5666 C 2262,5835 2322,6039 2322,6277 C 2322,6390 2307,6500 2277,6610 ' +
    'C 2248,6719 2205,6823 2148,6920 C 2090,7018 2022,7103 1943,7176 L 2024,7570 ' +
    'C 2068,7565 2098,7561 2115,7561 C 2191,7561 2259,7577 2322,7609 C 2385,7641 2439,7684 2483,7739 ' +
    'C 2527,7793 2561,7855 2585,7925 C 2608,7995 2621,8068 2621,8144 C 2621,8262 2590,8370 2528,8467 ' +
    'C 2466,8564 2373,8635 2248,8681 C 2256,8730 2270,8801 2291,8892 C 2311,8984 2326,9057 2336,9111 ' +
    'C 2346,9165 2350,9217 2350,9268 C 2350,9347 2331,9417 2293,9479 C 2254,9541 2202,9589 2136,9623 ' +
    'C 2071,9657 1999,9674 1921,9674 C 1811,9674 1715,9643 1633,9582 C 1551,9520 1507,9437 1503,9331 ' +
    'C 1506,9284 1517,9240 1537,9198 C 1557,9156 1584,9122 1619,9096 C 1653,9069 1694,9055 1741,9052 ' +
    'C 1780,9052 1817,9063 1852,9084 C 1886,9106 1914,9135 1935,9172 C 1955,9209 1966,9250 1966,9294 ' +
    'C 1966,9353 1946,9403 1906,9444 C 1866,9485 1815,9506 1754,9506 L 1731,9506 ' +
    'C 1770,9566 1834,9597 1923,9597 C 1968,9597 2014,9587 2060,9569 C 2107,9550 2146,9525 2179,9493 ' +
    'C 2212,9461 2234,9427 2243,9391 C 2260,9350 2268,9293 2268,9222 C 2268,9174 2263,9126 2254,9078 ' +
    'C 2245,9031 2231,8968 2212,8890 C 2193,8813 2179,8753 2171,8712 C 2111,8727 2049,8735 1984,8735 ' +
    'C 1875,8735 1772,8713 1675,8668 C 1578,8623 1493,8561 1419,8481 C 1346,8401 1289,8311 1248,8209 ' +
    'C 1208,8108 1187,8002 1186,7892 C 1190,7790 1209,7692 1245,7600 C 1281,7507 1327,7419 1384,7337 ' +
    'C 1441,7255 1500,7180 1561,7113 C 1623,7047 1704,6962 1806,6859 z';
  const CHIAVE_K = 16 / 590.5;                 // 590.5 = spazio righe nel disegno originale
  const CHIAVE_TX = 30 - CHIAVE_K * 1186;      // bordo sinistro della chiave a x = 30
  const CHIAVE_TY = (BOTTOM - S) - CHIAVE_K * 8149;  // riga del Sol sulla 2ª riga

  function y(step) { return BOTTOM - step * (S / 2); }

  function righe() {
    let out = '';
    for (let i = 0; i < 5; i++) {
      const yy = BOTTOM - i * S;
      out += '<line class="st-line" x1="' + X0 + '" y1="' + yy + '" x2="' + X1 + '" y2="' + yy + '"/>';
    }
    return out;
  }

  function chiave() {
    return '<g class="st-clef" transform="translate(' + CHIAVE_TX.toFixed(3) + ',' +
      CHIAVE_TY.toFixed(3) + ') scale(' + CHIAVE_K.toFixed(8) + ')">' +
      '<path d="' + CHIAVE_D + '"/></g>';
  }

  function tagli(step) {
    let out = '';
    if (step >= 10) for (let v = 10; v <= step; v += 2) out += taglio(v);
    if (step <= -2) for (let v = -2; v >= step; v -= 2) out += taglio(v);
    return out;
  }
  function taglio(step) {
    const yy = y(step);
    return '<line class="st-ledger" x1="' + (CX - 20) + '" y1="' + yy + '" x2="' + (CX + 20) + '" y2="' + yy + '"/>';
  }

  function testa(step, alter, opt) {
    const yy = y(step);
    const alto = step < 4;         // gambo in su sotto la 3ª riga (B4)
    const sx = alto ? CX + 9.2 : CX - 9.2;
    const sy2 = alto ? yy - 3.5 * S : yy + 3.5 * S;
    let out = '';
    out += '<ellipse class="st-head" cx="' + CX + '" cy="' + yy + '" rx="9.4" ry="6.7" ' +
      'transform="rotate(-20 ' + CX + ' ' + yy + ')"/>';
    out += '<line class="st-stem" x1="' + sx + '" y1="' + yy + '" x2="' + sx + '" y2="' + sy2 + '"/>';
    if (alter) {
      const sym = alter > 0 ? '\u266F' : '\u266D';
      out += '<text class="st-acc" x="' + (CX - 24) + '" y="' + (yy + (alter > 0 ? 5 : 7)) + '" ' +
        'font-size="34">' + sym + '</text>';
    }
    // piccola etichetta opzionale (usata solo in modalità riferimento)
    if (opt && opt.label) {
      out += '<text class="st-label" x="' + CX + '" y="' + (H - 10) + '" font-size="19">' + opt.label + '</text>';
    }
    return out;
  }

  /**
   * Costruisce l'SVG del pentagramma.
   * @param {object} o {notes:[note], label?:bool, className?:string, aria?:string}
   */
  function build(o) {
    o = o || {};
    const notes = (o.notes || []).filter(Boolean);
    const posizioni = [];
    if (notes.length <= 1) {
      posizioni.push(CX);
    } else {
      const start = 150, end = 320;
      notes.forEach(function (n, i) {
        posizioni.push(start + (end - start) * (i / (notes.length - 1)));
      });
    }
    let corpo = righe() + chiave();
    let testa_html = '';
    notes.forEach(function (n, i) {
      const step = T.staffStep(n);
      testa_html += tagli(step);
      const cxOrig = CX;
      // ridisegna la testa nella x corretta riusando il markup e spostandolo
      const svg = testa(step, n.alter, { label: o.labels ? T.solfege(n) : '' });
      const dx = posizioni[i] - cxOrig;
      testa_html += dx === 0 ? svg : '<g transform="translate(' + dx + ',0)">' + svg + '</g>';
    });
    const cls = 'staff-svg' + (o.className ? ' ' + o.className : '');
    return '<svg class="' + cls + '" viewBox="0 0 ' + W + ' ' + H + '" ' +
      'preserveAspectRatio="xMidYMid meet" role="img" ' +
      'aria-label="' + (o.aria || 'Pentagramma con nota') + '">' +
      corpo + testa_html + '</svg>';
  }

  function renderTo(el, o) {
    if (!el) return;
    el.innerHTML = build(o);
  }

  /** Pentagramma vuoto con la chiave: utile per le anteprime/lo sfondo. */
  function empty(o) {
    o = o || {};
    return '<svg class="staff-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' +
      righe() + chiave() + '</svg>';
  }

  return {
    renderTo: renderTo,
    build: build,
    empty: empty,
    X0: X0, X1: X1, BOTTOM: BOTTOM, CX: CX, S: S, W: W, H: H
  };
})();
