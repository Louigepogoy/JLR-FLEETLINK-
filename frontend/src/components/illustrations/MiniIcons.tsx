// Small colorful illustrated icons for the dashboard (sidebar menu, stat cards, page titles).
// Drawn on a 24x24 grid so they stay readable from 20px up to ~48px. Colors come from the --illo-*
// tokens in globals.css, so they adapt to light and dark mode.
import type { ComponentType } from 'react';
import { ACCENT, BOX, GOLD, GREEN, HAIR, L, MUTED, PRIMARY, RED, SKIN, SOFT, SURFACE, TIRE } from './palette';

export type MiniIcon = ComponentType<{ className?: string }>;

function Svg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={L}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Tiny smiling face: head, hair, eyes and smile, centered on (x, y) with radius r.
function Face({ x, y, r }: { x: number; y: number; r: number }) {
  // Hair cap: the top half of the head with a soft fringe dipping toward the middle.
  const hair = `M${x - r} ${y - 0.17 * r}a${r} ${r} 0 0 1 ${2 * r} 0`
    + `c${-0.33 * r} ${-0.37 * r} ${-0.67 * r} ${-0.5 * r} ${-r} ${-0.5 * r}`
    + `s${-0.67 * r} ${0.13 * r} ${-r} ${0.5 * r}z`;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={SKIN} />
      <path d={hair} fill={HAIR} strokeWidth={1} />
      <circle cx={x - r * 0.38} cy={y + r * 0.15} r={r * 0.11} fill={L} stroke="none" />
      <circle cx={x + r * 0.38} cy={y + r * 0.15} r={r * 0.11} fill={L} stroke="none" />
      <path d={`M${x - r * 0.35} ${y + r * 0.5}q${r * 0.35} ${r * 0.3} ${r * 0.7} 0`} strokeWidth={0.9} />
    </g>
  );
}

