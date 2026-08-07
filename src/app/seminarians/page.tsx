'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { api, calcAge, ApiError, type Seminarian } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { matchesPersonSearch } from '@/lib/search';
import { useToast } from '@/lib/toast';

const emptyForm = {
  first_name: '',
  last_name: '',
  birthdate: '',
  address: '',
  is_adventist: false,
};

type FillField = keyof typeof emptyForm | 'age';

export default function SeminariansPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState<Seminarian[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<'only' | 'present' | null>(null);
  const [animateFill, setAnimateFill] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Seminarian | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const fillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const age = useMemo(() => calcAge(form.birthdate), [form.birthdate]);

  const filteredItems = useMemo(
    () =>
      items.filter((s) =>
        matchesPersonSearch(search, [
          s.full_name,
          s.first_name,
          s.last_name,
          s.address,
          s.birthdate,
          s.is_adventist ? 'adventist yes' : 'no',
        ])
      ),
    [items, search]
  );

  async function load() {
    setLoading(true);
    try {
      setItems(await api.listSeminarians());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      if (fillTimer.current) clearTimeout(fillTimer.current);
    };
  }, []);

  function fieldClass(_name: FillField, delayIndex: number) {
    return `field${animateFill ? ` field-pop-in field-pop-delay-${delayIndex}` : ''}`;
  }

  function startEdit(s: Seminarian) {
    if (fillTimer.current) clearTimeout(fillTimer.current);

    setError('');
    setEditingId(s.id);
    setForm({
      first_name: s.first_name,
      last_name: s.last_name,
      birthdate: s.birthdate,
      address: s.address,
      is_adventist: s.is_adventist,
    });
    setAnimateFill(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    fillTimer.current = setTimeout(() => setAnimateFill(false), 450);
  }

  function resetForm() {
    if (fillTimer.current) clearTimeout(fillTimer.current);
    setEditingId(null);
    setForm(emptyForm);
    setAnimateFill(false);
  }

  async function saveSeminarian(markPresent: boolean) {
    if (!isAdmin) return;
    setSaving(true);
    setSavingMode(markPresent ? 'present' : 'only');
    setError('');
    try {
      if (editingId) {
        await api.updateSeminarian(editingId, form);
        toast.success('Seminarian updated.');
        resetForm();
        await load();
      } else {
        const created = await api.createSeminarian({
          ...form,
          mark_present: markPresent,
        });
        toast.success(
          markPresent
            ? `${created.full_name} added and marked present.`
            : `${created.full_name} added.`
        );
        if (markPresent) {
          router.push(
            `/attendance?marked=1&name=${encodeURIComponent(created.full_name)}`
          );
        } else {
          router.push(
            `/attendance?added=1&sid=${created.id}&name=${encodeURIComponent(created.full_name)}`
          );
        }
        return;
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Save failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await saveSeminarian(false);
  }

  async function onDeleteConfirmed() {
    if (!deleteTarget) return;
    const name = deleteTarget.full_name;
    await api.deleteSeminarian(deleteTarget.id);
    setDeleteTarget(null);
    toast.success(`${name} deleted.`);
    await load();
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Seminarians</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Register seminarians. Use Add only (staff marks later) or Add & mark present.
            Same first + last name cannot be registered twice.
          </p>
        </div>
      </div>

      {isAdmin ? (
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className={`card-panel mb-8 grid gap-4 p-5 md:grid-cols-2 ${
            animateFill ? 'form-edit-enter' : ''
          }`}
        >
          <h3 className="md:col-span-2 font-[family-name:var(--font-display)] text-xl">
            {editingId ? 'Edit seminarian' : 'Add seminarian'}
          </h3>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">First name</span>
            <input
              className={fieldClass('first_name', 0)}
              required
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">Last name</span>
            <input
              className={fieldClass('last_name', 1)}
              required
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">Birthdate</span>
            <input
              className={fieldClass('birthdate', 2)}
              type="date"
              required
              value={form.birthdate}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
            />
          </label>
          <div className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">Age (auto)</span>
            <div className={`${fieldClass('age', 3)} bg-[var(--surface)]`}>
              {age === null ? 'Enter birthdate' : `${age} years`}
            </div>
          </div>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Address</span>
            <textarea
              className={`${fieldClass('address', 4)} min-h-24`}
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label
            className={`flex items-center gap-2 text-sm md:col-span-2 rounded-lg px-2 py-1 ${
              animateFill ? 'field-pop-in field-pop-delay-5' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={form.is_adventist}
              onChange={(e) => setForm({ ...form, is_adventist: e.target.checked })}
            />
            Adventist
          </label>

          {error ? <p className="text-sm text-[var(--danger)] md:col-span-2">{error}</p> : null}

          <div className="flex flex-wrap gap-2 md:col-span-2">
            {editingId ? (
              <>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Update'}
                </button>
                <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="submit" className="btn-secondary" disabled={saving}>
                  {saving && savingMode === 'only' ? 'Adding…' : 'Add only'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => saveSeminarian(true)}
                >
                  {saving && savingMode === 'present' ? 'Adding…' : 'Add & mark present'}
                </button>
              </>
            )}
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-[var(--muted)]">
          Staff can view seminarians. Only Admin can add or edit.
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <label className="text-sm min-w-[240px] flex-1 max-w-md">
          <span className="mb-1 block text-[var(--muted)]">Search seminarian</span>
          <input
            className="field"
            type="search"
            placeholder="Name, address, birthdate…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <p className="text-sm text-[var(--muted)]">
          Showing <strong className="text-[var(--ink)]">{filteredItems.length}</strong> of{' '}
          {items.length}
        </p>
      </div>

      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Age</th>
              <th className="px-4 py-3 font-medium">Birthdate</th>
              <th className="px-4 py-3 font-medium">Adventist</th>
              <th className="px-4 py-3 font-medium">Address</th>
              {isAdmin ? <th className="px-4 py-3 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                  No seminarians yet.
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                  No match for “{search}”.
                </td>
              </tr>
            ) : (
              filteredItems.map((s) => (
                <tr key={s.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{s.full_name}</td>
                  <td className="px-4 py-3">{s.age}</td>
                  <td className="px-4 py-3">{s.birthdate}</td>
                  <td className="px-4 py-3">{s.is_adventist ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{s.address}</td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => startEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-[var(--danger)]"
                          onClick={() => setDeleteTarget(s)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete seminarian"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.full_name}? This cannot be undone.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirmed={onDeleteConfirmed}
      />
    </AppShell>
  );
}
