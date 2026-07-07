import { describe, it, expect } from 'vitest';
import { buildIndex } from '../src/core/index.js';
import { search, explainSearch } from '../src/core/search.js';

const note = (id, title, body, updatedAt = 0) => ({ id, title, body, updatedAt });

describe('search', () => {
    it('returns notes matching a single-token query', () => {
        const notes = [
            note('1', 'Grocery List', 'milk eggs bread'),
            note('2', 'Workout Plan', 'squats deadlifts'),
        ];
        const index = buildIndex(notes);
        const results = search('milk', index, notes);

        expect(results).toHaveLength(1);
        expect(results[0].note.id).toBe('1');
    });

    it('returns an empty array when no notes match', () => {
        const notes = [note('1', 'Grocery List', 'milk eggs bread')];
        const index = buildIndex(notes);

        expect(search('quantum', index, notes)).toEqual([]);
    });

    it('returns an empty array for an empty query', () => {
        const notes = [note('1', 'Grocery List', 'milk eggs bread')];
        const index = buildIndex(notes);

        expect(search('', index, notes)).toEqual([]);
        expect(search('   ', index, notes)).toEqual([]);
    });

    it('ranks notes with higher body term frequency above lower frequency matches', () => {
        const notes = [
            note('1', 'todo', 'call mom call dad call sister'), // "call" x3, all in body
            note('2', 'todo', 'call the bank'), // "call" x1, in body
        ];
        const index = buildIndex(notes);
        const results = search('call', index, notes);

        expect(results[0].note.id).toBe('1');
        expect(results[0].score).toBe(3); // 3 * bodyWeight(1)
        expect(results[1].note.id).toBe('2');
        expect(results[1].score).toBe(1);
    });

    it('ranks a title match above a body match with the same raw occurrence count', () => {
        const notes = [
            note('1', 'Milk Run', 'notes about the errand'), // "milk" x1 in title
            note('2', 'Shopping', 'buy milk sometimes'), // "milk" x1 in body
        ];
        const index = buildIndex(notes);
        const results = search('milk', index, notes);

        // default weights: titleWeight=3, bodyWeight=1
        expect(results[0].note.id).toBe('1');
        expect(results[0].score).toBe(3);
        expect(results[1].note.id).toBe('2');
        expect(results[1].score).toBe(1);
    });

    it('respects custom title/body weights when provided', () => {
        const notes = [
            note('1', 'Milk Run', 'notes about the errand'),
            note('2', 'Shopping', 'buy milk sometimes'),
        ];
        const index = buildIndex(notes);

        // equal weighting should tie the scores, breaking by recency instead
        const results = search('milk', index, notes, { titleWeight: 1, bodyWeight: 1 });

        expect(results[0].score).toBe(1);
        expect(results[1].score).toBe(1);
    });

    it('sums scores across multiple query tokens', () => {
        const notes = [
            note('1', 'Recipe', 'milk and eggs and flour'),
            note('2', 'Recipe', 'just milk'),
        ];
        const index = buildIndex(notes);
        const results = search('milk eggs', index, notes);

        // note 1 matches both "milk" (body x1) and "eggs" (body x1) -> score 2
        // note 2 matches only "milk" (body x1) -> score 1
        expect(results[0].note.id).toBe('1');
        expect(results[0].score).toBe(2);
        expect(results[1].note.id).toBe('2');
        expect(results[1].score).toBe(1);
    });

    it('breaks ties by recency when scores are equal', () => {
        const notes = [
            note('1', 'todo', 'call mom', 1000), // older
            note('2', 'todo', 'call dad', 2000), // newer
        ];
        const index = buildIndex(notes);
        const results = search('call', index, notes);

        expect(results[0].note.id).toBe('2');
        expect(results[1].note.id).toBe('1');
    });

    it('is case-insensitive', () => {
        const notes = [note('1', 'Grocery List', 'Milk and Eggs')];
        const index = buildIndex(notes);
        const results = search('MILK', index, notes);

        expect(results).toHaveLength(1);
    });

    it('ignores stale index entries for notes that no longer exist', () => {
        const notes = [note('1', 'Grocery List', 'milk eggs')];
        const index = buildIndex(notes);

        // simulate a stale index referencing a deleted note
        const staleNotes = [];
        const results = search('milk', index, staleNotes);

        expect(results).toEqual([]);
    });

    it('matches via word prefix, not exact token only', () => {
        const notes = [note('1', 'Shopping', 'buy milkshake mix')];
        const index = buildIndex(notes);
        const results = search('milk', index, notes);

        expect(results).toHaveLength(1);
        expect(results[0].note.id).toBe('1');
    });

    it('does not match mid-word, only word-start prefixes', () => {
        const notes = [note('1', 'Notes', 'we need to concatenate these files')];
        const index = buildIndex(notes);
        const results = search('cat', index, notes);

        expect(results).toEqual([]);
    });

    it('sums matches across multiple index tokens sharing the same query prefix', () => {
        const notes = [note('1', 'Shopping', 'milk and milkshake mix')];
        const index = buildIndex(notes);
        const { results } = explainSearch('milk', index, notes);

        expect(results[0].matches).toContainEqual({ token: 'milk', titleFreq: 0, bodyFreq: 1 });
        expect(results[0].matches).toContainEqual({ token: 'milkshake', titleFreq: 0, bodyFreq: 1 });
        // default weights: (0*3+1*1) + (0*3+1*1) = 2
        expect(results[0].score).toBe(2);
    });
});

