import { tokenize } from './tokenizer.js';

/**
 * Searches the index for a query and returns ranked results.
 *
 * MVP scoring (deliberate, documented in README):
 * - score = sum of term frequencies across all matched query tokens
 * - no title/body weighting yet (index doesn't track that split, see index.js)
 * - no TF-IDF: at single-user, small-corpus scale, normalizing against
 *   document frequency buys little and adds real complexity
 * - ties broken by recency (most recently updated note wins)
 *
 * @param {string} query
 * @param {Map<string, Map<string, number>>} index
 * @param {Array<{id: string, updatedAt: number}>} notes
 * @returns {Array<{note: object, score: number}>}
 */
export function search(query, index, notes) {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
        return [];
    }

    const scores = new Map();

    for (const token of tokens) {
        const postings = index.get(token);
        if (!postings) continue;

        for (const [noteId, freq] of postings) {
            scores.set(noteId, (scores.get(noteId) || 0) + freq);
        }
    }

    const noteById = new Map(notes.map((n) => [n.id, n]));

    return [...scores.entries()]
        .map(([noteId, score]) => ({ note: noteById.get(noteId), score }))
        .filter((result) => result.note !== undefined) // guard against stale index entries
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.note.updatedAt - a.note.updatedAt;
        });
}