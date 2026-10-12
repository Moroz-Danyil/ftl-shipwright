/**
 * Node implementations of the injected platform access, for the tests only.
 */
import { closeSync, openSync, readSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { inflateSync } from "node:zlib";
import type { DatAccess, FolderAccess } from "../data/sources";

/** Folder access over the real file system (paths relative to the root). */
export const nodeFolderAccess: FolderAccess = {
  async listFiles(root) {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else out.push(relative(root, full));
      }
    };
    walk(root);
    return out;
  },
  async readFile(path) {
    return new Uint8Array(await readFile(path));
  },
};

/** One entry of a PKG archive. */
export interface PkgEntry {
  path: string;
  dataOffset: number;
  dataSize: number;
  unpackedSize: number;
  compressed: boolean;
}

function readAt(fd: number, position: number, length: number): Buffer {
  const buf = Buffer.alloc(length);
  let done = 0;
  while (done < length) {
    const n = readSync(fd, buf, done, length - done, position + done);
    if (n === 0) throw new Error("Unexpected end of PKG file");
    done += n;
  }
  return buf;
}

/**
 * Reads the index of a PKG archive (`ftl.dat`). Big-endian: a 16-byte
 * header (`"PKG\n"`, u16 header size, u16 record size, u32 entry count,
 * u32 paths size), then the 20-byte records, then the null-terminated paths.
 */
export function readPkgIndex(file: string): PkgEntry[] {
  const fd = openSync(file, "r");
  try {
    const header = readAt(fd, 0, 16);
    if (header.toString("latin1", 0, 4) !== "PKG\n") throw new Error("Not a PKG file");
    const headerSize = header.readUInt16BE(4);
    const recordSize = header.readUInt16BE(6);
    const count = header.readUInt32BE(8);
    const pathsSize = header.readUInt32BE(12);
    const records = readAt(fd, headerSize, count * recordSize);
    const paths = readAt(fd, headerSize + count * recordSize, pathsSize);
    const entries: PkgEntry[] = [];
    for (let i = 0; i < count; i++) {
      const r = i * recordSize;
      const flagsAndOffset = records.readUInt32BE(r + 4);
      const dataOffset = records.readUInt32BE(r + 8);
      if (dataOffset === 0) continue;
      const pathOffset = flagsAndOffset & 0x00ffffff;
      const end = paths.indexOf(0, pathOffset);
      entries.push({
        path: paths.toString("latin1", pathOffset, end < 0 ? paths.length : end),
        dataOffset,
        dataSize: records.readUInt32BE(r + 12),
        unpackedSize: records.readUInt32BE(r + 16),
        // The flags are the top byte; its top bit marks zlib compression.
        compressed: (flagsAndOffset & 0x80000000) !== 0,
      });
    }
    return entries;
  } finally {
    closeSync(fd);
  }
}

/** Reads one entry's bytes (inflated when compressed). */
export function readPkgEntry(file: string, entry: PkgEntry): Uint8Array {
  const fd = openSync(file, "r");
  try {
    const raw = readAt(fd, entry.dataOffset, entry.dataSize);
    return new Uint8Array(entry.compressed ? inflateSync(raw) : raw);
  } finally {
    closeSync(fd);
  }
}

/** {@link DatAccess} backed by the test PKG reader (read-only). */
export function nodeDatAccess(): DatAccess {
  const indexes = new Map<string, PkgEntry[]>();
  const index = (dat: string) => {
    let entries = indexes.get(dat);
    if (!entries) {
      entries = readPkgIndex(dat);
      indexes.set(dat, entries);
    }
    return entries;
  };
  return {
    async listEntries(dat) {
      return index(dat).map((e) => ({ path: e.path, size: e.unpackedSize }));
    },
    async readEntry(dat, inner) {
      const entry = index(dat).find((e) => e.path === inner);
      if (!entry) throw new Error(`No entry ${inner}`);
      return readPkgEntry(dat, entry);
    },
  };
}
