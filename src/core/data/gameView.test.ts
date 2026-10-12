import { describe, expect, it } from "vitest";
import { classifyModPath, createGameView } from "./gameView";
import { memorySource } from "./sources";
import { readGameText, readTopLevelElements } from "./xmlLayers";

const base = memorySource({
  "data/blueprints.xml": '<FTL>\n<a name="1"/>\n</FTL>\n',
  "data/events.xml": "<FTL><e/></FTL>",
  "data/text_misc.xml": '<text name="k">v</text>',
  "img/ship/Kestral_base.png": new Uint8Array([1]),
});

describe("classifyModPath", () => {
  it("recognizes every append/clobber spelling", () => {
    expect(classifyModPath("data/blueprints.xml.append")).toEqual({
      target: "data/blueprints.xml",
      kind: "append",
    });
    expect(classifyModPath("data/blueprints.append.xml")).toEqual({
      target: "data/blueprints.xml",
      kind: "append",
    });
    expect(classifyModPath("data/x.XML.RawAppend")).toEqual({
      target: "data/x.xml",
      kind: "rawappend",
    });
    expect(classifyModPath("data/x.rawappend.xml")).toEqual({
      target: "data/x.xml",
      kind: "rawappend",
    });
    expect(classifyModPath("data/x.xml.rawclobber")).toEqual({
      target: "data/x.xml",
      kind: "rawclobber",
    });
    expect(classifyModPath("data/x.rawclobber.xml")).toEqual({
      target: "data/x.xml",
      kind: "rawclobber",
    });
    expect(classifyModPath("data\\x.xml")).toEqual({ target: "data/x.xml", kind: "replace" });
    expect(classifyModPath("img/x.png.append")).toEqual({
      target: "img/x.png.append",
      kind: "replace",
    });
  });
});

describe("createGameView", () => {
  it("without a mod is the base game", async () => {
    const view = createGameView(base);
    expect(await view.readText("data/events.xml")).toBe("<FTL><e/></FTL>");
    expect(await view.isFromMod("data/events.xml")).toBe(false);
    expect((await view.readLayers("data/events.xml"))!.map((l) => l.kind)).toEqual(["base"]);
    expect(await view.readLayers("nope")).toBeUndefined();
  });

  it("appends .xml.append and .append.xml, rawappend, in path order", async () => {
    const mod = memorySource({
      "data/blueprints.xml.append": '<b name="2"/>',
      "data/blueprints.append.xml": '<c name="3"/>',
      "data/Blueprints.xml.rawappend": '<d name="4"/>',
    });
    const view = createGameView(base, mod);
    const layers = (await view.readLayers("DATA/blueprints.xml"))!;
    expect(layers.map((l) => [l.kind, l.fromMod, l.sourcePath])).toEqual([
      ["base", false, "DATA/blueprints.xml"],
      ["rawappend", true, "data/Blueprints.xml.rawappend"],
      ["append", true, "data/blueprints.append.xml"],
      ["append", true, "data/blueprints.xml.append"],
    ]);
    expect(await view.readText("data/blueprints.xml")).toBe(
      '<FTL>\n<a name="1"/>\n</FTL>\n<d name="4"/>\n<c name="3"/>\n<b name="2"/>'
    );
    expect(await view.isFromMod("data/blueprints.xml")).toBe(true);
    const names = (await readTopLevelElements(view, "data/blueprints.xml")).map((e) => [
      e.element.attributes.name,
      e.fromMod,
    ]);
    expect(names).toEqual([
      ["1", false],
      ["4", true],
      ["3", true],
      ["2", true],
    ]);
  });

  it("rawclobber and ordinary files replace; appends still follow", async () => {
    const mod = memorySource({
      "data/events.xml": "<FTL><replaced/></FTL>",
      "data/blueprints.xml.rawclobber": "<new/>",
      "data/blueprints.xml": "<ignored/>",
      "data/blueprints.xml.append": "<more/>",
      "img/ship/kestral_base.png": new Uint8Array([9]),
      "img/ship/new_base.png": new Uint8Array([8]),
    });
    const view = createGameView(base, mod);
    expect(await view.readText("data/events.xml")).toBe("<FTL><replaced/></FTL>");
    expect((await view.readLayers("data/blueprints.xml"))!.map((l) => l.kind)).toEqual([
      "rawclobber",
      "append",
    ]);
    expect(await view.readText("data/blueprints.xml")).toBe("<new/>\n<more/>");
    expect(await view.readBytes("IMG/SHIP/KESTRAL_BASE.PNG")).toEqual(new Uint8Array([9]));
    expect(await view.has("img/ship/new_base.png")).toBe(true);
    const list = await view.list();
    expect(list).toContain("img/ship/new_base.png");
    expect(list.filter((p) => p.toLowerCase() === "img/ship/kestral_base.png")).toEqual([
      "img/ship/Kestral_base.png",
    ]);
    expect(list).not.toContain("data/blueprints.xml.append");
  });

  it("an append to a file that does not exist becomes the file", async () => {
    const view = createGameView(base, memorySource({ "data/newfile.xml.append": "<x/>" }));
    expect(await view.has("data/newfile.xml")).toBe(true);
    expect(await view.readText("data/newfile.xml")).toBe("<x/>");
    expect((await view.list()).includes("data/newfile.xml")).toBe(true);
  });

  it("readBytes of an appended file is the joined text", async () => {
    const view = createGameView(base, memorySource({ "data/events.xml.append": "<f/>" }));
    expect(new TextDecoder().decode(await view.readBytes("data/events.xml"))).toBe(
      "<FTL><e/></FTL>\n<f/>"
    );
  });

  it("ignores mod: instruction elements when reading XML", async () => {
    const mod = memorySource({
      "data/blueprints.xml.append": `<mod:findName type="a" name="1"><mod-append:extra/><a name="inside"/></mod:findName>
<FTL><b name="kept"/><mod:findLike type="b"><mod:removeTag/></mod:findLike></FTL>
<mod-append:x/>`,
    });
    const view = createGameView(base, mod);
    const names = (await readTopLevelElements(view, "data/blueprints.xml")).map(
      (e) => e.element.name + ":" + (e.element.attributes.name ?? "")
    );
    expect(names).toEqual(["a:1", "b:kept"]);
  });
});

describe("readGameText", () => {
  it("reads both text forms", async () => {
    const [el] = (
      await readTopLevelElements(
        createGameView(memorySource({ "a.xml": '<t id="k"/><t> Words </t>' })),
        "a.xml"
      )
    ).map((e) => e.element);
    expect(readGameText(el)).toEqual({ kind: "id", id: "k" });
    const els = (
      await readTopLevelElements(
        createGameView(memorySource({ "a.xml": '<t id="k"/><t> Words </t>' })),
        "a.xml"
      )
    ).map((e) => e.element);
    expect(readGameText(els[1])).toEqual({ kind: "text", text: "Words" });
    expect(readGameText(undefined)).toBeUndefined();
  });
});
