import Link from 'next/link';
import type { ComponentType } from 'react';
import { EmptyBoxIllo } from '@/components/illustrations/SpotIllustrations';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  // Optional small badge shown on the illustration to hint at what's empty.
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="glass-card p-12 flex flex-col items-center gap-3 text-center">
      <div className="illo-tile relative mb-1 flex h-28 w-28 items-center justify-center rounded-3xl">
        <EmptyBoxIllo className="h-24 w-24" />
        {Icon && (
          <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--background)] text-[var(--primary)] shadow-md ring-1 ring-[var(--card-border)]">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="font-semibold">{title}</p>
      {description && <p className="text-sm text-[var(--muted)] max-w-sm">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary text-sm mt-2">{actionLabel}</Link>
      )}
    </div>
  );
}
