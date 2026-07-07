import { describe, it, expect } from 'vitest';
import { buildIndex, removeNoteFromIndex } from '../src/core/index.js';

const note = (id, title, body) => ({ id, title, body });

describe('buildIndex', () => {
    it('indexes a single note, tracking title and body frequency separately', () => {
        const notes = [note('1', 'Grocery List', 'milk eggs bread')];
        const index = buildIndex(notes);

        expect(index.get('milk').get('1')).toEqual({ titleFreq: 0, bodyFreq: 1 });
        expect(index.get('eggs').get('1')).toEqual({ titleFreq: 0, bodyFreq: 1 });
        expect(index.get('bread').get('1')).toEqual({ titleFreq: 0, bodyFreq: 1 });
    });

    it('tracks title and body frequency separately for a token appearing in both', () => {
        const notes = [note('1', 'milk run', 'buy milk and eggs')];
        const index = buildIndex(notes);

        // "milk" appears once in the title and once in the body, tracked independently.
        expect(index.get('milk').get('1')).toEqual({ titleFreq: 1, bodyFreq: 1 });
    });

    it('tracks term frequency per note when a token repeats within the body', () => {
        const notes = [note('1', 'todo', 'call mom call dad call sister')];
        const index = buildIndex(notes);

        expect(index.get('call').get('1')).toEqual({ titleFreq: 0, bodyFreq: 3 });
    });

    it('tracks term frequency per note when a token repeats within the title', () => {
        const notes = [note('1', 'call call call', 'unrelated body text')];
        const index = buildIndex(notes);

        expect(index.get('call').get('1')).toEqual({ titleFreq: 3, bodyFreq: 0 });
    });

    it('indexes multiple notes sharing the same token separately', () => {
        const notes = [
            note('1', 'Recipe', 'add milk to the bowl'),
            note('2', 'Shopping', 'buy milk'),
        ];
        const index = buildIndex(notes);

        const milkPostings = index.get('milk');
        expect(milkPostings.get('1')).toEqual({ titleFreq: 0, bodyFreq: 1 });
        expect(milkPostings.get('2')).toEqual({ titleFreq: 0, bodyFreq: 1 });
        expect(milkPostings.size).toBe(2);
    });

    it('returns an empty index for an empty notes array', () => {
        const index = buildIndex([]);
        expect(index.size).toBe(0);
    });

    it('handles notes with empty title or body', () => {
        const notes = [note('1', '', 'just body text')];
        const index = buildIndex(notes);

        expect(index.get('just').get('1')).toEqual({ titleFreq: 0, bodyFreq: 1 });
        expect(index.has('')).toBe(false);
    });
});

describe('removeNoteFromIndex', () => {
    it('removes all postings for a given noteId', () => {
        const notes = [
            note('1', 'Recipe', 'add milk to the bowl'),
            note('2', 'Shopping', 'buy milk'),
        ];
        const index = buildIndex(notes);

        removeNoteFromIndex(index, '1');

        expect(index.get('milk').has('1')).toBe(false);
        expect(index.get('milk').has('2')).toBe(true);
    });

    it('deletes the token entirely if no notes reference it anymore', () => {
        const notes = [note('1', 'unique', 'onlyword here')];
        const index = buildIndex(notes);

        removeNoteFromIndex(index, '1');

        expect(index.has('onlyword')).toBe(false);
    });

    it('is a no-op if the noteId is not present in the index', () => {
        const notes = [note('1', 'Recipe', 'add milk to the bowl')];
        const index = buildIndex(notes);

        expect(() => removeNoteFromIndex(index, 'nonexistent')).not.toThrow();
        expect(index.get('milk').get('1')).toEqual({ titleFreq: 0, bodyFreq: 1 });
    });
});