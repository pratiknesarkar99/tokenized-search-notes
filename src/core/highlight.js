/**
 * Splits text into segments marking which parts match any of the given
 * search tokens, so the UI layer can render highlighted vs plain text
 * without ever touching innerHTML (avoids HTML injection from note
 * content entirely, everything is rendered via textContent/createTextNode
 * downstream).
 *
 * Matching is case-insensitive and **word-prefix** based, mirroring
 * search.js's matching rule exactly: a token "mil" highlights the whole
 * word "milk" (the entire matched word is highlighted, not just the
 * typed prefix), anchored to word starts so "cat" still won't highlight
 * inside "concatenate". This has to stay in sync with how search.js
 * matches, otherwise a note could show up as a search result with
 * nothing actually highlighted inside it, or a match count that
 * disagrees with what's visibly marked.
 *
 * @param {string} text
 * @param {string[]} tokens
 * @returns {Array<{ text: string, highlighted: boolean }>}
 */
export function highlightSegments(text, tokens) {
    if (!text || tokens.length === 0) {
        return [{ text: text || '', highlighted: false }];
    }

    const pattern = new RegExp(`\\b(?:${tokens.map(escapeRegex).join('|')})\\w*`, 'gi');
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ text: text.slice(lastIndex, match.index), highlighted: false });
        }
        segments.push({ text: match[0], highlighted: true });
        lastIndex = pattern.lastIndex;

        // Guard against zero-width matches causing an infinite loop.
        if (match.index === pattern.lastIndex) {
            pattern.lastIndex++;
        }
    }

    if (lastIndex < text.length) {
        segments.push({ text: text.slice(lastIndex), highlighted: false });
    }

    return segments;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Counts total match occurrences of any token in text.
 * Built from the same matching rule as highlightSegments (whole-word,
 * case-insensitive), so the badge count and the actual highlighted
 * segments can never disagree with each other.
 *
 * @param {string} text
 * @param {string[]} tokens
 * @returns {number}
 */
export function countMatches(text, tokens) {
    return highlightSegments(text, tokens).filter((segment) => segment.highlighted).length;
}

/**
 * Extracts a short window of text centered on the first match, for use as
 * a search-result preview (the "Google snippet" pattern), instead of
 * blindly truncating the first N characters regardless of where the
 * match actually falls.
 *
 * Falls back to a plain leading slice (no centering) when there are no
 * tokens or no match is found, same behavior as before this existed.
 *
 * @param {string} text
 * @param {string[]} tokens
 * @param {number} [contextChars] - characters of context on each side of the match
 * @returns {{
 *   segments: Array<{ text: string, highlighted: boolean }>,
 *   truncatedStart: boolean,
 *   truncatedEnd: boolean
 * }}
 */
export function getSnippet(text, tokens, contextChars = 60) {
    if (!text) {
        return { segments: [{ text: '', highlighted: false }], truncatedStart: false, truncatedEnd: false };
    }

    const leadingSlice = () => {
        const truncatedEnd = text.length > contextChars * 2;
        return {
            segments: [{ text: text.slice(0, contextChars * 2), highlighted: false }],
            truncatedStart: false,
            truncatedEnd,
        };
    };

    if (tokens.length === 0) {
        return leadingSlice();
    }

    const pattern = new RegExp(`\\b(${tokens.map(escapeRegex).join('|')})\\b`, 'i');
    const match = pattern.exec(text);

    if (!match) {
        return leadingSlice();
    }

    const start = Math.max(0, match.index - contextChars);
    const end = Math.min(text.length, match.index + match[0].length + contextChars);

    return {
        segments: highlightSegments(text.slice(start, end), tokens),
        truncatedStart: start > 0,
        truncatedEnd: end < text.length,
    };
}