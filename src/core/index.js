import { tokenize } from './tokenizer.js';

/**
 * Builds an inverted index from a list of notes.
 *
 * Structure: Map<token, Map<noteId, { titleFreq: number, bodyFreq: number }>>
 *
 * Title and body frequency are tracked separately (not combined into one
 * count) so the scoring layer can weight a title match higher than a body
 * match. This was originally deferred ("start simple, add complexity
 * later" was the explicit MVP call), now implemented as the planned v2
 * scoring improvement.
 *
 * Other MVP scope, still deliberate:
 * - full rebuild from scratch. No incremental updates yet (that's Phase 5,
 *   deferred deliberately since full rebuild is fast enough at this scale).
 *
 * @param {Array<{id: string, title: string, body: string}>} notes
 * @returns {Map<string, Map<string, { titleFreq: number, bodyFreq: number }>>}
 */
export function buildIndex(notes) {
    const index = new Map();

    for (const note of notes) {
        const titleFreq = countTokens(tokenize(note.title));
        const bodyFreq = countTokens(tokenize(note.body));

        const allTokens = new Set([...titleFreq.keys(), ...bodyFreq.keys()]);

        for (const token of allTokens) {
            if (!index.has(token)) {
                index.set(token, new Map());
            }
            index.get(token).set(note.id, {
                titleFreq: titleFreq.get(token) || 0,
                bodyFreq: bodyFreq.get(token) || 0,
            });
        }
    }

    return index;
}

function countTokens(tokens) {
    const freq = new Map();
    for (const token of tokens) {
        freq.set(token, (freq.get(token) || 0) + 1);
    }
    return freq;
}

/**
 * Removes all postings for a given noteId from the index, in place.
 * Used when a note is deleted, or before re-indexing an edited note.
 *
 * This is the operation that's easy to get subtly wrong (leaving stale
 * entries behind), so it has its own dedicated function and test coverage
 * rather than being inlined wherever deletion happens.
 *
 * @param {Map<string, Map<string, { titleFreq: number, bodyFreq: number }>>} index
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