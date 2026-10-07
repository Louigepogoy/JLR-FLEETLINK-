'use client';

import { useId } from 'react';

const BODY = 'M10.5 30.6v-4.2c0-1.3.9-2.4 2.2-2.7l4.6-1.1 3.9-4.5c.9-1 2.2-1.6 3.6-1.6h6.3c1.6 0 3.1.8 4 2.1l2.7 3.9 3.3.6c1.4.3 2.4 1.5 2.4 2.9v3.2c0 .9-.7 1.6-1.6 1.6H12.1c-.9 0-1.6-.7-1.6-1.6z';

/**
 * JLR Fleetlink mark: an emoji-style car "sticker" — the body uses the theme gradient
 * (--gradient-from → --gradient-to), with a thick white outline and a soft shadow so it reads
 * on both light and dark backgrounds.
 */
export default function BrandLogo({ className = 'h-11 w-11' }: { className?: string }) {
  const id = useId();
  const fill = `url(#${id})`;
  return (
    <svg
      viewBox="0 0 48 48"
      className={`shrink-0 drop-shadow-[0_3px_4px_rgba(15,23,42,0.35)] ${className}`}
      role="img"
      aria-label="JLR Fleetlink logo"
    >
      <defs>
        <linearGradient id={id} x1="6" y1="14" x2="42" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--gradient-from)' }} />
          <stop offset="1" style={{ stopColor: 'var(--gradient-to)' }} />
        </linearGradient>
      </defs>
      <g transform="translate(24 24) scale(1.12) translate(-28 -26.5)">
        {/* sticker outline */}
        <g fill="#fff" stroke="#fff" strokeWidth="5" strokeLinejoin="round">
          <path d={BODY} />
          <circle cx="17.5" cy="32" r="4.3" />
          <circle cx="35" cy="32" r="4.3" />
        </g>
        {/* body */}
        <path d={BODY} fill={fill} />
        {/* windows */}
        <path d="M20.6 22l2.6-3c.4-.5 1-.7 1.6-.7h3v3.7zM30 18.3h1.3c.8 0 1.5.4 1.9 1l1.8 2.7H30z" fill="#e0f2fe" />
        {/* lights */}
        <rect x="42.6" y="25" width="2.6" height="1.8" rx=".9" fill="#fde047" />
        <rect x="10.5" y="25.2" width="1.8" height="1.8" rx=".9" fill="#f87171" />
        {/* wheels */}
        <circle cx="17.5" cy="32" r="4.3" fill="#1e293b" />
        <circle cx="35" cy="32" r="4.3" fill="#1e293b" />
        <circle cx="17.5" cy="32" r="1.8" fill="#cbd5e1" />
        <circle cx="35" cy="32" r="1.8" fill="#cbd5e1" />
      </g>
    </svg>
  );
}
