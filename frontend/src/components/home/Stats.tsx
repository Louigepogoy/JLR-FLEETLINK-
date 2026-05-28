'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const stats = [
  { value: 500, suffix: '+', label: 'Premium Vehicles' },
  { value: 10000, suffix: '+', label: 'Happy Customers' },
  { value: 50, suffix: '+', label: 'Cities Covered' },
  { value: 4.9, suffix: '★', label: 'Average Rating', decimal: true },
];

function Counter({ target, decimal }: { target: number; decimal?: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(decimal ? Math.round(current * 10) / 10 : Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, decimal]);
  return <>{decimal ? count.toFixed(1) : count.toLocaleString()}</>;
}

export default function Stats() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl lg:text-4xl font-bold gradient-text">
                <Counter target={stat.value} decimal={stat.decimal} />
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
