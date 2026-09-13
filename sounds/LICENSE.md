# Violin samples — provenance and licence

The `.wav` files in this folder are excerpts of the **Solo Violin** recordings from
**VSCO 2 Community Edition**, released under **CC0 1.0 Universal** (public domain
dedication). The full licence text is in [`LICENSE-CC0.txt`](LICENSE-CC0.txt).

| | |
|---|---|
| **Library** | VSCO 2 Community Edition (Versilian Studios LLC) |
| **Source** | <https://github.com/sgossner/VSCO-2-CE> |
| **Original files** | `Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_<note>_p.wav`<br>`Strings/Solo Violin/Pizz/LLVln_Pizz_A4_p_RR1.wav` |
| **Licence** | CC0 1.0 Universal — <https://creativecommons.org/publicdomain/zero/1.0/> |
| **Files here** | `arco-G3.wav`, `arco-A3.wav`, `arco-C4.wav`, `arco-E4.wav`, `arco-G4.wav`, `arco-A4.wav`, `arco-C5.wav`, `arco-E5.wav`, `arco-G5.wav`, `arco-A5.wav`, `arco-C6.wav`, `pizz-A4.wav` |

CC0 imposes **no attribution requirement**: you may copy, modify and redistribute these
files for any purpose, including commercially, without asking. The credit above is given
because it is right to do so, not because the licence demands it.

## What was changed

The processing is done by [`tools/prepara-campioni.js`](../tools/prepara-campioni.js) and can
be re-run at any time (`node tools/prepara-campioni.js`):

* an excerpt is taken from each recording — 2.0 s starting 0.06 s in for the bowed notes,
  1.1 s from the start for the pizzicato
* stereo mixed down to mono
* resampled from 44 100 Hz to 22 050 Hz using a windowed-sinc anti-aliasing filter
* peak-normalised to 0.9, with a short fade-in and fade-out
* written as 16-bit PCM WAV

The measured pitch of every prepared file is in
[`tools/misura-campioni.js`](../tools/misura-campioni.js); those numbers are stored in
`js/audio.js` and used to tune playback exactly (one of the original notes is 23 cents
sharp, so it is transposed down when played).

## Fallback

The app works without these files too: if the browser refuses to load them (which happens
when `index.html` is opened directly from `file://`, because local file reads are blocked),
`js/audio.js` falls back to its own synthesised violin, so notes are always audible.
