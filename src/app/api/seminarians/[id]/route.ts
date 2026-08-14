import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireAdmin } from '@/lib/server/auth';
import { serializeSeminarian, type SeminarianRow } from '@/lib/server/domain';

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
  if (typeof body.birthdate === 'string') updates.birthdate = body.birthdate;
  if (typeof body.address === 'string') updates.address = body.address.trim();
  if (typeof body.is_adventist === 'boolean') updates.is_adventist = body.is_adventist;

  const { data, error } = await ctx.admin
    .from('seminarians')
    .update(updates)
    .eq('id', Number(id))
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') return jsonError('This name is already registered. Same name is not allowed.', 400);
    return jsonError(error.message, 400);
  }
  if (!data) return jsonError('Seminarian not found.', 404);
  return NextResponse.json(serializeSeminarian(data as SeminarianRow));
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;
  const { error } = await ctx.admin.from('seminarians').delete().eq('id', Number(id));
  if (error) return jsonError(error.message, 400);
  return new NextResponse(null, { status: 204 });
}
