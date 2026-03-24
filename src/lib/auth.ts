import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
  console.warn('⚠️ WARNING: JWT_SECRET tidak terkonfigurasi! Menggunakan random secret sementara untuk sesi ini.');
}

// Gunakan secret dari ENV, atau generate string acak unik untuk setiap jalannya server
const fallbackSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const key = new TextEncoder().encode(secretKey || fallbackSecret);

export async function encrypt(payload: any) {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: JWT_SECRET tidak terkonfigurasi di Vercel!');
  }
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (e) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}
