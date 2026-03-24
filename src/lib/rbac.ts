import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireRole(roles: ('admin' | 'staff' | 'manager')[]) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.role || !roles.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role' }, { status: 403 });
    }

    return null; // Passes verification
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
