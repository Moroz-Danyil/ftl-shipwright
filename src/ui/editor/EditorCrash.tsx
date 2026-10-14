/**
 * What the window shows when drawing the editor fails: a short message, the
 * error (selectable, to copy into a report) and two ways on. "Undo and
 * continue" undoes the last step and draws the editor again; "Back to the
 * start screen" closes the ship, as the logo in the top bar does. The error
 * is logged to the console too.
 */
import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { hasUnsavedChanges, useEditor } from "../../app/store";
import { useTexts } from "../../text";

/** The error as text: its stack when there is one (it starts with the message), else the message. */
function errorText(error: unknown): string {
  if (error instanceof Error) {
    const head = `${error.name}: ${error.message}`;
    return error.stack?.includes(error.message) ? error.stack : head;
  }
  return String(error);
}

function CrashScreen({ error, onContinue }: { error: unknown; onContinue: () => void }) {
  const texts = useTexts();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);

  const undoAndContinue = () => {
    useEditor.getState().undo();
    onContinue();
  };
  const backToStart = async () => {
    const state = useEditor.getState();
    if (
      hasUnsavedChanges(state) &&
      !(await state.askConfirm({ ...texts.topBar.confirmClose, danger: true }))
    )
      return;
    useEditor.getState().closeDocument();
  };

  return (
    <div className="ed-crash">
      <section className="dlg ed-crash-card" aria-labelledby="ed-crash-title">
        <h1 id="ed-crash-title" className="dlg-title">
          {texts.crash.title}
        </h1>
        <p className="dlg-message">{texts.crash.message}</p>
        <pre className="ed-crash-error" aria-label={texts.crash.errorLabel} tabIndex={0}>
          {errorText(error)}
        </pre>
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={() => void backToStart()}>
            {texts.crash.backToStart}
          </button>
          <button ref={first} type="button" className="btn btn--primary" onClick={undoAndContinue}>
            {texts.crash.undoAndContinue}
          </button>
        </div>
      </section>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  /** The error that stopped the editor; `undefined` while it works. */
  error?: { value: unknown };
}

/** Shows the crash screen in place of its children when drawing them throws. */
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(value: unknown): State {
    return { error: { value } };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("The editor stopped on an error:", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <CrashScreen error={error.value} onContinue={() => this.setState({ error: undefined })} />
    );
  }
}
