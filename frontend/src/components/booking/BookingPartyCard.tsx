import Link from 'next/link';
import { BadgeCheck, Mail, Phone } from 'lucide-react';
import { profilePath } from '@/lib/chat';

type Props = {
  label: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  verified?: boolean | null;
  email?: string | null;
  phone?: string | null;
  // Shown instead of the contact details when the backend withheld them (booking not accepted yet).
  hiddenContactNote?: string;
};

/** The other person on a booking: the owner for a renter, or the renter for an owner. */
export default function BookingPartyCard({
  label, userId, name, avatarUrl, verified, email, phone, hiddenContactNote,
}: Props) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--card-border)] p-3">
      <Link href={profilePath(userId)} className="shrink-0" title="View profile">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg font-semibold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>
      <div className="min-w-0 text-sm">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="flex items-center gap-1 font-medium">
          <Link href={profilePath(userId)} className="truncate hover:underline">{name}</Link>
          {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-label="Verified" />}
        </p>
        {(email || phone) ? (
          <p className="flex flex-wrap gap-x-3 text-xs text-[var(--muted)]">
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-1 hover:underline">
                <Mail className="h-3 w-3" /> {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1 hover:underline">
                <Phone className="h-3 w-3" /> {phone}
              </a>
            )}
          </p>
        ) : hiddenContactNote ? (
          <p className="text-xs text-[var(--muted)]">{hiddenContactNote}</p>
        ) : null}
      </div>
    </div>
  );
}
