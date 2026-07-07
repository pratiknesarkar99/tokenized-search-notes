import { describe, it, expect } from 'vitest';
import { createNote, updateNote, isValidNote } from '../src/models/note.js';

describe('createNote', () => {
    it('creates a note with a unique id', () => {
        const a = createNote({ title: 'A', body: 'body' });
        const b = createNote({ title: 'A', body: 'body' });
        expect(a.id).not.toBe(b.id);
    });

    it('trims the title', () => {
        const n = createNote({ title: '  Groceries  ', body: 'milk' });
        expect(n.title).toBe('Groceries');
    });

    it('sets createdAt and updatedAt to the same timestamp on creation', () => {
        const n = createNote({ title: 'A', body: 'B' });
        expect(n.createdAt).toBe(n.updatedAt);
    });

    it('defaults to empty title/body when none given', () => {
        const n = createNote();
        expect(n.title).toBe('');
        expect(n.body).toBe('');
    });
});

describe('updateNote', () => {
    it('returns a new object, does not mutate the original', () => {
        const original = createNote({ title: 'A', body: 'B' });
        const updated = updateNote(original, { title: 'A2' });

        expect(original.title).toBe('A');
        expect(updated.title).toBe('A2');
        expect(updated).not.toBe(original);
    });

    it('bumps updatedAt but preserves createdAt', () => {
        const original = createNote({ title: 'A', body: 'B' });
        const updated = updateNote(original, { title: 'A2' });

        expect(updated.createdAt).toBe(original.createdAt);
        expect(updated.updatedAt).toBeGreaterThanOrEqual(original.createdAt);
    });

    it('only updates fields that are explicitly passed', () => {
        const original = createNote({ title: 'A', body: 'B' });
        const updated = updateNote(original, { body: 'B2' });

        expect(updated.title).toBe('A');
        expect(updated.body).toBe('B2');
    });
});

describe('isValidNote', () => {
    it('rejects a note with an empty title', () => {
        expect(isValidNote({ title: '', body: 'something' })).toBe(false);
    });

    it('rejects a note with a whitespace-only title', () => {
        expect(isValidNote({ title: '   ', body: 'something' })).toBe(false);
    });

    it('accepts a note with a non-empty title and empty body', () => {
        expect(isValidNote({ title: 'Reminder', body: '' })).toBe(true);
    });
});