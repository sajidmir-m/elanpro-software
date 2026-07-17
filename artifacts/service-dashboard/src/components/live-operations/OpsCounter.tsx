import { useEffect, useState } from "react";

export function OpsCounter({ value }: { value: number }) {
  const safe = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame: number;
    const startTime = performance.now();
    const start = 0;
    const diff = safe - start;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / 500);
      setDisplay(Math.round(start + diff * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safe]);
  return <>{display.toLocaleString()}</>;
}
