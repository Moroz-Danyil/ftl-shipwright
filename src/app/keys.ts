/**
 * Keyboard shortcuts. The tool keys, Undo, Redo and Delete selected can be
 * changed in Settings; the other keys are fixed. Keys are named by their
 * position on the keyboard (`KeyZ` → `Z`), so they work the same with any
 * keyboard layout.
 */
import {
  WORKSPACES,
  WORKSPACE_TOOLS,
  workspaceKey,
  type ToolId,
  type WorkspaceId,
} from "./workspaces";

export type MoveDirection = "up" | "down" | "left" | "right";

export type CommandId =
  | "undo"
  | "redo"
  | "save"
  | "cancel"
  | "pan"
  | "delete"
  | `move.${MoveDirection}`
  | `moveFar.${MoveDirection}`
  | "mount.rotate"
  | "mount.mirror"
  | `workspace.${WorkspaceId}`
  | `tool.${ToolId}`;

export interface KeyBinding {
  /** Modifiers and key, e.g. `Ctrl+Shift+Z`, `1`, `Escape`, `Space`. */
  keys: string;
  command: CommandId;
}

/** The commands whose key can be changed. */
export type RebindableCommand = `tool.${ToolId}` | "undo" | "redo" | "delete";

/** The key of each command that can be changed. */
export type KeyMap = Record<RebindableCommand, string>;

/** The tools of all workspaces, each once, in the order the workspaces show them. */
const ALL_TOOLS: ToolId[] = [...new Set(WORKSPACES.flatMap((w) => WORKSPACE_TOOLS[w]))];

/** The commands that can be changed, in the order Settings lists them. */
export const REBINDABLE_COMMANDS: RebindableCommand[] = [
  ...ALL_TOOLS.map((tool) => `tool.${tool}` as const),
  "undo",
  "redo",
  "delete",
];

export const DEFAULT_KEYS: KeyMap = {
  "tool.select": "Q",
  "tool.room": "W",
  "tool.door": "E",
  "tool.station": "R",
  "tool.mount": "T",
  "tool.movePicture": "H",
  "tool.gib": "G",
  undo: "Ctrl+Z",
  redo: "Ctrl+Y",
  delete: "D",
};

/** The keys that cannot be changed. */
export const FIXED_BINDINGS: KeyBinding[] = [
  { keys: "Ctrl+Shift+Z", command: "redo" },
  { keys: "Ctrl+S", command: "save" },
  { keys: "Escape", command: "cancel" },
  { keys: "Space", command: "pan" },
  { keys: "Delete", command: "delete" },
  { keys: "Backspace", command: "delete" },
  { keys: "[", command: "mount.rotate" },
  { keys: "]", command: "mount.mirror" },
  ...(["Up", "Down", "Left", "Right"] as const).flatMap((d) => {
    const direction = d.toLowerCase() as MoveDirection;
    return [
      { keys: `Arrow${d}`, command: `move.${direction}` as const },
      { keys: `Shift+Arrow${d}`, command: `moveFar.${direction}` as const },
    ];
  }),
  ...WORKSPACES.map((w) => ({ keys: workspaceKey(w), command: `workspace.${w}` as const })),
];

/** All bindings: the chosen keys of the commands that can be changed, then the fixed keys. */
export function bindingsOf(keys: KeyMap): KeyBinding[] {
  return [
    ...REBINDABLE_COMMANDS.map((command) => ({ keys: keys[command], command })),
    ...FIXED_BINDINGS,
  ];
}

export const DEFAULT_BINDINGS: KeyBinding[] = bindingsOf(DEFAULT_KEYS);

export type KeyEventLike = Pick<
  KeyboardEvent,
  "code" | "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey"
>;

const CODE_NAMES: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
  Space: "Space",
  Escape: "Escape",
  Delete: "Delete",
  Backspace: "Backspace",
  Enter: "Enter",
  Tab: "Tab",
  Insert: "Insert",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
};

const F_KEY = /^F([1-9]|1[0-9]|2[0-4])$/;
const ARROW = /^Arrow(Up|Down|Left|Right)$/;

/** The name of a key by its position, if it has one (letters, digits, F-keys, signs, named keys). */
function positionName(code: string): string | undefined {
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  m = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  if (m) return m[1];
  if (F_KEY.test(code) || ARROW.test(code)) return code;
  return CODE_NAMES[code];
}

/** The key's name: by its position when it has one, else the key itself. */
export function keyName(event: Pick<KeyboardEvent, "code" | "key">): string {
  const named = positionName(event.code ?? "");
  if (named) return named;
  const key = event.key ?? "";
  if (key === " ") return "Space";
  return key.length === 1 ? key.toUpperCase() : key;
}

