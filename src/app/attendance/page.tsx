'use client';

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import {
  api,
  ApiError,
  formatDayLabel,
  type Seminar,
  type SeminarTally,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { matchesPersonSearch } from '@/lib/search';
import { useToast } from '@/lib/toast';
import { WelcomeModal, type WelcomePayload } from '@/components/WelcomeModal';

function AttendancePageContent() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justAdded = searchParams.get('added') === '1';
  const justMarked = searchParams.get('marked') === '1';
  const focusSid = searchParams.get('sid') ? Number(searchParams.get('sid')) : null;
  const focusName = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : '';

  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tally, setTally] = useState<SeminarTally | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(justAdded ? focusSid : null);
  const [showAddReminder, setShowAddReminder] = useState(justAdded);
  const [celebrateId, setCelebrateId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [deleteSeminarId, setDeleteSeminarId] = useState<number | null>(null);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [welcome, setWelcome] = useState<WelcomePayload | null>(
    justMarked && focusName
      ? {
          kind: 'welcome',
          full_name: focusName,
          subtitle: 'Newly registered and marked present for today.',
        }
      : null
  );

  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  const loadSeminars = useCallback(async () => {
    const list = await api.listSeminars();
    setSeminars(list);
    setSelectedId((prev) => {
      if (prev && list.some((s) => s.id === prev)) return prev;
      const fromQuery = searchParams.get('seminar');
      if (fromQuery) {
        const qid = Number(fromQuery);
        if (list.some((s) => s.id === qid)) return qid;
      }
      const active = list.find((s) => s.is_active);
      return active?.id ?? list[0]?.id ?? null;
    });
  }, [searchParams]);

  const loadTally = useCallback(async (id: number) => {
    setLoading(true);
    setError('');
    try {
      setTally(await api.seminarTally(id));
    } catch (err) {
      setTally(null);
      setError(err instanceof ApiError ? err.message : 'Failed to load tally');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeminars().catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Failed to load seminars')
    );
  }, [loadSeminars]);

  useEffect(() => {
    if (selectedId) loadTally(selectedId);
    else {
      setTally(null);
      setLoading(false);
    }
  }, [selectedId, loadTally]);

  useEffect(() => {
    if (!highlightId || !tally) return;
    const el = rowRefs.current[highlightId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, tally]);

  const pendingToday = useMemo(() => {
    if (!tally?.can_mark_today) return [];
    return tally.rows.filter((r) => r.today_status === 'A');
  }, [tally]);

  const filteredRows = useMemo(() => {
    if (!tally) return [];
    return tally.rows.filter((row) =>
      matchesPersonSearch(search, [
        row.full_name,
        row.first_name,
        row.last_name,
        row.is_adventist ? 'adventist yes' : 'no',
        row.today_status,
      ])
    );
  }, [tally, search]);

  const highlightedStillPending =
    highlightId != null && pendingToday.some((r) => r.seminarian_id === highlightId);

  async function onCreateSeminar(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.createSeminar(form);
      toast.success(`Seminar “${created.title}” created.`);
      setWelcome({
        kind: 'seminar_created',
        full_name: created.title,
        subtitle: `Scheduled ${created.start_date} → ${created.end_date}.`,
      });
      setForm({ title: '', start_date: '', end_date: '' });
      setShowCreate(false);
      await loadSeminars();
      setSelectedId(created.id);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not create seminar';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteSeminarConfirmed() {
    if (!deleteSeminarId) return;
    await api.deleteSeminar(deleteSeminarId);
    toast.success('Seminar deleted.');
    setDeleteSeminarId(null);
    await loadSeminars();
  }

  async function markPresent(seminarianId: number) {
    if (!selectedId || !tally?.can_mark_today) return;
    setMarkingId(seminarianId);
    setError('');
    try {
      const result = await api.markPresent(seminarianId, selectedId);
      setCelebrateId(seminarianId);
      toast.success(result.message);
      setWelcome({
        kind: result.greeting,
        full_name: result.full_name,
        seminar_title: result.seminar_title,
        present_count: result.present_count,
        total_days: result.total_days,
        subtitle: result.is_returning
          ? 'Good to see you again. Present for today.'
          : 'Glad you are here. Marked present for today.',
      });
      if (seminarianId === highlightId) {
        setShowAddReminder(false);
        setHighlightId(null);
        router.replace('/attendance');
      }
      await loadTally(selectedId);
      setTimeout(() => setCelebrateId(null), 900);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not mark present';
      setError(msg);
      toast.error(msg);
    } finally {
      setMarkingId(null);
    }
  }

  function dismissWelcome() {
    setWelcome(null);
    if (justMarked) {
      router.replace('/attendance');
    }
  }

  function dismissAddReminder() {
    setShowAddReminder(false);
    setHighlightId(null);
    router.replace('/attendance');
  }

  async function onExport(format: 'xlsx' | 'pdf') {
    if (!selectedId) return;
    setExporting(format);
    setError('');
    try {
      await api.exportTally(selectedId, format);
      toast.success(`Tally exported as ${format === 'pdf' ? 'PDF' : 'Excel'}.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Export failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setExporting(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Attendance sheet</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Create a seminar week, then mark daily attendance. Tally shows P / A for each day.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? 'Close' : 'New seminar'}
          </button>
        ) : null}
      </div>

      {showAddReminder ? (
        <div className="remind-banner mb-4" role="status">
          <div className="remind-banner-pulse" />
          <div className="relative z-[1] flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                Staff action needed
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Mark present now
                {focusName ? `: ${focusName}` : ''}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                This seminarian was just added and is still Absent (A) today. Tap{' '}
                <strong>Mark P</strong> on the highlighted row so they are not forgotten.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {highlightedStillPending && highlightId ? (
                <button
                  type="button"
                  className="btn-primary btn-pulse"
                  disabled={markingId === highlightId}
                  onClick={() => markPresent(highlightId)}
                >
                  {markingId === highlightId ? 'Marking…' : 'Mark them Present'}
                </button>
              ) : null}
              <button type="button" className="btn-secondary" onClick={dismissAddReminder}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin && showCreate ? (
        <form onSubmit={onCreateSeminar} className="card-panel mb-6 grid gap-4 p-5 md:grid-cols-3">
          <h3 className="md:col-span-3 font-[family-name:var(--font-display)] text-xl">
            New seminar
          </h3>
          <label className="text-sm md:col-span-3">
            <span className="mb-1 block text-[var(--muted)]">Title</span>
            <input
              className="field"
              required
              placeholder="e.g. August 2026 Seminar"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">Start date</span>
            <input
              className="field"
              type="date"
              required
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">End date</span>
            <input
              className="field"
              type="date"
              required
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Saving…' : 'Create seminar'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm min-w-[240px] flex-1">
          <span className="mb-1 block text-[var(--muted)]">Seminar</span>
          <select
            className="field"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
          >
            {seminars.length === 0 ? <option value="">No seminars yet</option> : null}
            {seminars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.start_date} → {s.end_date})
                {s.is_active ? ' · active' : s.has_ended ? ' · ended' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm min-w-[220px] flex-1">
          <span className="mb-1 block text-[var(--muted)]">Search person</span>
          <input
            className="field"
            type="search"
            placeholder="Type a name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {isAdmin && selectedId ? (
          <button
            type="button"
            className="btn-secondary text-[var(--danger)]"
            onClick={() => setDeleteSeminarId(selectedId)}
          >
            Delete seminar
          </button>
        ) : null}
        {selectedId ? (
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={!!exporting}
              onClick={() => onExport('xlsx')}
            >
              {exporting === 'xlsx' ? 'Exporting…' : 'Export Excel'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!!exporting}
              onClick={() => onExport('pdf')}
            >
              {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
            </button>
          </>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-sm text-[var(--danger)]">{error}</p> : null}

      {tally ? (
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
          <span>
            Days: <strong className="text-[var(--ink)]">{tally.seminar.day_count}</strong>
          </span>
          <span>
            Present today:{' '}
            <strong className="text-[var(--ok)]">{tally.present_today}</strong>
          </span>
          <span>
            Still absent today:{' '}
            <strong className="text-[var(--danger)]">{pendingToday.length}</strong>
          </span>
          <span>
            Perfect so far:{' '}
            <strong className="text-[var(--accent)]">{tally.perfect_count}</strong>
          </span>
          {tally.can_mark_today ? (
            <span className="text-[var(--ok)]">Marking open for today</span>
          ) : (
            <span>Today is outside this seminar — view only</span>
          )}
        </div>
      ) : null}

      <div className="card-panel overflow-x-auto">
        {!selectedId ? (
          <p className="px-4 py-8 text-sm text-[var(--muted)]">
            {isAdmin
              ? 'Create a seminar (start and end dates) to begin the attendance tally.'
              : 'No seminar available yet. Ask an admin to create one.'}
          </p>
        ) : loading ? (
          <p className="px-4 py-8 text-sm text-[var(--muted)]">Loading tally…</p>
        ) : !tally || tally.rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--muted)]">
            No seminarians registered yet. Add seminarians first.
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--muted)]">
            No match for “{search}”.
          </p>
        ) : (
          <table className="tally-table w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="sticky-name px-4 py-3 font-medium">Name</th>
                {tally.dates.map((d) => (
                  <th
                    key={d}
                    className={`px-2 py-3 text-center font-medium whitespace-nowrap ${
                      d === tally.today ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : ''
                    }`}
                  >
                    <div className="text-[0.7rem] uppercase tracking-wide">
                      {formatDayLabel(d)}
                    </div>
                    <div className="text-[0.65rem] opacity-70">{d.slice(5)}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium">Total</th>
                <th className="px-3 py-3 text-center font-medium">Week</th>
                <th className="px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const canMark =
                  tally.can_mark_today && row.today_status !== 'P' && row.today_status !== '-';
                const isFocus = highlightId === row.seminarian_id;
                const isCelebrate = celebrateId === row.seminarian_id;
                return (
                  <tr
                    key={row.seminarian_id}
                    ref={(el) => {
                      rowRefs.current[row.seminarian_id] = el;
                    }}
                    className={`border-t border-[var(--line)] ${
                      isFocus ? 'row-focus' : row.perfect_attendance ? 'bg-[rgba(15,92,69,0.04)]' : ''
                    } ${isCelebrate ? 'row-celebrate' : ''}`}
                  >
                    <td className="sticky-name px-4 py-2.5 font-medium whitespace-nowrap">
                      {row.full_name}
                      {isFocus ? (
                        <span className="ml-2 text-[0.65rem] uppercase tracking-wide text-[var(--accent)]">
                          New — mark P
                        </span>
                      ) : null}
                    </td>
                    {tally.dates.map((d) => {
                      const mark = row.days[d] ?? '-';
                      return (
                        <td
                          key={d}
                          className={`px-2 py-2 text-center ${
                            d === tally.today ? 'bg-[var(--accent-soft)]' : ''
                          }`}
                        >
                          <span
                            className={
                              mark === 'P'
                                ? 'tally-p'
                                : mark === 'A'
                                  ? `tally-a${canMark ? ' tally-a-pulse' : ''}`
                                  : 'tally-pending'
                            }
                          >
                            {mark}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center tabular-nums">
                      {row.present_count}/{row.elapsed_days || row.total_days}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.perfect_attendance ? (
                        <span className="badge-present">All present</span>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.today_status === 'P' ? (
                        <span className="text-xs text-[var(--ok)] font-semibold">Present today</span>
                      ) : canMark ? (
                        <button
                          type="button"
                          className={`btn-primary${isFocus || pendingToday.length > 0 ? ' btn-pulse' : ''}`}
                          disabled={markingId === row.seminarian_id}
                          onClick={() => markPresent(row.seminarian_id)}
                        >
                          {markingId === row.seminarian_id ? '…' : 'Mark P'}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <DeleteConfirmModal
        open={deleteSeminarId !== null}
        title="Delete seminar"
        message="Delete this seminar and all its attendance records? This cannot be undone."
        onCancel={() => setDeleteSeminarId(null)}
        onConfirmed={onDeleteSeminarConfirmed}
      />

      <WelcomeModal open={welcome !== null} payload={welcome} onClose={dismissWelcome} />
    </AppShell>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
          Loading attendance…
        </div>
      }
    >
      <AttendancePageContent />
    </Suspense>
  );
}
