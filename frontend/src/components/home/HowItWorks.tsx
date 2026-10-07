'use client';

import { motion } from 'framer-motion';
import { BrowseCarIllo, IlloTile, PayPhoneIllo, RideEarnIllo, VerifyIdIllo } from '@/components/illustrations/SpotIllustrations';

const steps = [
  {
    icon: VerifyIdIllo,
    title: 'Verify Your Identity',
    desc: 'Sign up with your driver\'s license and a live selfie. An admin reviews and approves every new account.',
  },
  {
    icon: BrowseCarIllo,
    title: 'Browse or List a Vehicle',
    desc: 'Search verified vehicles anywhere in the Philippines, or list your own — every account can do both.',
  },
  {
    icon: PayPhoneIllo,
    title: 'Pay Securely',
    desc: 'Book with GCash or card, with support for partial down payments before pickup.',
  },
  {
    icon: RideEarnIllo,
    title: 'Ride or Earn',
    desc: 'Pick up your vehicle at the agreed spot, or start earning once your listing is booked.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">How <span className="gradient-text">JLR Fleetlink</span> Works</h2>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            From sign-up to pickup, here&apos;s what to expect.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4 sm:p-6 group"
            >
              <div className="relative mb-3 sm:mb-5 w-fit">
                <IlloTile className="h-12 w-12 sm:h-20 sm:w-20 transition-transform duration-300 group-hover:scale-105">
                  <step.icon className="h-8 w-8 sm:h-14 sm:w-14" />
                </IlloTile>
                <span className="absolute -left-2 -top-2 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white shadow-md ring-2 ring-[var(--background)]">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 leading-snug">{step.title}</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
