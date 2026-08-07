'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { api, type DashboardStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .dashboardStats()
      .then(setStats)
      .catch((err) => setError(err.message || 'Failed to load stats'));
  }, []);

  const active = stats?.active_seminar;

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Dashboard</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Overview for {stats?.date ?? 'today'}
          {active ? ` · ${active.title}` : ''}
        </p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
      ) : null}

      {active ? (
        <div className="card-panel mb-4 px-5 py-4 text-sm">
          <span className="text-[var(--muted)]">Active seminar: </span>
          <strong>{active.title}</strong>
          <span className="text-[var(--muted)]">
            {' '}
            ({active.start_date} → {active.end_date}, {active.day_count} days)
          </span>
        </div>
      ) : (
        <div className="card-panel mb-4 px-5 py-4 text-sm text-[var(--muted)]">
          No seminar is active today.
          {isAdmin ? ' Create one on the Attendance page to start tracking.' : ''}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-panel p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Seminarians</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {stats?.total_seminarians ?? '—'}
          </p>
        </div>
        <div className="card-panel p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Present today</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--ok)]">
            {stats?.present_today ?? '—'}
          </p>
        </div>
        <div className="card-panel p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Absent today</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--danger)]">
            {stats?.absent_today ?? '—'}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {isAdmin ? (
          <Link href="/seminarians" className="btn-primary inline-block">
            Add seminarian
          </Link>
        ) : null}
        <Link href="/attendance" className="btn-secondary inline-block">
          Open attendance tally
        </Link>
        <Link href="/raffle" className="btn-secondary inline-block">
          Raffle wheel
        </Link>
      </div>
    </AppShell>
  );
}
