'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Maria Santos',
    role: 'Customer',
    text: 'Booking was seamless! Paid ₱3,000 down payment via GCash and completed the rest before pickup. Highly recommend!',
    rating: 5,
  },
  {
    name: 'Juan Dela Cruz',
    role: 'Vehicle Owner',
    text: 'I listed my SUV and started earning within a week. The commission system is transparent and payouts are fast.',
    rating: 5,
  },
  {
    name: 'Ana Reyes',
    role: 'Customer',
    text: 'Best rental platform in the Philippines. Clean UI, great vehicles, and the dark mode is gorgeous!',
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">What Our <span className="gradient-text">Users Say</span></h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass-card p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-sm text-[var(--muted)] mb-6">&ldquo;{t.text}&rdquo;</p>
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-[var(--muted)]">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
