/**
 * Tokenizer: converts raw text into a normalized array of tokens.
 *
 * MVP scope (deliberate, documented in README):
 * - lowercase everything
 * - strip punctuation (replaced with whitespace so "don't" -> "don t", not "dont")
 * - split on whitespace
 * - drop empty strings
 *
 * Explicitly NOT included in MVP:
 * - stopword removal (adds value mainly at larger corpus sizes)
 * - stemming/lemmatization (marginal benefit at single-user note counts)
 *
 * Pure function: no DOM, no side effects, fully unit-testable in isolation.
 */
export function tokenize(text) {
    if (typeof text !== 'string' || text.length === 0) {
        return [];
    }

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}