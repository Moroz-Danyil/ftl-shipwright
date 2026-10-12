import { createContext, useContext } from "react";
import type { Platform } from "./types";

export const PlatformContext = createContext<Platform | null>(null);

/** The platform the app runs on, provided at the root of the interface. */
export function usePlatform(): Platform {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error("usePlatform needs a PlatformContext provider");
  return platform;
}
