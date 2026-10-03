import React from 'react';

/** The campus logo and, beside it, the Saba Steel emblem (marks only, on transparent backgrounds). */
export const BrandMark: React.FC<{ className?: string }> = ({ className = 'h-9 w-9' }) => (
  <span className="inline-flex flex-shrink-0 items-center gap-1.5">
    <img src="/logo.png" alt="" aria-hidden="true" draggable={false} className={`${className} flex-shrink-0 object-contain`} />
    <img src="/saba-mark.png" alt="" aria-hidden="true" draggable={false} className={`${className} flex-shrink-0 object-contain dark:rounded-full dark:bg-white dark:p-0.5`} />
  </span>
);
