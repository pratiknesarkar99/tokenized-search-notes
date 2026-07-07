import { getAllNotes, saveNote, deleteNote } from './storage/notesRepository.js';
import { createNote, updateNote, isValidNote } from './models/note.js';
import { buildIndex } from './core/index.js';
import { search } from './core/search.js';
import { renderNoteList } from './ui/noteList.js';
import { renderNoteEditor } from './ui/noteEditor.js';
import { renderSearchBar } from './ui/searchBar.js';

/**
 * App state lives here as module-level variables. This is the "singleton"
 * approach we deliberately chose for MVP (Option A). If this ever needs to
 * become more testable/explicit (Option B), only this file and the UI
 * event handlers change, the core functions (tokenize/buildIndex/search)
 * already take their data as parameters and don't know this state exists.
 */
let notes = [];
let searchIndex = new Map();
let editingNoteId = null; // null = not editing, 'new' = creating, otherwise an existing note's id
let activeQuery = ''; // current search box contents, '' = no filter

const listContainer = document.getElementById('note-list');
const editorContainer = document.getElementById('note-editor');
const searchContainer = document.getElementById('search-bar');
const newNoteBtn = document.getElementById('new-note-btn');

/**
 * Rebuilds the index from the current notes array.
 * MVP approach: full rebuild on every mutation (create/edit/delete).
 * Fine at this scale (a few hundred notes rebuilds in single-digit ms).
 * Incremental updates are a documented future improvement, not a gap
 * we're pretending doesn't exist.
 */
function rebuildIndex() {
    searchIndex = buildIndex(notes);
}

function getVisibleNotes() {
    if (activeQuery.trim() === '') {
        return notes;
    }
    return search(activeQuery, searchIndex, notes).map((result) => result.note);
}

function refreshList() {
    renderNoteList(listContainer, getVisibleNotes(), {
        onSelect: (id) => {
            editingNoteId = id;
            showEditor();
        },
        onDelete: (id) => {
            deleteNote(id);
            notes = getAllNotes();
            rebuildIndex();
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
            rebuildIndex();
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

renderSearchBar(searchContainer, {
    onSearch: (query) => {
        activeQuery = query;
        refreshList();
    },
});

// Initial load
notes = getAllNotes();
rebuildIndex();
refreshList();