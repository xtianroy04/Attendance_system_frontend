import { NextResponse } from 'next/server';
import { createAdminClient, createAnonClient } from '@/lib/supabase';
import { isAuthError, jsonError, requireUser } from '@/lib/server/auth';

export async function POST(request: Request) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const password = body.password || '';
  if (!password) return jsonError('Password is required.', 400);

  const admin = createAdminClient();
  const { data: authUser, error } = await admin.auth.admin.getUserById(ctx.profile.id);
  if (error || !authUser.user?.email) return jsonError('Incorrect password.', 400);

  const anon = createAnonClient();
  const { error: signError } = await anon.auth.signInWithPassword({
    email: authUser.user.email,
    password,
  });
  if (signError) return jsonError('Incorrect password.', 400);

  return NextResponse.json({ ok: true });
}
