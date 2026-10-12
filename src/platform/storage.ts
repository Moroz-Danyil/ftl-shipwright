/**
 * Small values kept between runs (`localStorage`). Every access is guarded:
 * storage may be missing or refuse writes, and then nothing is remembered.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Reads a JSON value; `undefined` when absent or unreadable. */
export function readStored<T>(key: string, store = defaultStore()): T | undefined {
  try {
    const raw = store?.getItem(key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

/** Writes a JSON value, or removes the key when the value is `undefined`. */
export function writeStored(key: string, value: unknown, store = defaultStore()): void {
  try {
    if (value === undefined) store?.removeItem(key);
    else store?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage refused the write; the value is simply not remembered.
  }
}
