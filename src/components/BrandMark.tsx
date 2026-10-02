import React from 'react';

/** The campus logo (the mark only, on a transparent background). */
export const BrandMark: React.FC<{ className?: string }> = ({ className = 'h-9 w-9' }) => (
  <img src="/logo.png" alt="" aria-hidden="true" draggable={false} className={`${className} flex-shrink-0 object-contain`} />
);
