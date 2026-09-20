import { generateVariant } from './random-variants.mjs';
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ puzzle: generateVariant(data) });
  } catch {
    self.postMessage({ puzzle: null });
  }
};
