import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireAdmin } from '@/lib/server/auth';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.first_name === 'string') updates.first_name = body.first_name.trim();
  if (typeof body.last_name === 'string') updates.last_name = body.last_name.trim();
  if (typeof body.email === 'string') updates.email = body.email.trim();
  if (typeof body.username === 'string') updates.username = body.username.trim();
  if (body.role === 'admin' || body.role === 'staff') updates.role = body.role;
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

  if (typeof body.password === 'string' && body.password) {
    if (body.password.length < 6) return jsonError('Password must be at least 6 characters.', 400);
    const { error } = await ctx.admin.auth.admin.updateUserById(id, { password: body.password });
    if (error) return jsonError(error.message, 400);
  }

  if (Object.keys(updates).length) {
    const { error } = await ctx.admin.from('profiles').update(updates).eq('id', id);
    if (error) return jsonError(error.message, 400);
  }

  const { data: profile, error } = await ctx.admin
    .from('profiles')
    .select('id, username, first_name, last_name, email, role, is_active')
    .eq('id', id)
    .maybeSingle();
  if (error || !profile) return jsonError('User not found.', 404);
  return NextResponse.json(profile);
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;
  if (id === ctx.profile.id) return jsonError('You cannot delete your own account.', 400);

  const { error } = await ctx.admin.auth.admin.deleteUser(id);
  if (error) return jsonError(error.message, 400);
  return new NextResponse(null, { status: 204 });
}
