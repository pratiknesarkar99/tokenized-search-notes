/**
 * Appends highlight segments (from highlightSegments/getSnippet) to a DOM
 * element as real text nodes and <mark> elements. Never uses innerHTML,
 * so note content (user-authored, could contain anything) can never be
 * interpreted as HTML.
 *
 * Shared by noteViewer.js (full-note highlighting) and noteList.js
 * (sidebar snippet highlighting) so there's one place that does this,
 * not two copies that could drift.
 *
 * @param {HTMLElement} el
 * @param {Array<{ text: string, highlighted: boolean }>} segments
 */
export function appendHighlightedSegments(el, segments) {
    for (const segment of segments) {
        if (segment.highlighted) {
            const mark = document.createElement('mark');
            mark.textContent = segment.text;
            el.appendChild(mark);
        } else {
            el.appendChild(document.createTextNode(segment.text));
        }
    }
}