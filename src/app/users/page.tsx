'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { api, ApiError, type Role, type User } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

const emptyForm = {
  username: '',
  password: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'staff' as Role,
};

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createUser(form);
      toast.success(`User “${form.username}” created.`);
      setForm(emptyForm);
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Create failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteConfirmed() {
    if (!deleteTarget) return;
    const name = deleteTarget.username;
    await api.deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    toast.success(`User “${name}” deleted.`);
    await load();
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <p className="text-sm text-[var(--muted)]">Admin access required.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Users</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create Admin or Staff accounts. Staff can mark attendance; Admin manages everything.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card-panel mb-8 grid gap-4 p-5 md:grid-cols-2">
        <h3 className="md:col-span-2 font-[family-name:var(--font-display)] text-xl">
          Add user
        </h3>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Username</span>
          <input
            className="field"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Password</span>
          <input
            className="field"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">First name</span>
          <input
            className="field"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Last name</span>
          <input
            className="field"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Email</span>
          <input
            className="field"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Role</span>
          <select
            className="field"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        {error ? <p className="text-sm text-[var(--danger)] md:col-span-2">{error}</p> : null}

        <div className="md:col-span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>

      <div className="card-panel overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3 uppercase text-xs tracking-wide">{u.role}</td>
                  <td className="px-4 py-3">{u.is_active === false ? 'No' : 'Yes'}</td>
                  <td className="px-4 py-3">
                    {currentUser?.id === u.id ? (
                      <span className="text-xs text-[var(--muted)]">You</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary text-[var(--danger)]"
                        onClick={() => setDeleteTarget(u)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete user"
        message={
          deleteTarget
            ? `Delete user “${deleteTarget.username}”? This cannot be undone.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirmed={onDeleteConfirmed}
      />
    </AppShell>
  );
}
