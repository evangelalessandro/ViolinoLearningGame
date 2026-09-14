# 🎻 ImparaNote Violin

A web app to **learn the violin notes by playing**: recognise notes on the staff, find them
on the strings, train your ear. Made for kids, teens and adults, with timed challenges for
one player, **turn-based duels** and **side-by-side challenges** for two players on the same
screen.

Available in **English and Italian** (note names switch too: C D E F G A B ⇄ Do Re Mi Fa Sol La Si).

Nothing to install, no internet needed: it is fully static and the violin sound is
synthesised in real time by the browser (Web Audio API).

🇮🇹 [Leggi questo documento in italiano](README.it.md)

---

## How to use it

**Quickest way:** open `index.html` with a double click (it works from `file://` too).

**Recommended** (for tablets, and to behave exactly like a published site):

```powershell
# from the project folder
python -m http.server 8899
# then open http://127.0.0.1:8899/
```

Sound starts on the first tap/click: that is a browser rule, not a bug.
Personal bests are stored in the browser's `localStorage`: no data ever leaves your device.

---

## The games

| Game | What it trains |
|---|---|
| 🎼 **Read the note** | A note appears on the staff: choose its name (10 questions) |
| 🎻 **Find the position** | Read the name and tap the right spot on the fingerboard |
| 👂 **Ear training** | The violin plays a note: recognise it by ear (replayable) |
| ⏱️ **Time challenge** | 60 seconds of mixed reading and listening questions |
| 🔥 **Fingerboard race** | 60 seconds to find as many notes as possible on the fingerboard |
| ⚔️ **Turn-based duel** | 2 players, one timed turn each: the highest score wins |
| 👥 **Side-by-side challenge** | 2 players **at the same time**, split screen, each with their own notes |
| 🏁 **Head to head** | One note for both: whoever answers first wins the point |
| 🎼 **Classical pieces** | Choose a famous piece and name its notes one by one from the staff |
| 🎸 **Violin Hero** | The notes of the piece fall down: hit the right string in time |

### The note keyboard

When a game asks you to name a note, the answers are a **fixed keyboard**: the same notes in
the same order for every question — Do Re Mi Fa Sol La Si, plus the sharps when the level uses
them — so you learn where each note lives instead of hunting for the button each time. The
keys 1…7 (up to =) play them. In the two-player games the answers are still four choices,
because a whole keyboard does not fit twice on one screen.

Every key is **one note in one octave**: the keyboard has a separate key for G3 and G4, and
each key shows its octave (`G3`, `C♯5`), because a G is not an answer to a question about the
G one octave higher. On the first levels the keyboard holds just the notes of the level
(9 keys for *kids*); when a piece needs more (or the level uses accidentals) it grows and the
keys shrink a little to stay on one row.

### 🎼 Classical pieces

Pick from the built-in library (`js/brani.js`, all public-domain melodies, all playable in
1st position from G3 to C6):

| Piece | |
|---|---|
| Inno alla Gioia / Ode to Joy | Ludwig van Beethoven |
| Per Elisa / Für Elise (opening) | Ludwig van Beethoven |
| Canone di Pachelbel / Pachelbel's Canon (theme) | Johann Pachelbel |
| Fra Martino / Frère Jacques | traditional |
| Brillante stella / Twinkle, Twinkle, Little Star | traditional |
| Jingle Bells | James Lord Pierpont |
| Scala e arpeggio di Do / C major scale and arpeggio | exercise |

You can **listen to the whole piece first** (with its rhythm); then the app shows its notes one
by one on the staff: name each one, hear it played, and watch the melody build up note by note
at the top of the screen. Wrong notes go into the mistakes review like everywhere else.

### 🎸 Violin Hero

The notes of the chosen piece fall towards a line, each in the lane of the string where it is
actually played (G, D, A, E). Hit the right lane in time — tap the four buttons or press keys
`1` `2` `3` `4` — and the app plays that note, so playing well builds the melody you hear.
Four beats of count-in, then it starts; perfect timing is worth double, missing a note breaks
the streak, and a stray tap costs nothing.

The **Tempo** control above the lanes changes the speed of the piece while you play: drag the
slider, use the **−** / **+** buttons or the `-` / `+` keys, and the label shows the speed and
the resulting BPM (`0.8× · 80 BPM` for Ode to Joy, which is written at 100). The notes never jump:
whatever is arriving on the line
stays there and the rest stretches or squeezes around it, so you can slow a passage down,
learn it, and speed it back up. The choice is remembered for the next time (0.5× to 1.6×).

### 📋 Mistakes review

Every game has a **📋 Mistakes** button (with the number of wrong answers): it opens a panel
that **pauses** the game and explains every mistake, one by one. The same panel opens at the
end with **"Review the mistakes"**.

