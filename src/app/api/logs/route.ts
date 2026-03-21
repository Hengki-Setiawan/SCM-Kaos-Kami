import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  // Only accessible with auth header in production
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.JWT_SECRET || 'dev-secret';
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const level = url.searchParams.get('level'); // 'error', 'warn', 'info', or null for all
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let logs;
  if (level === 'error') {
    logs = logger.getRecentErrors(limit);
  } else {
    logs = logger.getRecentLogs(limit);
    if (level) {
      logs = logs.filter(l => l.level === level);
    }
  }

  return NextResponse.json({ 
    success: true, 
    count: logs.length,
    logs 
  });
}
