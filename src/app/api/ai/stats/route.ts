import { NextResponse } from 'next/server';
import { getAIStats } from '@/lib/ai-logger';
import { requireRole } from '@/lib/rbac';

export async function GET() {
  // Hanya admin yang bisa melihat stats AI ini
  const roleCheck = await requireRole(['admin']);
  if (roleCheck) return roleCheck;

  return NextResponse.json({
    success: true,
    data: getAIStats()
  });
}