For each mistake the panel shows:

* the **staff** with the right note;
* **your answer** and the **right answer**, with the note spelled out ("F♯4 — F sharp");
* **what kind of mistake it was**, recognised automatically:
  * *Same name, different octave* (G3 mistaken for G4)
  * *Wrong accidental* (F instead of F♯)
  * *Wrong line or space* (note read one step too high or too low)
  * *A semitone away*
  * *Wrong string* or *Wrong finger* (for the fingerboard games)
* **a concrete explanation** ("You tapped the E string, but A3 is played on the G string
  (1st finger)") and **where that note is played**, plus alternative positions;
* the **frequency comparison** (F = 349.2 Hz · F♯ = 370.0 Hz);
* a **🔊 Compare** button that plays the right note first and then the wrong one, so you can
  hear the difference.

At the top of the panel: how many right, how many wrong, the accuracy, and — if a kind of
mistake repeats — the **most frequent mistake** with advice on how to avoid it.

### Scoring

10 points per correct answer, plus a **streak bonus** (3 in a row: +5, 5 in a row: +10) and a
**speed bonus** (up to +8). Each game's best score per level is saved.

### Two-player controls

You can play by **tapping the buttons** on screen (great for two people on one tablet) or
with the keyboard:

| | Keys |
|---|---|
| Player 1 | `A` `S` `D` `F` |
| Player 2 | `J` `K` `L` `Ò` |

In single-player games you answer with `1` `2` `3` `4` (or by tapping), `Space` replays the note.

---

## Levels

| Level | Content |
|---|---|
| 🧒 **Kids** | Open strings and the first notes, 1st position, naturals only (G3–A4) |
| 🎵 **Teens** | The whole 1st position with natural notes (G3–E5) |
| 🎼 **Adults** | Complete 1st position, with sharps and flats, ledger lines |
| 🏆 **Masters** | 1st–3rd position, accidentals, high register up to C6 |

The **📚 Study** section shows the interactive fingerboard (tap a dot: you hear the note and
see it on the staff), the tuning G–D–A–E and the table of the notes on each string.

---

## The violin sound

The notes you hear are **real violin recordings**, not a synthetic tone.

* **Samples** — the *Solo Violin* recordings from **VSCO 2 Community Edition**, released
  under **CC0 1.0 Universal** (public domain). Eleven bowed notes with real vibrato covering
  G3–C6 — 3.5 s each, natural bow attack included — plus a pizzicato used for the
  interface sounds. They live in `sounds/`, are mono 22 050 Hz WAV, and weigh about 1.7 MB
  in total. Provenance and processing are documented in
  [`sounds/LICENSE.md`](sounds/LICENSE.md) and the preparation script is
  [`tools/prepara-campioni.js`](tools/prepara-campioni.js).
* **Tuning** — the real pitch of every recording was measured with
  [`tools/misura-campioni.js`](tools/misura-campioni.js) and stored in `js/audio.js`, so
  playback is transposed exactly onto the requested note. One of the original notes is
  23 cents sharp: without this correction it would sound out of tune.
* **Playback** — each note uses the nearest sample, transposed by at most two semitones,
  held for as long as the note lasts (the samples are long enough that nothing is cut
  short) and released like a bow being lifted, through a soft limiter and a short reverb.
* **Fallback** — if the browser refuses to read the sample files (which happens when
  `index.html` is opened directly from `file://`, because local file reads are blocked), the
  app synthesises the violin instead: bowed-string spectrum `(1/n)·|sin(n·π·β)|`, body
  resonances (A0 ~285 Hz, B1 ~480 Hz, bridge hill ~3 kHz), bow-hair noise, vibrato and a
  pizzicato model. Notes are therefore always audible, sampled or synthesised.

---

## How the musical model works

* **Note names** — Italian mode uses **Do Re Mi Fa Sol La Si**, English mode uses
  **C D E F G A B**, with ♯/♭ next to the name (and the spoken form *"F sharp"*,
  *"B flat"* in the tooltips). The number after the name is the octave: **A4** = 440 Hz, the
  reference A.
* **Open string and fingers** — in 1st position the *k*-th finger plays the diatonic degree
  *k* above the open string; each finger can also play a semitone lower (a "low" finger,
  e.g. B♭) or higher (a "high" finger, e.g. F♯). Every accidental comes out of this, matching
  real violin fingering.
  * E.g. on the D string: 0 = D4, 1st = E4, 2nd = F4/F♯4, 3rd = G4, 4th = A4.
  * On the E string the 1st finger is one semitone up (F5), not two.
* **Positions** — in position *P* the 1st finger plays degree *P* above the open string
  (3rd position on the G string: 1st finger = C4).
* **The same note on several strings** — D4 is the open D string *or* the 4th finger on the
  G string: the app accepts both and explains them in the feedback.
* **Same name in different octaves** — G3 and G4 are both called "G": that is why
  multiple-choice answers always have distinct names, and why the *Find the position*
  question also shows the staff and the octave, making the spot to tap unambiguous.
* **The staff** — the treble clef is a vector drawing aligned geometrically to the G line
  (no dependency on installed music fonts); every note is placed by counting lines and
  spaces from E4 (bottom line), with ledger lines computed automatically.

---

## Project structure

```
index.html            screen structure and the bilingual guide
css/styles.css        styling (automatic light/dark theme, responsive)
js/i18n.js            interface translations (Italian / English) and language switching
js/theory.js          notes, frequencies, strings, fingerings, positions, levels
js/audio.js           violin sound synthesis (Web Audio), effects, tuning
js/staff.js           treble staff drawing (SVG)
js/violin.js          interactive violin fingerboard (SVG)
js/brani.js           public-domain pieces for the two music games
js/games.js           game engine: questions, scoring, timing, turns (no DOM)
js/eroe.js            Violin Hero engine: falling notes, timing and scoring
js/app.js             interface, screens, wiring with the engine
sounds/               recorded violin samples (VSCO 2 CE, CC0) + licence
tools/                sample preparation and tuning measurement scripts
test/test-motore.js          logic test suite
test/test-interfaccia.js     interface test suite (real mouse events, Chrome)
test/test-audio.js           violin timbre test suite (spectrum analysis, Chrome)
```

No external libraries, no build step.

---

## Tests

```powershell
node test/test-motore.js          # logic: notes, fingerings, questions, full games
node test/test-interfaccia.js     # interface: real mouse clicks (needs Chrome)
node test/test-audio.js           # sound: spectrum of the synthesised violin (needs Chrome)
```

`test-motore.js` runs ~20,700 checks: note names and frequencies, 1st-position fingerings,
consistency of every level (every note asked must really be playable and have a clickable dot
on the fingerboard), question generation (one right answer only, options with distinct names),
recognition of the mistake types in the review, the **pause** (the clock does not tick while
you read), and a simulation of **all 32 game × level combinations** played to the end.

`test-interfaccia.js` opens the app in headless Chrome and uses it with **real mouse events**
(so it goes through element hit-testing), checking that no forgotten veil or modal covers the
interface, that every button really responds, that the mistakes review opens and pauses the
clock, that the **language button** translates the whole interface and the note names, that the
fixed answer keyboard has a **separate key for each note in each octave** (so G4 really answers
a question about G4 and not about G3), that the **Tempo** control of Violin Hero really changes
the speed (slider, −/+ buttons, `-`/`+` keys, and it stays reachable on a phone), and
that the word `undefined` never appears on screen (the classic symptom of a property spelled
differently in the interface than where it is defined). It needs the app served over HTTP:

```powershell
python -m http.server 8899
node test/test-interfaccia.js
```

> Why two test suites: a click made with JavaScript's `element.click()` works **even under a
> transparent veil**, so it cannot prove the app is usable. Only a real click notices.

`test-audio.js` renders the notes with an `OfflineAudioContext` (so it does not need to play
them) and analyses the spectrum with the Goertzel transform, checking that the pitch is exact
within a few Hz, that the bowed-string harmonic series is the expected one — including the
gap on the 8th harmonic — that the body resonances colour the sound where they should, that
the vibrato widens the spectrum around the fundamental, that the sound is sustained while the
pizzicato decays, and that nothing clips.

---

## Technical notes

* Modern browsers (Chrome, Edge, Firefox, Safari): it uses classic `<script>` tags, so it
  works when opened from `file://` as well.
* The fingerboard shows positions as virtual semitone "frets": tapping a dot identifies the
  note unambiguously and the number inside is the finger that plays it.
* The side-by-side challenge keeps a separate state for each player: one player's answer does
  not block the other.
* The dark theme follows the system preference.
* The interface language is remembered in `localStorage`; on first visit it follows the
  browser language (Italian browsers get Italian, everyone else gets English).

## Credits

* Violin samples: **Solo Violin** from
  [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) by Versilian Studios LLC,
  released under **CC0 1.0 Universal** (public domain dedication). See
  [sounds/LICENSE.md](sounds/LICENSE.md).
* Treble clef: **public domain** vector drawing taken from
  [Treble clef.svg](https://commons.wikimedia.org/wiki/File:Treble_clef.svg)
  (Wikimedia Commons, PD-self). In the original file the clef is drawn together with the
  staff, which made it possible to derive the exact transformation that aligns it to the
  G line.
* Everything else (code, sound synthesis, fingerboard graphics, translations) is original.
