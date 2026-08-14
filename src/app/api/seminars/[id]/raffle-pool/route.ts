import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireUser } from '@/lib/server/auth';
import {
  dateRange,
  serializeSeminar,
  type SeminarRow,
  type SeminarianRow,
} from '@/lib/server/domain';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;
  const mode = new URL(request.url).searchParams.get('mode') || 'all';
  if (!['all', 'perfect', 'manual', 'non_adventist'].includes(mode)) {
    return jsonError('mode must be all, perfect, manual, or non_adventist.', 400);
  }

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
      .select('seminarian_id, status')
      .eq('seminar_id', Number(id))
      .eq('status', 'present'),
  ]);

  const dates = dateRange(seminar.start_date, seminar.end_date);
  const dayCount = dates.length;
  const presentCounts = new Map<number, number>();
  for (const s of (seminarians || []) as SeminarianRow[]) presentCounts.set(s.id, 0);
  for (const row of records || []) {
    presentCounts.set(row.seminarian_id, (presentCounts.get(row.seminarian_id) || 0) + 1);
  }

  const allEntries = ((seminarians || []) as SeminarianRow[]).map((s) => {
    const presentCount = presentCounts.get(s.id) || 0;
    return {
      id: s.id,
      full_name: `${s.first_name} ${s.last_name}`,
      first_name: s.first_name,
      last_name: s.last_name,
      is_adventist: s.is_adventist,
      present_count: presentCount,
      total_days: dayCount,
      perfect_attendance: dayCount > 0 && presentCount === dayCount,
    };
  });

  let pool = allEntries;
  if (mode === 'perfect') pool = allEntries.filter((e) => e.perfect_attendance);
  if (mode === 'non_adventist') pool = allEntries.filter((e) => !e.is_adventist);

  return NextResponse.json({
    seminar: serializeSeminar(seminar as SeminarRow),
    mode,
    day_count: dayCount,
    pool,
    pool_count: pool.length,
    all_seminarians: allEntries,
  });
}
