// Dashboard icons (sidebar menu, stat cards, page titles): simple blue line icons on a soft tile.
// Each export keeps its original name so every page that uses it picks up the new style.
import type { ComponentType } from 'react';
import {
  CalendarCheck, Car, ChartColumn, ClipboardList, Coins, CreditCard, Crown, Flag, Headset, History, Hourglass,
  House, IdCard, LayoutDashboard, MessageCircle, Package, Receipt, Search, Settings, ShieldAlert, TrendingUp,
  Users, Wallet, type LucideIcon,
} from 'lucide-react';

export type MiniIcon = ComponentType<{ className?: string }>;

const line = (Icon: LucideIcon): MiniIcon => {
  function LineIcon({ className }: { className?: string }) {
    return <Icon className={`text-[var(--primary)] ${className ?? ''}`} strokeWidth={1.75} aria-hidden="true" />;
  }
  return LineIcon;
};

export const HomeIcon = line(House);
export const OverviewIcon = line(LayoutDashboard);
export const MessagesIcon = line(MessageCircle);
export const CalendarCheckIcon = line(CalendarCheck);
export const BrowseCarIcon = line(Search);
export const MyVehicleIcon = line(Car);
export const RequestsIcon = line(ClipboardList);
export const EarningsIcon = line(Coins);
export const ReceiptIcon = line(Receipt);
export const CrownIcon = line(Crown);
export const SupportIcon = line(Headset);
export const VerifyIdIcon = line(IdCard);
export const UsersIcon = line(Users);
export const HistoryIcon = line(History);
export const FlagIcon = line(Flag);
export const DisputeIcon = line(ShieldAlert);
export const CardIcon = line(CreditCard);
export const WalletIcon = line(Wallet);
export const ChartIcon = line(ChartColumn);
export const SettingsIcon = line(Settings);
export const TrendUpIcon = line(TrendingUp);
export const PendingIcon = line(Hourglass);
export const PackageIcon = line(Package);

// Soft tile an icon sits on in the sidebar, stat cards, and page titles. `className` sets the tile size
// and corner radius; the icon always fills about half of the tile so every size looks the same.
export function IconChip({ icon: Icon, className = 'h-8 w-8 rounded-lg' }: {
  icon: MiniIcon;
  className?: string;
  // Kept for existing callers; the icon is sized relative to the tile instead.
  iconClassName?: string;
}) {
  return (
    <span className={`illo-tile flex shrink-0 items-center justify-center ${className}`}>
      <Icon className="h-[55%] w-[55%]" />
    </span>
  );
}
