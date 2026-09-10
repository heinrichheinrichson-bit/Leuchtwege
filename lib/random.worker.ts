import { generateRandom } from './random-game.mjs';
self.onmessage = (event) => {
  try {
    self.postMessage({ puzzle: generateRandom(event.data) });
  } catch {
    self.postMessage({ puzzle: null });
  }
};
