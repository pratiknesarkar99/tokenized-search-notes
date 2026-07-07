/**
 * Renders a "search internals" panel that shows how the ranking was
 * actually computed for the current query: the tokenized query and,
 * per matching note, which tokens matched with what title/body frequency
 * breakdown, and the resulting weighted score.
 *
 * This exists purely as a portfolio/demo aid, it's not something a real
 * end user of a notes app would want visible by default. It's toggled
 * on/off and hidden by default.
 *
 * @param {HTMLElement} container
 * @param {{ tokens: string[], results: Array<{ note: object, score: number, matches: Array<{ token: string, titleFreq: number, bodyFreq: number }> }> }} explanation
 */
export function renderSearchInternals(container, explanation) {
    container.innerHTML = '';

    const { tokens, results } = explanation;

    if (tokens.length === 0) {
        const hint = document.createElement('p');
        hint.className = 'internals-hint';
        hint.textContent = 'Type a search query to see how ranking is computed.';
        container.appendChild(hint);
        return;
    }

    const tokenRow = document.createElement('div');
    tokenRow.className = 'internals-tokens';
    tokenRow.innerHTML =
        '<strong>Query tokens:</strong> ' +
        tokens.map((t) => `<code>${t}</code>`).join(' ');
    container.appendChild(tokenRow);

    if (results.length === 0) {
        const noMatch = document.createElement('p');
        noMatch.className = 'internals-hint';
        noMatch.textContent = 'No notes contain any of these tokens.';
        container.appendChild(noMatch);
        return;
    }

    const legend = document.createElement('p');
    legend.className = 'internals-hint';
    legend.textContent = 'Title matches are weighted 3x, body matches 1x.';
    container.appendChild(legend);

    const table = document.createElement('table');
    table.className = 'internals-table';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Note</th><th>Matched tokens (title×, body×)</th><th>Score</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const result of results) {
        const row = document.createElement('tr');

        const titleCell = document.createElement('td');
        titleCell.textContent = result.note.title || '(untitled)';

        const matchesCell = document.createElement('td');
        matchesCell.innerHTML = result.matches
            .map((m) => `<code>${m.token}</code>&nbsp;(title×${m.titleFreq}, body×${m.bodyFreq})`)
            .join(', ');

        const scoreCell = document.createElement('td');
        scoreCell.className = 'internals-score';
        scoreCell.textContent = result.score;

        row.appendChild(titleCell);
        row.appendChild(matchesCell);
        row.appendChild(scoreCell);
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    container.appendChild(table);
}