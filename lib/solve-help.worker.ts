import { solutionPlan } from './solve-help.mjs';
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ plan: solutionPlan(data.puzzle, data.session) });
  } catch {
    self.postMessage({
      error: 'Für diese Stellung wurde kein Lösungsweg gefunden.',
    });
  }
};
