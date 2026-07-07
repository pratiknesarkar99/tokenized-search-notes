import { describe, it, expect } from 'vitest';
import { highlightSegments, countMatches } from '../src/core/highlight.js';

describe('highlightSegments', () => {
    it('returns the whole text as one plain segment when there are no tokens', () => {
        expect(highlightSegments('hello world', [])).toEqual([
            { text: 'hello world', highlighted: false },
        ]);
    });

    it('returns an empty segment for empty text', () => {
        expect(highlightSegments('', ['milk'])).toEqual([{ text: '', highlighted: false }]);
    });

    it('highlights a single matching word', () => {
        expect(highlightSegments('buy milk today', ['milk'])).toEqual([
            { text: 'buy ', highlighted: false },
            { text: 'milk', highlighted: true },
            { text: ' today', highlighted: false },
        ]);
    });

    it('is case-insensitive', () => {
        expect(highlightSegments('Buy Milk today', ['milk'])).toEqual([
            { text: 'Buy ', highlighted: false },
            { text: 'Milk', highlighted: true },
            { text: ' today', highlighted: false },
        ]);
    });

    it('matches whole words only, not substrings', () => {
        const segments = highlightSegments('categorize the cat', ['cat']);
        const highlighted = segments.filter((s) => s.highlighted).map((s) => s.text);
        expect(highlighted).toEqual(['cat']);
    });

    it('highlights multiple distinct tokens in the same text', () => {
        const segments = highlightSegments('milk and eggs and flour', ['milk', 'eggs']);
        const highlighted = segments.filter((s) => s.highlighted).map((s) => s.text);
        expect(highlighted).toEqual(['milk', 'eggs']);
    });

    it('highlights repeated occurrences of the same token', () => {
        const segments = highlightSegments('call mom call dad', ['call']);
        const highlighted = segments.filter((s) => s.highlighted).map((s) => s.text);
        expect(highlighted).toEqual(['call', 'call']);
    });

    it('returns the whole text unhighlighted when no token matches', () => {
        expect(highlightSegments('hello world', ['quantum'])).toEqual([
            { text: 'hello world', highlighted: false },
        ]);
    });

    it('does not break on regex special characters in tokens', () => {
        expect(() => highlightSegments('cost is $5.00 (approx)', ['$5.00'])).not.toThrow();
    });
});

describe('countMatches', () => {
    it('counts a single match', () => {
        expect(countMatches('buy milk today', ['milk'])).toBe(1);
    });

    it('counts repeated occurrences of the same token', () => {
        expect(countMatches('call mom call dad call sister', ['call'])).toBe(3);
    });

    it('sums counts across multiple distinct tokens', () => {
        expect(countMatches('milk and eggs and flour', ['milk', 'eggs'])).toBe(2);
    });

    it('returns 0 when nothing matches', () => {
        expect(countMatches('hello world', ['quantum'])).toBe(0);
    });

    it('returns 0 for empty text or empty tokens', () => {
        expect(countMatches('', ['milk'])).toBe(0);
        expect(countMatches('buy milk', [])).toBe(0);
    });
});