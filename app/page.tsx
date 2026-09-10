'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import levels from '@/lib/levels.json';
import { evaluate, neighbor } from '@/lib/game.mjs';
import { fresh, boardOf, act, restore } from '@/lib/session.mjs';
export default function Home() {
  const [level, setLevel] = useState(0);
  const [sessions, setSessions] = useState<Record<number, any>>({});
  const [done, setDone] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const [lockMode, setLockMode] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const l = levels[level],
    session = sessions[level] || fresh(l);
  const board: number[] = boardOf(l, session),
    moves = session.moves,
    status = evaluate(board, l.n, l.source);
  useEffect(() => {
    try {
      const saved = restore(
        levels,
        JSON.parse(localStorage.getItem('leuchtwege-v2') || 'null'),
        JSON.parse(localStorage.getItem('leuchtwege-v1') || 'null'),
      );
      setLevel(saved.level);
      setSessions(saved.sessions);
      setDone(saved.done);
      setSound(saved.sound);
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        'leuchtwege-v2',
        JSON.stringify({ version: 2, level, sessions, done, sound }),
      );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [ready, level, sessions, done, sound]);
  useEffect(() => {
    if (ready && status.solved)
      setDone((v) => (v.includes(level) ? v : [...v, level]));
  }, [ready, status.solved, level]);
  function start(i: number) {
    setLevel(i);
    setLockMode(false);
  }
  function dispatch(action: { type: string; index?: number }) {
    setSessions((all) => ({
      ...all,
      [level]: act(l, all[level] || fresh(l), action),
    }));
  }
  function turn(i: number) {
    if (!ready || status.solved) return;
    if (lockMode) {
      dispatch({ type: 'lock', index: i });
      return;
    }
    if (session.locks[i]) return;
    dispatch({ type: 'turn', index: i });
    if (sound)
      try {
        const ctx = new AudioContext(),
          o = ctx.createOscillator(),
          g = ctx.createGain();
        o.frequency.value = 520;
        g.gain.setValueAtTime(0.035, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.09);
        o.onended = () => {
          void ctx.close();
        };
      } catch {}
  }
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const ac = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'read_puzzle',
            description:
              'Read current Leuchtwege puzzle. Bits 1,2,4,8 mean north,east,south,west.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute: () => ({
              level: level + 1,
              size: l.n,
              source: l.source,
              board,
              solved: status.solved,
            }),
          },
          { signal: ac.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => ac.abort();
  }, [level, board, l.n, l.source, status.solved]);
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ✳ <span>Leuchtwege</span>
        </a>
        <Button
          variant="ghost"
          className="sound"
          onClick={() => setSound((v) => !v)}
          aria-pressed={sound}
        >
          Ton {sound ? 'an' : 'aus'}
        </Button>
      </header>
      <section className="game">
        <div className="eyebrow">EIN MOMENT ZUM KNOBELN</div>
        <div className="title-row">
          <div>
            <p className="level-label">
              Rätsel {String(level + 1).padStart(2, '0')} / {levels.length}
            </p>
            <h1>{l.name}</h1>
          </div>
          <span className="size">
            {l.n} × {l.n}
          </span>
        </div>
        <p className="intro">Drehe die Wege. Lass das ganze Netz leuchten.</p>
        <p className="difficulty-label">
          {level < 12
            ? 'Ursprüngliche Testrätsel'
            : l.difficulty.tier + ' · neue Proberätsel'}
        </p>
        <div className="meter">
          <span>
            <i /> {status.lit.size} von {board.length} verbunden
          </span>
          <span>{moves} Drehungen</span>
        </div>
        <div
          className={'board ' + (status.solved ? 'complete' : '')}
          style={{ gridTemplateColumns: 'repeat(' + l.n + ',1fr)' }}
        >
          {board.map((mask, i) => (
            <button
              key={level + '-' + i}
              className={
                'tile ' +
                (status.lit.has(i) ? 'lit ' : '') +
                (session.locks[i] ? 'locked' : '')
              }
              disabled={status.solved || !ready}
              onClick={() => turn(i)}
              aria-label={
                'Zeile ' +
                (Math.floor(i / l.n) + 1) +
                ', Spalte ' +
                ((i % l.n) + 1) +
                ': ' +
                [0, 1, 2, 3]
                  .filter((d) => mask & (1 << d))
                  .map((d) => ['oben', 'rechts', 'unten', 'links'][d])
                  .join(', ') +
                '. ' +
                (status.lit.has(i) ? 'Verbunden. ' : '') +
                (session.locks[i] ? 'Gesperrt. ' : '') +
                (lockMode ? 'Sperre umschalten.' : 'Im Uhrzeigersinn drehen.')
              }
            >
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <g
                  className="rotor"
                  style={{
                    transform: 'rotate(' + session.turns[i] * 90 + 'deg)',
                  }}
                >
                  {[0, 1, 2, 3]
                    .filter((d) => l.initial[i] & (1 << d))
                    .map((d) => (
                      <path
                        key={d}
                        d={
                          ['M50 50V0', 'M50 50H100', 'M50 50V100', 'M50 50H0'][
                            d
                          ]
                        }
                        className="wire"
                      />
                    ))}
                  <circle
                    cx="50"
                    cy="50"
                    r={i === l.source ? 13 : 5}
                    className={i === l.source ? 'source' : 'joint'}
                  />
                  {i === l.source && (
                    <circle cx="50" cy="50" r="5" fill="#142235" />
                  )}
                </g>
                {[0, 1, 2, 3]
                  .filter((d) => {
                    const j = neighbor(i, d, l.n);
                    return (
                      mask & (1 << d) &&
                      (j < 0 || !(board[j] & (1 << ((d + 2) % 4))))
                    );
                  })
                  .map((d) => (
                    <circle
                      key={d}
                      cx={[50, 93, 50, 7][d]}
                      cy={[7, 50, 93, 50][d]}
                      r="3"
                      className="open-end"
                    />
                  ))}
              </svg>
              {session.locks[i] && (
                <span className="lock-badge" aria-hidden="true">
                  ◆
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="feedback" aria-live="polite">
          {status.solved ? (
            <>
              <strong>Alles verbunden. Schön gelöst.</strong>
              <span>
                {done.length === levels.length
                  ? 'Du hast alle Rätsel gelöst.'
                  : 'Nimm den nächsten Funken mit.'}
              </span>
            </>
          ) : (
            <>
              <strong>{status.open} offene Anschlüsse</strong>
              <span>Jeder Anschluss braucht ein passendes Gegenstück.</span>
            </>
          )}
        </div>
        <div className="actions">
          <Button
            variant="outline"
            disabled={!ready || !session.history.length}
            onClick={() => dispatch({ type: 'undo' })}
          >
            ↶ Rückgängig
          </Button>
          <Button
            variant={lockMode ? 'default' : 'outline'}
            disabled={!ready || status.solved}
            aria-pressed={lockMode}
            onClick={() => setLockMode((v) => !v)}
          >
            ◆ {lockMode ? 'Sperren aktiv' : 'Kacheln sperren'}
          </Button>
          <Button
            variant="outline"
            disabled={!ready}
            onClick={() => dispatch({ type: 'reset' })}
          >
            ↻ Neu starten
          </Button>
          {status.solved && level < levels.length - 1 && (
            <Button onClick={() => start(level + 1)}>Nächstes Rätsel →</Button>
          )}
        </div>
        {lockMode && (
          <p className="mode-help" role="status">
            Tippe eine Kachel an, um sie zu sperren oder zu entsperren. Danach
            „Sperren aktiv“ ausschalten, um weiterzudrehen.
          </p>
        )}
        {storageError && (
          <p role="status" className="mode-help">
            Dein Browser kann den Fortschritt gerade nicht speichern. Lass diese
            Seite geöffnet.
          </p>
        )}
        <nav className="levels" aria-label="Rätsel auswählen">
          {levels.map((_, i) => (
            <button
              key={i}
              aria-label={
                'Rätsel ' + (i + 1) + (done.includes(i) ? ', gelöst' : '')
              }
              aria-current={i === level ? 'step' : undefined}
              className={
                (i === level ? 'selected ' : '') +
                (done.includes(i) ? 'finished' : '')
              }
              disabled={!ready}
              onClick={() => start(i)}
            >
              {done.includes(i) ? '✓' : i + 1}
            </button>
          ))}
        </nav>
        <details>
          <summary>So funktioniert’s</summary>
          <p>
            Rätsel 1–12 sind die bisherigen Testrätsel. Danach folgen jeweils
            drei leichte, mittlere und schwere Proberätsel. Die Einstufung ist
            vorläufig: längere Schlussfolgerungsketten und mehr offene
            Möglichkeiten erhöhen die Schwierigkeit.
          </p>
          <p>
            Antippen dreht eine Kachel um 90°. Der helle Kreis ist die Quelle.
            Verbinde alle Kacheln mit ihr, ohne offene Enden oder Anschlüsse am
            Spielfeldrand. Die kleinen Punkte markieren offene Anschlüsse.
          </p>
          <p>
            Licht bedeutet „mit der Quelle verbunden“, nicht automatisch
            „richtig gedreht“. Du darfst beliebig ausprobieren. Beim Wechsel zu
            einem anderen Rätsel bleibt dein Zwischenstand erhalten. „Kacheln
            sperren“ schützt deine eigenen Markierungen vor versehentlichem
            Drehen. Eine Sperre bestätigt nicht, dass die Kachel richtig liegt.
            „Rückgängig“ nimmt die letzte Drehung oder Sperränderung zurück.
          </p>
        </details>
        <footer>Kein Zeitdruck. Nur du und der nächste Lichtblick.</footer>
      </section>
    </main>
  );
}
