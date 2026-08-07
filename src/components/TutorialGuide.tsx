'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const DONE_KEY = 'sda_tutorial_done_v1';
const SESSION_KEY = 'sda_tutorial_session_v1';

type TourStep = {
  id: string;
  title: string;
  body: string;
  href?: string;
  adminOnly?: boolean;
};

const ALL_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome guide',
    body: 'This system tracks seminarian attendance for Manticao Central Church seminars. Follow these steps to learn the flow — or tap Skip anytime.',
    href: '/dashboard',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    body: 'Your home overview: today’s present/absent counts and the active seminar. Start here each day to see who still needs to be marked.',
    href: '/dashboard',
  },
  {
    id: 'seminarians',
    title: 'Seminarians',
    body: 'Register people once (Admin). Add only if staff will mark later, or Add & mark present when they arrive during an active seminar. Names must be unique.',
    href: '/seminarians',
  },
  {
    id: 'attendance',
    title: 'Attendance sheet',
    body: 'Create a seminar date range (e.g. one week). The tally shows P / A / – for each day. Mark Present only for today — no future days, no double-mark.',
    href: '/attendance',
  },
  {
    id: 'flow',
    title: 'Daily flow',
    body: '1) Admin creates the seminar week. 2) Register new seminarians as they come. 3) Staff taps Mark P on the tally. 4) Watch Welcome / Welcome back confirmations.',
    href: '/attendance',
  },
  {
    id: 'archive',
    title: 'Archive & export',
    body: 'Ended seminars keep totals here: present marks, perfect attendance, and rate. Open a tally again, or export Excel / PDF for records.',
    href: '/archive',
  },
  {
    id: 'raffle',
    title: 'Raffle wheel',
    body: 'After the seminar, spin for prizes. Filter by perfect attendance, everyone, non-Adventist, or a manual list. Winners are removed so they don’t win twice.',
    href: '/raffle',
  },
  {
    id: 'users',
    title: 'Users (Admin)',
    body: 'Admins create Staff or Admin accounts. Staff can view seminarians and mark attendance; only Admin manages users and seminarian records.',
    href: '/users',
    adminOnly: true,
  },
  {
    id: 'done',
    title: 'You’re ready',
    body: 'Tap the floating guide head anytime to replay this tour. Need a reminder? Look for the green helper at the bottom-right of the screen.',
    href: '/dashboard',
  },
];

type SessionState = {
  open: boolean;
  stepIndex: number;
};

function readSession(): SessionState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (typeof parsed.open !== 'boolean' || typeof parsed.stepIndex !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(state: SessionState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function TutorialGuide({ autoStart = true }: { autoStart?: boolean }) {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const steps = useMemo(
    () => ALL_STEPS.filter((s) => !s.adminOnly || isAdmin),
    [isAdmin]
  );

  const totalSteps = steps.length;
  const safeIndex = Math.min(Math.max(stepIndex, 0), Math.max(totalSteps - 1, 0));
  const step = steps[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex >= totalSteps - 1;

  useEffect(() => {
    const session = readSession();
    if (session?.open) {
      setOpen(true);
      setStepIndex(session.stepIndex);
    } else if (autoStart) {
      try {
        const done = localStorage.getItem(DONE_KEY);
        if (!done) {
          setOpen(true);
          setStepIndex(0);
          writeSession({ open: true, stepIndex: 0 });
        }
      } catch {
        /* ignore */
      }
    }
    setReady(true);
  }, [autoStart]);

  useEffect(() => {
    if (!ready) return;
    if (open) {
      writeSession({ open: true, stepIndex: safeIndex });
    }
  }, [ready, open, safeIndex]);

  // Keep index valid when admin/staff step list length differs
  useEffect(() => {
    if (stepIndex > totalSteps - 1) {
      setStepIndex(Math.max(totalSteps - 1, 0));
    }
  }, [stepIndex, totalSteps]);

  const markDone = useCallback(() => {
    try {
      localStorage.setItem(DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    clearSession();
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), steps.length - 1);
      const next = steps[clamped];
      if (!next) return;
      setStepIndex(clamped);
      writeSession({ open: true, stepIndex: clamped });
      if (next.href && pathname !== next.href) {
        router.push(next.href);
      }
    },
    [steps, pathname, router]
  );

  function openTour() {
    setStepIndex(0);
    setOpen(true);
    writeSession({ open: true, stepIndex: 0 });
    const first = steps[0];
    if (first?.href && pathname !== first.href) {
      router.push(first.href);
    }
  }

  function skip() {
    markDone();
    setOpen(false);
  }

  function finish() {
    markDone();
    setOpen(false);
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    goToStep(safeIndex + 1);
  }

  function back() {
    if (isFirst) return;
    goToStep(safeIndex - 1);
  }

  if (!ready) return null;

  return (
    <>
      <button
        type="button"
        className={`guide-fab${open ? ' is-open' : ''}`}
        aria-label="Open how-to guide"
        title="How to use this system"
        onClick={() => (open ? setOpen(false) : openTour())}
      >
        <span className="guide-fab-face" aria-hidden>
          <span className="guide-fab-eyes">
            <i />
            <i />
          </span>
          <span className="guide-fab-smile" />
        </span>
        <span className="guide-fab-pulse" aria-hidden />
      </button>

      {open && step ? (
        <div className="guide-panel" role="dialog" aria-labelledby="guide-title">
          <div className="guide-panel-head">
            <p className="guide-step-label">
              Step {safeIndex + 1} of {totalSteps}
            </p>
            <button type="button" className="guide-skip" onClick={skip}>
              Skip
            </button>
          </div>

          <div className="guide-progress" aria-hidden>
            <div
              className="guide-progress-bar"
              style={{ width: `${((safeIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <h3 id="guide-title" className="guide-title">
            {step.title}
          </h3>
          <p className="guide-body">{step.body}</p>

          <div className="guide-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={back}
              disabled={isFirst}
            >
              Back
            </button>
            <button type="button" className="btn-primary" onClick={next}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
