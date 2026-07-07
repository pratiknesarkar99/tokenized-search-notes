/**
 * Renders the list of notes into a container element.
 * No framework, direct DOM manipulation, kept deliberately simple for MVP.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} notes
 * @param {{ onSelect: (id: string) => void, onDelete: (id: string) => void }} handlers
 */
export function renderNoteList(container, notes, { onSelect, onDelete }) {
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
        item.className = 'note-item';
        item.dataset.noteId = note.id;

        const title = document.createElement('h3');
        title.textContent = note.title || '(untitled)';

        const preview = document.createElement('p');
        preview.className = 'note-preview';
        preview.textContent = note.body.slice(0, 80);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDelete(note.id);
        });

        item.appendChild(title);
        item.appendChild(preview);
        item.appendChild(deleteBtn);
        item.addEventListener('click', () => onSelect(note.id));

        container.appendChild(item);
    }
}