'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/store/themeStore';

export default function Providers({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme, setTheme]);

  return (
    <>
      {children}
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
