'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/store/themeStore';
import VerifyAccountFloat from '@/components/layout/VerifyAccountFloat';

export default function Providers({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme, setTheme]);

  return (
    <>
      {children}
      <VerifyAccountFloat />
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'glass-card !bg-[var(--card)] !text-[var(--foreground)]',
          duration: 4000,
        }}
      />
    </>
  );
}
