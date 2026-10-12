/**
 * Undo history of whole snapshots. Ships are immutable and share unchanged
 * parts, so keeping every state is cheap.
 */

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

/** How many steps can be undone. */
export const HISTORY_LIMIT = 200;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Makes `next` the present state; the redo steps are dropped. An unchanged state records nothing. */
export function record<T>(history: History<T>, next: T, limit = HISTORY_LIMIT): History<T> {
  if (next === history.present) return history;
  const past = [...history.past, history.present];
  return { past: past.slice(Math.max(0, past.length - limit)), present: next, future: [] };
}

export function undo<T>(history: History<T>): History<T> {
  if (history.past.length === 0) return history;
  const past = history.past.slice(0, -1);
  return {
    past,
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  if (history.future.length === 0) return history;
  const [present, ...future] = history.future;
  return { past: [...history.past, history.present], present, future };
}

export const canUndo = <T>(history: History<T>) => history.past.length > 0;
export const canRedo = <T>(history: History<T>) => history.future.length > 0;
