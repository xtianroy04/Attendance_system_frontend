import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireUser } from '@/lib/server/auth';
import { dayCount, todayISO } from '@/lib/server/domain';

export async function POST(request: Request) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;

  let body: { seminarian_id?: number; seminar_id?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const seminarianId = Number(body.seminarian_id);
  const seminarId = Number(body.seminar_id);
  if (!seminarianId || !seminarId) return jsonError('seminarian_id and seminar_id are required.', 400);

  const today = todayISO();
  const { data: seminar } = await ctx.admin.from('seminars').select('*').eq('id', seminarId).maybeSingle();
  if (!seminar) return jsonError('Seminar not found.', 404);
  if (today < seminar.start_date || today > seminar.end_date) {
    return jsonError('Today is outside this seminar date range.', 400);
  }

  const { data: seminarian } = await ctx.admin
    .from('seminarians')
    .select('*')
    .eq('id', seminarianId)
    .maybeSingle();
  if (!seminarian) return jsonError('Seminarian not found.', 404);

  const { data: existing } = await ctx.admin
    .from('attendance')
    .select('id')
    .eq('seminar_id', seminarId)
    .eq('seminarian_id', seminarianId)
    .eq('date', today)
    .eq('status', 'present')
    .maybeSingle();
  if (existing) return jsonError('This seminarian is already marked present today.', 400);

  const { count: priorPresent } = await ctx.admin
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('seminar_id', seminarId)
    .eq('seminarian_id', seminarianId)
    .eq('status', 'present')
    .lt('date', today)
    .gte('date', seminar.start_date);

  const { data: record, error } = await ctx.admin
    .from('attendance')
    .upsert(
      {
        seminar_id: seminarId,
        seminarian_id: seminarianId,
        date: today,
        status: 'present',
        marked_by: ctx.profile.id,
      },
      { onConflict: 'seminar_id,seminarian_id,date' }
    )
    .select('*')
    .single();

  if (error) return jsonError(error.message, 400);

  const prior = priorPresent || 0;
  const presentCount = prior + 1;
  const isReturning = prior > 0;
  const fullName = `${seminarian.first_name} ${seminarian.last_name}`;
  const totalDays = dayCount(seminar.start_date, seminar.end_date);

  return NextResponse.json(
    {
      id: record.id,
      seminar_id: seminarId,
      seminarian_id: seminarianId,
      full_name: fullName,
      date: today,
      status: 'present',
      created: true,
      greeting: isReturning ? 'welcome_back' : 'welcome',
      is_returning: isReturning,
      prior_present_days: prior,
      present_count: presentCount,
      total_days: totalDays,
      seminar_title: seminar.title,
      message: isReturning ? `Welcome back, ${fullName}!` : `Welcome, ${fullName}!`,
    },
    { status: 201 }
  );
}
