import { getSnippet, countMatches } from '../core/highlight.js';
import { appendHighlightedSegments } from './highlightRenderer.js';

/**
 * Renders the list of notes into a container element.
 * No framework, direct DOM manipulation, kept deliberately simple for MVP.
 *
 * When `tokens` is non-empty (an active search), each note's preview is a
 * snippet windowed around its first match (the "Google result" pattern),
 * with the matched term highlighted, instead of a blind first-80-characters
 * truncation. With no active search, it falls back to that plain leading
 * slice, there's no match to center on.
 *
 * Each note also gets a small badge next to its title showing its total
 * match count (title + body combined) when a search is active, so you can
 * tell at a glance which result is the strongest without opening it.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} notes
 * @param {{
 *   onSelect: (id: string) => void,
 *   onDelete: (id: string) => void,
 *   activeNoteId?: string|null,
 *   tokens?: string[]
 * }} handlers
 */
export function renderNoteList(container, notes, { onSelect, onDelete, activeNoteId = null, tokens = [] }) {
    container.innerHTML = '';

    if (notes.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'No notes yet. Create one to get started.';
        container.appendChild(empty);
        return;
    }

    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

    for (const note of sorted) {
        const item = document.createElement('div');
        item.className = note.id === activeNoteId ? 'note-item active' : 'note-item';
        item.dataset.noteId = note.id;

        const header = document.createElement('div');
        header.className = 'note-item-header';

        const title = document.createElement('h3');
        title.textContent = note.title || '(untitled)';
        header.appendChild(title);

        if (tokens.length > 0) {
            const matchCount = countMatches(note.title, tokens) + countMatches(note.body, tokens);
            const badge = document.createElement('span');
            badge.className = 'list-match-badge';
            badge.textContent = matchCount === 1 ? '1 match' : `${matchCount} matches`;
            badge.title = matchCount === 1 ? '1 match' : `${matchCount} matches`;
            header.appendChild(badge);
        }

        const preview = document.createElement('p');
        preview.className = 'note-preview';

        const snippet = getSnippet(note.body, tokens);
        if (snippet.truncatedStart) {
            preview.appendChild(document.createTextNode('…'));
        }
        appendHighlightedSegments(preview, snippet.segments);
        if (snippet.truncatedEnd) {
            preview.appendChild(document.createTextNode('…'));
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDelete(note.id);
        });

        item.appendChild(header);
        item.appendChild(preview);
        item.appendChild(deleteBtn);
        item.addEventListener('click', () => onSelect(note.id));

        container.appendChild(item);
    }
}