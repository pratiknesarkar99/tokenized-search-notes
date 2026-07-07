/**
 * Renders the note editor form into a container element.
 * Handles both "create new" (note = null) and "edit existing" (note = object).
 *
 * @param {HTMLElement} container
 * @param {object|null} note
 * @param {{ onSave: (data: {title: string, body: string}) => void, onCancel: () => void }} handlers
 */
export function renderNoteEditor(container, note, { onSave, onCancel }) {
    container.innerHTML = '';

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Title';
    titleInput.className = 'title-input';
    titleInput.value = note ? note.title : '';

    const bodyInput = document.createElement('textarea');
    bodyInput.placeholder = 'Write your note...';
    bodyInput.className = 'body-input';
    bodyInput.value = note ? note.body : '';
    bodyInput.rows = 10;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = note ? 'Save Changes' : 'Create Note';
    saveBtn.className = 'save-btn';
    saveBtn.addEventListener('click', () => {
        onSave({ title: titleInput.value, body: bodyInput.value });
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'cancel-btn';
    cancelBtn.addEventListener('click', onCancel);

    const buttonRow = document.createElement('div');
    buttonRow.className = 'button-row';
    buttonRow.appendChild(saveBtn);
    buttonRow.appendChild(cancelBtn);

    container.appendChild(titleInput);
    container.appendChild(bodyInput);
    container.appendChild(buttonRow);

    titleInput.focus();
}