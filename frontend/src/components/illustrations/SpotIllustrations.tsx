// Section and empty-state icons (home page, policies, empty lists): simple blue line icons on a soft tile.
// Each export keeps its original name so every page that uses it picks up the new style.
import type { ComponentType } from 'react';
import {
  BadgeCheck, Bell, CarFront, ChartColumn, FileText, IdCard, Inbox, LifeBuoy, Lock, MessageSquare,
  MonitorSmartphone, ReceiptText, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Smartphone, Star, Timer,
  Vault, type LucideIcon,
} from 'lucide-react';

// The icon fills about half of whatever tile it sits in, matching the dashboard icons. Callers may still
// pass a className (from the old illustrations); the size comes from the tile instead.
const line = (Icon: LucideIcon): ComponentType<{ className?: string }> => {
  function LineIllo() {
    return <Icon className="h-[45%] w-[45%] text-[var(--primary)]" strokeWidth={1.75} aria-hidden="true" />;
  }
  return LineIllo;
};

// How it works
export const VerifyIdIllo = line(IdCard);
export const BrowseCarIllo = line(Search);
export const PayPhoneIllo = line(Smartphone);
export const RideEarnIllo = line(CarFront);

// Why choose JLR Fleetlink
export const SmartSearchIllo = line(SlidersHorizontal);
export const SecureShieldIllo = line(ShieldCheck);
export const AnalyticsIllo = line(ChartColumn);
export const NotifyBellIllo = line(Bell);
export const ResponsiveIllo = line(MonitorSmartphone);

// Rent with confidence
export const HeldPaymentIllo = line(Vault);
export const InspectCarIllo = line(Timer);
export const RefundIllo = line(RotateCcw);
export const ApprovedListingIllo = line(BadgeCheck);
export const ChatMediaIllo = line(MessageSquare);
export const RatingsIllo = line(Star);

// Policies & legal
export const TermsIllo = line(FileText);
export const PrivacyIllo = line(Lock);
export const RefundPolicyIllo = line(ReceiptText);
export const HelpDeskIllo = line(LifeBuoy);

// Empty states
export const EmptyBoxIllo = line(Inbox);

// Rounded tile the icons sit on (soft gradient tint that adapts to the theme).
export function IlloTile({ children, className = 'h-16 w-16' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`illo-tile flex shrink-0 items-center justify-center rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
