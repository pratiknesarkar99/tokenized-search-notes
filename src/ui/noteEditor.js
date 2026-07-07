/**
 * Renders the note editor form into a container element.
 * Handles both "create new" (note = null) and "edit existing" (note = object).
 *
 * Layout: a compact subheader (Save/Cancel) pinned above the title, then the
 * title input, then the body textarea filling all remaining vertical space.
 * The subheader living at the top instead of the bottom means it's always
 * visible without scrolling, and the textarea (not the surrounding container)
 * owns its own scroll region, so there's exactly one scrollbar, not two.
 *
 * @param {HTMLElement} container
 * @param {object|null} note
 * @param {{ onSave: (data: {title: string, body: string}) => void, onCancel: () => void }} handlers
 */
export function renderNoteEditor(container, note, { onSave, onCancel }) {
    container.innerHTML = '';

    const subheader = document.createElement('div');
    subheader.className = 'editor-subheader';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = note ? 'Save Changes' : 'Create Note';
    saveBtn.className = 'save-btn';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'cancel-btn';
    cancelBtn.addEventListener('click', onCancel);

    subheader.appendChild(saveBtn);
    subheader.appendChild(cancelBtn);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Title';
    titleInput.className = 'title-input';
    titleInput.value = note ? note.title : '';

    const bodyInput = document.createElement('textarea');
    bodyInput.placeholder = 'Write your note...';
    bodyInput.className = 'body-input';
    bodyInput.value = note ? note.body : '';

    saveBtn.addEventListener('click', () => {
        onSave({ title: titleInput.value, body: bodyInput.value });
    });

    container.appendChild(subheader);
    container.appendChild(titleInput);
    container.appendChild(bodyInput);

    titleInput.focus();
}