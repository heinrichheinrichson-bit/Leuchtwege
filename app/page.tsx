'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import levels from '@/lib/levels.json';
import { rotate, evaluate, neighbor } from '@/lib/game.mjs';
export default function Home() {
  const [level, setLevel] = useState(0),
    [board, setBoard] = useState<number[]>(levels[0].initial),
    [done, setDone] = useState<number[]>([]),
    [ready, setReady] = useState(false),
    [sound, setSound] = useState(false),
    [moves, setMoves] = useState(0);
  const l = levels[level],
    status = evaluate(board, l.n, l.source);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('leuchtwege-v1') || 'null');
      if (s && Number.isInteger(s.level) && s.level >= 0 && s.level < 12) {
        const lv = levels[s.level];
        if (
          Array.isArray(s.board) &&
          s.board.length === lv.initial.length &&
          s.board.every((m: number, i: number) =>
            [
              lv.initial[i],
              rotate(lv.initial[i]),
              rotate(rotate(lv.initial[i])),
              rotate(rotate(rotate(lv.initial[i]))),
            ].includes(m),
          )
        ) {
          setLevel(s.level);
          setBoard(s.board);
          setMoves(Number.isInteger(s.moves) && s.moves >= 0 ? s.moves : 0);
        }
        if (Array.isArray(s.done))
          setDone(
            s.done.filter(
              (v: number) => Number.isInteger(v) && v >= 0 && v < 12,
            ),
          );
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          'leuchtwege-v1',
          JSON.stringify({ level, board, done, moves }),
        );
      } catch {}
  }, [ready, level, board, done, moves]);
  useEffect(() => {
    if (ready && status.solved)
      setDone((v) => (v.includes(level) ? v : [...v, level]));
  }, [ready, status.solved, level]);
  function start(i: number) {
    setLevel(i);
    setBoard([...levels[i].initial]);
    setMoves(0);
  }
  function turn(i: number) {
    if (status.solved) return;
    setBoard((b) => b.map((m, j) => (i === j ? rotate(m) : m)));
    setMoves((v) => v + 1);
    if (sound) {
      try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(520, ctx.currentTime);
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
              Rätsel {String(level + 1).padStart(2, '0')} / 12
            </p>
            <h1>{l.name}</h1>
          </div>
          <span className="size">
            {l.n} × {l.n}
          </span>
        </div>
        <p className="intro">Drehe die Wege. Lass das ganze Netz leuchten.</p>
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
              className={'tile ' + (status.lit.has(i) ? 'lit' : '')}
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
                'Im Uhrzeigersinn drehen.'
              }
            >
              <svg viewBox="0 0 100 100" aria-hidden="true">
                {[0, 1, 2, 3]
                  .filter((d) => mask & (1 << d))
                  .map((d) => (
                    <path
                      key={d}
                      d={
                        ['M50 50V0', 'M50 50H100', 'M50 50V100', 'M50 50H0'][d]
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
            </button>
          ))}
        </div>
        <div className="feedback" aria-live="polite">
          {status.solved ? (
            <>
              <strong>Alles verbunden. Schön gelöst.</strong>
              <span>
                {done.length === 12
                  ? 'Du hast alle zwölf Rätsel gelöst.'
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
          <Button variant="outline" onClick={() => start(level)}>
            ↻ Neu starten
          </Button>
          {status.solved && level < 11 && (
            <Button onClick={() => start(level + 1)}>Nächstes Rätsel →</Button>
          )}
        </div>
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
              onClick={() => start(i)}
            >
              {done.includes(i) ? '✓' : i + 1}
            </button>
          ))}
        </nav>
        <details>
          <summary>So funktioniert’s</summary>
          <p>
            Antippen dreht eine Kachel um 90°. Der helle Kreis ist die Quelle.
            Verbinde alle Kacheln mit ihr, ohne offene Enden oder Anschlüsse am
            Spielfeldrand. Die kleinen Punkte markieren offene Anschlüsse.
          </p>
          <p>
            Licht bedeutet „mit der Quelle verbunden“, nicht automatisch
            „richtig gedreht“. Du darfst beliebig ausprobieren. Beim Wechsel zu
            einem anderen Rätsel beginnt dessen Anordnung von vorn.
          </p>
        </details>
        <footer>Kein Zeitdruck. Nur du und der nächste Lichtblick.</footer>
      </section>
    </main>
  );
}
