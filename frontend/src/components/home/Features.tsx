'use client';

import { motion } from 'framer-motion';
import {
  AnalyticsIllo, IlloTile, NotifyBellIllo, PayPhoneIllo, ResponsiveIllo, SecureShieldIllo, SmartSearchIllo,
} from '@/components/illustrations/SpotIllustrations';

const features = [
  { icon: SmartSearchIllo, title: 'Smart Search & Filters', desc: 'Find the perfect vehicle by type, price, location, and more.' },
  { icon: PayPhoneIllo, title: 'GCash & Card Payments', desc: 'Pay securely with GCash or Visa/Mastercard. Support partial payments.' },
  { icon: SecureShieldIllo, title: 'Verified & Secure', desc: 'JWT authentication, role-based access, and double-booking prevention.' },
  { icon: AnalyticsIllo, title: 'Owner Analytics', desc: 'Track earnings, bookings, and transactions in real-time.' },
  { icon: NotifyBellIllo, title: 'Smart Notifications', desc: 'Stay updated on bookings, payments, and platform alerts.' },
  { icon: ResponsiveIllo, title: 'Fully Responsive', desc: 'Seamless experience on desktop, tablet, and mobile devices.' },
];

export default function Features() {
  return (
    <section id="features" className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Why Choose <span className="gradient-text">JLR Fleetlink</span></h2>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            A complete peer-to-peer vehicle rental marketplace for the whole Philippines — rent a ride, or list your own and start earning.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-card p-4 sm:p-6 group cursor-default"
            >
              <IlloTile className="mb-3 h-12 w-12 sm:mb-5 sm:h-20 sm:w-20 transition-transform duration-300 group-hover:scale-105">
                <feature.icon className="h-8 w-8 sm:h-14 sm:w-14" />
              </IlloTile>
              <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 leading-snug">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)]">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
