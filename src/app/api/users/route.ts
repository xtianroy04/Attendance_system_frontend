import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireAdmin } from '@/lib/server/auth';

function authEmail(username: string, email?: string) {
  const trimmed = (email || '').trim();
  if (trimmed) return trimmed.toLowerCase();
  return `${username.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@users.attendance.local`;
}

function serializeProfile(p: {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
}) {
  return {
    id: p.id,
    username: p.username,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    role: p.role,
    is_active: p.is_active,
  };
}

export async function GET(request: Request) {
  const ctx = await requireAdmin(request);
  if (isAuthError(ctx)) return ctx;
  const { data, error } = await ctx.admin
    .from('profiles')
    .select('id, username, first_name, last_name, email, role, is_active')
    .order('username');
  if (error) return jsonError(error.message, 400);
  return NextResponse.json((data || []).map(serializeProfile));
}

export async function POST(request: Request) {
  const ctx = await requireAdmin(request);
  if (isAuthError(ctx)) return ctx;

  let body: {
    username?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: 'admin' | 'staff';
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) return jsonError('Username and password are required.', 400);
  if (password.length < 6) return jsonError('Password must be at least 6 characters.', 400);

  const email = authEmail(username, body.email);
  const { data: created, error: createError } = await ctx.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, role: body.role || 'staff' },
  });
  if (createError || !created.user) return jsonError(createError?.message || 'Could not create user.', 400);

  const { data: profile, error: profileError } = await ctx.admin
    .from('profiles')
    .insert({
      id: created.user.id,
      username,
      first_name: (body.first_name || '').trim(),
      last_name: (body.last_name || '').trim(),
      email: (body.email || '').trim(),
      role: body.role === 'admin' ? 'admin' : 'staff',
      is_active: true,
    })
    .select('id, username, first_name, last_name, email, role, is_active')
    .single();

  if (profileError) {
    await ctx.admin.auth.admin.deleteUser(created.user.id);
    return jsonError(
      profileError.message.includes('duplicate') || profileError.code === '23505'
        ? 'That username is already taken.'
        : profileError.message,
      400
    );
  }

  return NextResponse.json(serializeProfile(profile), { status: 201 });
}
