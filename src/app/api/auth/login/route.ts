import { NextResponse } from 'next/server';
import { createAdminClient, createAnonClient } from '@/lib/supabase';
import { jsonError } from '@/lib/server/auth';

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) return jsonError('Username and password are required.', 400);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, is_active')
    .ilike('username', username)
    .maybeSingle();

  if (!profile) return jsonError('No active account found with the given credentials.', 401);
  if (!profile.is_active) return jsonError('This account is inactive.', 401);

  const { data: authUser, error: userError } = await admin.auth.admin.getUserById(profile.id);
  if (userError || !authUser.user?.email) {
    return jsonError('No active account found with the given credentials.', 401);
  }

  const anon = createAnonClient();
  const { data, error } = await anon.auth.signInWithPassword({
    email: authUser.user.email,
    password,
  });

  if (error || !data.session) {
    return jsonError('No active account found with the given credentials.', 401);
  }

  return NextResponse.json({
    access: data.session.access_token,
    refresh: data.session.refresh_token,
  });
}
