const assert=require('node:assert/strict');const E=require('../dist/engine');
assert.equal(E.detect(E.base).length,0);
let delayed=E.clone(E.base);delayed[0].start+=120;delayed[0].end+=120;
assert(E.detect(delayed).some(x=>x.id==='transfer'));
let opts=E.recover(delayed,15000);assert(opts.some(x=>x.feasible));for(let p of opts.filter(x=>x.feasible)){assert.equal(E.detect(p.items).length,0);assert(p.total<=15000);}
assert.equal(opts.find(x=>x.id==='car').feasible,false);
let cancelled=E.clone(E.base);cancelled[0].cancelled=true;assert(E.detect(cancelled).some(x=>x.kind==='dependency'));let recovery=E.recover(cancelled,15000);assert.equal(recovery.filter(x=>x.feasible).length,1);assert.equal(recovery.find(x=>x.feasible).id,'flight');
assert(E.recover(delayed,100).every(x=>!x.feasible));
let fixed=delayed.find(x=>x.id==='meeting');assert.equal(E.propagate(delayed).find(x=>x.id==='meeting').start,fixed.start);
assert.deepEqual(E.base,E.clone(E.base));console.log('Passed: baseline, delay propagation, cancellation, budget and fixed-appointment checks.');
