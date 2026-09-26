import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  onComplete?: () => void;
  isMotionEnabled?: boolean;
}

export const Confetti: React.FC<ConfettiProps> = ({ onComplete, isMotionEnabled = true }) => {
  const [pieces, setPieces] = useState<
    Array<{ id: number; x: number; y: number; rot: number; color: string; size: number }>
  >([]);

  useEffect(() => {
    // Respect settings.motion and prefers-reduced-motion
    if (
      !isMotionEnabled ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      if (onComplete) onComplete();
      return;
    }

    const colors = ['#3F6E8A', '#7FA8C2', '#D2AE6E', '#4E8A6A', '#B25E57', '#76679A'];
    const newPieces = Array.from({ length: 42 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: -60 - Math.random() * 240,
      rot: Math.random() * 720 - 360,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
    }));
    setPieces(newPieces);

    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1150);

    return () => clearTimeout(timer);
  }, [onComplete, isMotionEnabled]);

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
              ['--x' as string]: `${p.x}px`,
              ['--y' as string]: `${p.y}px`,
              ['--r' as string]: `${p.rot}deg`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
