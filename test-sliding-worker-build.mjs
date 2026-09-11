import { Worker } from 'node:worker_threads';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { freshSliding, slidingStatus } from './lib/sliding.mjs';
import { solutionPlan, applyHelp } from './lib/solve-help.mjs';
const dir = 'dist/client/_next/static';
const page = readdirSync(dir + '/chunks')
  .filter((n) => n.startsWith('page-'))
  .map((n) => readFileSync(dir + '/chunks/' + n, 'utf8'))
  .join('');
assert(page.includes('new Worker(`/_next/static/random-sliding.worker-'));
const code = readFileSync(
  dir +
    '/' +
    readdirSync(dir).find((n) => n.startsWith('random-sliding.worker-')),
  'utf8',
);
const make = () =>
  new Worker(
    `const {parentPort}=require('node:worker_threads');global.self=global;self.postMessage=data=>parentPort.postMessage(data);${code};parentPort.on('message',data=>self.onmessage({data}));`,
    { eval: true },
  );
const worker = make();
const request = (data) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Worker timeout')), 15000);
    worker.once('error', reject);
    worker.once('message', (m) => {
      clearTimeout(timer);
      worker.removeListener('error', reject);
      resolve(m);
    });
    worker.postMessage(data);
  });
try {
  for (const mode of ['slide', 'rotate'])
    for (const tier of ['Leicht', 'Mittel', 'Schwer']) {
      const { puzzle: l, error } = await request({ mode, tier, seed: 91234 });
      assert(!error, error);
      const s = freshSliding(l);
      assert(
        slidingStatus(l, applyHelp(l, s, solutionPlan(l, s), 'all')).solved,
      );
    }
  assert((await request({ mode: 'invalid', tier: 'Schwer', seed: 1 })).error);
} finally {
  await worker.terminate();
}
const canceled = make();
let received = false;
canceled.on('message', () => {
  received = true;
});
canceled.postMessage({ mode: 'rotate', tier: 'Schwer', seed: 1 });
await canceled.terminate();
assert(!received);
console.log(
  'PASS: shipped sliding generator worker, all modes/tiers, solver compatibility, rejection and termination.',
);
