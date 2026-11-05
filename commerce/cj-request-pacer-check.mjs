import assert from 'node:assert/strict';
import {createCjPacedFetch} from './cj-request-pacer.mjs';

// CJ enforces an account-level request budget. Verify actual start times,
// including when calls arrive concurrently or one provider request fails.
let current=0;
const starts=[];
const calls=[];
const transport=async id=>{
  starts.push(current);
  calls.push(id);
  if(id===2)throw Error('CJ temporary provider failure');
  return 'response-'+id;
};
const paced=createCjPacedFetch(transport,{
  force:true,
  clock:()=>current,
  sleep:async duration=>{
    assert.ok(duration>0);
    current+=duration;
  }
});
const outcomes=await Promise.allSettled([0,1,2,3,4].map(i=>paced(i)));
assert.deepEqual(starts,[0,1250,2500,3750,5000]);
assert.deepEqual(calls,[0,1,2,3,4],
  'a failed request is never retried or allowed to poison the queue');
assert.deepEqual(outcomes.map(x=>x.status),
  ['fulfilled','fulfilled','rejected','fulfilled','fulfilled']);
assert.equal(outcomes[2].reason.message,'CJ temporary provider failure');
assert.equal(outcomes[4].value,'response-4');

// A synthetic injected transport stays instantaneous to keep larger
// supplier and isolated PostgreSQL checks lightweight.
assert.equal(createCjPacedFetch(transport),transport);
assert.throws(()=>createCjPacedFetch(transport,{intervalMs:500}),/interval/);
assert.throws(()=>createCjPacedFetch(transport,{intervalMs:12000}),/interval/);
assert.throws(()=>createCjPacedFetch(null),/fetcher required/);

// No retry, no supplier write, no CJ credential or billing request.
assert.equal(calls.length,5);
console.log('CJ request pacing OK: serialized calls, >=1250ms spacing, no retries after provider failure');
