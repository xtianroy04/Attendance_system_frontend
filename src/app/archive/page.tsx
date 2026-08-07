'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api, ApiError, type SeminarArchiveItem } from '@/lib/api';
import { useToast } from '@/lib/toast';

type StatusFilter = 'all' | 'ended' | 'active' | 'upcoming';

export default function ArchivePage() {
  const toast = useToast();
  const [status, setStatus] = useState<StatusFilter>('ended');
  const [items, setItems] = useState<SeminarArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const load = useCallback(async (filter: StatusFilter) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.seminarArchive(filter);
      setItems(data.results);
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiError ? err.message : 'Failed to load archive');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  async function onExport(id: number, format: 'xlsx' | 'pdf') {
    setExporting(`${id}-${format}`);
    setError('');
    try {
      await api.exportTally(id, format);
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
      <div className="mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Seminar archive</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Past and current seminars with attendance totals. Open a tally or export PDF / Excel.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['ended', 'Ended'],
            ['active', 'Active'],
            ['upcoming', 'Upcoming'],
            ['all', 'All'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={status === value ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="mb-4 text-sm text-[var(--danger)]">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading archive…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No seminars in this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Seminar</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3 text-right">People</th>
                <th className="px-4 py-3 text-right">Present marks</th>
                <th className="px-4 py-3 text-right">Perfect</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const s = item.seminar;
                const badge = s.is_active ? 'Active' : s.has_ended ? 'Ended' : 'Upcoming';
                return (
                  <tr key={s.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--ink)]">{s.title}</div>
                      <div className="mt-0.5 text-xs text-[var(--muted)]">{badge}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {s.start_date} → {s.end_date}
                      <div className="text-xs">
                        {item.elapsed_days}/{item.total_days} days counted
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.total_seminarians}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.total_present_marks}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--ok)]">
                      {item.perfect_count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {item.attendance_rate}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/attendance?seminar=${s.id}`}
                          className="btn-secondary !px-2.5 !py-1.5 text-xs"
                        >
                          View tally
                        </Link>
                        <button
                          type="button"
                          className="btn-secondary !px-2.5 !py-1.5 text-xs"
                          disabled={exporting === `${s.id}-xlsx`}
                          onClick={() => onExport(s.id, 'xlsx')}
                        >
                          {exporting === `${s.id}-xlsx` ? '…' : 'Excel'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary !px-2.5 !py-1.5 text-xs"
                          disabled={exporting === `${s.id}-pdf`}
                          onClick={() => onExport(s.id, 'pdf')}
                        >
                          {exporting === `${s.id}-pdf` ? '…' : 'PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
