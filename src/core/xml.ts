/**
 * A small, tolerant XML reader and a few writing helpers.
 *
 * FTL data files are "XML-ish": they may have no root element, several
 * top-level elements, comments containing `--`, and stray text. A strict
 * parser rejects many of them, so this module implements just what the ship
 * files need:
 *
 * - elements with attributes (single or double quotes), text, comments,
 *   CDATA, processing instructions and `<!DOCTYPE>` (the last two are skipped);
 * - every element remembers its source range, so unknown elements can be
 *   copied back verbatim;
 * - mismatched or missing closing tags never throw: a closing tag closes the
 *   nearest open element with that name, stray closing tags are ignored and
 *   elements still open at the end of the input are closed there.
 */

export interface XmlElement {
  type: "element";
  name: string;
  /** Attribute values, entity-decoded. Insertion order = source order. */
  attributes: Record<string, string>;
  children: XmlNode[];
  /** Offset of the `<` that opens the element. */
  start: number;
  /** Offset just past the element's last character (`>` of the end tag). */
  end: number;
}

export interface XmlText {
  type: "text";
  /** Entity-decoded text. */
  text: string;
}

export interface XmlComment {
  type: "comment";
  text: string;
}

export type XmlNode = XmlElement | XmlText | XmlComment;

const NAME_START = /[A-Za-z_:À-￿]/;
const NAME_CHAR = /[A-Za-z0-9_:.\-·À-￿]/;

const NAMED_ENTITIES: Record<string, string> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
};

/** Decodes the five predefined entities and numeric character references. Unknown entities are left as they are. */
export function decodeEntities(s: string): string {
  if (!s.includes("&")) return s;
  return s.replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z]+);/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) return String.fromCodePoint(code);
      return whole;
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

/** Escapes text content. */
export function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escapes an attribute value for use inside double quotes. */
export function escapeAttribute(s: string): string {
  return escapeText(s).replace(/"/g, "&quot;");
}

/**
 * Parses an XML document or fragment into a list of top-level nodes.
 * Never throws on malformed input; see the module comment for the rules.
 */
export function parseXml(src: string): XmlNode[] {
  const root: XmlNode[] = [];
  const stack: XmlElement[] = [];
  const childrenOf = (): XmlNode[] => (stack.length ? stack[stack.length - 1].children : root);
  let i = 0;
  const n = src.length;

  const pushText = (raw: string) => {
    if (raw.length === 0) return;
    const list = childrenOf();
    const text = decodeEntities(raw);
    const last = list[list.length - 1];
    if (last && last.type === "text") last.text += text;
    else list.push({ type: "text", text });
  };

  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) {
      pushText(src.slice(i));
      break;
    }
    if (lt > i) pushText(src.slice(i, lt));
    i = lt;

    if (src.startsWith("<!--", i)) {
      const close = src.indexOf("-->", i + 4);
      const stop = close < 0 ? n : close;
      childrenOf().push({ type: "comment", text: src.slice(i + 4, stop) });
      i = close < 0 ? n : close + 3;
      continue;
    }
    if (src.startsWith("<![CDATA[", i)) {
      const close = src.indexOf("]]>", i + 9);
      const stop = close < 0 ? n : close;
      const list = childrenOf();
      const text = src.slice(i + 9, stop);
      const last = list[list.length - 1];
      if (last && last.type === "text") last.text += text;
      else list.push({ type: "text", text });
      i = close < 0 ? n : close + 3;
      continue;
    }
    if (src.startsWith("<?", i)) {
      const close = src.indexOf("?>", i + 2);
      i = close < 0 ? n : close + 2;
      continue;
    }
    if (src.startsWith("<!", i)) {
      const close = src.indexOf(">", i + 2);
      i = close < 0 ? n : close + 1;
      continue;
    }
    if (src[i + 1] === "/") {
      // Closing tag.
      let j = i + 2;
      while (j < n && NAME_CHAR.test(src[j])) j++;
      const name = src.slice(i + 2, j);
      const close = src.indexOf(">", j);
      const after = close < 0 ? n : close + 1;
      let k = stack.length - 1;
      while (k >= 0 && stack[k].name !== name) k--;
      if (k >= 0) {
        // Elements opened inside it and never closed end where it ends.
        while (stack.length > k) {
          const el = stack.pop()!;
          el.end = after;
        }
      }
      i = after;
      continue;
    }
    if (i + 1 < n && NAME_START.test(src[i + 1])) {
      // Opening tag.
      let j = i + 1;
      while (j < n && NAME_CHAR.test(src[j])) j++;
      const el: XmlElement = {
        type: "element",
        name: src.slice(i + 1, j),
        attributes: {},
        children: [],
        start: i,
        end: n,
      };
      let selfClosing = false;
      // Attributes.
      for (;;) {
        while (j < n && /\s/.test(src[j])) j++;
        if (j >= n) break;
        if (src[j] === ">") {
          j++;
          break;
        }
        if (src[j] === "/" && src[j + 1] === ">") {
          selfClosing = true;
          j += 2;
          break;
        }
        if (src[j] === "/") {
          j++;
          continue;
        }
        const a0 = j;
        while (j < n && !/[\s=>/]/.test(src[j])) j++;
        const attrName = src.slice(a0, j);
        while (j < n && /\s/.test(src[j])) j++;
        let value = "";
        if (src[j] === "=") {
          j++;
          while (j < n && /\s/.test(src[j])) j++;
          const q = src[j];
          if (q === '"' || q === "'") {
            const close = src.indexOf(q, j + 1);
            const stop = close < 0 ? n : close;
            value = src.slice(j + 1, stop);
            j = close < 0 ? n : close + 1;
          } else {
            const v0 = j;
            while (j < n && !/[\s>]/.test(src[j]) && !(src[j] === "/" && src[j + 1] === ">")) j++;
            value = src.slice(v0, j);
          }
        }
        if (attrName.length > 0 && !(attrName in el.attributes)) {
          el.attributes[attrName] = decodeEntities(value);
        }
        if (j === a0) j++; // a stray character: skip it so the loop always advances
      }
      childrenOf().push(el);
      if (selfClosing) el.end = j;
      else stack.push(el);
      i = j;
      continue;
    }
    // A lone '<' that starts nothing: keep it as text.
    pushText("<");
    i++;
  }
  // Unclosed elements end at the end of the input (their `end` is already n).
  return root;
}

