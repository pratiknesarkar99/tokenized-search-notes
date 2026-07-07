import { getAllNotes, saveNote, deleteNote } from './storage/notesRepository.js';
import { createNote, updateNote, isValidNote } from './models/note.js';
import { buildIndex } from './core/index.js';
import { search, explainSearch } from './core/search.js';
import { tokenize } from './core/tokenizer.js';
import { renderNoteList } from './ui/noteList.js';
import { renderNoteEditor } from './ui/noteEditor.js';
import { renderNoteViewer } from './ui/noteViewer.js';
import { renderSearchBar } from './ui/searchBar.js';
import { renderSearchInternals } from './ui/searchInternals.js';
import { initSidebarResize } from './ui/sidebarResize.js';

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
let viewMode = 'edit'; // 'edit' or 'preview'. preview = read-only + highlighted, only used for existing notes opened from an active search
let activeQuery = ''; // current search box contents, '' = no filter
let internalsVisible = false; // "search internals" demo panel, off by default
let pendingScrollFraction = null; // set when switching preview -> edit, applied to the new textarea once rendered

const listContainer = document.getElementById('note-list');
const editorContainer = document.getElementById('note-editor');
const emptyStateEl = document.getElementById('empty-state');
const searchContainer = document.getElementById('search-bar');
const internalsContainer = document.getElementById('search-internals');
const internalsToggleBtn = document.getElementById('internals-toggle-btn');
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

function refreshInternalsPanel() {
    if (!internalsVisible) return;
    const explanation = explainSearch(activeQuery, searchIndex, notes);
    renderSearchInternals(internalsContainer, explanation);
}

function refreshList() {
    renderNoteList(listContainer, getVisibleNotes(), {
        activeNoteId: editingNoteId,
        tokens: tokenize(activeQuery),
        onSelect: (id) => {
            editingNoteId = id;
            viewMode = activeQuery.trim() !== '' ? 'preview' : 'edit';
            showActiveNote();
            refreshList();
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
            refreshInternalsPanel();
        },
    });
}

function showActiveNote() {
    editorContainer.classList.remove('hidden');
    emptyStateEl.classList.add('hidden');

    const isNewNote = editingNoteId === 'new';
    const noteBeingEdited = editingNoteId && !isNewNote
        ? notes.find((n) => n.id === editingNoteId)
        : null;

    if (!isNewNote && viewMode === 'preview' && noteBeingEdited) {
        const tokens = tokenize(activeQuery);
        renderNoteViewer(editorContainer, noteBeingEdited, tokens, {
            onEdit: (scrollFraction) => {
                viewMode = 'edit';
                pendingScrollFraction = scrollFraction;
                showActiveNote();
            },
        });
        return;
    }

    renderNoteEditor(editorContainer, noteBeingEdited, tokenize(activeQuery), {
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
            refreshInternalsPanel();
        },
        onCancel: () => {
            editingNoteId = null;
            hideEditor();
            refreshList();
        },
    });

    if (pendingScrollFraction !== null) {
        const textarea = editorContainer.querySelector('.body-input');
        if (textarea) {
            const scrollable = textarea.scrollHeight - textarea.clientHeight;
            textarea.scrollTop = pendingScrollFraction * scrollable;
        }
        pendingScrollFraction = null;
    }
}

function hideEditor() {
    editorContainer.classList.add('hidden');
    editorContainer.innerHTML = '';
    emptyStateEl.classList.remove('hidden');
}

newNoteBtn.addEventListener('click', () => {
    editingNoteId = 'new';
    viewMode = 'edit';
    showActiveNote();
});

renderSearchBar(searchContainer, {
    onSearch: (query) => {
        activeQuery = query;
        refreshList();

        // If the query matches nothing, an existing open note is no longer
        // part of the result set, keeping it open is misleading (it looks
        // like it's still "in" the search). Clear it back to the empty state.
        // Scoped to existing notes only, an in-progress "new note" draft is
        // left alone so a zero-match search doesn't silently discard unsaved
        // input.
        const hasResults = getVisibleNotes().length > 0;
        const isEditingExistingNote = editingNoteId && editingNoteId !== 'new';
        if (query.trim() !== '' && !hasResults && isEditingExistingNote) {
            editingNoteId = null;
            hideEditor();
            refreshList();
        } else if (isEditingExistingNote && viewMode === 'preview') {
            // Query changed but the note still matches (or user is still typing),
            // re-render so the highlighted terms stay in sync with the box.
            showActiveNote();
        }

        refreshInternalsPanel();
    },
});

internalsToggleBtn.addEventListener('click', () => {
    internalsVisible = !internalsVisible;
    internalsToggleBtn.textContent = internalsVisible
        ? 'Hide search internals'
        : 'Show search internals';
    internalsContainer.classList.toggle('hidden', !internalsVisible);
    refreshInternalsPanel();
});

// Initial load
notes = getAllNotes();
rebuildIndex();
refreshList();

initSidebarResize(document.getElementById('sidebar'), document.getElementById('resize-handle'));