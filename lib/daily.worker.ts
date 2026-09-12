import { generateDaily } from './daily-generator.mjs';
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ entry: generateDaily(data.day, data.mode) });
  } catch (e) {
    self.postMessage({
      error:
        e instanceof Error
          ? e.message
          : 'Tagesrätsel konnte nicht erzeugt werden.',
    });
  }
};
