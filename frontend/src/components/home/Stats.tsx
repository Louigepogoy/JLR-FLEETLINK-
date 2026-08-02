'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

function Counter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}</>;
}

export default function Stats() {
  const [stats, setStats] = useState({ availableVehicles: 0, activeUsers: 0, citiesCovered: 11 });

  useEffect(() => {
    api.get('/vehicles/stats/summary').then((res) => setStats(res.data.data)).catch(() => {});
  }, []);

  const items = [
    { value: stats.availableVehicles, suffix: '', label: 'Vehicles Available Now' },
    { value: stats.activeUsers, suffix: '', label: 'Registered Users' },
    { value: stats.citiesCovered, suffix: '', label: 'Cebu Cities & Municipalities' },
  ];

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {items.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl lg:text-4xl font-bold gradient-text">
                <Counter target={stat.value} />
                {stat.suffix}
              </div>
              <p className="text-sm text-[var(--muted)] mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
