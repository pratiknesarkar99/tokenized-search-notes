import { highlightSegments } from '../core/highlight.js';
import { appendHighlightedSegments } from './highlightRenderer.js';

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
 * When `tokens` is non-empty (editing a note that was opened from an active
 * search), the body is rendered as a live highlight overlay: an invisible
 * textarea stacked on top of a visibly-highlighted div, so search terms
 * stay highlighted while you type, not just in the read-only preview. See
 * buildBodyField() below for how the two layers stay in sync. With no
 * tokens, it's just a plain textarea, no overlay overhead.
 *
 * @param {HTMLElement} container
 * @param {object|null} note
 * @param {string[]} tokens - tokenized search query, empty when not searching
 * @param {{ onSave: (data: {title: string, body: string}) => void, onCancel: () => void }} handlers
 */
export function renderNoteEditor(container, note, tokens, { onSave, onCancel }) {
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

    const { wrapper, bodyInput } = buildBodyField(note ? note.body : '', tokens);

    saveBtn.addEventListener('click', () => {
        onSave({ title: titleInput.value, body: bodyInput.value });
    });

    container.appendChild(subheader);
    container.appendChild(titleInput);
    container.appendChild(wrapper);

    titleInput.focus();
}

/**
 * Builds the body textarea, optionally with a live highlight overlay.
 *
 * The overlay technique: a transparent-text <textarea> is stacked exactly
 * on top of a visibly-highlighted <div> underneath. The textarea captures
 * all real typing/clicks/selection and shows only its caret (via
 * caret-color); the div shows the actual visible text with <mark>
 * highlights, recomputed on every keystroke. Both layers share identical
 * font, padding, line-height, and white-space handling (enforced in CSS,
 * see .body-input / .body-highlight-overlay), that's what keeps the
 * invisible caret aligned with the visible highlighted text beneath it.
 * Scroll position is synced one-way, textarea -> overlay, since only the
 * textarea is actually interactive.
 *
 * When there are no tokens (not editing from an active search), this
 * skips the overlay entirely and returns a plain textarea, no reason to
 * pay the extra DOM/sync overhead when there's nothing to highlight.
 */
function buildBodyField(bodyText, tokens) {
    const wrapper = document.createElement('div');
    wrapper.className = 'body-input-wrapper';

    const bodyInput = document.createElement('textarea');
    bodyInput.placeholder = 'Write your note...';
    bodyInput.value = bodyText;

    if (tokens.length === 0) {
        bodyInput.className = 'body-input';
        wrapper.appendChild(bodyInput);
        return { wrapper, bodyInput };
    }

    bodyInput.className = 'body-input body-input-overlay-mode';

    const overlay = document.createElement('div');
    overlay.className = 'body-highlight-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    function renderOverlay() {
        overlay.innerHTML = '';
        appendHighlightedSegments(overlay, highlightSegments(bodyInput.value, tokens));
    }

    bodyInput.addEventListener('input', renderOverlay);
    bodyInput.addEventListener('scroll', () => {
        overlay.scrollTop = bodyInput.scrollTop;
    });

    renderOverlay();

    wrapper.appendChild(overlay);
    wrapper.appendChild(bodyInput);
    return { wrapper, bodyInput };
}