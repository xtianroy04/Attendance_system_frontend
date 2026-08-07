'use client';

import { useEffect, useRef } from 'react';

export type WelcomeKind = 'welcome' | 'welcome_back' | 'seminar_created';

export type WelcomePayload = {
  kind: WelcomeKind;
  full_name: string;
  subtitle?: string;
  seminar_title?: string;
  present_count?: number;
  total_days?: number;
};

type WelcomeModalProps = {
  open: boolean;
  payload: WelcomePayload | null;
  onClose: () => void;
};

function copyFor(kind: WelcomeKind) {
  if (kind === 'welcome_back') {
    return {
      eyebrow: 'Returning seminarian',
      title: 'Welcome back',
      defaultSubtitle: 'Good to see you again at the seminar.',
    };
  }
  if (kind === 'seminar_created') {
    return {
      eyebrow: 'Seminar ready',
      title: 'Seminar created',
      defaultSubtitle: 'You can open the tally and mark attendance when the dates cover today.',
    };
  }
  return {
    eyebrow: 'Present today',
    title: 'Welcome',
    defaultSubtitle: 'Glad you are here. Marked present for today.',
  };
}

export function WelcomeModal({ open, payload, onClose }: WelcomeModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !payload) return null;

  const copy = copyFor(payload.kind);

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="welcome-modal-glow" aria-hidden />
        <p className="welcome-modal-eyebrow">{copy.eyebrow}</p>
        <h3
          id="welcome-modal-title"
          className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]"
        >
          {copy.title}
        </h3>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--accent)]">
          {payload.full_name}
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {payload.subtitle || copy.defaultSubtitle}
        </p>
        {payload.seminar_title && payload.kind !== 'seminar_created' ? (
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            {payload.seminar_title}
            {payload.present_count != null && payload.total_days != null
              ? ` · ${payload.present_count}/${payload.total_days} days`
              : ''}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button ref={closeRef} type="button" className="btn-primary" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
