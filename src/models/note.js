
/**
 * Note model: a plain data factory, no class, no framework dependency.
 *
 * Shape: { id, title, body, createdAt, updatedAt }
 *
 * Kept intentionally flat. No tags, no nested structures, per the earlier
 * scoping decision (tags/backlinks explicitly out of scope for this project).
 */

export function createNote({ title = '', body = '' } = {}) {
    const now = Date.now();
    return {
        id: crypto.randomUUID(),
        title: title.trim(),
        body,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Returns an updated copy of a note with a fresh updatedAt timestamp.
 * Never mutates the original note object.
 */
export function updateNote(note, { title, body }) {
    return {
        ...note,
        title: title !== undefined ? title.trim() : note.title,
        body: body !== undefined ? body : note.body,
        updatedAt: Date.now(),
    };
}

/**
 * A note is valid if it has a non-empty title after trimming.
 * Empty body is allowed (a note can be "just a title" as a placeholder).
 */
export function isValidNote(note) {
    return typeof note.title === 'string' && note.title.trim().length > 0;
}