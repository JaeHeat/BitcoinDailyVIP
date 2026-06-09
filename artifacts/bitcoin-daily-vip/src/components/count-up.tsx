import { useEffect, useRef, useState } from "react";

// Parses values like "70%", "~20", "-3.2%", "2.32", "11W", "$13,803" into an
// animatable shape. Returns null for values without a single number (e.g. "5–10%"),
// in which case the caller should render the raw string.
function parseValue(v: string) {
  const m = v.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  // Reject ranges like "5–10%" — the suffix still contains another number.
  if (/\d/.test(m[3])) return null;
  const numStr = m[2].replace(/,/g, "");
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  const grouped = m[2].includes(",");
  return { prefix: m[1], target: parseFloat(numStr), decimals, grouped, suffix: m[3] };
}

function format(n: number, decimals: number, grouped: boolean) {
  const fixed = n.toFixed(decimals);
  if (!grouped) return fixed;
  const [int, dec] = fixed.split(".");
  const withCommas = Number(int).toLocaleString("en-US");
  return dec ? `${withCommas}.${dec}` : withCommas;
}

export function CountUp({
  value,
  durationMs = 1200,
  className,
}: {
  value: string;
  durationMs?: number;
  className?: string;
}) {
  const parsed = parseValue(value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const [display, setDisplay] = useState(
    parsed ? `${parsed.prefix}${format(0, parsed.decimals, parsed.grouped)}${parsed.suffix}` : value,
  );

  useEffect(() => {
    if (!parsed) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || started.current) continue;
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            setDisplay(
              `${parsed.prefix}${format(parsed.target * eased, parsed.decimals, parsed.grouped)}${parsed.suffix}`,
            );
            if (t < 1) requestAnimationFrame(step);
            else setDisplay(value);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
