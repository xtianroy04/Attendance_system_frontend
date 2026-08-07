'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { SdaLogo } from '@/components/SdaLogo';
import { TutorialGuide } from '@/components/TutorialGuide';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/seminarians', label: 'Seminarians' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/archive', label: 'Archive' },
  { href: '/raffle', label: 'Raffle' },
  { href: '/users', label: 'Users', adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout, isAdmin } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && pathname.startsWith('/users') && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, user, isAdmin, pathname, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] text-[var(--ink)]">
        <p className="text-sm tracking-wide text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <SdaLogo size={96} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Manticao Central Church
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Seminarian Attendance
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[var(--muted)]">
              {user.username}
              <span className="ml-2 rounded border border-[var(--line)] px-2 py-0.5 text-xs uppercase tracking-wide">
                {user.role}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                logout();
                toast.success('Signed out.');
                router.replace('/login');
              }}
              className="rounded border border-[var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--surface)]"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {visibleNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <TutorialGuide />
    </div>
  );
}
