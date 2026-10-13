/**
 * Keyboard shortcuts, all in one table so they can be made configurable.
 * Keys are named by their position on the keyboard (`KeyZ` → `Z`), so they
 * work the same with any keyboard layout.
 */
import { TOOL_KEYS, WORKSPACES, workspaceKey, type ToolId, type WorkspaceId } from "./workspaces";

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

export const DEFAULT_BINDINGS: KeyBinding[] = [
  { keys: "Ctrl+Z", command: "undo" },
  { keys: "Ctrl+Shift+Z", command: "redo" },
  { keys: "Ctrl+Y", command: "redo" },
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
  ...(Object.entries(TOOL_KEYS) as Array<[ToolId, string]>).map(([tool, key]) => ({
    keys: key,
    command: `tool.${tool}` as const,
  })),
];

export type KeyEventLike = Pick<
  KeyboardEvent,
  "code" | "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey"
>;

const CODE_NAMES: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Space: "Space",
  Escape: "Escape",
  Delete: "Delete",
  Backspace: "Backspace",
  Enter: "Enter",
};

/** The key's name: a letter or digit by its position, else a named key. */
export function keyName(event: Pick<KeyboardEvent, "code" | "key">): string {
  const code = event.code ?? "";
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  m = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  if (m) return m[1];
  if (CODE_NAMES[code]) return CODE_NAMES[code];
  if (/^Arrow/.test(code)) return code;
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
