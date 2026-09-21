import { proveOptimal } from './optimal-moves.mjs';
self.onmessage = ({ data }) => {
  try {
    self.postMessage(
      proveOptimal(data.puzzle, data.moves, {
        budgetMs: 12000,
        maxNodes: 1000000,
      }),
    );
  } catch {
    self.postMessage({ proven: false, optimal: false, minimumMoves: null });
  }
};
