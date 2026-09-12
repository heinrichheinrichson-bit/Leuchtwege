import { Worker } from 'node:worker_threads';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

import { solutionPlan, applyHelp, helpSolved } from './lib/solve-help.mjs';
const dir = 'dist/client/_next/static';
const page = readdirSync(dir + '/chunks')
  .filter((n) => n.startsWith('page-'))
  .map((n) => readFileSync(dir + '/chunks/' + n, 'utf8'))
  .join('');
assert(page.includes('new Worker(`/_next/static/daily.worker-'));
const code = readFileSync(
  dir + '/' + readdirSync(dir).find((n) => n.startsWith('daily.worker-')),
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
  for (const mode of ['turn', 'slide', 'rotate']) {
    const { entry, error } = await request({ mode, day: '2026-09-12' });
    assert(!error, error);
    const { puzzle: l, session: s } = entry;
    assert(helpSolved(l, applyHelp(l, s, solutionPlan(l, s), 'all')));
  }
  assert((await request({ mode: 'invalid', day: '2026-09-12' })).error);
} finally {
  await worker.terminate();
}
const canceled = make();
let received = false;
canceled.on('message', () => {
  received = true;
});
canceled.postMessage({ mode: 'rotate', day: '2026-09-12' });
await canceled.terminate();
assert(!received);
console.log(
  'PASS: shipped daily generator worker, all modes, solver compatibility, rejection and termination.',
);
