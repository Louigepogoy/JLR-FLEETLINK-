'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Stepper({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-[var(--card-border)]" />
        <motion.div
          className="absolute top-5 left-0 h-0.5 gradient-bg"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
        {steps.map((label, i) => {
          const id = i + 1;
          return (
            <div key={label} className="flex flex-col items-center relative z-10">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                  currentStep > id
                    ? 'gradient-bg border-transparent text-white'
                    : currentStep === id
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)]'
                )}
                animate={currentStep === id ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: currentStep === id ? Infinity : 0, duration: 2 }}
              >
                {currentStep > id ? <Check className="w-5 h-5" /> : id}
              </motion.div>
              <span className={cn(
                'text-xs mt-2 hidden sm:block',
                currentStep >= id ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
