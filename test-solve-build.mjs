import { Worker } from 'node:worker_threads';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fresh } from './lib/session.mjs';
import { freshSliding } from './lib/sliding.mjs';
import { applyHelp, helpSolved } from './lib/solve-help.mjs';
const dir='dist/client/_next/static';
const page=readdirSync(dir+'/chunks').filter(n=>n.startsWith('page-')).map(n=>readFileSync(dir+'/chunks/'+n,'utf8')).join('');
const testBuild=process.argv.includes('--test-build');
assert.equal(/[`"']Testhilfe[`"']/.test(page),testBuild,'Developer button must only exist in test build');
assert.equal(page.includes('Werbung simulieren · +1 Tipp'),testBuild,'Reward simulation must only be reachable in test build');
assert(page.includes('new Worker(`/_next/static/solve-help.worker-'),'Solver must use same-origin worker URL');
const code=readFileSync(dir+'/'+readdirSync(dir).find(n=>n.startsWith('solve-help.worker-')),'utf8');
const worker=new Worker(`const {parentPort}=require('node:worker_threads');global.self=global;self.postMessage=data=>parentPort.postMessage(data);${code};parentPort.on('message',data=>self.onmessage({data}));`,{eval:true});
try {
  const puzzles=[JSON.parse(readFileSync('lib/levels.json'))[20],JSON.parse(readFileSync('lib/sliding-levels.json'))[5]];
  for(const puzzle of puzzles) {
    const session=puzzle.pieces?freshSliding(puzzle):fresh(puzzle);
    const message=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Worker timeout')),10000);
      worker.once('error',reject);worker.once('message',m=>{clearTimeout(timer);worker.removeListener('error',reject);resolve(m);});worker.postMessage({puzzle,session});
    });
    assert(message.plan);
    assert(helpSolved(puzzle,applyHelp(puzzle,session,message.plan,'all')));
  }
} finally {await worker.terminate();}
console.log('PASS: shipped solver worker and '+(testBuild?'enabled':'disabled')+' developer/reward simulation controls.');
