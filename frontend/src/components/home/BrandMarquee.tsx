'use client';

import { motion } from 'framer-motion';

const brands = [
  { name: 'Toyota', logo: '/brands/toyota.svg' },
  { name: 'Honda', logo: '/brands/honda.svg' },
  { name: 'Ford', logo: '/brands/ford.svg' },
  { name: 'Mitsubishi', logo: '/brands/mitsubishi.svg' },
  { name: 'Suzuki', logo: '/brands/suzuki.svg' },
  { name: 'Nissan', logo: '/brands/nissan.svg' },
  { name: 'Isuzu', logo: '/brands/isuzu.svg' },
  { name: 'Hyundai', logo: '/brands/hyundai.svg' },
  { name: 'Kia', logo: '/brands/kia.svg' },
  { name: 'Yamaha', logo: '/brands/yamaha.svg' },
];

export default function BrandMarquee() {
  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-6"
        >
          Popular Brands Available in Cebu
        </motion.p>

        <div className="relative overflow-hidden brand-marquee-mask">
          <div className="flex w-max items-center gap-4 brand-marquee-track">
            {[...brands, ...brands].map((brand, i) => (
              <div
                key={`${brand.name}-${i}`}
                className="group flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-3 transition-colors dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/10"
              >
                <div className="relative h-6 w-full opacity-70 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0 dark:opacity-90 dark:brightness-0 dark:invert dark:group-hover:opacity-100 dark:group-hover:brightness-100 dark:group-hover:invert-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.logo}
                    alt={`${brand.name} logo`}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
