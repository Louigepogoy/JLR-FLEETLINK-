'use client';

import { motion } from 'framer-motion';
import { IdCard, Search, CreditCard, Car } from 'lucide-react';

const steps = [
  {
    icon: IdCard,
    title: 'Verify Your Identity',
    desc: 'Sign up with your driver\'s license and a live selfie. An admin reviews and approves every new account.',
  },
  {
    icon: Search,
    title: 'Browse or List a Vehicle',
    desc: 'Search verified Cebu vehicles to rent, or list your own — every account can do both.',
  },
  {
    icon: CreditCard,
    title: 'Pay Securely',
    desc: 'Book with GCash or card, with support for partial down payments before pickup.',
  },
  {
    icon: Car,
    title: 'Ride or Earn',
    desc: 'Pick up your vehicle at the agreed spot, or start earning once your listing is booked.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">How <span className="gradient-text">JLR Fleetlink</span> Works</h2>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            From sign-up to pickup, here&apos;s what to expect.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold">
                  {i + 1}
                </span>
                <step.icon className="w-6 h-6 text-[var(--primary)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--muted)]">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
