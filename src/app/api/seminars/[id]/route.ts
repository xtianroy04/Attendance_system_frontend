import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireAdmin } from '@/lib/server/auth';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;
  const { error } = await ctx.admin.from('seminars').delete().eq('id', Number(id));
  if (error) return jsonError(error.message, 400);
  return new NextResponse(null, { status: 204 });
}
