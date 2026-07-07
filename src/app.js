import { getAllNotes, saveNote, deleteNote } from './storage/notesRepository.js';
import { createNote, updateNote, isValidNote } from './models/note.js';
import { renderNoteList } from './ui/noteList.js';
import { renderNoteEditor } from './ui/noteEditor.js';

/**
 * App state lives here as module-level variables. This is the "singleton"
 * approach we deliberately chose for MVP (Option A). If this ever needs to
 * become more testable/explicit (Option B), only this file and the UI
 * event handlers change, the core functions (tokenize/buildIndex/search)
 * already take their data as parameters and don't know this state exists.
 */
let notes = [];
let editingNoteId = null; // null = not editing, 'new' = creating, otherwise an existing note's id

const listContainer = document.getElementById('note-list');
const editorContainer = document.getElementById('note-editor');
const newNoteBtn = document.getElementById('new-note-btn');

function refreshList() {
    renderNoteList(listContainer, notes, {
        onSelect: (id) => {
            editingNoteId = id;
            showEditor();
        },
        onDelete: (id) => {
            deleteNote(id);
            notes = getAllNotes();
            if (editingNoteId === id) {
                editingNoteId = null;
                hideEditor();
            }
            refreshList();
        },
    });
}

function showEditor() {
    editorContainer.classList.remove('hidden');
    const noteBeingEdited =
        editingNoteId && editingNoteId !== 'new'
            ? notes.find((n) => n.id === editingNoteId)
            : null;

    renderNoteEditor(editorContainer, noteBeingEdited, {
        onSave: ({ title, body }) => {
            if (!isValidNote({ title, body })) {
                alert('A note needs a title.');
                return;
            }

            if (noteBeingEdited) {
                saveNote(updateNote(noteBeingEdited, { title, body }));
            } else {
                saveNote(createNote({ title, body }));
            }

            notes = getAllNotes();
            editingNoteId = null;
            hideEditor();
            refreshList();
        },
        onCancel: () => {
            editingNoteId = null;
            hideEditor();
        },
    });
}

function hideEditor() {
    editorContainer.classList.add('hidden');
    editorContainer.innerHTML = '';
}

newNoteBtn.addEventListener('click', () => {
    editingNoteId = 'new';
    showEditor();
});

// Initial load
notes = getAllNotes();
refreshList();