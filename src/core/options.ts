/** Formatting options shared by all writers. */
export interface WriteOptions {
  /** Line ending. Default `'\n'` (vanilla files use `'\r\n'`; the game reads both). */
  lineEnding?: "\n" | "\r\n";
  /** Indentation unit for XML output. Default one tab, as in vanilla files. */
  indent?: string;
}

export function resolveWriteOptions(options: WriteOptions | undefined): Required<WriteOptions> {
  return {
    lineEnding: options?.lineEnding ?? "\n",
    indent: options?.indent ?? "\t",
  };
}
