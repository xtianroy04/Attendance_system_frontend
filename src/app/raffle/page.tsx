'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { SpinWheel } from '@/components/SpinWheel';
import { api, ApiError, type RaffleEntry, type Seminar } from '@/lib/api';
import { matchesPersonSearch } from '@/lib/search';
import { useToast } from '@/lib/toast';

type Mode = 'perfect' | 'all' | 'manual' | 'non_adventist';

export default function RafflePage() {
  const toast = useToast();
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [seminarId, setSeminarId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('perfect');
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RaffleEntry | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [removedWinnerIds, setRemovedWinnerIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .listSeminars()
      .then((list) => {
        setSeminars(list);
        const ended = list.find((s) => s.has_ended);
        const active = list.find((s) => s.is_active);
        setSeminarId(ended?.id ?? active?.id ?? list[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load seminars'))
      .finally(() => setLoading(false));
  }, []);

  const loadPool = useCallback(async (id: number, m: Mode) => {
    setError('');
    try {
      const data = await api.rafflePool(id, m);
      setEntries(data.all_seminarians);
      setRemovedWinnerIds(new Set());
      setHistory([]);
      if (m === 'perfect') {
        setSelectedIds(new Set(data.pool.map((p) => p.id)));
      } else if (m === 'non_adventist') {
        setSelectedIds(new Set(data.pool.map((p) => p.id)));
      } else if (m === 'all') {
        setSelectedIds(new Set(data.all_seminarians.map((p) => p.id)));
      } else {
        setSelectedIds(new Set());
      }
      setWinner(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load raffle pool');
    }
  }, []);

  useEffect(() => {
    if (seminarId) loadPool(seminarId, mode);
  }, [seminarId, mode, loadPool]);

  const pool = useMemo(
    () => entries.filter((e) => selectedIds.has(e.id) && !removedWinnerIds.has(e.id)),
    [entries, selectedIds, removedWinnerIds]
  );

  const visibleEntries = useMemo(
    () =>
      entries.filter((e) =>
        matchesPersonSearch(search, [e.full_name, e.first_name, e.last_name])
      ),
    [entries, search]
  );

  const visiblePool = useMemo(
    () =>
      pool.filter((e) =>
        matchesPersonSearch(search, [e.full_name, e.first_name, e.last_name])
      ),
    [pool, search]
  );

  function togglePerson(id: number) {
    if (mode !== 'manual') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setWinner(null);
  }

  function selectAllManual() {
    setSelectedIds(
      new Set(entries.filter((e) => !removedWinnerIds.has(e.id)).map((e) => e.id))
    );
  }

  function clearManual() {
    setSelectedIds(new Set());
  }

  function spin() {
    if (spinning || pool.length < 1) return;
    setWinner(null);
    setSpinning(true);

    const index = Math.floor(Math.random() * pool.length);
    const chosen = pool[index];
    const slice = 360 / pool.length;
    const segmentCenter = index * slice + slice / 2;
    const spins = 6 + Math.floor(Math.random() * 3);
    const target = spins * 360 + (360 - segmentCenter);

    setRotation((prev) => {
      const normalized = prev % 360;
      return prev - normalized + target;
    });

    window.setTimeout(() => {
      setSpinning(false);
      setWinner(chosen);
      setHistory((h) => [chosen.full_name, ...h].slice(0, 12));
      // Remove winner from wheel so they cannot win again
      setRemovedWinnerIds((prev) => new Set(prev).add(chosen.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(chosen.id);
        return next;
      });
      toast.success(`Winner: ${chosen.full_name}`);
    }, 5200);
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Raffle wheel</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          After the seminar, spin for prizes. Choose who can join the raffle.
        </p>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="card-panel space-y-4 p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Seminar</span>
            <select
              className="field"
              value={seminarId ?? ''}
              disabled={loading || spinning}
              onChange={(e) => setSeminarId(e.target.value ? Number(e.target.value) : null)}
            >
              {seminars.length === 0 ? <option value="">No seminars</option> : null}
              {seminars.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.start_date} → {s.end_date})
                  {s.has_ended ? ' · ended' : s.is_active ? ' · active' : ''}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-[var(--muted)]">Who can win</legend>
            {(
              [
                ['perfect', 'Present all week (perfect attendance)'],
                ['all', 'All registered seminarians'],
                ['non_adventist', 'Non-Adventist only'],
                ['manual', 'Manual selection'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === value}
                  disabled={spinning}
                  onChange={() => setMode(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
            In pool: <strong>{pool.length}</strong>
            {removedWinnerIds.size > 0 ? (
              <span className="text-[var(--muted)]">
                {' '}
                · {removedWinnerIds.size} already won (removed)
              </span>
            ) : null}
            {mode === 'perfect' ? (
              <span className="text-[var(--muted)]"> · perfect attendance only</span>
            ) : null}
            {mode === 'non_adventist' ? (
              <span className="text-[var(--muted)]"> · non-Adventist only</span>
            ) : null}
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Search person</span>
            <input
              className="field"
              type="search"
              placeholder="Type a name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {mode === 'manual' ? (
            <div>
              <div className="mb-2 flex gap-2">
                <button type="button" className="btn-secondary" onClick={selectAllManual} disabled={spinning}>
                  Select all remaining
                </button>
                <button type="button" className="btn-secondary" onClick={clearManual} disabled={spinning}>
                  Clear
                </button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--line)] p-2">
                {entries.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[var(--muted)]">No seminarians yet.</p>
                ) : visibleEntries.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[var(--muted)]">No match for “{search}”.</p>
                ) : (
                  visibleEntries.map((e) => {
                    const won = removedWinnerIds.has(e.id);
                    return (
                      <label
                        key={e.id}
                        className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                          won
                            ? 'cursor-not-allowed opacity-55'
                            : 'cursor-pointer hover:bg-[var(--surface)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(e.id) && !won}
                          disabled={spinning || won}
                          onChange={() => togglePerson(e.id)}
                        />
                        <span className="flex-1">
                          {e.full_name}
                          {won ? (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                              Won
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {e.present_count}/{e.total_days}
                          {e.perfect_attendance ? ' · perfect' : ''}
                          {e.is_adventist ? ' · Adventist' : ' · Non-Adventist'}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--line)] p-2 text-sm">
              {pool.length === 0 ? (
                <p className="px-2 py-3 text-[var(--muted)]">
                  {removedWinnerIds.size > 0
                    ? 'All remaining people in this pool have already won.'
                    : mode === 'perfect'
                      ? 'No one has perfect attendance for this seminar yet.'
                      : mode === 'non_adventist'
                        ? 'No non-Adventist seminarians registered.'
                        : 'No seminarians registered.'}
                </p>
              ) : visiblePool.length === 0 ? (
                <p className="px-2 py-3 text-[var(--muted)]">No match for “{search}”.</p>
              ) : (
                visiblePool.map((e) => (
                  <div key={e.id} className="flex justify-between px-2 py-1">
                    <span>{e.full_name}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {e.present_count}/{e.total_days}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <button
            type="button"
            className="btn-primary w-full btn-pulse"
            disabled={spinning || pool.length < 1}
            onClick={spin}
          >
            {spinning
              ? 'Spinning…'
              : pool.length < 1
                ? removedWinnerIds.size > 0
                  ? 'No one left to spin'
                  : 'No one in pool'
                : 'Spin the wheel'}
          </button>
        </div>

        <div className="card-panel flex flex-col items-center justify-center gap-5 p-5">
          <SpinWheel
            people={pool}
            rotation={rotation}
            spinning={spinning}
            winnerId={winner?.id ?? null}
          />

          {winner && !spinning ? (
            <div className="winner-banner text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                Winner
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                {winner.full_name}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Removed from the wheel for the next spin
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              {spinning ? 'Good luck…' : 'Press spin when ready'}
            </p>
          )}

          {history.length > 0 ? (
            <div className="w-full border-t border-[var(--line)] pt-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-[var(--muted)]">
                Recent winners
              </p>
              <ul className="space-y-1 text-sm">
                {history.map((name, i) => (
                  <li key={`${name}-${i}`}>
                    {i + 1}. {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
