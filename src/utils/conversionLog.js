// ── conversionLog ────────────────────────────────────────────────
// Records what happened on every conversion: how much parsed, what got
// flagged, and what a human changed afterwards. The learning loop that
// consumes this is not built yet, but the data has to exist by the time
// it is, otherwise there is nothing to learn the client's own patterns
// from. Capturing it from the first conversion is the whole point.
//
// Local only. This writes to localStorage, never to a vault or to SQL,
// so it stays inside V1's read-only boundary.
//
// Deliberately dumb: append a record, cap the buffer, read it back. No
// viewer, no export, no settings. Those belong with the loop that uses
// this, not here.

const KEY = "provisioningai-conversion-log";

// Enough history to see a pattern, small enough that localStorage's ~5MB
// budget is never the reason a workflow fails to save.
const MAX_ENTRIES = 500;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt or unreadable log must never block the conversion itself.
    return [];
  }
}

function write(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Quota or private-mode failures are not worth interrupting a user
    // mid-import over. Losing a log line is recoverable; losing their
    // pasted workflow is not.
  }
}

/**
 * Record one conversion.
 *
 * `source` names what produced the input (currently only 'paste-import').
 * `detail` carries the counts and, importantly, the exact text of every
 * line that could not be used - that unresolved text is the signal the
 * learning loop will actually need.
 */
export function logConversion(source, detail = {}) {
  const entry = {
    at: new Date().toISOString(),
    source,
    ...detail,
  };
  const entries = read();
  entries.push(entry);
  write(entries.slice(-MAX_ENTRIES));
  return entry;
}

/**
 * Record a human correcting something the conversion could not resolve.
 * This is the other half of the signal: not just what failed, but what a
 * person decided it should have been.
 */
export function logCorrection(detail = {}) {
  return logConversion("human-correction", detail);
}

/** Everything recorded so far, oldest first. */
export function readConversionLog() {
  return read();
}

/** Clears the log. Present so the data is the user's to discard. */
export function clearConversionLog() {
  write([]);
}
