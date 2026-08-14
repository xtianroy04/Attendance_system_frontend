import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireUser } from '@/lib/server/auth';
import {
  buildTally,
  type AttendanceRow,
  type SeminarRow,
  type SeminarianRow,
  todayISO,
} from '@/lib/server/domain';

export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') || 'all').toLowerCase();
  const today = todayISO();

  let query = ctx.admin.from('seminars').select('*').order('start_date', { ascending: false });
  if (status === 'ended') query = query.lt('end_date', today);
  else if (status === 'active') query = query.lte('start_date', today).gte('end_date', today);
  else if (status === 'upcoming') query = query.gt('start_date', today);

  const [{ data: seminars, error }, { data: seminarians }, { data: records }] = await Promise.all([
    query,
    ctx.admin.from('seminarians').select('*'),
    ctx.admin.from('attendance').select('seminar_id, seminarian_id, date, status'),
  ]);
  if (error) return jsonError(error.message, 400);

  const bySeminar = new Map<number, AttendanceRow[]>();
  for (const row of records || []) {
    const list = bySeminar.get(row.seminar_id) || [];
    list.push(row);
    bySeminar.set(row.seminar_id, list);
  }

  const results = ((seminars || []) as SeminarRow[]).map((seminar) => {
    const tally = buildTally(
      seminar,
      (seminarians || []) as SeminarianRow[],
      bySeminar.get(seminar.id) || [],
      today
    );
    return {
      seminar: tally.seminar,
      total_seminarians: tally.total_seminarians,
      total_days: tally.seminar.day_count,
      elapsed_days: tally.elapsed_days,
      total_present_marks: tally.total_present_marks,
      perfect_count: tally.perfect_count,
      attendance_rate: tally.attendance_rate,
      present_today: tally.seminar.is_active ? tally.present_today : null,
    };
  });

  return NextResponse.json({ status, count: results.length, results });
}
