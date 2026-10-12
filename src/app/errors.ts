/** A readable reason from whatever was thrown (Tauri commands reject with plain strings). */
export function reasonOf(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}
