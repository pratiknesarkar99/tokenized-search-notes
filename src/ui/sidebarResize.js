/**
 * Makes the sidebar resizable by dragging a handle, and persists the
 * chosen width across sessions.
 *
 * Deliberately kept separate from notesRepository.js, this is a UI
 * layout preference, not note domain data, so it doesn't belong in the
 * same storage abstraction. Simple direct localStorage use is fine here.
 *
 * Default width: 30% of the viewport width on first load (no stored
 * preference yet). Clamped between MIN_WIDTH and a max ratio of the
 * viewport so the sidebar can never swallow the whole window or shrink
 * to nothing.
 */

const STORAGE_KEY = 'notes-app:sidebarWidth';
const MIN_WIDTH = 220;
const MAX_WIDTH_RATIO = 0.6;
const DEFAULT_WIDTH_RATIO = 0.3;

export function initSidebarResize(sidebar, handle) {
    const maxWidth = () => window.innerWidth * MAX_WIDTH_RATIO;

    function applyWidth(width) {
        const clamped = Math.min(Math.max(width, MIN_WIDTH), maxWidth());
        sidebar.style.width = `${clamped}px`;
        return clamped;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    const initialWidth = stored ? parseFloat(stored) : window.innerWidth * DEFAULT_WIDTH_RATIO;
    applyWidth(initialWidth);

    let dragging = false;

    handle.addEventListener('mousedown', (e) => {
        dragging = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // avoid selecting text while dragging
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const newWidth = applyWidth(e.clientX);
        localStorage.setItem(STORAGE_KEY, String(newWidth));
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}