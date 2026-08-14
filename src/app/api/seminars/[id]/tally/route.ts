import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireUser } from '@/lib/server/auth';
import {
  buildTally,
  type AttendanceRow,
  type SeminarRow,
  type SeminarianRow,
} from '@/lib/server/domain';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  const { data: seminar, error } = await ctx.admin
    .from('seminars')
    .select('*')
    .eq('id', Number(id))
    .maybeSingle();
  if (error) return jsonError(error.message, 400);
  if (!seminar) return jsonError('Seminar not found.', 404);

  const [{ data: seminarians }, { data: records }] = await Promise.all([
    ctx.admin.from('seminarians').select('*').order('last_name').order('first_name'),
    ctx.admin
      .from('attendance')
      .select('seminarian_id, date, status')
      .eq('seminar_id', Number(id)),
  ]);

  return NextResponse.json(
    buildTally(seminar as SeminarRow, (seminarians || []) as SeminarianRow[], (records || []) as AttendanceRow[])
  );
}
