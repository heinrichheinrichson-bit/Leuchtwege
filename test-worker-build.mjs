// Exercise the shipped worker with Node's thread transport, without browser UI automation.
import { Worker } from 'node:worker_threads';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { evaluate, solutions } from './lib/game.mjs';
const dir = 'dist/client/_next/static';
const path = dir + '/' + readdirSync(dir).find(n => /^random\.worker-.*\.js$/.test(n));
assert(existsSync(path), 'Generated worker asset missing');
const code = readFileSync(path, 'utf8');
const page = readdirSync(dir + '/chunks').filter(n => /^page-.*\.js$/.test(n)).map(n => readFileSync(dir + '/chunks/' + n, 'utf8')).join('');
assert(page.includes('new Worker(`/_next/static/random.worker-'), 'Worker must resolve against the app origin, not a build-time file URL');
const adapter = `const {parentPort}=require('node:worker_threads');global.self=global;self.postMessage=(data)=>parentPort.postMessage(data);${code};parentPort.on('message',data=>self.onmessage({data}));`;
const worker = new Worker(adapter, {eval:true});
try {
  async function send(options) {
    return await new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(Error('Worker timed out')),8000);
      worker.once('error',reject);
      worker.once('message',msg=>{clearTimeout(timer);worker.removeListener('error',reject);resolve(msg);});
      worker.postMessage(options);
    });
  }
  for (const tier of ['Leicht','Mittel','Schwer']) {
    const {puzzle:l}=await send({tier,size:4,seed:39013});
    assert(l);
    assert.equal(l.difficulty.tier,tier);
    assert(evaluate(l.solution,l.n,l.source).solved);
    assert.equal(solutions(l.initial,l.n,l.source).length,1);
  }
  assert.deepEqual(await send({tier:'Schwer',size:3,seed:0}), {puzzle:null});
} finally { await worker.terminate(); }
const cancelled = new Worker(adapter,{eval:true});
let delivered = false;
cancelled.on('message',()=>{delivered=true;});
cancelled.postMessage({tier:'Schwer',size:6,seed:49013});
await cancelled.terminate();
assert(!delivered,'Cancelled worker delivered a stale puzzle');
console.log('PASS: production worker asset, same-origin URL, generation messages, failure message, worker termination.');
