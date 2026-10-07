'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ui/ThemeToggle';
import BrandLogo from '@/components/ui/BrandLogo';

interface AuthShellProps {
  title: string;
  subtitle: string;
  panelTitle: React.ReactNode;
  panelText: string;
  children: React.ReactNode;
}

/**
 * Split layout shared by the sign-in and create-account pages: the form on the left and a photo
 * panel with a tagline on the right, floating over a blurred copy of the same photo.
 */
export default function AuthShell({ title, subtitle, panelTitle, panelText, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 sm:p-6 bg-white dark:bg-[#07111f]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Blurred anyway, so a small copy is enough. */}
        <Image src="/hero.jpg" alt="" fill priority quality={40} sizes="640px" className="object-cover scale-110 blur-2xl opacity-70 dark:opacity-40" />
        <div className="absolute inset-0 bg-white/50 dark:bg-[#07111f]/70" />
      </div>
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-blue-950/20 md:grid-cols-[1fr_1.1fr] dark:border-white/10 dark:bg-[#0f172a]"
      >
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <BrandLogo />
              <span className="text-xl font-bold gradient-text">JLR Fleetlink</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-semibold">{title}</h1>
            <p className="mt-1 text-[var(--muted)]">{subtitle}</p>
          </div>
          <div className="auth-form mx-auto w-full max-w-sm">{children}</div>
        </div>

        {/* Photo panel: a blurred copy fills the panel, the full picture (all vehicles and the GET A RIDE
            title) sits centered on top of it, and the tagline overlays the darkened bottom. */}
        <div className="relative m-3 hidden min-h-[560px] overflow-hidden rounded-2xl md:block">
          <Image src="/hero.jpg" alt="" fill quality={40} sizes="640px" className="scale-125 object-cover blur-xl" />
          <div className="absolute inset-x-0 top-0 bottom-[34%] flex items-center px-2">
            <Image
              src="/hero.jpg"
              alt="Van, motorcycle, and car available to rent on JLR Fleetlink"
              width={1644}
              height={957}
              sizes="(min-width: 1024px) 560px, 55vw"
              className="h-auto w-full [mask-image:linear-gradient(to_bottom,transparent,#000_10%,#000_94%,transparent),linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)] [mask-composite:intersect] [-webkit-mask-composite:source-in]"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#061934] via-[#061934]/90 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <h2 className="text-3xl lg:text-4xl font-semibold leading-tight">{panelTitle}</h2>
            <p className="mt-3 max-w-sm text-sm text-white/75">{panelText}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
