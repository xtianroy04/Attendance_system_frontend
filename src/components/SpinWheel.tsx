'use client';

import { useMemo } from 'react';

type WheelPerson = {
  id: number;
  full_name: string;
};

/** High-contrast alternating slices for readability */
const PAIR_A = '#0f5c45';
const PAIR_B = '#f5b335';
const PAIR_C = '#1f7a5c';
const PAIR_D = '#fff1d0';

function sliceColor(i: number, total: number): { fill: string; text: string } {
  const palette = [
    { fill: PAIR_A, text: '#ffffff' },
    { fill: PAIR_B, text: '#1c2a22' },
    { fill: PAIR_C, text: '#ffffff' },
    { fill: PAIR_D, text: '#1c2a22' },
  ];
  // Prefer strict alternate when many slices
  if (total > 8) {
    return i % 2 === 0
      ? { fill: PAIR_A, text: '#ffffff' }
      : { fill: PAIR_B, text: '#1c2a22' };
  }
  return palette[i % palette.length];
}

function shortLabel(fullName: string, crowded: boolean): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return crowded && parts[0].length > 10 ? `${parts[0].slice(0, 9)}…` : parts[0];
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (crowded) {
    const label = `${first} ${last.charAt(0)}.`;
    return label.length > 12 ? `${first.slice(0, 8)}…` : label;
  }
  const full = `${first} ${last}`;
  return full.length > 16 ? `${first} ${last.charAt(0)}.` : full;
}

type SpinWheelProps = {
  people: WheelPerson[];
  rotation: number;
  spinning: boolean;
  winnerId: number | null;
};

export function SpinWheel({ people, rotation, spinning, winnerId }: SpinWheelProps) {
  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 6;
  const rimR = outerR - 14;
  const radius = rimR - 2;

  const slices = useMemo(() => {
    const n = Math.max(people.length, 1);
    const angle = 360 / n;
    const crowded = n > 10;
    return people.map((person, i) => {
      const start = i * angle;
      const end = start + angle;
      const large = angle > 180 ? 1 : 0;
      const startRad = ((start - 90) * Math.PI) / 180;
      const endRad = ((end - 90) * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;

      const midAngle = (start + end) / 2;
      const midRad = ((midAngle - 90) * Math.PI) / 180;
      const labelR = radius * (crowded ? 0.68 : 0.62);
      const lx = cx + labelR * Math.cos(midRad);
      const ly = cy + labelR * Math.sin(midRad);

      let textRotate = midAngle - 90;
      if (midAngle > 90 && midAngle < 270) {
        textRotate += 180;
      }

      const colors = sliceColor(i, n);
      return {
        person,
        path,
        fill: colors.fill,
        text: colors.text,
        lx,
        ly,
        textRotate,
        label: shortLabel(person.full_name, crowded),
        tickAngle: start,
      };
    });
  }, [people, cx, cy, radius]);

  if (people.length === 0) {
    return (
      <div className="wheel-wrap">
        <div className="wheel-empty">Add people to the pool to spin</div>
      </div>
    );
  }

  const fontSize =
    people.length > 18 ? 9 : people.length > 12 ? 10 : people.length > 8 ? 11 : 13;

  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = ((i * 7.5 - 90) * Math.PI) / 180;
    const inner = i % 4 === 0 ? outerR - 11 : outerR - 7;
    return {
      x1: cx + inner * Math.cos(a),
      y1: cy + inner * Math.sin(a),
      x2: cx + (outerR - 1) * Math.cos(a),
      y2: cy + (outerR - 1) * Math.sin(a),
      major: i % 4 === 0,
    };
  });

  return (
    <div className="wheel-stage">
      <div className="wheel-wrap">
        <div className="wheel-pointer-peg" aria-hidden>
          <span className="wheel-pointer-tip" />
          <span className="wheel-pointer-base" />
        </div>

        <div
          className={`wheel-disk${spinning ? ' is-spinning' : ''}${
            winnerId && !spinning ? ' has-winner' : ''
          }`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
              <filter id="sliceShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
              </filter>
              <radialGradient id="rimGrad" cx="50%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#2a8f6c" />
                <stop offset="55%" stopColor="#0f5c45" />
                <stop offset="100%" stopColor="#0a3d30" />
              </radialGradient>
              <radialGradient id="hubGrad" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fffdf8" />
                <stop offset="100%" stopColor="#e8e0d0" />
              </radialGradient>
            </defs>

            {/* Outer rim */}
            <circle cx={cx} cy={cy} r={outerR} fill="url(#rimGrad)" />
            <circle cx={cx} cy={cy} r={rimR} fill="#0a3d30" />

            {ticks.map((t, i) => (
              <line
                key={i}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.major ? '#f5b335' : 'rgba(255,248,230,0.35)'}
                strokeWidth={t.major ? 2 : 1}
                strokeLinecap="round"
              />
            ))}

            {/* Inner face */}
            <circle cx={cx} cy={cy} r={radius + 1} fill="#fffdf8" />

            {slices.map((slice) => {
              const dimmed = Boolean(winnerId && winnerId !== slice.person.id && !spinning);
              const isWin = winnerId === slice.person.id && !spinning;
              return (
                <g key={slice.person.id} filter="url(#sliceShadow)">
                  <path
                    d={slice.path}
                    fill={slice.fill}
                    stroke="#fffdf8"
                    strokeWidth={2.5}
                    opacity={dimmed ? 0.4 : 1}
                  />
                  {isWin ? (
                    <path
                      d={slice.path}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={4}
                      opacity={0.9}
                    />
                  ) : null}
                  <text
                    x={slice.lx}
                    y={slice.ly}
                    fill={slice.text}
                    fontSize={fontSize}
                    fontWeight={700}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${slice.textRotate}, ${slice.lx}, ${slice.ly})`}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {slice.label}
                  </text>
                </g>
              );
            })}

            {/* Hub */}
            <circle cx={cx} cy={cy} r={36} fill="url(#hubGrad)" stroke="#0f5c45" strokeWidth={4} />
            <circle cx={cx} cy={cy} r={26} fill="#0f5c45" />
            <text
              x={cx}
              y={cy - 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#f5b335"
              fontSize={12}
              fontWeight={800}
              letterSpacing="0.06em"
            >
              SDA
            </text>
          </svg>
        </div>
      </div>
      <div className="wheel-stand" aria-hidden />
    </div>
  );
}
