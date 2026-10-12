/**
 * Pictures from the game files, ready to draw: a URL for `<image>` and the
 * picture's size. Each file is read once per source.
 */
import { useEffect, useState } from "react";
import type { FileSource } from "../core";

export interface LoadedPicture {
  url: string;
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from a PNG's header, or `undefined` if the bytes are not a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.length < 24 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function bytesToUrl(bytes: Uint8Array): string {
  if (typeof URL.createObjectURL === "function")
    return URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" }));
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/png;base64,${btoa(binary)}`;
}

const cache = new WeakMap<FileSource, Map<string, Promise<LoadedPicture | undefined>>>();

/** Reads a picture (cached). Resolves to `undefined` when it is missing or not a PNG. */
export function loadPicture(source: FileSource, path: string): Promise<LoadedPicture | undefined> {
  let bySource = cache.get(source);
  if (!bySource) {
    bySource = new Map();
    cache.set(source, bySource);
  }
  const key = path.toLowerCase();
  let picture = bySource.get(key);
  if (!picture) {
    picture = source.readBytes(path).then(
      (bytes) => {
        const size = bytes && pngSize(bytes);
        return bytes && size ? { url: bytesToUrl(bytes), ...size } : undefined;
      },
      () => undefined
    );
    bySource.set(key, picture);
  }
  return picture;
}

/** The picture at `path` once it is read; `undefined` while reading, or when there is none. */
export function usePicture(
  source: FileSource | undefined,
  path: string | null | undefined
): LoadedPicture | undefined {
  const [loaded, setLoaded] = useState<{
    source: FileSource;
    path: string;
    picture?: LoadedPicture;
  }>();
  useEffect(() => {
    if (!source || !path) return;
    let live = true;
    void loadPicture(source, path).then((picture) => {
      if (live) setLoaded({ source, path, picture });
    });
    return () => {
      live = false;
    };
  }, [source, path]);
  return loaded && loaded.source === source && loaded.path === path ? loaded.picture : undefined;
}
