'use server';

import { cookies } from 'next/headers';
import { encrypt } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(password: string) {
  // In production, use env var. Hardcoded fallback for easy local dev testing
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword && process.env.NODE_ENV === 'production') {
    return { success: false, error: 'Sistem belum dikonfigurasi: Variabel ADMIN_PASSWORD hilang di Vercel!' };
  }
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    return { success: false, error: 'Sistem belum dikonfigurasi: Variabel JWT_SECRET hilang di Vercel!' };
  }
  
  if (password !== (adminPassword || 'admin123')) {
    return { success: false, error: 'Password salah' };
  }
  
  const token = await encrypt({ role: 'admin', loggedInAt: new Date().toISOString() });
  
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  
  return { success: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/login');
}
