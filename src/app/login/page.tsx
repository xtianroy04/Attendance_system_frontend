'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SdaLogo } from '@/components/SdaLogo';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

type Verse = {
  text: string;
  reference: string;
  translation: string;
};

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verse, setVerse] = useState<Verse | null>(null);
  const [verseLoading, setVerseLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/verse');
        if (!res.ok) throw new Error('verse failed');
        const data = (await res.json()) as Verse;
        if (!cancelled) setVerse(data);
      } catch {
        if (!cancelled) {
          setVerse({
            text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
            reference: 'John 3:16',
            translation: 'WEB',
          });
        }
      } finally {
        if (!cancelled) setVerseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success('Signed in successfully.');
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-split min-h-screen">
      <aside className="login-verse-pane">
        <div className="login-verse-inner">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(255,248,230,0.75)]">
            Bible verse for today
          </p>

          {verseLoading ? (
            <div className="mt-8 space-y-3 animate-pulse">
              <div className="h-4 w-4/5 rounded bg-white/20" />
              <div className="h-4 w-full rounded bg-white/15" />
              <div className="h-4 w-3/5 rounded bg-white/15" />
            </div>
          ) : verse ? (
            <blockquote className="login-verse-quote">
              <p className="login-verse-text">“{verse.text}”</p>
              <footer className="mt-8">
                <cite className="not-italic font-[family-name:var(--font-display)] text-2xl text-[#f5b335]">
                  {verse.reference}
                </cite>
              </footer>
            </blockquote>
          ) : null}

          <div className="mt-auto pt-12">
            <p className="text-sm text-[rgba(255,248,230,0.7)]">
              Manticao Central Church
            </p>
            <p className="text-xs text-[rgba(255,248,230,0.45)]">
              Seventh-day Adventist · Seminarian Attendance
            </p>
          </div>
        </div>
      </aside>

      <main className="login-form-pane">
        <div className="login-form-card">
          <div className="mb-6 flex justify-center sm:justify-start">
            <SdaLogo size={160} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            Seventh-day Adventist Church
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            Manticao Central Church
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign in to manage seminarian attendance.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Username</span>
              <input
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--muted)]">Password</span>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
