/**
 * The Shortcuts tab of Settings: the commands whose key can be changed, each
 * with its key and a reset button. Clicking a key waits for the new key
 * (Esc cancels); a key another command has is offered as a swap, a fixed key
 * is refused.
 */
import { useRef, useState, type KeyboardEvent } from "react";
import {
  DEFAULT_KEYS,
  REBINDABLE_COMMANDS,
  bindableKeysOfEvent,
  keyConflict,
  keyLabel,
  type CommandId,
  type RebindableCommand,
} from "../../app/keys";
import { useEditor } from "../../app/store";
import { useTexts, type Texts } from "../../text";
import { ResetIcon } from "../common/icons";

/** What a fixed command does, in the words of the refusal. */
function fixedAction(texts: Texts, command: CommandId): string {
  const actions = texts.shortcuts.fixedActions;
  if (command.startsWith("move")) return actions.move;
  if (command.startsWith("workspace.")) return actions.workspace;
  if (command.startsWith("mount.")) return actions.mount;
  if (command === "redo" || command === "save" || command === "cancel" || command === "pan")
    return actions[command];
  return actions.delete;
}

/** A key that cannot be given as it is: a swap to confirm, or a refusal. */
type Pending =
  | { kind: "taken"; command: RebindableCommand; keys: string; other: RebindableCommand }
  | { kind: "fixed"; command: RebindableCommand; keys: string; fixed: CommandId };

function ShortcutRow({
  command,
  capturing,
  pending,
  onCapture,
  onPending,
}: {
  command: RebindableCommand;
  capturing: boolean;
  pending: Pending | undefined;
  onCapture: (on: boolean) => void;
  onPending: (pending: Pending | undefined) => void;
}) {
  const texts = useTexts();
  const map = useEditor((s) => s.keys);
  const { setKey, resetKey } = useEditor.getState();
  const name = texts.shortcuts.names[command];
  const key = keyLabel(map[command]);
  const isDefault = map[command] === DEFAULT_KEYS[command];
  /** Set when a key press was taken, so its key-up does not press the button again. */
  const taken = useRef(false);
  const keyButton = useRef<HTMLButtonElement>(null);
  /** Esc in a conflict drops the new key and goes back to the key button. */
  const onConflictKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    onPending(undefined);
    keyButton.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!capturing) return;
    if (e.key === "Tab") return;
    e.preventDefault();
    e.stopPropagation();
    taken.current = true;
    if (e.code === "Escape" || e.key === "Escape") {
      onCapture(false);
      return;
    }
    const keys = bindableKeysOfEvent(e);
    if (!keys) return;
    onCapture(false);
    const conflict = keyConflict(map, command, keys);
    if (!conflict) setKey(command, keys);
    else if (conflict.kind === "fixed")
      onPending({ kind: "fixed", command, keys, fixed: conflict.command });
    else onPending({ kind: "taken", command, keys, other: conflict.command });
  };

  const shown = pending?.command === command ? pending : undefined;
  return (
    <li className="set-key-row">
      <span className="set-key-name">{name}</span>
      <button
        ref={keyButton}
        type="button"
        className={capturing ? "set-key set-key--capturing" : "set-key"}
        aria-label={capturing ? texts.shortcuts.capturing(name) : texts.shortcuts.change(name, key)}
        aria-pressed={capturing}
        onClick={() => {
          onPending(undefined);
          onCapture(!capturing);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => {
          if (!taken.current) return;
          taken.current = false;
          e.preventDefault();
        }}
        onBlur={() => capturing && onCapture(false)}
      >
        {capturing ? texts.shortcuts.pressKey : key}
      </button>
      <button
        type="button"
        className="btn btn--icon set-key-reset"
        aria-label={texts.shortcuts.reset(name, keyLabel(DEFAULT_KEYS[command]))}
        title={texts.shortcuts.reset(name, keyLabel(DEFAULT_KEYS[command]))}
        disabled={isDefault}
        onClick={() => {
          onPending(undefined);
          resetKey(command);
        }}
      >
        <ResetIcon />
      </button>
      {shown?.kind === "taken" && (
        <div className="set-key-conflict" role="alert" onKeyDown={onConflictKey}>
          <span>
            {texts.shortcuts.taken(keyLabel(shown.keys), texts.shortcuts.names[shown.other], key)}
          </span>
          <span className="set-key-actions">
            <button
              type="button"
              className="btn btn--small"
              autoFocus
              onClick={() => {
                setKey(command, shown.keys);
                onPending(undefined);
              }}
            >
              {texts.shortcuts.swap}
            </button>
            <button type="button" className="btn btn--small" onClick={() => onPending(undefined)}>
              {texts.common.cancel}
            </button>
          </span>
        </div>
      )}
      {shown?.kind === "fixed" && (
        <div className="set-key-conflict" role="alert" onKeyDown={onConflictKey}>
          {texts.shortcuts.fixed(keyLabel(shown.keys), fixedAction(texts, shown.fixed))}
        </div>
      )}
    </li>
  );
}

export function ShortcutsPanel() {
  const texts = useTexts();
  const changed = useEditor((s) => REBINDABLE_COMMANDS.some((c) => s.keys[c] !== DEFAULT_KEYS[c]));
  const [capturing, setCapturing] = useState<RebindableCommand>();
  const [pending, setPending] = useState<Pending>();
  const groups: Array<[string, RebindableCommand[]]> = [
    [texts.shortcuts.tools, REBINDABLE_COMMANDS.filter((c) => c.startsWith("tool."))],
    [texts.shortcuts.editing, REBINDABLE_COMMANDS.filter((c) => !c.startsWith("tool."))],
  ];
  return (
    <>
      <p className="set-hint">{texts.shortcuts.hint}</p>
      {groups.map(([title, commands]) => (
        <section key={title} className="set-key-group" aria-label={title}>
          <span className="set-label">{title}</span>
          <ul className="set-keys">
            {commands.map((command) => (
              <ShortcutRow
                key={command}
                command={command}
                capturing={capturing === command}
                pending={pending}
                onCapture={(on) => setCapturing(on ? command : undefined)}
                onPending={setPending}
              />
            ))}
          </ul>
        </section>
      ))}
      <p className="set-hint">{texts.shortcuts.fixedKeys}</p>
      <div>
        <button
          type="button"
          className="btn"
          disabled={!changed}
          onClick={() => {
            setPending(undefined);
            useEditor.getState().resetAllKeys();
          }}
        >
          {texts.shortcuts.resetAll}
        </button>
      </div>
    </>
  );
}
