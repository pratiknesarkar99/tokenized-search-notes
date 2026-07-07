import { describe, it, expect } from 'vitest';
import { highlightSegments, countMatches, getSnippet } from '../src/core/highlight.js';

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

describe('getSnippet', () => {
    it('falls back to a leading slice when there are no tokens', () => {
        const result = getSnippet('the quick brown fox', [], 60);
        expect(result.segments).toEqual([{ text: 'the quick brown fox', highlighted: false }]);
        expect(result.truncatedStart).toBe(false);
        expect(result.truncatedEnd).toBe(false);
    });

    it('falls back to a leading slice when no token matches', () => {
        const result = getSnippet('the quick brown fox', ['quantum'], 60);
        expect(result.segments).toEqual([{ text: 'the quick brown fox', highlighted: false }]);
        expect(result.truncatedEnd).toBe(false);
    });

    it('marks truncatedEnd when the fallback slice cuts off text', () => {
        const longText = 'a'.repeat(200);
        const result = getSnippet(longText, [], 10);
        expect(result.truncatedEnd).toBe(true);
        expect(result.segments[0].text.length).toBe(20);
    });

    it('centers the window on the match when it is deep in the text', () => {
        const text = 'x'.repeat(100) + ' milk ' + 'y'.repeat(100);
        const result = getSnippet(text, ['milk'], 20);

        expect(result.truncatedStart).toBe(true);
        expect(result.truncatedEnd).toBe(true);

        const highlighted = result.segments.filter((s) => s.highlighted).map((s) => s.text);
        expect(highlighted).toEqual(['milk']);
    });

    it('does not mark truncatedStart when the match is near the beginning', () => {
        const text = 'milk ' + 'y'.repeat(100);
        const result = getSnippet(text, ['milk'], 20);

        expect(result.truncatedStart).toBe(false);
        expect(result.truncatedEnd).toBe(true);
    });

    it('does not mark truncatedEnd when the match is near the end', () => {
        const text = 'x'.repeat(100) + ' milk';
        const result = getSnippet(text, ['milk'], 20);

        expect(result.truncatedStart).toBe(true);
        expect(result.truncatedEnd).toBe(false);
    });

    it('does not truncate either side when the whole text fits in the window', () => {
        const text = 'buy milk today';
        const result = getSnippet(text, ['milk'], 60);

        expect(result.truncatedStart).toBe(false);
        expect(result.truncatedEnd).toBe(false);
    });

    it('returns an empty segment for empty text regardless of tokens', () => {
        const result = getSnippet('', ['milk'], 60);
        expect(result.segments).toEqual([{ text: '', highlighted: false }]);
    });
});