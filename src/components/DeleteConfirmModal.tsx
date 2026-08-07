'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/lib/toast';

type DeleteConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirmed: () => Promise<void> | void;
};

export function DeleteConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onCancel,
  onConfirmed,
}: DeleteConfirmModalProps) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setError('');
    setSubmitting(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.verifyPassword(password);
      await onConfirmed();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not delete';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-modal-title" className="font-[family-name:var(--font-display)] text-2xl">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
        <p className="mt-3 text-sm text-[var(--danger)]">
          Enter your account password to confirm deletion.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Password</span>
            <input
              ref={inputRef}
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </label>

          {error ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ background: 'var(--danger)' }}
              disabled={submitting}
            >
              {submitting ? 'Checking…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
