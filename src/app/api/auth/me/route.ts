import { NextResponse } from 'next/server';
import { isAuthError, requireUser } from '@/lib/server/auth';

export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;
  const p = ctx.profile;
  return NextResponse.json({
    id: p.id,
    username: p.username,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    role: p.role,
    is_active: p.is_active,
  });
}