/** Child elements of a node list (optionally only those with a given name). */
export function elements(nodes: XmlNode[], name?: string): XmlElement[] {
  const out: XmlElement[] = [];
  for (const node of nodes) {
    if (node.type === "element" && (name === undefined || node.name === name)) out.push(node);
  }
  return out;
}

/** First child element with the given name. */
export function firstElement(nodes: XmlNode[], name: string): XmlElement | undefined {
  for (const node of nodes) {
    if (node.type === "element" && node.name === name) return node;
  }
  return undefined;
}

/**
 * True for Slipstream's advanced-append instruction elements (`<mod:findName>`,
 * `<mod-append:x>`, `<mod-overwrite:x>`, ...). They describe edits, not
 * definitions, so readers skip them together with their content.
 */
export function isModInstruction(name: string): boolean {
  return /^mod(-[A-Za-z]+)?:/.test(name);
}

/**
 * All elements with the given name at any depth, in document order. Does not
 * descend into a match, and skips Slipstream `mod:` instruction elements.
 */
export function findElementsDeep(nodes: XmlNode[], name: string): XmlElement[] {
  const out: XmlElement[] = [];
  const visit = (list: XmlNode[]) => {
    for (const node of list) {
      if (node.type !== "element" || isModInstruction(node.name)) continue;
      if (node.name === name) out.push(node);
      else visit(node.children);
    }
  };
  visit(nodes);
  return out;
}

/** The nodes without Slipstream `mod:` instruction elements, at every depth. Returns new arrays; elements are copied only when a child was removed. */
export function stripModInstructions(nodes: XmlNode[]): XmlNode[] {
  const out: XmlNode[] = [];
  for (const node of nodes) {
    if (node.type !== "element") {
      out.push(node);
      continue;
    }
    if (isModInstruction(node.name)) continue;
    const children = stripModInstructions(node.children);
    out.push(
      children.length === node.children.length && children.every((c, i) => c === node.children[i])
        ? node
        : { ...node, children }
    );
  }
  return out;
}

/** Concatenated text content of an element's direct text children (no trimming). */
export function textOf(el: XmlElement): string {
  let s = "";
  for (const c of el.children) if (c.type === "text") s += c.text;
  return s;
}

/**
 * Tiny builder for indented XML output. Lines are collected and joined with
 * the chosen line ending at the end.
 */
export class XmlWriter {
  private readonly lines: string[] = [];

  constructor(private readonly indentUnit: string) {}

  private pad(level: number): string {
    return this.indentUnit.repeat(level);
  }

  /** `<name a="1" b="2"/>` */
  empty(
    level: number,
    name: string,
    attrs: Array<[string, string | number | boolean | undefined]> = []
  ): void {
    this.lines.push(`${this.pad(level)}<${name}${formatAttributes(attrs)}/>`);
  }

  /** `<name a="1">text</name>` */
  textElement(
    level: number,
    name: string,
    text: string,
    attrs: Array<[string, string | number | boolean | undefined]> = []
  ): void {
    this.lines.push(
      `${this.pad(level)}<${name}${formatAttributes(attrs)}>${escapeText(text)}</${name}>`
    );
  }

  open(
    level: number,
    name: string,
    attrs: Array<[string, string | number | boolean | undefined]> = []
  ): void {
    this.lines.push(`${this.pad(level)}<${name}${formatAttributes(attrs)}>`);
  }

  close(level: number, name: string): void {
    this.lines.push(`${this.pad(level)}</${name}>`);
  }

  /** A pre-formatted chunk (e.g. a verbatim element), indented on its first line only. */
  raw(level: number, text: string): void {
    this.lines.push(`${this.pad(level)}${text}`);
  }

  blank(): void {
    this.lines.push("");
  }

  toString(lineEnding: string): string {
    return this.lines.join(lineEnding) + lineEnding;
  }
}

function formatAttributes(attrs: Array<[string, string | number | boolean | undefined]>): string {
  let s = "";
  for (const [k, v] of attrs) {
    if (v === undefined) continue;
    s += ` ${k}="${escapeAttribute(String(v))}"`;
  }
  return s;
}
