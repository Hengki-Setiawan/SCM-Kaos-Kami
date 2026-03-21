import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: { default: 'Kaos Kami SCM', template: '%s — Kaos Kami SCM' },
  description: 'Supply Chain Management System untuk Kaos Kami',
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'Kaos Kami',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

import { validateEnv } from '@/lib/env';

// E5: Validate env on boot
validateEnv();

import AppLayout from '@/components/layout/AppLayout';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/ConfirmDialog';

import SearchModal from '@/components/SearchModal';
import InstallBanner from '@/components/InstallBanner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.variable}>
        <ToastProvider>
          <ConfirmProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <SearchModal />
            <InstallBanner />
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

