import { NextResponse } from 'next/server';
import { isAuthError, jsonError, requireAdmin, requireUser } from '@/lib/server/auth';
import { serializeSeminarian, todayISO, type SeminarianRow } from '@/lib/server/domain';

export async function GET(request: Request) {
  const ctx = await requireUser(request);
  if (isAuthError(ctx)) return ctx;
  const { data, error } = await ctx.admin
    .from('seminarians')
    .select('*')
    .order('last_name')
    .order('first_name');
  if (error) return jsonError(error.message, 400);
  return NextResponse.json((data as SeminarianRow[]).map(serializeSeminarian));
}

export async function POST(request: Request) {
  const ctx = await requireAdmin(request);
  if (isAuthError(ctx)) return ctx;

  let body: {
    first_name?: string;
    last_name?: string;
    birthdate?: string;
    address?: string;
    is_adventist?: boolean;
    mark_present?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const first_name = (body.first_name || '').trim();
  const last_name = (body.last_name || '').trim();
  if (!first_name || !last_name || !body.birthdate) {
    return jsonError('First name, last name, and birthdate are required.', 400);
  }

  const { data: created, error } = await ctx.admin
    .from('seminarians')
    .insert({
      first_name,
      last_name,
      birthdate: body.birthdate,
      address: (body.address || '').trim(),
      is_adventist: Boolean(body.is_adventist),
      created_by: ctx.profile.id,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return jsonError(`${first_name} ${last_name} is already registered. Same name is not allowed.`, 400);
    }
    return jsonError(error.message, 400);
  }

  if (body.mark_present) {
    const today = todayISO();
    const { data: seminars } = await ctx.admin
      .from('seminars')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1);
    const active = seminars?.[0];
    if (!active) {
      await ctx.admin.from('seminarians').delete().eq('id', created.id);
      return NextResponse.json(
        {
          mark_present:
            'No active seminar today. Create a seminar first, or use Add only then mark present on the tally.',
        },
        { status: 400 }
      );
    }
    const { error: attError } = await ctx.admin.from('attendance').insert({
      seminar_id: active.id,
      seminarian_id: created.id,
      date: today,
      status: 'present',
      marked_by: ctx.profile.id,
    });
    if (attError) {
      await ctx.admin.from('seminarians').delete().eq('id', created.id);
      return jsonError(attError.message, 400);
    }
  }

  return NextResponse.json(serializeSeminarian(created as SeminarianRow), { status: 201 });
}
