import { describe, it, expect } from 'vitest';
import { buildIndex } from '../src/core/index.js';
import { search } from '../src/core/search.js';

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

    it('ranks notes with higher term frequency above lower frequency matches', () => {
        const notes = [
            note('1', 'todo', 'call mom call dad call sister'), // "call" x3
            note('2', 'todo', 'call the bank'), // "call" x1
        ];
        const index = buildIndex(notes);
        const results = search('call', index, notes);

        expect(results[0].note.id).toBe('1');
        expect(results[0].score).toBe(3);
        expect(results[1].note.id).toBe('2');
        expect(results[1].score).toBe(1);
    });

    it('sums scores across multiple query tokens', () => {
        const notes = [
            note('1', 'Recipe', 'milk and eggs and flour'),
            note('2', 'Recipe', 'just milk'),
        ];
        const index = buildIndex(notes);
        const results = search('milk eggs', index, notes);

        // note 1 matches both "milk" (1) and "eggs" (1) -> score 2
        // note 2 matches only "milk" (1) -> score 1
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
});