// Friendly spot illustrations (home page sections, dashboard empty states).
// All colors come from the --illo-* tokens in globals.css, so they adapt to light and dark mode.
import { ACCENT, BOX, GOLD, GREEN, HAIR, L, MUTED, PRIMARY, RED, SKIN, SOFT, SURFACE, TIRE } from './palette';

type IlloProps = { className?: string };

function Svg({ className, children }: IlloProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke={L}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// A smiling person's head and shoulders; used on the ID card and elsewhere.
function Person({ x, y, scale = 1, shirt = ACCENT }: { x: number; y: number; scale?: number; shirt?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-8 13a8 8 0 0 1 16 0z" fill={shirt} />
      <circle cx="0" cy="0" r="6" fill={SKIN} />
      <path d="M-6 -1a6 6 0 0 1 12 0c-2-2.2-4-3-6-3s-4 .8-6 3z" fill={HAIR} strokeWidth={1.5} />
      <circle cx="-2.2" cy="0.8" r="0.6" fill={L} stroke="none" />
      <circle cx="2.2" cy="0.8" r="0.6" fill={L} stroke="none" />
      <path d="M-2 3q2 1.6 4 0" strokeWidth={1.3} />
    </g>
  );
}

function CheckBadge({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={GREEN} />
      <path d={`M${cx - r * 0.45} ${cy}l${r * 0.32} ${r * 0.32} ${r * 0.6} -${r * 0.62}`} stroke={SURFACE} strokeWidth={2.2} />
    </g>
  );
}

// 1 · Driver's license with the owner's face, approved.
export function VerifyIdIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <rect x="6" y="14" width="46" height="34" rx="5" fill={SURFACE} />
      <path d="M11 14h36a5 5 0 0 1 5 5v3H6v-3a5 5 0 0 1 5-5z" fill={PRIMARY} />
      <circle cx="11" cy="18" r="1" fill={SURFACE} stroke="none" />
      <rect x="12" y="27" width="16" height="17" rx="3" fill={SOFT} strokeWidth={1.5} />
      <Person x={20} y={34} scale={0.85} />
      <path d="M32 29h14M32 34h10M32 39h12" stroke={MUTED} strokeWidth={2.4} />
      <CheckBadge cx={50} cy={46} r={8} />
    </Svg>
  );
}

// 2 · Magnifying glass over a car.
export function BrowseCarIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <path d="M8 44v-6a3 3 0 0 1 2-2.8l4.5-1.6 4.5-6.4a4 4 0 0 1 3.3-1.7h12.4a4 4 0 0 1 3.3 1.7l4.5 6.4 4.5 1.6a3 3 0 0 1 2 2.8v6a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill={PRIMARY} />
      <path d="M21 33.4l3.5-5h6.5v5zM34 28.4h4.5l3.5 5h-8z" fill={SURFACE} strokeWidth={1.5} />
      <path d="M8.5 39h4M50.5 39h4" stroke={GOLD} strokeWidth={2.5} />
      <circle cx="18" cy="46" r="4.5" fill={TIRE} />
      <circle cx="18" cy="46" r="1.6" fill={SURFACE} stroke="none" />
      <circle cx="45" cy="46" r="4.5" fill={TIRE} />
      <circle cx="45" cy="46" r="1.6" fill={SURFACE} stroke="none" />
      <path d="M52 23l6 6" strokeWidth={6} />
      <path d="M52 23l6 6" stroke={GOLD} strokeWidth={3} />
      <circle cx="45" cy="16" r="9" fill={SURFACE} strokeWidth={2.5} />
      <path d="M40.5 13.5a5 5 0 0 1 4-2.5" stroke={SOFT} strokeWidth={2} />
    </Svg>
  );
}

// 3 · Phone showing a successful payment, with a card and a peso coin.
export function PayPhoneIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <g transform="rotate(-14 20 36)">
        <rect x="4" y="26" width="30" height="20" rx="3.5" fill={ACCENT} />
        <path d="M4 32h30" strokeWidth={3} />
        <rect x="8" y="37" width="7" height="4" rx="1" fill={GOLD} strokeWidth={1.3} />
      </g>
      <rect x="27" y="8" width="24" height="44" rx="5" fill={SURFACE} />
      <path d="M35.5 12h7" stroke={MUTED} />
      <CheckBadge cx={39} cy={26} r={7} />
      <path d="M33 37h12M35 42h8" stroke={MUTED} strokeWidth={2.4} />
      <circle cx="51" cy="49" r="7" fill={GOLD} />
      <path d="M49 45.5v7M49 45.5h2.8a2 2 0 0 1 0 4H49M47.8 47.4h5.5" strokeWidth={1.4} />
    </Svg>
  );
}

