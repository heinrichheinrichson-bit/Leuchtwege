import { generateSliding } from './random-sliding.mjs';
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ puzzle: generateSliding(data) });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : 'Rätsel konnte nicht erzeugt werden.',
    });
  }
};
