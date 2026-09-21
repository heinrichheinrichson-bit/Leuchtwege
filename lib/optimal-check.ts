import certified from './optimal-catalog.json';
import OptimalWorker from './optimal.worker?worker';
import { changeHistory } from './history-store';
const pending = new Set<string>();
export function checkOptimal(puzzle: any, attempt: any) {
  if (
    !puzzle ||
    !attempt?.completedAt ||
    attempt.assistance !== 'none' ||
    attempt.partialTime ||
    attempt.effortMoves !== attempt.moves ||
    attempt.optimalProof ||
    pending.has(attempt.id)
  )
    return;
  const cached = (certified as any)[puzzle.id];
  const signature = JSON.stringify([
    puzzle.n,
    puzzle.initial,
    puzzle.source,
    puzzle.sourceId,
    puzzle.pieces,
    puzzle.mode,
    puzzle.variant,
    puzzle.groups,
    puzzle.owners,
    puzzle.targets,
    puzzle.sources,
  ]);
  if (cached?.signature === signature) {
    changeHistory((h) => ({
      ...h,
      attempts: h.attempts.map((a: any) =>
        a.id === attempt.id
          ? {
              ...a,
              optimalProof: { version: 1, minimumMoves: cached.minimumMoves },
              optimal: a.moves === cached.minimumMoves,
            }
          : a,
      ),
    }));
    return;
  }
  pending.add(attempt.id);
  let worker: Worker;
  try {
    worker = new OptimalWorker();
  } catch {
    pending.delete(attempt.id);
    return;
  }
  const finish = () => {
    clearTimeout(timer);
    worker.terminate();
    pending.delete(attempt.id);
  };
  const timer = setTimeout(finish, 15000);
  worker.onerror = finish;
  worker.onmessage = ({ data }) => {
    finish();
    if (!data.proven) return;
    changeHistory((h) => ({
      ...h,
      attempts: h.attempts.map((a: any) =>
        a.id === attempt.id && a.completedAt === attempt.completedAt
          ? {
              ...a,
              optimalProof: { version: 1, minimumMoves: data.minimumMoves },
              optimal: data.optimal,
            }
          : a,
      ),
    }));
  };
  worker.postMessage({ puzzle, moves: attempt.moves });
}
