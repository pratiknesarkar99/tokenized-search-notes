import { tokenize } from './tokenizer.js';

/**
 * Runs a query against the index and returns full scoring detail per note,
 * not just the final score. This is the shared computation both `search()`
 * (the real search results used by the UI) and the "search internals" demo
 * panel are built on, so there's exactly one place that implements ranking
 * logic, not two copies that could drift out of sync.
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
 * @returns {{
 *   tokens: string[],
 *   results: Array<{ note: object, score: number, matches: Array<{ token: string, freq: number }> }>
 * }}
 */
export function explainSearch(query, index, notes) {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
        return { tokens: [], results: [] };
    }

    const matchesByNote = new Map(); // noteId -> [{ token, freq }]

    for (const token of tokens) {
        const postings = index.get(token);
        if (!postings) continue;

        for (const [noteId, freq] of postings) {
            if (!matchesByNote.has(noteId)) {
                matchesByNote.set(noteId, []);
            }
            matchesByNote.get(noteId).push({ token, freq });
        }
    }

    const noteById = new Map(notes.map((n) => [n.id, n]));

    const results = [...matchesByNote.entries()]
        .map(([noteId, matches]) => {
            const score = matches.reduce((sum, m) => sum + m.freq, 0);
            return { note: noteById.get(noteId), score, matches };
        })
        .filter((result) => result.note !== undefined) // guard against stale index entries
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.note.updatedAt - a.note.updatedAt;
        });

    return { tokens, results };
}

/**
 * Searches the index for a query and returns ranked results.
 * Thin wrapper over explainSearch() that drops the per-token breakdown,
 * used by the real UI where you just want the ranked note list.
 *
 * @param {string} query
 * @param {Map<string, Map<string, number>>} index
 * @param {Array<{id: string, updatedAt: number}>} notes
 * @returns {Array<{note: object, score: number}>}
 */
export function search(query, index, notes) {
    return explainSearch(query, index, notes).results.map(({ note, score }) => ({
        note,
        score,
    }));
}