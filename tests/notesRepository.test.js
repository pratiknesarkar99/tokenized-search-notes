import { describe, it, expect, beforeEach } from 'vitest';
import { getAllNotes, saveNote, deleteNote } from '../src/storage/notesRepository.js';
import { createNote } from '../src/models/note.js';

describe('notesRepository', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns an empty array when nothing is stored', () => {
        expect(getAllNotes()).toEqual([]);
    });

    it('saves a new note and retrieves it', () => {
        const note = createNote({ title: 'Groceries', body: 'milk' });
        saveNote(note);

        const notes = getAllNotes();
        expect(notes).toHaveLength(1);
        expect(notes[0].id).toBe(note.id);
    });

    it('updates an existing note in place rather than duplicating it', () => {
        const note = createNote({ title: 'Groceries', body: 'milk' });
        saveNote(note);

        const updated = { ...note, title: 'Groceries v2' };
        saveNote(updated);

        const notes = getAllNotes();
        expect(notes).toHaveLength(1);
        expect(notes[0].title).toBe('Groceries v2');
    });

    it('deletes a note by id', () => {
        const noteA = createNote({ title: 'A', body: '' });
        const noteB = createNote({ title: 'B', body: '' });
        saveNote(noteA);
        saveNote(noteB);

        deleteNote(noteA.id);

        const notes = getAllNotes();
        expect(notes).toHaveLength(1);
        expect(notes[0].id).toBe(noteB.id);
    });

    it('falls back to an empty array if localStorage contains corrupted JSON', () => {
        localStorage.setItem('notes-app:notes', '{not valid json');
        expect(getAllNotes()).toEqual([]);
    });

    it('falls back to an empty array if stored value is not an array', () => {
        localStorage.setItem('notes-app:notes', JSON.stringify({ not: 'an array' }));
        expect(getAllNotes()).toEqual([]);
    });
});