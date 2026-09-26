import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  onComplete?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({ onComplete }) => {
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; y: number; rot: number; color: string; size: number }>>([]);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (onComplete) onComplete();
      return;
    }

    const colors = ['#2563eb', '#38bdf8', '#fbbf24', '#10b981', '#f43f5e', '#a855f7'];
    const newPieces = Array.from({ length: 42 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 280,
      y: -60 - Math.random() * 220,
      rot: Math.random() * 720 - 360,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
    }));
    setPieces(newPieces);

    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (pieces.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {pieces.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm animate-confettiPop"
            style={{
              width: `${p.size}px`,
              height: `${p.size * 1.4}px`,
              backgroundColor: p.color,
              transform: `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rot}deg)`,
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        ))}
      </div>
    </div>
  );
};
