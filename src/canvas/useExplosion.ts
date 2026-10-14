/**
 * Plays the explosion preview for a few seconds at the chosen speed: the
 * seconds into the explosion (the clock's seconds times the speed), then
 * nothing. The speed is read when the preview starts.
 */
import { useEffect, useRef, useState } from "react";
import { EXPLOSION_SECONDS } from "../app/art/explosion";
import { useEditor } from "../app/store";

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
    const speed = useEditor.getState().explosionSpeed;
    const start = performance.now();
    const tick = (now: number) => {
      const s = (now - start) / 1000;
      if (s >= EXPLOSION_SECONDS) {
        frame.current = null;
        setSeconds(undefined);
        return;
      }
      setSeconds(Math.max(0, s) * speed);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  return { seconds, play };
}