describe('explainSearch', () => {
    it('returns the tokenized query alongside results', () => {
        const notes = [note('1', 'Grocery List', 'milk eggs')];
        const index = buildIndex(notes);
        const { tokens } = explainSearch('Milk Eggs', index, notes);

        expect(tokens).toEqual(['milk', 'eggs']);
    });

    it('returns per-token title/body match breakdown for each result', () => {
        const notes = [note('1', 'todo', 'call mom call dad call sister')];
        const index = buildIndex(notes);
        const { results } = explainSearch('call', index, notes);

        expect(results[0].matches).toEqual([{ token: 'call', titleFreq: 0, bodyFreq: 3 }]);
        expect(results[0].score).toBe(3);
    });

    it('breaks down matches from both title and body for the same token', () => {
        const notes = [note('1', 'milk run', 'buy milk and eggs')];
        const index = buildIndex(notes);
        const { results } = explainSearch('milk', index, notes);

        expect(results[0].matches).toEqual([{ token: 'milk', titleFreq: 1, bodyFreq: 1 }]);
        // default weights: 1 * 3 (title) + 1 * 1 (body) = 4
        expect(results[0].score).toBe(4);
    });

    it('breaks down multiple matched tokens separately per note', () => {
        const notes = [note('1', 'Recipe', 'milk and eggs and flour')];
        const index = buildIndex(notes);
        const { results } = explainSearch('milk eggs', index, notes);

        expect(results[0].matches).toContainEqual({ token: 'milk', titleFreq: 0, bodyFreq: 1 });
        expect(results[0].matches).toContainEqual({ token: 'eggs', titleFreq: 0, bodyFreq: 1 });
        expect(results[0].score).toBe(2);
    });

    it('produces results identical (ignoring matches) to search() for the same input', () => {
        const notes = [
            note('1', 'todo', 'call mom call dad', 1000),
            note('2', 'todo', 'call the bank', 2000),
        ];
        const index = buildIndex(notes);

        const plainResults = search('call', index, notes);
        const { results: explainedResults } = explainSearch('call', index, notes);

        expect(explainedResults.map(({ note, score }) => ({ note, score }))).toEqual(
            plainResults
        );
    });

    it('returns empty tokens and results for an empty query', () => {
        const notes = [note('1', 'Grocery List', 'milk eggs')];
        const index = buildIndex(notes);

        expect(explainSearch('', index, notes)).toEqual({ tokens: [], results: [] });
    });
});