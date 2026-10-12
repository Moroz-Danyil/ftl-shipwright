/**
 * The drag in progress on the canvas, if any, so that Esc (handled with the
 * other keys) can cancel it.
 */

let cancelActive: (() => void) | null = null;

/** Registers how to cancel the drag that just started; `null` when it ended. */
export function setGestureCancel(cancel: (() => void) | null): void {
  cancelActive = cancel;
}

/** Cancels the drag in progress; false when there is none. */
export function cancelGesture(): boolean {
  const cancel = cancelActive;
  if (!cancel) return false;
  cancelActive = null;
  cancel();
  return true;
}
