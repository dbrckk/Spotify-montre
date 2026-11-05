/**
 * CJ's OpenAPI account budget is commonly limited to about one request/sec.
 * Real sequential reads must be paced from the FIRST through the LAST request.
 * An injected CI fetcher is kept unpaced unless force is enabled explicitly.
 *
 * Each instance serializes concurrent calls and starts them >= 1250ms apart.
 * It never retries an uncertain supplier POST, so no supplier order can be
 * duplicated by this transport helper.
 *
 * Does not coordinate separately running servers or GitHub Actions jobs:
 * those need their own account-level scheduling/concurrency protection.
 */
export function createCjPacedFetch(fetcher=fetch,{
  force=false,intervalMs=1250,clock=Date.now,
  sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}){
  if(typeof fetcher!=='function')throw Error('CJ fetcher required');
  if(!Number.isSafeInteger(intervalMs)||intervalMs<1000||intervalMs>10000)
    throw Error('CJ interval must be between 1 and 10 seconds');
  if(typeof clock!=='function'||typeof sleep!=='function')
    throw Error('CJ pacing clock unavailable');
  if(!force&&fetcher!==fetch)return fetcher;
  let queue=Promise.resolve();
  let lastStart=null;
  return (...args)=>{
    const call=queue.then(async()=>{
      const current=clock();
      if(!Number.isFinite(current)||current<0)
        throw Error('CJ pacing clock invalid');
      if(lastStart!==null){
        const delay=Math.max(0,lastStart+intervalMs-current);
        if(delay>0)await sleep(delay);
      }
      lastStart=clock();
      if(!Number.isFinite(lastStart)||lastStart<0)
        throw Error('CJ pacing clock invalid');
      return fetcher(...args);
    });
    // A network error must not poison the next unrelated read; importantly
    // the original error is still propagated to this caller without retry.
    queue=call.then(()=>{},()=>{});
    return call;
  };
}