/** The event as written in a binding, e.g. `Ctrl+Shift+Z`. Cmd on a Mac counts as Ctrl. */
export function keysOfEvent(event: KeyEventLike): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(keyName(event));
  return parts.join("+");
}

export function commandForEvent(
  event: KeyEventLike,
  bindings: KeyBinding[] = DEFAULT_BINDINGS
): CommandId | undefined {
  const keys = keysOfEvent(event);
  return bindings.find((b) => b.keys === keys)?.command;
}

/** Keys that close dialogs, press buttons or move the focus; they are never given to a command. */
const UNBINDABLE = new Set(["Escape", "Enter", "Tab"]);

/** True for a key name that can be bound (a key with a known position, other than Esc, Enter, Tab). */
function bindableName(name: string): boolean {
  if (UNBINDABLE.has(name)) return false;
  return (
    /^[A-Z0-9]$/.test(name) ||
    F_KEY.test(name) ||
    ARROW.test(name) ||
    Object.values(CODE_NAMES).includes(name)
  );
}

/**
 * The keys a key press would be bound to, or undefined when it cannot be
 * bound: a modifier alone, a key without a known position, Esc, Enter or Tab.
 */
export function bindableKeysOfEvent(event: KeyEventLike): string | undefined {
  const name = positionName(event.code ?? "");
  if (!name || !bindableName(name)) return undefined;
  return keysOfEvent(event);
}

/** True for keys, written as in a binding, that could be given to a command. */
export function isBindableKeys(keys: unknown): keys is string {
  if (typeof keys !== "string") return false;
  const m = /^(?:Ctrl\+)?(?:Alt\+)?(?:Shift\+)?(.+)$/.exec(keys);
  return m !== null && bindableName(m[1]);
}

/** The fixed command on these keys, if any. */
export function fixedCommandOf(keys: string): CommandId | undefined {
  return FIXED_BINDINGS.find((b) => b.keys === keys)?.command;
}

/** Why keys cannot simply be given to a command: they are fixed, or another command has them. */
export type KeyConflict =
  { kind: "fixed"; command: CommandId } | { kind: "taken"; command: RebindableCommand };

export function keyConflict(
  map: KeyMap,
  command: RebindableCommand,
  keys: string
): KeyConflict | undefined {
  const fixed = fixedCommandOf(keys);
  if (fixed) return { kind: "fixed", command: fixed };
  const other = REBINDABLE_COMMANDS.find((c) => c !== command && map[c] === keys);
  return other ? { kind: "taken", command: other } : undefined;
}

/**
 * Gives keys to a command. A command that had them gets the command's old
 * keys in exchange; fixed keys are refused (the map comes back unchanged).
 */
export function rebind(map: KeyMap, command: RebindableCommand, keys: string): KeyMap {
  const conflict = keyConflict(map, command, keys);
  if (conflict?.kind === "fixed" || map[command] === keys) return map;
  const next = { ...map, [command]: keys };
  if (conflict) next[conflict.command] = map[command];
  return next;
}

/** The commands whose keys differ from the default ones, with their keys. */
export function changedKeys(map: KeyMap): Partial<KeyMap> {
  return Object.fromEntries(
    REBINDABLE_COMMANDS.filter((c) => map[c] !== DEFAULT_KEYS[c]).map((c) => [c, map[c]])
  );
}

/**
 * The key map from remembered changes. Unknown commands, keys that cannot be
 * bound and fixed keys are ignored; when two commands would end up with the
 * same keys, the default keys are used.
 */
export function keyMapFrom(changes: unknown): KeyMap {
  const map = { ...DEFAULT_KEYS };
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return map;
  for (const [command, keys] of Object.entries(changes)) {
    if (!(REBINDABLE_COMMANDS as string[]).includes(command)) continue;
    if (!isBindableKeys(keys) || fixedCommandOf(keys)) continue;
    map[command as RebindableCommand] = keys;
  }
  const used = REBINDABLE_COMMANDS.map((c) => map[c]);
  return new Set(used).size === used.length ? map : { ...DEFAULT_KEYS };
}

const KEY_LABELS: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  Delete: "Del",
  PageUp: "PgUp",
  PageDown: "PgDn",
};

/** How keys are shown: `Ctrl+Z`, `Q`, `Shift+↑`. */
export function keyLabel(keys: string): string {
  return keys
    .split("+")
    .map((part) => KEY_LABELS[part] ?? part)
    .join("+");
}

/** True for elements that take typed text, where single keys must not run commands. */
export function isTextField(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== "string") return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag !== "input") return false;
  const type = ((el as HTMLInputElement).type || "text").toLowerCase();
  return !["button", "checkbox", "radio", "range", "color", "submit", "reset"].includes(type);
}
