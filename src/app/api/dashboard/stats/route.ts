import { NextResponse } from 'next/server';
import { isAuthError, requireUser } from '@/lib/server/auth';
import { serializeSeminar, todayISO, type SeminarRow } from '@/lib/server/domain';

export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;

  const today = todayISO();
  const [{ count }, { data: seminars }] = await Promise.all([
    ctx.admin.from('seminarians').select('*', { count: 'exact', head: true }),
    ctx.admin
      .from('seminars')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1),
  ]);

  const total = count || 0;
  const active = (seminars?.[0] as SeminarRow | undefined) || null;
  let presentToday = 0;
  if (active) {
    const { count: presentCount } = await ctx.admin
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('seminar_id', active.id)
      .eq('date', today)
      .eq('status', 'present');
    presentToday = presentCount || 0;
  }

  return NextResponse.json({
    total_seminarians: total,
    present_today: presentToday,
    absent_today: active ? Math.max(total - presentToday, 0) : total,
    date: today,
    active_seminar: active ? serializeSeminar(active, today) : null,
  });
}
