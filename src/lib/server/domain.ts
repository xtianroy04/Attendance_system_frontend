const MANILA = 'Asia/Manila';

export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: MANILA });
}

export function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function dayCount(start: string, end: string): number {
  return dateRange(start, end).length;
}

export function calcAge(birthdate: string): number {
  const dob = new Date(birthdate + 'T00:00:00');
  const [y, m, d] = todayISO().split('-').map(Number);
  const today = new Date(y, m - 1, d);
  let age = today.getFullYear() - dob.getFullYear();
  const md = today.getMonth() - dob.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export type SeminarRow = {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  created_at: string;
  created_by: string | null;
};

export function serializeSeminar(s: SeminarRow, today = todayISO()) {
  const dates = dateRange(s.start_date, s.end_date);
  return {
    id: s.id,
    title: s.title,
    start_date: s.start_date,
    end_date: s.end_date,
    day_count: dates.length,
    is_active: s.start_date <= today && today <= s.end_date,
    has_ended: today > s.end_date,
    has_started: today >= s.start_date,
    dates,
    created_at: s.created_at,
  };
}

export type SeminarianRow = {
  id: number;
  first_name: string;
  last_name: string;
  birthdate: string;
  address: string;
  is_adventist: boolean;
  created_at: string;
};

export function serializeSeminarian(s: SeminarianRow) {
  return {
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    full_name: `${s.first_name} ${s.last_name}`,
    birthdate: s.birthdate,
    age: calcAge(s.birthdate),
    address: s.address,
    is_adventist: s.is_adventist,
    created_at: s.created_at,
  };
}

export type AttendanceRow = {
  seminarian_id: number;
  date: string;
  status: string;
};

export function buildTally(
  seminar: SeminarRow,
  seminarians: SeminarianRow[],
  records: AttendanceRow[],
  today = todayISO()
) {
  const dates = dateRange(seminar.start_date, seminar.end_date);
  const present = new Set(
    records
      .filter((r) => r.status === 'present')
      .map((r) => `${r.seminarian_id}|${r.date}`)
  );
  const elapsedDays = dates.filter((d) => d <= today);
  let perfectCount = 0;
  let totalPresentMarks = 0;

  const rows = seminarians.map((s) => {
    const days: Record<string, 'P' | 'A' | '-'> = {};
    let presentCount = 0;
    for (const d of dates) {
      if (d > today) {
        days[d] = '-';
      } else if (present.has(`${s.id}|${d}`)) {
        days[d] = 'P';
        presentCount += 1;
      } else {
        days[d] = 'A';
      }
    }
    const elapsed = elapsedDays.length;
    const perfect = elapsed > 0 && presentCount === elapsed;
    if (perfect) perfectCount += 1;
    totalPresentMarks += presentCount;
    return {
      seminarian_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      full_name: `${s.first_name} ${s.last_name}`,
      is_adventist: s.is_adventist,
      days,
      present_count: presentCount,
      elapsed_days: elapsed,
      total_days: dates.length,
      perfect_attendance: perfect,
      today_status: (days[today] ?? '-') as 'P' | 'A' | '-',
    };
  });

  const possible = seminarians.length * elapsedDays.length;
  const attendanceRate = possible ? Math.round((totalPresentMarks / possible) * 1000) / 10 : 0;
  const serialized = serializeSeminar(seminar, today);

  return {
    seminar: serialized,
    dates,
    today,
    can_mark_today: serialized.is_active,
    rows,
    perfect_count: perfectCount,
    total_seminarians: rows.length,
    present_today: rows.filter((r) => r.today_status === 'P').length,
    total_present_marks: totalPresentMarks,
    elapsed_days: elapsedDays.length,
    attendance_rate: attendanceRate,
  };
}