// 4 · Happy driver in a car (front view) with earnings coins.
export function RideEarnIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <path d="M17 32l4-10a4 4 0 0 1 3.7-2.5h14.6A4 4 0 0 1 43 22l4 10z" fill={SOFT} />
      <clipPath id="illo-windshield">
        <path d="M17 32l4-10a4 4 0 0 1 3.7-2.5h14.6A4 4 0 0 1 43 22l4 10z" />
      </clipPath>
      <g clipPath="url(#illo-windshield)">
        <Person x={32} y={27} scale={0.8} shirt={GREEN} />
      </g>
      <path d="M17 32l4-10a4 4 0 0 1 3.7-2.5h14.6A4 4 0 0 1 43 22l4 10" />
      <rect x="10" y="31" width="44" height="15" rx="6" fill={PRIMARY} />
      <circle cx="17.5" cy="38" r="3" fill={GOLD} />
      <circle cx="46.5" cy="38" r="3" fill={GOLD} />
      <path d="M26 41h12" strokeWidth={2.4} />
      <rect x="13" y="45" width="9" height="7" rx="2" fill={TIRE} />
      <rect x="42" y="45" width="9" height="7" rx="2" fill={TIRE} />
      <circle cx="54" cy="14" r="6" fill={GOLD} />
      <path d="M52.3 11v6M52.3 11h2.3a1.7 1.7 0 0 1 0 3.4h-2.3M51.3 12.6h4.6" strokeWidth={1.2} />
      <path d="M8 12l1.2 2.8L12 16l-2.8 1.2L8 20l-1.2-2.8L4 16l2.8-1.2z" fill={GOLD} strokeWidth={1.2} />
    </Svg>
  );
}

// Search panel with filter sliders and a magnifying glass.
export function SmartSearchIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <rect x="6" y="10" width="34" height="40" rx="5" fill={SURFACE} />
      <path d="M12 20h22M12 30h22M12 40h22" stroke={MUTED} strokeWidth={2.4} />
      <circle cx="18" cy="20" r="3.5" fill={PRIMARY} />
      <circle cx="28" cy="30" r="3.5" fill={ACCENT} />
      <circle cx="21" cy="40" r="3.5" fill={GOLD} />
      <path d="M53 51l6 6" strokeWidth={6} />
      <path d="M53 51l6 6" stroke={GOLD} strokeWidth={3} />
      <circle cx="46" cy="44" r="9.5" fill={SOFT} strokeWidth={2.5} />
      <path d="M41.5 41a5.5 5.5 0 0 1 4.5-2.8" stroke={SURFACE} strokeWidth={2} />
    </Svg>
  );
}

// Shield with a check and a padlock.
export function SecureShieldIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <path d="M30 6l20 7v15c0 12-8.5 21.5-20 27C18.5 49.5 10 40 10 28V13z" fill={PRIMARY} />
      <path d="M30 12l14 5v11c0 8.6-5.8 15.6-14 19.8-8.2-4.2-14-11.2-14-19.8V17z" fill={SOFT} strokeWidth={1.5} />
      <path d="M23 29l5 5 9-10" stroke={SURFACE} strokeWidth={3.2} />
      <path d="M23 29l5 5 9-10" strokeWidth={1.2} />
      <rect x="44" y="40" width="14" height="12" rx="2.5" fill={GOLD} />
      <path d="M47 40v-3a4 4 0 0 1 8 0v3" />
      <circle cx="51" cy="46" r="1.4" fill={L} stroke="none" />
    </Svg>
  );
}

