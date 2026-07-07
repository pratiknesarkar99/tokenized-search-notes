import { tokenize } from './tokenizer.js';

/**
 * Builds an inverted index from a list of notes.
 *
 * Structure: Map<token, Map<noteId, termFrequency>>
 *
 * MVP scope (deliberate):
 * - title and body tokens are combined into one frequency count per token.
 *   No separate title/body weighting yet, that's a scoring-layer concern,
 *   added later without changing this structure.
 * - full rebuild from scratch. No incremental updates yet (that's Phase 5,
 *   deferred deliberately since full rebuild is fast enough at this scale).
 *
 * @param {Array<{id: string, title: string, body: string}>} notes
 * @returns {Map<string, Map<string, number>>}
 */
export function buildIndex(notes) {
    const index = new Map();

    for (const note of notes) {
        const tokens = [...tokenize(note.title), ...tokenize(note.body)];

        const freq = new Map();
        for (const token of tokens) {
            freq.set(token, (freq.get(token) || 0) + 1);
        }

        for (const [token, count] of freq) {
            if (!index.has(token)) {
                index.set(token, new Map());
            }
            index.get(token).set(note.id, count);
        }
    }

    return index;
}

/**
 * Removes all postings for a given noteId from the index, in place.
 * Used when a note is deleted, or before re-indexing an edited note.
 *
 * This is the operation that's easy to get subtly wrong (leaving stale
 * entries behind), so it has its own dedicated function and test coverage
 * rather than being inlined wherever deletion happens.
 *
 * @param {Map<string, Map<string, number>>} index
 * @param {string} noteId
 */
export function removeNoteFromIndex(index, noteId) {
    for (const [token, postings] of index) {
        if (postings.has(noteId)) {
            postings.delete(noteId);
            if (postings.size === 0) {
                index.delete(token);
            }
        }
    }
}