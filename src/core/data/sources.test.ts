import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  createFileSource,
  datSource,
  decodeText,
  encodeText,
  folderSource,
  joinFolderPath,
  memorySource,
  normalizePath,
  pathKey,
  zipSource,
} from "./sources";

describe("paths", () => {
  it("normalizes slashes and compares case-insensitively", () => {
    expect(normalizePath(".\\data\\\\blueprints.xml")).toBe("data/blueprints.xml");
    expect(normalizePath("/img//ship/a.png")).toBe("img/ship/a.png");
    expect(pathKey("IMG\\Ship\\A.PNG")).toBe("img/ship/a.png");
  });

  it("decodes UTF-8 and drops a BOM", () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]))).toBe("hi");
    expect(decodeText(encodeText("Größe ✓"))).toBe("Größe ✓");
  });
});

describe("memorySource", () => {
  const src = memorySource({ "data\\A.xml": "<a/>", "img/b.png": new Uint8Array([1, 2]) });

  it("lists, finds and reads files case-insensitively", async () => {
    expect(await src.list()).toEqual(["data/A.xml", "img/b.png"]);
    expect(await src.has("DATA/a.XML")).toBe(true);
    expect(await src.readText("data/a.xml")).toBe("<a/>");
    expect(await src.readBytes("IMG/B.png")).toEqual(new Uint8Array([1, 2]));
    expect(await src.readBytes("missing")).toBeUndefined();
    expect(await src.readText("missing")).toBeUndefined();
  });

  it("accepts a Map", async () => {
    const m = memorySource(new Map([["x.txt", "x"]]));
    expect(await m.readText("X.TXT")).toBe("x");
  });
});

describe("createFileSource", () => {
  it("lists once and skips directory entries", async () => {
    let calls = 0;
    const src = createFileSource(
      async () => {
        calls++;
        return ["dir/", "dir/a.txt", "DIR/A.TXT"];
      },
      async (p) => encodeText(p)
    );
    expect(await src.list()).toEqual(["DIR/A.TXT"]);
    expect(await src.readText("dir/a.txt")).toBe("DIR/A.TXT");
    await src.has("x");
    expect(calls).toBe(1);
  });
});

describe("zipSource", () => {
  it("reads a mod zip", async () => {
    const zip = zipSync({
      "data/blueprints.xml.append": encodeText("<x/>"),
      "img/": new Uint8Array(0),
      "img/a.png": new Uint8Array([7]),
    });
    const src = zipSource(zip);
    expect((await src.list()).sort()).toEqual(["data/blueprints.xml.append", "img/a.png"]);
    expect(await src.readText("DATA/blueprints.xml.append")).toBe("<x/>");
  });

  it("removes a single wrapping folder", async () => {
    const zip = zipSync({
      "MyMod/data/a.txt": encodeText("a"),
      "MyMod/img/b.png": new Uint8Array([1]),
    });
    expect((await zipSource(zip).list()).sort()).toEqual(["data/a.txt", "img/b.png"]);
  });

  it("keeps a top folder that is a game folder", async () => {
    const zip = zipSync({ "data/sub/a.txt": encodeText("a") });
    expect(await zipSource(zip).list()).toEqual(["data/sub/a.txt"]);
  });
});

describe("folderSource", () => {
  it("uses the injected functions with relative or full listed paths", async () => {
    const files: Record<string, string> = {
      "C:/Mods/My/data/a.txt": "A",
      "C:/Mods/My/img/b.png": "B",
    };
    const reads: string[] = [];
    const src = folderSource("C:\\Mods\\My\\", {
      async listFiles(root) {
        expect(root).toBe("C:\\Mods\\My\\");
        return ["C:\\Mods\\My\\data\\a.txt", "img\\b.png"];
      },
      async readFile(path) {
        reads.push(path);
        return encodeText(files[path]);
      },
    });
    expect(await src.list()).toEqual(["data/a.txt", "img/b.png"]);
    expect(await src.readText("DATA/A.txt")).toBe("A");
    expect(await src.readText("img/b.png")).toBe("B");
    expect(reads).toEqual(["C:/Mods/My/data/a.txt", "C:/Mods/My/img/b.png"]);
  });

  it("joins folder paths with forward slashes, keeping a leading / or //", () => {
    expect(joinFolderPath("C:\\Mods\\My\\", "data\\a.txt")).toBe("C:/Mods/My/data/a.txt");
    expect(joinFolderPath("/home/me/mod/", "img/a.png")).toBe("/home/me/mod/img/a.png");
    expect(joinFolderPath("\\\\server\\share\\mod", "a.txt")).toBe("//server/share/mod/a.txt");
  });
});

describe("datSource", () => {
  it("uses the injected archive commands", async () => {
    const src = datSource("X:/ftl.dat", {
      async listEntries(dat) {
        expect(dat).toBe("X:/ftl.dat");
        return [
          { path: "data/blueprints.xml", size: 3 },
          { path: "img/a.png", size: 1 },
        ];
      },
      async readEntry(dat, inner) {
        return encodeText(`${dat}|${inner}`);
      },
    });
    expect(await src.has("Data/Blueprints.xml")).toBe(true);
    expect(await src.readText("data/BLUEPRINTS.xml")).toBe("X:/ftl.dat|data/blueprints.xml");
  });
});
