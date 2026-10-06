import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  HelpDeskIllo, IlloTile, PrivacyIllo, RefundPolicyIllo, TermsIllo,
} from '@/components/illustrations/SpotIllustrations';

const policies = [
  {
    icon: TermsIllo,
    title: 'Terms of Service',
    desc: 'The rules for booking, listing, payments, and conduct on the platform.',
    href: '/terms',
  },
  {
    icon: PrivacyIllo,
    title: 'Privacy Policy',
    desc: 'What personal data we collect, why we need it, and how we protect it.',
    href: '/privacy',
  },
  {
    icon: RefundPolicyIllo,
    title: 'Refund & Dispute Policy',
    desc: 'How held payments, pickup inspections, disputes, and refunds work.',
    href: '/refund-policy',
  },
  {
    icon: HelpDeskIllo,
    title: 'Help Center',
    desc: 'Answers to common questions, or send a ticket to our support team.',
    href: '/help',
  },
];

/** Home page section linking to the platform's legal policies. */
export default function LegalSection() {
  return (
    <section id="legal" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10" data-reveal>
          <h2 className="text-3xl font-bold mb-3">Policies <span className="gradient-text">&amp; Legal</span></h2>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            Clear rules protect everyone. Please read them before you book or list a vehicle.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {policies.map(({ icon: Icon, title, desc, href }) => (
            <Link key={title} href={href} className="glass-card group flex flex-col p-5 transition-transform hover:-translate-y-1">
              <IlloTile className="mb-4 h-16 w-16 transition-transform duration-300 group-hover:scale-105">
                <Icon className="h-11 w-11" />
              </IlloTile>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="mb-4 flex-1 text-sm text-[var(--muted)]">{desc}</p>
              <span className="flex items-center gap-1 text-sm font-medium text-[var(--primary)]">
                Read more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-[var(--muted)]" data-reveal>
          Online payments and refunds are processed by PayMongo. JLR Fleetlink never sees or stores your full card details.
          By using the platform you agree to our{' '}
          <Link href="/terms" className="text-[var(--primary)] hover:underline">Terms of Service</Link> and{' '}
          <Link href="/privacy" className="text-[var(--primary)] hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
}
