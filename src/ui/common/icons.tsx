/** Small line icons drawn with the current text color. */
import type { ToolId } from "../../app/workspaces";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path
        d="M4 14 L10 7 H20 L25 14 L20 21 H10 Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <circle cx="15" cy="14" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

export function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 4 L2 8 L6 12 M2 8 H10 A4 4 0 0 1 10 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10 4 L14 8 L10 12 M14 8 H6 A4 4 0 0 0 6 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M7 1 L13 12 H1 Z M7 5 V8 M7 10 V10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3 3 L4.5 4.5 M11.5 11.5 L13 13 M13 3 L11.5 4.5 M4.5 11.5 L3 13"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M2 6 H9 L11 8 H20 V18 H2 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** A plain hull outline, shown where a ship has no icon picture. */
export function HullIcon() {
  return (
    <svg width="34" height="18" viewBox="0 0 34 18" aria-hidden="true">
      <path
        d="M2 9 L8 3 H26 L32 9 L26 15 H8 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Points right when folded; the open state turns it to point down. */
export function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** An arrow pointing up (earlier) or down (later). */
export function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d={
          direction === "up"
            ? "M6 10.5 V2 M2.5 5.5 L6 2 L9.5 5.5"
            : "M6 1.5 V10 M2.5 6.5 L6 10 L9.5 6.5"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function CrossIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 2 L10 10 M10 2 L2 10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const TOOL_PATHS: Record<ToolId, string> = {
  select: "M6 3 V16 L9.2 12.8 L11.6 18 L13.6 17.1 L11.2 11.9 H15.5 Z",
  room: "M3 4 H17 V16 H3 Z M10 4 V16 M3 10 H10",
  door: "M2 10 H6.5 M13.5 10 H18 M6.5 7.5 H13.5 V12.5 H6.5 Z",
  station: "M10 3.5 A2.5 2.5 0 1 1 9.99 3.5 Z M5 17 C5 11.5 15 11.5 15 17 M7 14.5 L4 12",
  movePicture:
    "M10 2 V18 M2 10 H18 M7.5 4.5 L10 2 L12.5 4.5 M7.5 15.5 L10 18 L12.5 15.5 M4.5 7.5 L2 10 L4.5 12.5 M15.5 7.5 L18 10 L15.5 12.5",
  mount: "M10 4 A6 6 0 1 1 9.99 4 Z M10 1.5 V6 M10 14 V18.5 M1.5 10 H6 M14 10 H18.5",
  gib: "M3 6 L8.5 3.5 L9.5 9 L4 10.5 Z M11.5 10.5 L17 9 L17.5 15.5 L12 16.5 Z M5 15 L7 13 M14 4 L15.5 6",
};

/** The line icon of a tool on the tool rail. */
export function ToolIcon({ tool }: { tool: ToolId }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={TOOL_PATHS[tool]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
