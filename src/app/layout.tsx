import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: { default: 'Kaos Kami SCM', template: '%s — Kaos Kami SCM' },
  description: 'Supply Chain Management System eksklusif untuk operasional Kaos Kami, mengelola stok, pesanan, dan AI analytics secara real-time.',
  keywords: ['SCM', 'Kaos Kami', 'Gudang', 'ERP', 'Warehouse Management'],
  authors: [{ name: 'Kaos Kami SCM Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'Stok KaosKami',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
  openGraph: {
    title: 'Kaos Kami SCM',
    description: 'Sistem Manajemen Rantai Pasok pintar untuk Kaos Kami',
    url: 'https://kaoskami-scm.vercel.app',
    siteName: 'Kaos Kami SCM',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kaos Kami SCM Dashboard',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaos Kami SCM',
    description: 'Sistem Manajemen Gudang Pintar',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png'
  }
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
import NetworkStatus from '@/components/NetworkStatus';
import AppUpdateBanner from '@/components/AppUpdateBanner';

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
            <NetworkStatus />
            <AppUpdateBanner />
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

