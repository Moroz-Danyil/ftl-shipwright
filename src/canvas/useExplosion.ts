/** Plays the explosion preview: the seconds since it started, for a few seconds, then nothing. */
import { useEffect, useRef, useState } from "react";
import { EXPLOSION_SECONDS } from "../app/art/explosion";

export function useExplosion(): { seconds: number | undefined; play: () => void } {
  const [seconds, setSeconds] = useState<number>();
  const frame = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  const play = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const start = performance.now();
    const tick = (now: number) => {
      const s = (now - start) / 1000;
      if (s >= EXPLOSION_SECONDS) {
        frame.current = null;
        setSeconds(undefined);
        return;
      }
      setSeconds(s);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  return { seconds, play };
}
