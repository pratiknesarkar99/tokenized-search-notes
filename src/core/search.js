import { tokenize } from './tokenizer.js';

const DEFAULT_TITLE_WEIGHT = 3;
const DEFAULT_BODY_WEIGHT = 1;

/**
 * Runs a query against the index and returns full scoring detail per note,
 * not just the final score. This is the shared computation both `search()`
 * (the real search results used by the UI) and the "search internals" demo
 * panel are built on, so there's exactly one place that implements ranking
 * logic, not two copies that could drift out of sync.
 *
 * Scoring: score = sum over matched tokens of
 *   (titleFreq * titleWeight) + (bodyFreq * bodyWeight)
 *
 * Title matches are weighted higher than body matches by default (3:1).
 * A note titled "Milk Run" ranks above a note that merely mentions "milk"
 * once in a long body, even though both have one raw occurrence, that's
 * the whole point of this layer. The 3:1 ratio is a reasonable starting
 * heuristic, not derived from any formal model, tunable via the weights
 * argument if it ever needs adjusting.
 *
 * Matching is by **word prefix**, not exact token only: a query token
 * "mil" matches any indexed token that starts with "mil" ("milk",
 * "military", etc.), enabling search-as-you-type. This is a real change
 * from exact-token matching, not an addition on top of it. "cat" now
 * matches "category", where it previously wouldn't have. Still anchored
 * to word starts though, not arbitrary substrings: "cat" will not match
 * "concatenate" (no word boundary at that position in the string).
 *
 * Implementation: a linear scan over the index's vocabulary for each
 * query token, checking `.startsWith()`. Fine at this project's realistic
 * scale (at most a few thousand unique tokens), a trie/prefix-tree would
 * be the right structure if this needed to scale much further, deferred
 * as unnecessary complexity for now, same reasoning as the other
 * scale-related MVP calls in this project.
 *
 * @param {string} query
 * @param {Map<string, Map<string, { titleFreq: number, bodyFreq: number }>>} index
 * @param {Array<{id: string, updatedAt: number}>} notes
 * @param {{ titleWeight?: number, bodyWeight?: number }} [weights]
 * @returns {{
 *   tokens: string[],
 *   results: Array<{
 *     note: object,
 *     score: number,
 *     matches: Array<{ token: string, titleFreq: number, bodyFreq: number }>
 *   }>
 * }}
 */
export function explainSearch(
    query,
    index,
    notes,
    { titleWeight = DEFAULT_TITLE_WEIGHT, bodyWeight = DEFAULT_BODY_WEIGHT } = {}
) {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
        return { tokens: [], results: [] };
    }

    const matchesByNote = new Map(); // noteId -> [{ token, titleFreq, bodyFreq }]

    for (const queryToken of tokens) {
        for (const indexToken of findTokensWithPrefix(index, queryToken)) {
            const postings = index.get(indexToken);

            for (const [noteId, freqs] of postings) {
                if (!matchesByNote.has(noteId)) {
                    matchesByNote.set(noteId, []);
                }
                matchesByNote.get(noteId).push({
                    token: indexToken, // the actual matched word, not the typed prefix
                    titleFreq: freqs.titleFreq,
                    bodyFreq: freqs.bodyFreq,
                });
            }
        }
    }

    const noteById = new Map(notes.map((n) => [n.id, n]));

    const results = [...matchesByNote.entries()]
        .map(([noteId, matches]) => {
            const score = matches.reduce(
                (sum, m) => sum + m.titleFreq * titleWeight + m.bodyFreq * bodyWeight,
                0
            );
            return { note: noteById.get(noteId), score, matches };
        })
        .filter((result) => result.note !== undefined) // guard against stale index entries
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.note.updatedAt - a.note.updatedAt;
        });

    return { tokens, results };
}

function findTokensWithPrefix(index, prefix) {
    const matches = [];
    for (const indexToken of index.keys()) {
        if (indexToken.startsWith(prefix)) {
            matches.push(indexToken);
        }
    }
    return matches;
}

/**
 * Searches the index for a query and returns ranked results.
 * Thin wrapper over explainSearch() that drops the per-token breakdown,
 * used by the real UI where you just want the ranked note list.
 *
 * @param {string} query
 * @param {Map<string, Map<string, { titleFreq: number, bodyFreq: number }>>} index
 * @param {Array<{id: string, updatedAt: number}>} notes
 * @param {{ titleWeight?: number, bodyWeight?: number }} [weights]
 * @returns {Array<{note: object, score: number}>}
 */
export function search(query, index, notes, weights) {
    return explainSearch(query, index, notes, weights).results.map(({ note, score }) => ({
        note,
        score,
    }));
}