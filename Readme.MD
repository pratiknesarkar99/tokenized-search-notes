
# Notes App with Client-Side Full-Text Search

A vanilla JS notes app (no framework) with a custom-built inverted index for search, instead of a `.includes()` scan or a search library. Built as a Tier 1 portfolio project, scoped specifically around demonstrating search/ranking mechanics rather than another CRUD-with-localStorage clone.

## Why this project exists

A basic notes app (create, edit, delete, list, persist to localStorage) is commodity code at this point, it doesn't demonstrate much on its own. The interesting engineering problem here is: given a set of notes, how do you find the right one quickly, and how do you rank results when more than one note matches?

This project answers that with a hand-rolled inverted index and a simple term-frequency scoring function, not a third-party search library. The goal was to understand and be able to explain the mechanics, not just wire up a dependency.

## Architecture

```
notes-app/
├── index.html
├── style.css
├── src/
│   ├── models/
│   │   └── note.js          # Note factory, immutable update, validation
│   ├── core/
│   │   ├── tokenizer.js      # Pure function, no dependencies
│   │   ├── index.js          # Inverted index build/maintenance
│   │   └── search.js         # Scoring and ranking
│   ├── storage/
│   │   └── notesRepository.js # localStorage read/write, only file that touches it
│   ├── ui/
│   │   ├── noteList.js
│   │   ├── noteEditor.js
│   │   └── searchBar.js
│   └── app.js                 # Wires everything together, holds app state
└── tests/
    ├── tokenizer.test.js
    ├── index.test.js
    ├── search.test.js
    ├── note.test.js
    └── notesRepository.test.js
```

**Core design constraint: pure logic separated from UI.** Everything in `src/core/` and `src/models/` is a pure function with no DOM dependency. It's fully unit-testable without a browser. `src/ui/` and `src/app.js` are the only layers that touch the DOM, and they're intentionally left untested (see "What's not tested" below).

**Why `notesRepository.js` exists as its own module:** it's the only place that calls `localStorage` directly. If this ever moved to IndexedDB (a real production-grade concern once note count or note size grows past what localStorage handles well), only this file changes. Nothing else in the app knows or cares how persistence works.

## How search works

1. **Tokenizer** (`tokenizer.js`): lowercases text, strips punctuation, splits on whitespace. Deliberately no stemming, no stopword removal (see "Scoping decisions" below).
2. **Inverted index** (`index.js`): `Map<token, Map<noteId, termFrequency>>`. Built by tokenizing each note's title and body combined, counting token frequency per note.
3. **Scoring** (`search.js`): for a query, tokenize it the same way, sum term frequencies across all matched tokens for each note, sort by score descending, break ties by most recently updated.

Example: searching "milk eggs" against a note containing "milk" once and "eggs" once scores 2. A note containing only "milk" three times scores 3 and ranks higher, even though it doesn't match every query term. That's a real, explainable tradeoff of a pure term-frequency-sum approach (see below).

## Scoping decisions (why not do it "properly")

These were deliberate MVP calls, not oversights:

- **No TF-IDF.** TF-IDF's value comes from normalizing term weight against how rare a term is across the whole corpus. At single-user scale with a few hundred notes, that normalization buys very little and adds real complexity (tracking document frequency per token, recomputing on every mutation). Plain term-frequency summing is good enough here.
- **No title/body weighting.** The index currently combines title and body tokens into one frequency count per note. A more advanced version would track them separately so a title match outranks several body mentions. Deferred because it changes the index's internal shape, and "start simple, add complexity later" was the explicit call made before building it.
- **No stemming or stopword removal.** Marginal benefit at this note count, real implementation cost (stemming especially, since naive suffix-stripping breaks on irregular words).
- **Full index rebuild on every mutation, not incremental.** Rebuilding from scratch on every note create/edit/delete is O(all notes) instead of O(one note). At this app's realistic scale (dozens to low hundreds of notes), that's single-digit milliseconds, not something a user will ever notice. Incremental updates (patching only the changed note's postings) would be the production-grade next step if this needed to scale to thousands of notes, but building it now would be optimizing a problem that doesn't exist yet.
- **Module-level singleton for app state**, instead of explicitly passing the index and notes array through every function call. Chosen for MVP simplicity. The core functions (`tokenize`, `buildIndex`, `search`) never assumed a singleton, they take all their data as parameters, so migrating to explicit state-passing later is a wiring change in `app.js` only, not a rewrite of the core logic.

## Tech stack

- Vanilla JavaScript (ES modules), no framework. This is a Tier 1 project, the point is demonstrating fundamentals without a framework doing the work.
- [Vitest](https://vitest.dev/) for unit tests, chosen over Jest for faster startup and native ESM support without extra config.
- [jsdom](https://github.com/jsdom/jsdom) for simulating `localStorage` in tests (Node has no native `localStorage`).
- localStorage for persistence. No backend, no database, everything runs client-side.

## Setup

```bash
npm install
npm test        # run the test suite (42 tests)
npm run serve   # serve the app locally (npx serve .)
```

Open the URL that `npm run serve` prints. The app won't work correctly opened directly as a `file://` path, ES modules require a server.

## What's tested vs what's not

**Fully unit tested (42 tests total):**
- `tokenizer.js`, `index.js`, `search.js`, `note.js`, `notesRepository.js`

**Not unit tested, deliberately:**
- `app.js`, `noteList.js`, `noteEditor.js`, `searchBar.js`

These are DOM-manipulation and wiring code. Testing them meaningfully would need jsdom plus simulated user events for comparatively low payoff, the logic worth testing (search ranking, index correctness, persistence edge cases) is already covered where it actually lives.

## Known limitations

- No field-weighted search (title vs body matches score identically)
- No fuzzy matching or typo tolerance
- No stemming (searching "run" won't match "running")
- Full index rebuild on every note mutation (fine at MVP scale, not built to scale past a few thousand notes)
- No backend, no sync across devices, localStorage only

## Bugs encountered and fixed

**1. Test import path mismatch after moving folders.**
Initial project setup accidentally nested `tests/` under `src/` (`src/tests/tokenizer.test.js`) while the import path assumed `tests/` sat at the project root (`../src/core/tokenizer.js`). This caused Vitest to fail with "Failed to load url" instead of a clearer error, since the relative path silently resolved to a nonexistent nested folder (`src/src/core/...`) rather than throwing an obvious "wrong folder" error. Root cause: folder structure and import paths were set up in two separate steps without cross-checking. Fixed by moving `tests/` back to the project root, keeping `src/` as pure application code.

**2. `localStorage` not available in default Vitest test environment.**
`notesRepository.test.js` needs a real `localStorage` to test against, but Vitest's default test environment is plain Node, which has no `localStorage` global. Fixed by adding `jsdom` as a dev dependency and setting `environment: 'jsdom'` in `vitest.config.js`.

**3. Stale index entries after note deletion.**
Early version of `search()` would crash if the index still referenced a note ID that had already been deleted from the notes array (an index built before a delete, not yet rebuilt). Fixed by filtering out results where the note lookup returns `undefined` before sorting, with a dedicated test case (`ignores stale index entries for notes that no longer exist`) so this doesn't regress silently.

## Possible future improvements (not built, explicitly out of scope for this MVP)

- Title/body weighted scoring
- Incremental index updates instead of full rebuild
- IndexedDB instead of localStorage (for larger note counts or structured queries)
- Backlinks between notes (`[[note title]]` style references)