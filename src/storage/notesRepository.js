
/**
 * Notes repository: the only module that touches localStorage directly.
 *
 * Everything else in the app (UI, index building) works with plain note
 * objects and never knows or cares that persistence happens to be
 * localStorage. This is what makes it possible to swap in IndexedDB later
 * (Phase 5+/production-grade note in the README) without touching any
 * other file.
 */

const STORAGE_KEY = 'notes-app:notes';

export function getAllNotes() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // Corrupted or manually-edited localStorage data. Fail safe to an
        // empty list rather than crashing the whole app on load.
        console.warn('notes-app: could not parse stored notes, starting fresh');
        return [];
    }
}

function saveAllNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function saveNote(note) {
    const notes = getAllNotes();
    const existingIndex = notes.findIndex((n) => n.id === note.id);

    if (existingIndex === -1) {
        notes.push(note);
    } else {
        notes[existingIndex] = note;
    }

    saveAllNotes(notes);
    return note;
}

export function deleteNote(noteId) {
    const notes = getAllNotes().filter((n) => n.id !== noteId);
    saveAllNotes(notes);
}