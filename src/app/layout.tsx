import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Kaos Kami SCM',
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

import AppLayout from '@/components/layout/AppLayout';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.variable}>
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
