import { highlightSegments } from '../core/highlight.js';

/**
 * Renders a read-only view of a note with matched search terms
 * highlighted (yellow <mark>), plus:
 * - a "current of total" match indicator with up/down navigation buttons
 *   (and ArrowUp/ArrowDown support when the body has focus), the currently
 *   selected match gets a distinct orange highlight and is scrolled into
 *   view, same pattern as browser Ctrl+F.
 * - an Edit button that hands control back to the caller to switch into
 *   the editable textarea view. The current scroll position (as a
 *   fraction of scrollable height, not raw pixels, since the textarea's
 *   layout isn't guaranteed to be pixel-identical) is computed here and
 *   passed to onEdit so the caller can restore roughly the same reading
 *   position in edit mode.
 *
 * Deliberately read-only: highlighting live inside an editable <textarea>
 * isn't possible (textareas only render plain text), and the alternative
 * (a transparent textarea overlaid pixel-perfectly on a styled div) is
 * real complexity for little payoff in a single-user notes app.
 *
 * Uses textContent/createTextNode throughout, never innerHTML, so note
 * content (user-authored, could contain anything) can never be
 * interpreted as HTML.
 *
 * @param {HTMLElement} container
 * @param {object} note
 * @param {string[]} tokens - tokenized search query, used to find matches
 * @param {{ onEdit: (scrollFraction: number) => void }} handlers
 */
export function renderNoteViewer(container, note, tokens, { onEdit }) {
    container.innerHTML = '';

    const marks = []; // all <mark> elements, in document order (title first, then body)

    const titleEl = document.createElement('h2');
    titleEl.className = 'viewer-title';
    appendHighlighted(titleEl, note.title || '(untitled)', tokens, marks);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'viewer-body';
    bodyEl.tabIndex = 0; // focusable so ArrowUp/ArrowDown can navigate matches
    appendHighlighted(bodyEl, note.body, tokens, marks);

    const totalMatches = marks.length;
    let currentIndex = -1;

    function setActiveMatch(index) {
        if (totalMatches === 0) return;
        if (currentIndex >= 0) {
            marks[currentIndex].classList.remove('active-match');
        }
        currentIndex = ((index % totalMatches) + totalMatches) % totalMatches;
        const mark = marks[currentIndex];
        mark.classList.add('active-match');
        mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
        countLabel.textContent = `${currentIndex + 1} of ${totalMatches}`;
    }

    const subheader = document.createElement('div');
    subheader.className = 'editor-subheader';

    const matchNav = document.createElement('div');
    matchNav.className = 'match-nav';

    const countLabel = document.createElement('span');
    countLabel.className = 'match-count-badge';
    countLabel.textContent = totalMatches === 0 ? 'No matches' : `1 of ${totalMatches}`;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'match-nav-btn';
    prevBtn.textContent = '\u25B2'; // ▲
    prevBtn.title = 'Previous match';
    prevBtn.disabled = totalMatches === 0;
    prevBtn.addEventListener('click', () => setActiveMatch(currentIndex - 1));

    const nextBtn = document.createElement('button');
    nextBtn.className = 'match-nav-btn';
    nextBtn.textContent = '\u25BC'; // ▼
    nextBtn.title = 'Next match';
    nextBtn.disabled = totalMatches === 0;
    nextBtn.addEventListener('click', () => setActiveMatch(currentIndex + 1));

    matchNav.appendChild(countLabel);
    matchNav.appendChild(prevBtn);
    matchNav.appendChild(nextBtn);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'save-btn';
    editBtn.addEventListener('click', () => {
        const scrollable = bodyEl.scrollHeight - bodyEl.clientHeight;
        const scrollFraction = scrollable > 0 ? bodyEl.scrollTop / scrollable : 0;
        onEdit(scrollFraction);
    });

    subheader.appendChild(matchNav);
    subheader.appendChild(editBtn);

    container.appendChild(subheader);
    container.appendChild(titleEl);
    container.appendChild(bodyEl);

    if (totalMatches > 0) {
        setActiveMatch(0);
    }

    bodyEl.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveMatch(currentIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveMatch(currentIndex - 1);
        }
    });
}

function appendHighlighted(el, text, tokens, marksCollector) {
    for (const segment of highlightSegments(text, tokens)) {
        if (segment.highlighted) {
            const mark = document.createElement('mark');
            mark.textContent = segment.text;
            el.appendChild(mark);
            marksCollector.push(mark);
        } else {
            el.appendChild(document.createTextNode(segment.text));
        }
    }
}