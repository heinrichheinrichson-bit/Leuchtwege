'use client';
import { t as tr } from '@/lib/i18n';
import type { CSSProperties } from 'react';

const modes = [
  ['catalog', 'Drehpuzzles', 'Drehen & verbinden', '#ffdc91'],
  ['slide', 'Nur Schieben', 'Platz für neue Wege', '#8bdcf5'],
  ['rotate', 'Schieben & Drehen', 'Zwei Züge, ein Netz', '#ffba85'],
  ['dual', 'Zwei Stromkreise', 'Zwei Quellen, zwei Netze', '#8de6cf'],
  ['path', 'Lichtweg', 'Verbinde die Sterne', '#f2a9d5'],
  ['linked', 'Gekoppelte Drehungen', 'Gemeinsam drehen', '#c3b1ff'],
];

function Preview({ mode }: { mode: string }) {
  const path =
    mode === 'path' ? 'M12 44H32V12H64V28H80' : 'M12 44V12H46V44H80V12';
  return (
    <svg viewBox="0 0 92 56" aria-hidden="true" className="mode-preview">
      <defs>
        <filter
          id={'glow-' + mode}
          x="-60%"
          y="-100%"
          width="220%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {[0, 1, 2].map((x) =>
        [0, 1].map((y) => (
          <rect
            key={x + '-' + y}
            x={x * 30 + 2}
            y={y * 26 + 2}
            width="27"
            height="23"
            rx="5"
            fill="currentColor"
            opacity={mode === 'slide' && x === 2 && y === 1 ? 0 : 0.08}
          />
        )),
      )}
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        filter={'url(#glow-' + mode + ')'}
        opacity=".65"
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path}
        fill="none"
        stroke="#fff8e9"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="44" r="4" fill="currentColor" />
      {mode === 'dual' && (
        <path
          d="M12 28H29V44"
          fill="none"
          stroke="#e5b3ff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {mode === 'path' && (
        <text x="74" y="33" fill="#fff8e9" fontSize="17">
          ★
        </text>
      )}
      {mode === 'linked' && (
        <g fill="#fff8e9" fontSize="10" fontWeight="bold">
          <text x="19" y="24">
            1
          </text>
          <text x="68" y="40">
            1
          </text>
        </g>
      )}
      {['slide', 'rotate'].includes(mode) && (
        <rect
          x="63"
          y="31"
          width="25"
          height="23"
          rx="4"
          fill="var(--background)"
          stroke="currentColor"
          strokeDasharray="2 3"
          opacity=".9"
        />
      )}
    </svg>
  );
}

export default function ModeGallery({
  onOpen,
  disabled,
}: {
  onOpen: (mode: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mode-gallery">
      {modes.map(([id, name, description, color]) => (
        <button
          key={id}
          type="button"
          className="mode-card"
          style={{ '--mode-color': color } as CSSProperties}
          disabled={disabled}
          onClick={() => onOpen(id)}
        >
          <Preview mode={id} />
          <span>
            <strong>{tr(name)}</strong>
            <small>{tr(description)}</small>
          </span>
          <span className="mode-arrow" aria-hidden="true">
            ›
          </span>
        </button>
      ))}
    </div>
  );
}
