import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'staff';
  is_active: boolean;
};

export type AuthContext = {
  profile: Profile;
  admin: ReturnType<typeof createAdminClient>;
};

export function jsonError(detail: string, status: number) {
  return NextResponse.json({ detail }, { status });
}

export async function requireUser(request: Request): Promise<AuthContext | NextResponse> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return jsonError('Authentication credentials were not provided.', 401);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return jsonError('Invalid or expired token.', 401);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, username, first_name, last_name, email, role, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) return jsonError('Profile not found.', 401);
  if (!profile.is_active) return jsonError('This account is inactive.', 401);

  return { profile: profile as Profile, admin };
}

export async function requireAdmin(request: Request): Promise<AuthContext | NextResponse> {
  const ctx = await requireUser(request);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.profile.role !== 'admin') return jsonError('Admin access required.', 403);
  return ctx;
}

export function isAuthError(value: AuthContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
