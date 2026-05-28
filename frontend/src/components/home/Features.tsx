'use client';

import { motion } from 'framer-motion';
import { CreditCard, Search, Shield, BarChart3, Bell, Smartphone } from 'lucide-react';

const features = [
  { icon: Search, title: 'Smart Search & Filters', desc: 'Find the perfect vehicle by type, price, location, and more.' },
  { icon: CreditCard, title: 'GCash & Card Payments', desc: 'Pay securely with GCash or Visa/Mastercard. Support partial payments.' },
  { icon: Shield, title: 'Verified & Secure', desc: 'JWT authentication, role-based access, and double-booking prevention.' },
  { icon: BarChart3, title: 'Owner Analytics', desc: 'Track earnings, bookings, and transactions in real-time.' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Stay updated on bookings, payments, and platform alerts.' },
  { icon: Smartphone, title: 'Fully Responsive', desc: 'Seamless experience on desktop, tablet, and mobile devices.' },
];

export default function Features() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Why Choose <span className="gradient-text">JLR Fleetlink</span></h2>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            A complete vehicle rental platform built for customers, owners, and administrators.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-card p-6 group cursor-default"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--muted)]">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
