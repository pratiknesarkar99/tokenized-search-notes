/**
 * Renders a debounced search input above the note list.
 * Calls onSearch(query) after the user stops typing for `delay` ms.
 * An empty query means "show all notes" and is handled by the caller.
 */
export function renderSearchBar(container, { onSearch, delay = 300 } = {}) {
    container.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search notes...';
    input.className = 'search-input';

    let debounceTimer = null;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            onSearch(input.value);
        }, delay);
    });

    container.appendChild(input);
}