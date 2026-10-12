import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  elements,
  escapeAttribute,
  escapeText,
  findElementsDeep,
  firstElement,
  isModInstruction,
  parseXml,
  stripModInstructions,
  textOf,
  XmlWriter,
  type XmlElement,
} from "./xml";

describe("parseXml", () => {
  it("reads elements, attributes, text and comments", () => {
    const nodes = parseXml("<a x=\"1\" y='two'><b>hi</b><!-- note --><c/></a>");
    expect(nodes).toHaveLength(1);
    const a = nodes[0] as XmlElement;
    expect(a.name).toBe("a");
    expect(a.attributes).toEqual({ x: "1", y: "two" });
    expect(elements(a.children).map((e) => e.name)).toEqual(["b", "c"]);
    expect(textOf(firstElement(a.children, "b")!)).toBe("hi");
    expect(a.children.some((c) => c.type === "comment" && c.text === " note ")).toBe(true);
  });

  it("accepts several top-level elements and no root", () => {
    const nodes = parseXml("  <a/>\n<b></b> text <c/>");
    expect(elements(nodes).map((e) => e.name)).toEqual(["a", "b", "c"]);
  });

  it("skips the XML declaration, DOCTYPE and keeps CDATA as text", () => {
    const nodes = parseXml('<?xml version="1.0"?><!DOCTYPE x><a><![CDATA[<raw> & ]]></a>');
    const a = elements(nodes)[0];
    expect(textOf(a)).toBe("<raw> & ");
  });

  it("records source ranges", () => {
    const src = 'xx<a k="v"><b/></a>yy';
    const a = elements(parseXml(src))[0];
    expect(src.slice(a.start, a.end)).toBe('<a k="v"><b/></a>');
    const b = elements(a.children)[0];
    expect(src.slice(b.start, b.end)).toBe("<b/>");
  });

  it('ignores elements inside comments, including comments with "--" and "<!-"', () => {
    const src = '<!-- <shipBlueprint name="X"/> -- odd --><a/><!--<g/> <!- inner -->';
    expect(findElementsDeep(parseXml(src), "shipBlueprint")).toHaveLength(0);
    expect(elements(parseXml(src)).map((e) => e.name)).toEqual(["a"]);
  });

  it("decodes entities in text and attributes", () => {
    const a = elements(
      parseXml('<a t="&quot;x&quot; &amp; y">&lt;b&gt; &#65;&#x42; &unknown;</a>')
    )[0];
    expect(a.attributes.t).toBe('"x" & y');
    expect(textOf(a)).toBe("<b> AB &unknown;");
  });

  it("tolerates mismatched and missing closing tags", () => {
    const src = "<a><b><c></b><d/></a></zzz><e>";
    const nodes = parseXml(src);
    const [a, e] = elements(nodes);
    expect(a.name).toBe("a");
    const b = firstElement(a.children, "b")!;
    // <c> is closed when </b> closes its parent.
    expect(firstElement(b.children, "c")).toBeDefined();
    expect(firstElement(a.children, "d")).toBeDefined();
    expect(e.name).toBe("e");
    expect(e.end).toBe(src.length);
  });

  it("tolerates odd whitespace in tags and unquoted values", () => {
    const a = elements(parseXml('<a\n\tx = "1"\ty=2 flag ></a >'))[0];
    expect(a.attributes).toEqual({ x: "1", y: "2", flag: "" });
  });

  it("keeps a lone < as text", () => {
    const a = elements(parseXml("<a>1 < 2</a>"))[0];
    expect(textOf(a)).toBe("1 < 2");
  });

  it("findElementsDeep does not descend into a match", () => {
    const nodes = parseXml("<r><x><x/></x><y><x/></y></r>");
    expect(findElementsDeep(nodes, "x")).toHaveLength(2);
  });
});

describe("escaping", () => {
  it("escapes and decodes symmetrically", () => {
    const s = `a < b > c & "d" 'e'`;
    expect(decodeEntities(escapeText(s))).toBe(s);
    expect(decodeEntities(escapeAttribute(s))).toBe(s);
    expect(escapeAttribute('"')).toBe("&quot;");
  });
});

describe("XmlWriter", () => {
  it("writes indented elements and skips undefined attributes", () => {
    const w = new XmlWriter("  ");
    w.open(0, "a", [
      ["x", 1],
      ["y", undefined],
      ["z", true],
    ]);
    w.empty(1, "b", [["t", 'a"b']]);
    w.textElement(1, "c", "x & y");
    w.raw(1, "<raw/>");
    w.close(0, "a");
    expect(w.toString("\n")).toBe(
      '<a x="1" z="true">\n  <b t="a&quot;b"/>\n  <c>x &amp; y</c>\n  <raw/>\n</a>\n'
    );
  });
});

describe("Slipstream mod: instructions", () => {
  it("recognizes mod:, mod-append: and similar prefixes", () => {
    expect(isModInstruction("mod:findName")).toBe(true);
    expect(isModInstruction("mod-append:shipBlueprint")).toBe(true);
    expect(isModInstruction("mod-overwrite:x")).toBe(true);
    expect(isModInstruction("model")).toBe(false);
    expect(isModInstruction("shipBlueprint")).toBe(false);
  });

  it("are skipped by findElementsDeep and removed by stripModInstructions", () => {
    const nodes = parseXml(
      '<FTL><a/><mod:findName name="x"><a/><mod-append:a/></mod:findName><b><mod:removeTag/><a/></b></FTL>'
    );
    expect(findElementsDeep(nodes, "a")).toHaveLength(2);
    const stripped = stripModInstructions(nodes);
    const ftl = elements(stripped)[0];
    expect(elements(ftl.children).map((e) => e.name)).toEqual(["a", "b"]);
    expect(elements(elements(ftl.children)[1].children).map((e) => e.name)).toEqual(["a"]);
    // The input is not changed.
    expect(elements((nodes[0] as XmlElement).children).map((e) => e.name)).toEqual([
      "a",
      "mod:findName",
      "b",
    ]);
  });
});