function Peso({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x - 0.9 * s} ${y - 2.2 * s}v${4.4 * s}M${x - 0.9 * s} ${y - 2.2 * s}h${1.6 * s}a${1.2 * s} ${1.2 * s} 0 0 1 0 ${2.4 * s}h-${1.6 * s}M${x - 1.7 * s} ${y - 1.1 * s}h${3.6 * s}`}
      strokeWidth={1}
    />
  );
}

export function OverviewIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="8" height="9" rx="2" fill={PRIMARY} />
      <rect x="13" y="3" width="8" height="5" rx="2" fill={GOLD} />
      <rect x="13" y="10" width="8" height="11" rx="2" fill={ACCENT} />
      <rect x="3" y="14" width="8" height="7" rx="2" fill={GREEN} />
    </Svg>
  );
}

export function MessagesIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M10 3.5h8.5a2.5 2.5 0 0 1 2.5 2.5v4.5a2.5 2.5 0 0 1-2.5 2.5H18v2.5L15 13h-5z" fill={ACCENT} />
      <path d="M5.5 8h8A2.5 2.5 0 0 1 16 10.5v5a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3v-3a2.5 2.5 0 0 1-2.5-2.5v-5A2.5 2.5 0 0 1 5.5 8z" fill={PRIMARY} />
      <circle cx="6.8" cy="13" r="0.9" fill={SURFACE} stroke="none" />
      <circle cx="9.5" cy="13" r="0.9" fill={SURFACE} stroke="none" />
      <circle cx="12.2" cy="13" r="0.9" fill={SURFACE} stroke="none" />
    </Svg>
  );
}

export function CalendarCheckIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3" fill={SURFACE} />
      <path d="M6 5h12a3 3 0 0 1 3 3v2H3V8a3 3 0 0 1 3-3z" fill={RED} />
      <path d="M8 3v4M16 3v4" strokeWidth={1.8} />
      <path d="M8.5 15l2.5 2.5 4.5-5" stroke={GREEN} strokeWidth={2.2} />
    </Svg>
  );
}

export function BrowseCarIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4.5 12l1.7-3a2 2 0 0 1 1.7-1h4.2a2 2 0 0 1 1.7 1l1.7 3" fill={SOFT} />
      <rect x="2" y="12" width="16" height="5.5" rx="2" fill={PRIMARY} />
      <circle cx="6" cy="17.5" r="1.9" fill={TIRE} />
      <circle cx="14" cy="17.5" r="1.9" fill={TIRE} />
      <path d="M20 9.5l2 2" strokeWidth={2.6} />
      <path d="M20 9.5l2 2" stroke={GOLD} strokeWidth={1.2} />
      <circle cx="17.5" cy="7" r="3.4" fill={SURFACE} strokeWidth={1.6} />
    </Svg>
  );
}

export function MyVehicleIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M6 11l1.6-4.2A1.6 1.6 0 0 1 9.1 5.7h5.8a1.6 1.6 0 0 1 1.5 1.1L18 11" fill={SOFT} />
      <rect x="3" y="11" width="18" height="7" rx="2.5" fill={GREEN} />
      <circle cx="6.5" cy="14.5" r="1.3" fill={GOLD} />
      <circle cx="17.5" cy="14.5" r="1.3" fill={GOLD} />
      <path d="M10 16h4" />
      <rect x="4.5" y="17.5" width="3.5" height="3" rx="1" fill={TIRE} />
      <rect x="16" y="17.5" width="3.5" height="3" rx="1" fill={TIRE} />
    </Svg>
  );
}

export function RequestsIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="4.5" y="4" width="15" height="17.5" rx="2.5" fill={SURFACE} />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1.2" fill={MUTED} />
      <path d="M7.5 20.5a4.5 4.5 0 0 1 9 0z" fill={ACCENT} />
      <Face x={12} y={12.5} r={3.2} />
    </Svg>
  );
}

export function EarningsIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="15.5" cy="8.5" r="5.5" fill={GOLD} />
      <circle cx="9" cy="15" r="6" fill={GOLD} />
      <circle cx="9" cy="15" r="4.2" strokeWidth={0.9} />
      <Peso x={9} y={15} s={0.85} />
      <path d="M17.5 21l2.5-3 2 2" stroke={GREEN} strokeWidth={1.8} />
    </Svg>
  );
}

export function ReceiptIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M5 3h14v18l-2.3-1.5L14.3 21 12 19.5 9.7 21l-2.4-1.5L5 21z" fill={SURFACE} />
      <path d="M8 7.5h8M8 11h8M8 14.5h4.5" stroke={MUTED} strokeWidth={1.6} />
      <circle cx="17.5" cy="16" r="3.5" fill={GREEN} />
      <path d="M16 16l1 1 2-2" stroke={SURFACE} strokeWidth={1.4} />
    </Svg>
  );
}

export function CrownIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3.5 8l4.3 3.8L12 5l4.2 6.8L20.5 8l-1.7 10H5.2z" fill={GOLD} />
      <rect x="5" y="17.5" width="14" height="3" rx="1" fill={GOLD} />
      <circle cx="12" cy="13.5" r="1.4" fill={RED} />
      <circle cx="3.5" cy="7.5" r="1.2" fill={PRIMARY} />
      <circle cx="12" cy="4.5" r="1.2" fill={PRIMARY} />
      <circle cx="20.5" cy="7.5" r="1.2" fill={PRIMARY} />
    </Svg>
  );
}

export function SupportIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M5 22a7 7 0 0 1 14 0z" fill={PRIMARY} />
      <Face x={12} y={10.5} r={5} />
      <path d="M6.2 10.5a5.8 5.8 0 0 1 11.6 0" stroke={ACCENT} strokeWidth={1.8} />
      <rect x="4.6" y="9.2" width="2.6" height="4.2" rx="1.2" fill={ACCENT} />
      <rect x="16.8" y="9.2" width="2.6" height="4.2" rx="1.2" fill={ACCENT} />
      <path d="M18.2 13.4c0 2.4-1.8 3.6-4.6 3.6" strokeWidth={1.1} />
      <circle cx="13.3" cy="17" r="0.9" fill={ACCENT} />
    </Svg>
  );
}

export function VerifyIdIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="2" y="5" width="18" height="13.5" rx="2.5" fill={SURFACE} />
      <path d="M4.5 5h13A2.5 2.5 0 0 1 20 7.5V8H2v-.5A2.5 2.5 0 0 1 4.5 5z" fill={PRIMARY} />
      <Face x={7.5} y={12.5} r={2.6} />
      <path d="M12 11.5h5M12 14.5h3.5" stroke={MUTED} strokeWidth={1.5} />
      <circle cx="19" cy="18" r="3.8" fill={GREEN} />
      <path d="M17.3 18l1.2 1.2 2.2-2.4" stroke={SURFACE} strokeWidth={1.5} />
    </Svg>
  );
}

export function UsersIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12.5 19.5a5 5 0 0 1 9.5 0z" fill={ACCENT} />
      <Face x={17.2} y={9} r={3.1} />
      <path d="M2 21.5a6 6 0 0 1 12 0z" fill={PRIMARY} />
      <Face x={8} y={10.5} r={3.8} />
    </Svg>
  );
}

export function HistoryIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" fill={SURFACE} />
      <path d="M3.6 8.5A9 9 0 0 1 12 3" stroke={PRIMARY} strokeWidth={2.2} />
      <path d="M12 7v5l3.5 2" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="1" fill={L} stroke="none" />
      <circle cx="18.5" cy="18.5" r="3.5" fill={GREEN} />
      <path d="M17 18.5l1 1 2-2" stroke={SURFACE} strokeWidth={1.4} />
    </Svg>
  );
}

export function FlagIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M5 21V3.5" strokeWidth={1.8} />
      <path d="M5 4.5c3-1.5 5.5 1.5 8.5 0s4.5-1 6 0v8.5c-1.5-1-3-1.5-6 0s-5.5-1.5-8.5 0z" fill={RED} />
      <path d="M8 8.5c1.5-.5 2.5.3 3.5.1" stroke={SURFACE} strokeWidth={1.2} />
    </Svg>
  );
}

export function CardIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="2" y="5.5" width="20" height="13.5" rx="2.5" fill={ACCENT} />
      <path d="M2 9.5h20" strokeWidth={2.4} />
      <rect x="5" y="12.5" width="4.5" height="3.2" rx="0.8" fill={GOLD} strokeWidth={1.1} />
      <path d="M14 15.5h4.5" stroke={SURFACE} strokeWidth={1.6} />
    </Svg>
  );
}

export function WalletIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="15" cy="5.5" r="3.5" fill={GOLD} />
      <path d="M4.5 7.5h14a2.5 2.5 0 0 1 2.5 2.5v8.5a2.5 2.5 0 0 1-2.5 2.5h-14A2.5 2.5 0 0 1 2 18.5V10a2.5 2.5 0 0 1 2.5-2.5z" fill={PRIMARY} />
      <path d="M15.5 12H22v4.5h-6.5a2.25 2.25 0 0 1 0-4.5z" fill={SOFT} />
      <circle cx="16" cy="14.25" r="1" fill={L} stroke="none" />
    </Svg>
  );
}

export function ChartIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="3" width="19" height="18" rx="2.5" fill={SURFACE} />
      <rect x="6" y="13" width="3" height="5" rx="0.8" fill={PRIMARY} strokeWidth={1} />
      <rect x="10.5" y="10" width="3" height="8" rx="0.8" fill={ACCENT} strokeWidth={1} />
      <rect x="15" y="7" width="3" height="11" rx="0.8" fill={GREEN} strokeWidth={1} />
      <path d="M5.5 10.5l4-3 3 1.5 5-3.5" stroke={GOLD} strokeWidth={1.6} />
    </Svg>
  );
}

export function SettingsIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8" stroke={PRIMARY} strokeWidth={3.4} strokeDasharray="3.1 3.2" strokeLinecap="butt" />
      <circle cx="12" cy="12" r="6" fill={SOFT} />
      <circle cx="12" cy="12" r="2.4" fill={SURFACE} />
    </Svg>
  );
}

export function TrendUpIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 18.5l5.5-6 4 3.5L20 7" stroke={GREEN} strokeWidth={2.6} />
      <path d="M15 7h5v5" stroke={GREEN} strokeWidth={2.6} />
      <circle cx="6.5" cy="7" r="3.5" fill={GOLD} />
      <Peso x={6.5} y={7} s={0.6} />
    </Svg>
  );
}

export function PendingIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M6 3h12M6 21h12" strokeWidth={1.8} />
      <path d="M7 3.5h10c0 4-3 5.5-5 8.5-2-3-5-4.5-5-8.5zM7 20.5h10c0-4-3-5.5-5-8.5-2 3-5 4.5-5 8.5z" fill={SURFACE} />
      <path d="M9 19.5h6c0-1.8-1.5-3-3-4.5-1.5 1.5-3 2.7-3 4.5z" fill={GOLD} strokeWidth={1} />
      <path d="M9.5 6h5c-.5 1.3-1.5 2-2.5 3-1-1-2-1.7-2.5-3z" fill={GOLD} strokeWidth={1} />
    </Svg>
  );
}

export function PackageIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 2.5l8.5 4.5v10L12 21.5 3.5 17V7z" fill={BOX} />
      <path d="M3.5 7L12 11.5 20.5 7M12 11.5v10" />
      <path d="M7.8 4.8l8.4 4.5" stroke={SURFACE} strokeWidth={1.6} />
    </Svg>
  );
}

// Small tile a mini icon sits on in the sidebar and in stat cards. `className` sets size and corner radius.
export function IconChip({ icon: Icon, className = 'h-8 w-8 rounded-lg', iconClassName = 'h-5 w-5' }: {
  icon: MiniIcon;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={`illo-tile flex shrink-0 items-center justify-center ${className}`}>
      <Icon className={iconClassName} />
    </span>
  );
}
