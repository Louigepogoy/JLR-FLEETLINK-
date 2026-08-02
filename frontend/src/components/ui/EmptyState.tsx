import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="glass-card p-12 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
        <Icon className="w-6 h-6" />
      </div>
      <p className="font-semibold">{title}</p>
      {description && <p className="text-sm text-[var(--muted)] max-w-sm">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary text-sm mt-2">{actionLabel}</Link>
      )}
    </div>
  );
}
