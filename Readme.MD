# Notes App with Client-Side Full-Text Search

A vanilla JS notes app (no framework) with a custom-built inverted index for search, instead of a `.includes()` scan or a search library. Built as a Tier 1 portfolio project, scoped specifically around demonstrating search/ranking mechanics rather than another CRUD-with-localStorage clone.

## Why this project exists

A basic notes app (create, edit, delete, list, persist to localStorage) is commodity code at this point, it doesn't demonstrate much on its own. The interesting engineering problem here is: given a set of notes, how do you find the right one quickly, how do you rank results when more than one note matches, and how do you make that ranking mechanism visible instead of a black box?

This project answers that with a hand-rolled inverted index, a weighted term-frequency scoring function, and a toggleable debug panel that shows the ranking math live, not a third-party search library. The goal was to understand and be able to explain the mechanics, not just wire up a dependency.

## Features

- Create, edit, delete notes, persisted to `localStorage`
- Full-text search with a custom inverted index (not `.includes()`, not a library)
- Title matches ranked above body matches (weighted scoring, see below)
- Search results open in a **read-only highlighted preview** (matched terms in yellow), with an Edit button to switch into the normal editable view
- **Match navigation**: up/down buttons (and arrow keys) to jump between highlighted matches within an open note, current match highlighted distinctly
- Scroll position is preserved when switching from the preview into edit mode
- **"Show search internals" panel**: a toggleable debug view showing the tokenized query and the exact per-note, per-token score breakdown (title× / body× frequency), so the ranking mechanism is visible, not just its output
- Resizable, persisted sidebar (drag to resize, width remembered across sessions)
- Desktop-app-style layout: fixed header, independently scrolling sidebar and content pane

## Architecture

```
notes-app/
├── index.html
├── style.css
├── src/
│   ├── models/
│   │   └── note.js           # Note factory, immutable update, validation
│   ├── core/
│   │   ├── tokenizer.js       # Pure function, no dependencies
│   │   ├── index.js           # Inverted index build/maintenance
│   │   ├── search.js          # Weighted scoring and ranking
│   │   └── highlight.js       # Text segmentation for highlighting + match counting
│   ├── storage/
│   │   └── notesRepository.js # localStorage read/write, only file that touches it
│   ├── ui/
│   │   ├── noteList.js
│   │   ├── noteEditor.js      # Editable view (title input + textarea)
│   │   ├── noteViewer.js      # Read-only highlighted preview + match navigation
│   │   ├── searchBar.js
│   │   ├── searchInternals.js # Debug panel: shows the ranking computation live
│   │   └── sidebarResize.js   # Drag-to-resize sidebar, persists width
│   └── app.js                  # Wires everything together, holds app state
└── tests/
    ├── tokenizer.test.js
    ├── index.test.js
    ├── search.test.js
    ├── highlight.test.js
    ├── note.test.js
    └── notesRepository.test.js
```

**Core design constraint: pure logic separated from UI.** Everything in `src/core/` and `src/models/` is a pure function with no DOM dependency. It's fully unit-testable without a browser. `src/ui/` and `src/app.js` are the only layers that touch the DOM, and they're intentionally left untested (see "What's tested vs what's not" below).

**Why `notesRepository.js` exists as its own module:** it's the only place that calls `localStorage` directly. If this ever moved to IndexedDB (a real production-grade concern once note count or note size grows past what localStorage handles well), only this file changes. Nothing else in the app knows or cares how persistence works.

## How search works

1. **Tokenizer** (`tokenizer.js`): lowercases text, strips punctuation, splits on whitespace. Deliberately no stemming, no stopword removal (see "Scoping decisions" below).
2. **Inverted index** (`index.js`): `Map<token, Map<noteId, { titleFreq, bodyFreq }>>`. Title and body token frequency are tracked **separately** per note, not combined, so the scoring layer can weight them differently.
3. **Scoring** (`search.js`): for a query, tokenize it the same way, then for each matched note: `score = (titleFreq × titleWeight) + (bodyFreq × bodyWeight)`, summed across all matched tokens. Default weights are `titleWeight = 3`, `bodyWeight = 1`, overridable per call. Results sort by score descending, ties broken by most recently updated.
4. **Highlighting** (`highlight.js`): a separate pure function splits note text into plain/highlighted segments for a given set of tokens (whole-word, case-insensitive). Used by the read-only preview to render `<mark>` tags, and by the match-count/navigation feature. Kept entirely separate from the scoring index, this is about *display*, not *ranking*.

