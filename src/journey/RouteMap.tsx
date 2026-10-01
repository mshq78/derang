import React, { useEffect, useMemo, useRef, useState } from 'react';

interface RouteMapProps {
  /** Number of stages (stops between the start and the destination). */
  stages: number;
  /** 0 = at the start, 1..stages = at that stage's stop, stages + 1 = arrived. */
  position: number;
  /** Stage numbers (1-based) that are open, to light their stops. */
  openStops: number[];
  doneStops: number[];
}

const PATH = 'M 20 120 C 60 120, 70 40, 120 50 S 170 130, 215 110 S 270 30, 340 45';

/** A stylised road from Isfahan to Babolsar with a bus that glides to the current stop. */
export const RouteMap: React.FC<RouteMapProps> = ({ stages, position, openStops, doneStops }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const [total, setTotal] = useState(0);
  const [bus, setBus] = useState({ x: 20, y: 120, angle: 0 });
  const fraction = useRef(0);
  const stops = stages + 2;

  useEffect(() => {
    if (pathRef.current) setTotal(pathRef.current.getTotalLength());
  }, []);

  const points = useMemo(() => {
    const el = pathRef.current;
    if (!el || !total) return [] as { x: number; y: number }[];
    return Array.from({ length: stops }, (_, i) => el.getPointAtLength((i / (stops - 1)) * total));
  }, [total, stops]);

  // Glide the bus to the target stop.
  useEffect(() => {
    const el = pathRef.current;
    if (!el || !total) return;
    const target = Math.min(1, Math.max(0, position / (stops - 1)));
    const from = fraction.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? 0 : 2600;
    const start = performance.now();
    let raf = 0;
    const place = (f: number) => {
      const p = el.getPointAtLength(f * total);
      const q = el.getPointAtLength(Math.min(total, f * total + 1));
      setBus({ x: p.x, y: p.y, angle: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI });
    };
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const f = from + (target - from) * eased;
      fraction.current = f;
      place(f);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [position, total, stops]);

  return (
    <svg viewBox="0 0 360 160" className="w-full" role="img" aria-label="مسیر اصفهان تا بابلسر و جایگاه اتوبوس">
      <path d={PATH} fill="none" stroke="var(--color-line-strong)" strokeWidth="14" strokeLinecap="round" />
      <path d={PATH} fill="none" stroke="var(--color-surface)" strokeWidth="2" strokeDasharray="6 8" strokeLinecap="round" />
      <path ref={pathRef} d={PATH} fill="none" stroke="none" />
      {points.map((p, i) => {
        const isStage = i > 0 && i < stops - 1;
        const done = isStage && doneStops.includes(i);
        const open = isStage && openStops.includes(i);
        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isStage ? 9 : 11}
              fill={done ? 'var(--color-success)' : open ? 'var(--color-primary)' : 'var(--color-surface)'}
              stroke={open || done ? 'var(--color-surface)' : 'var(--color-line-strong)'}
              strokeWidth="3"
            />
            <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="800" fill={open || done ? 'var(--color-surface)' : 'var(--color-ink-3)'}>
              {isStage ? (done ? '✓' : String(i).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])) : i === 0 ? '' : '★'}
            </text>
            {(i === 0 || i === stops - 1) && (
              <text x={p.x} y={p.y + (i === 0 ? 28 : -18)} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--color-ink)">
                {i === 0 ? 'اصفهان' : 'بابلسر'}
              </text>
            )}
          </g>
        );
      })}
      <g transform={`translate(${bus.x} ${bus.y - 14}) rotate(${Math.abs(bus.angle) > 90 ? 0 : bus.angle * 0.35})`}>
        <ellipse cx="0" cy="17" rx="17" ry="3" fill="rgba(0,0,0,0.18)" />
        <rect x="-17" y="-8" width="34" height="22" rx="6" fill="var(--color-primary)" />
        <rect x="-13" y="-4" width="8" height="7" rx="1.5" fill="var(--color-surface)" />
        <rect x="-3" y="-4" width="8" height="7" rx="1.5" fill="var(--color-surface)" />
        <rect x="7" y="-4" width="7" height="7" rx="1.5" fill="var(--color-surface)" />
        <circle cx="-9" cy="14" r="3.6" fill="var(--color-ink)" />
        <circle cx="9" cy="14" r="3.6" fill="var(--color-ink)" />
      </g>
    </svg>
  );
};