// Dashboard board with rising bars, a trend arrow and a coin.
export function AnalyticsIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <rect x="6" y="10" width="44" height="42" rx="5" fill={SURFACE} />
      <path d="M12 46h32" stroke={MUTED} />
      <rect x="14" y="34" width="6" height="12" rx="1.5" fill={PRIMARY} strokeWidth={1.5} />
      <rect x="24" y="27" width="6" height="19" rx="1.5" fill={ACCENT} strokeWidth={1.5} />
      <rect x="34" y="20" width="6" height="26" rx="1.5" fill={GREEN} strokeWidth={1.5} />
      <path d="M13 28l9-7 7 4 12-10" stroke={GOLD} strokeWidth={2.6} />
      <path d="M36 15h5v5" stroke={GOLD} strokeWidth={2.6} />
      <circle cx="52" cy="48" r="7" fill={GOLD} />
      <path d="M50 44.5v7M50 44.5h2.8a2 2 0 0 1 0 4H50M48.8 46.4h5.5" strokeWidth={1.4} />
    </Svg>
  );
}

// Ringing bell with an unread badge.
export function NotifyBellIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <path d="M8 22a10 10 0 0 1 4-8M56 22a10 10 0 0 0-4-8" stroke={MUTED} strokeWidth={2.2} />
      <path d="M32 10a13 13 0 0 1 13 13v9l4 7a2 2 0 0 1-1.7 3H16.7a2 2 0 0 1-1.7-3l4-7v-9a13 13 0 0 1 13-13z" fill={GOLD} />
      <path d="M24 20a9 9 0 0 1 5-5.5" stroke={SURFACE} strokeWidth={2} />
      <path d="M26.5 46a5.5 5.5 0 0 0 11 0" fill={GOLD} />
      <path d="M32 6v4" />
      <circle cx="46" cy="14" r="7" fill={RED} />
      <path d="M46 11v6" stroke={SURFACE} strokeWidth={2.2} />
    </Svg>
  );
}

// Laptop and phone showing the same page.
export function ResponsiveIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <rect x="6" y="12" width="40" height="27" rx="3" fill={SURFACE} />
      <rect x="10" y="16" width="32" height="19" rx="1.5" fill={SOFT} strokeWidth={1.5} />
      <path d="M14 21h12M14 26h18" stroke={SURFACE} strokeWidth={2.4} />
      <rect x="30" y="28" width="8" height="4" rx="1" fill={PRIMARY} strokeWidth={1.2} />
      <path d="M2 43h48l-3 5H5z" fill={MUTED} />
      <rect x="42" y="22" width="18" height="32" rx="3.5" fill={SURFACE} />
      <rect x="45" y="27" width="12" height="18" rx="1.5" fill={ACCENT} strokeWidth={1.5} />
      <path d="M48 32h6M48 36h4" stroke={SURFACE} strokeWidth={2} />
      <path d="M49.5 49.5h3" stroke={MUTED} />
    </Svg>
  );
}

// Empty states: a friendly person holding an open, empty box.
export function EmptyBoxIllo({ className }: IlloProps) {
  return (
    <Svg className={className}>
      <path d="M7 14l1 2.4L10.4 17 8 18l-1 2.4L6 18l-2.4-1L6 16.4z" fill={GOLD} strokeWidth={1.2} />
      <circle cx="54" cy="12" r="1.6" fill={MUTED} stroke="none" />
      <circle cx="58" cy="20" r="1.1" fill={MUTED} stroke="none" />
      <path d="M22 38v-6a10 10 0 0 1 20 0v6" fill={ACCENT} />
      <circle cx="32" cy="16" r="7" fill={SKIN} />
      <path d="M25 15a7 7 0 0 1 14 0c-2.4-2.6-4.6-3.4-7-3.4s-4.6.8-7 3.4z" fill={HAIR} strokeWidth={1.5} />
      <circle cx="29.4" cy="17" r="0.8" fill={L} stroke="none" />
      <circle cx="34.6" cy="17" r="0.8" fill={L} stroke="none" />
      <path d="M29.6 20q2.4 1.6 4.8 0" strokeWidth={1.4} />
      <path d="M17 36l-5-7h16l4 7z" fill={BOX} />
      <path d="M47 36l5-7H36l-4 7z" fill={BOX} />
      <rect x="17" y="36" width="30" height="20" rx="2" fill={BOX} />
      <path d="M17 36h30" strokeWidth={2.4} />
      <path d="M26 44h12" stroke={SURFACE} strokeWidth={2.2} />
      <circle cx="17" cy="43" r="3.2" fill={SKIN} />
      <circle cx="47" cy="43" r="3.2" fill={SKIN} />
    </Svg>
  );
}

// Rounded tile the illustrations sit on (gradient tint that adapts to the theme).
export function IlloTile({ children, className = 'h-16 w-16' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`illo-tile flex shrink-0 items-center justify-center rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