Example: searching "milk" against a note titled "Milk Run" (title match ×1) and a note that merely mentions "milk" once in its body (body match ×1) now ranks the title match first: `1 × 3 = 3` vs `1 × 1 = 1`, even though both notes have identical raw occurrence counts. Before this weighting was added, they scored identically, a flat term-frequency sum treats every occurrence the same regardless of where it appears.

## Scoping decisions (why not do it "properly")

These were deliberate MVP calls, not oversights:

- **No TF-IDF.** TF-IDF's value comes from normalizing term weight against how rare a term is across the whole corpus. At single-user scale with a few hundred notes, that normalization buys very little and adds real complexity (tracking document frequency per token, recomputing on every mutation). Plain weighted term-frequency summing is good enough here.
- **Title/body weighting: implemented, ratio is a heuristic.** Originally deferred ("start simple, add complexity later"), later built once the base search was working. The 3:1 title:body ratio is a reasonable starting point, not derived from any formal model. It's exposed as an optional parameter (`{ titleWeight, bodyWeight }`) on `search()`/`explainSearch()` if it ever needs tuning.
- **No stemming or stopword removal.** Marginal benefit at this note count, real implementation cost (stemming especially, since naive suffix-stripping breaks on irregular words).
- **No prefix or fuzzy matching.** Search is whole-token exact match only, "mil" won't match "milk" until the full word is typed, and typos don't match at all. Prefix matching would be a bounded, reasonable next step; fuzzy/typo tolerance is a bigger scope jump not worth it at this project's scale.
- **Full index rebuild on every mutation, not incremental.** Rebuilding from scratch on every note create/edit/delete is O(all notes) instead of O(one note). At this app's realistic scale (dozens to low hundreds of notes), that's single-digit milliseconds, not something a user will ever notice. Incremental updates (patching only the changed note's postings) would be the production-grade next step if this needed to scale to thousands of notes, but building it now would be optimizing a problem that doesn't exist yet.
- **Module-level singleton for app state**, instead of explicitly passing the index and notes array through every function call. Chosen for MVP simplicity. The core functions (`tokenize`, `buildIndex`, `search`) never assumed a singleton, they take all their data as parameters, so migrating to explicit state-passing later is a wiring change in `app.js` only, not a rewrite of the core logic.
- **Search-term highlighting is read-only, not live-in-textarea.** A `<textarea>` can only render plain text, it can't show colored `<mark>` spans while you're typing in it. The alternative (a transparent textarea overlaid pixel-perfectly on a styled div, kept in sync on every keystroke/scroll/resize) is a real, fiddly technique for comparatively little payoff in a single-user notes app. Instead, opening a note from an active search shows a read-only highlighted preview with an Edit button, the same pattern Notion, Obsidian, and Apple Notes all use.

## Tech stack

- Vanilla JavaScript (ES modules), no framework. This is a Tier 1 project, the point is demonstrating fundamentals without a framework doing the work.
- [Vitest](https://vitest.dev/) for unit tests, chosen over Jest for faster startup and native ESM support without extra config.
- [jsdom](https://github.com/jsdom/jsdom) for simulating `localStorage` in tests (Node has no native `localStorage`).
- localStorage for persistence and for a UI preference (sidebar width). No backend, no database, everything runs client-side.

## Setup

```bash
npm install
npm test        # run the test suite (65 tests)
npm run serve   # serve the app locally (npx serve .)
```

Open the URL that `npm run serve` prints. The app won't work correctly opened directly as a `file://` path, ES modules require a server.

## What's tested vs what's not

**Fully unit tested (65 tests total):**
- `tokenizer.js`, `index.js`, `search.js`, `highlight.js`, `note.js`, `notesRepository.js`

**Not unit tested, deliberately:**
- `app.js`, `noteList.js`, `noteEditor.js`, `noteViewer.js`, `searchBar.js`, `searchInternals.js`, `sidebarResize.js`

These are DOM-manipulation and wiring code. Testing them meaningfully would need jsdom plus simulated user events (clicks, drags, keyboard navigation) for comparatively low payoff, the logic worth testing (search ranking, index correctness, highlight matching, persistence edge cases) is already covered where it actually lives, in the pure `core/` layer.

## Known limitations

- No fuzzy matching or typo tolerance
- No stemming (searching "run" won't match "running")
- No prefix matching (searching "mil" won't match "milk" until fully typed)
- Full index rebuild on every note mutation (fine at MVP scale, not built to scale past a few thousand notes)
- Title/body weighting ratio (3:1) is a heuristic default, not tuned against real usage data
- No path from edit mode back into the highlighted preview (only preview → edit exists, not the reverse)
- No backend, no sync across devices, localStorage only
- Sidebar resize doesn't reclamp automatically if the browser window is resized after dragging, it keeps its last stored pixel width until manually dragged again

## Bugs encountered and fixed

**1. Test import path mismatch after moving folders.**
Initial project setup accidentally nested `tests/` under `src/` (`src/tests/tokenizer.test.js`) while the import path assumed `tests/` sat at the project root (`../src/core/tokenizer.js`). This caused Vitest to fail with "Failed to load url" instead of a clearer error, since the relative path silently resolved to a nonexistent nested folder (`src/src/core/...`) rather than throwing an obvious "wrong folder" error. Root cause: folder structure and import paths were set up in two separate steps without cross-checking. Fixed by moving `tests/` back to the project root, keeping `src/` as pure application code.

**2. `localStorage` not available in default Vitest test environment.**
`notesRepository.test.js` needs a real `localStorage` to test against, but Vitest's default test environment is plain Node, which has no `localStorage` global. Fixed by adding `jsdom` as a dev dependency and setting `environment: 'jsdom'` in `vitest.config.js`.

**3. Stale index entries after note deletion.**
Early version of `search()` would crash if the index still referenced a note ID that had already been deleted from the notes array (an index built before a delete, not yet rebuilt). Fixed by filtering out results where the note lookup returns `undefined` before sorting, with a dedicated test case (`ignores stale index entries for notes that no longer exist`) so this doesn't regress silently.

**4. CSS specificity tie silently defeated the "hidden" state of the empty-state view.**
After the sidebar/content-pane layout redesign, the empty-state message ("Select a note...") stayed visible even when a note was actively open in the editor, and the content pane showed two scrollbars. Root cause: `.hidden { display: none }` was defined early in the stylesheet, and `.empty-state-main { display: flex }` was defined later. Both are single-class selectors with identical specificity, so when an element had both classes at once, the cascade resolved the tie by source order, not by which class was added last via JavaScript. The later rule in the file won regardless of DOM state, so toggling `.hidden` via `classList.add` had no visible effect on that specific element. Fixed by moving `.hidden` to the very end of the stylesheet, the standard convention for utility classes, so it always wins any specificity tie. The double scrollbar was a side effect of the same bug (two full-height panels stacking at once); resolved as part of the same fix.

**5. Index data shape change broke local tests after a partial file sync.**
When title/body weighted scoring was added, `index.js`'s stored value per note changed from a plain number (`freq`) to an object (`{ titleFreq, bodyFreq }`). After updating the code, a local test run showed 15 failing tests with `NaN` scores and objects coming back as raw numbers. Root cause: `search.js` and the test files had been updated locally, but `index.js` itself was still the old version, so `search.js` was calling `.titleFreq` on a plain number (`undefined`), producing `NaN` downstream. Not a logic bug, a file-sync mismatch between which files had actually been replaced locally versus which hadn't. Resolved by confirming the correct `index.js` content and re-verifying the full suite passed before re-sharing it. Worth a note for future changes that touch a shared data structure across multiple files: always re-run the full suite after copying files locally, a partial copy can look exactly like a real regression.

## Possible future improvements (not built, explicitly out of scope for this MVP)

- Contextual search-result snippets in the sidebar list (currently just the first 80 characters, regardless of where the match actually is)
- Prefix matching ("mil" matching "milk" while typing)
- Incremental index updates instead of full rebuild
- IndexedDB instead of localStorage (for larger note counts or structured queries)
- Backlinks between notes (`[[note title]]` style references)
- A path from edit mode back into the highlighted preview