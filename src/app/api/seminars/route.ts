import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireAdmin, requireUser } from '@/lib/server/auth';
import { serializeSeminar, type SeminarRow } from '@/lib/server/domain';

export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;
  const { data, error } = await ctx.admin
    .from('seminars')
    .select('*')
    .order('start_date', { ascending: false })
    .order('id', { ascending: false });
  if (error) return jsonError(error.message, 400);
  return NextResponse.json((data as SeminarRow[]).map((s) => serializeSeminar(s)));
}

export async function POST(request: Request) {
  const ctx = await requireAdmin(request);
  if (isAuthError(ctx)) return ctx;

  let body: { title?: string; start_date?: string; end_date?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const title = (body.title || '').trim();
  if (!title || !body.start_date || !body.end_date) {
    return jsonError('Title, start date, and end date are required.', 400);
  }
  if (body.end_date < body.start_date) {
    return NextResponse.json({ end_date: 'End date must be on or after start date.' }, { status: 400 });
  }

  const { data, error } = await ctx.admin
    .from('seminars')
    .insert({
      title,
      start_date: body.start_date,
      end_date: body.end_date,
      created_by: ctx.profile.id,
    })
    .select('*')
    .single();
  if (error) return jsonError(error.message, 400);
  return NextResponse.json(serializeSeminar(data as SeminarRow), { status: 201 });
}
