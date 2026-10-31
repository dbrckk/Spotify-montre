/**
 * Production SEO health audit for Atelier Montres.
 * Uses only built-in Node.js APIs and read-only public HTTP requests.
 * Checks crawlability, canonical consistency, published inventory and images.
 * Does not claim that Google has indexed or ranked any page.
 */
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const base=new URL(process.env.SEO_AUDIT_BASE_URL||'https://atelier-montres-selection-fr.onrender.com/');
if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash){
  throw Error('SEO_AUDIT_BASE_URL must be an HTTPS origin ending in /');
}
const issues=[],checked=[];
const origin=base.origin;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const popular=JSON.parse(readFileSync(resolve(repoRoot,'site/selection-populaires.json'),'utf8')).products;
const verified=JSON.parse(readFileSync(resolve(repoRoot,'research/amazon-fr-popular-verified.json'),'utf8')).verifiedProducts;
if(popular.length!==13||Object.keys(verified).length!==1)throw Error('Source catalog and Amazon direct-link registry changed: update audit assertions deliberately');
const report={checkedAt:new Date().toISOString(),site:base.href,pages:0,issues,checked,commercialPages:0,commercialChecks:0};

async function request(url){
  let error;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{
        signal:AbortSignal.timeout(14000),
        headers:{accept:'text/html,application/xml,text/plain,application/json,image/webp;q=0.9,*/*;q=0.5'}
      });
      if((response.status===429||response.status>=500)&&attempt<2){
        error=Error('HTTP '+response.status);
        await response.body?.cancel();
        await delay(750*(attempt+1));
        continue;
      }
      return response;
    }catch(e){
      error=e;
      if(attempt<2)await delay(750*(attempt+1));
    }
  }
  throw Error(error?.message||'Network request failed');
}
async function fetchText(path,kind){
  const url=new URL(path,base).href;
  try{
    const response=await request(url);
    if(!response.ok){issues.push(path+': HTTP '+response.status);return null;}
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.toLowerCase().includes(kind)){
      issues.push(path+': unexpected Content-Type '+contentType);
      return null;
    }
    return await response.text();
  }catch(error){
    issues.push(path+': fetch failed: '+error.message);
    return null;
  }
}
function decodeXml(value){
  return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
async function auditPage(url){
  const path=new URL(url).pathname;
  const html=await fetchText(path,'text/html');
  if(html===null)return;
  checked.push(url);
  if(!/<html\b/i.test(html)||!/<h1(?:\s|>)/i.test(html)||!/<title>\s*[^<]+\s*<\/title>/i.test(html)){
    issues.push(path+': missing HTML, H1 or title');
  }
  const canonicals=[...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
    .map(match=>match[1]);
  if(canonicals.length!==1||canonicals[0]!==url){
    issues.push(path+': canonical mismatch: '+JSON.stringify(canonicals));
  }
  const robots=html.match(/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["']([^"']+)["']/i);
  if(!robots||/(?:^|,)\s*noindex\b/i.test(robots[1])){
    issues.push(path+': missing indexable robots tag or unexpected noindex');
  }
  if(!/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["'][^"']{40,}/i.test(html)){
    issues.push(path+': missing substantial meta description');
  }
  const model=popular.find(p=>path==='/montres/'+p.id+'.html');
  if(model){
    report.commercialPages++;
    const expect=(condition,message)=>{report.commercialChecks++;if(!condition)issues.push(path+': '+message);};
    expect(html.includes('data-popular-watch-id="'+model.id+'"'),'incorrect or missing product identity');
    expect(html.includes('<h1>'+model.brand+' '+model.model+'</h1>'),'incorrect product H1');
    expect(html.includes('href="'+model.officialUrl+'"'),'manufacturer URL absent');
    expect(html.includes('href="'+model.marketEvidence.url+'"'),'research source absent');
    expect((html.match(/class="am-extra-fact"/g)||[]).length===4,'expected four model-specific facts');
    expect(html.includes('En tant que Partenaire Amazon'),'affiliate disclosure absent');
    expect((html.match(/class="am-extra-related"/g)||[]).length===1,'internal comparison links absent');
    const direct=verified[model.id];
    if(direct){
      expect(html.includes('https://www.amazon.fr/dp/'+direct.asin+'?tag=drackk04-21'),
        'verified exact-model Amazon.fr destination missing');
      expect(html.includes('data-amazon-product="'+model.id+'"'),'direct product attribution missing');
      expect(!html.includes('data-amazon-search-id="'+model.id+'"'),'verified ASIN should not silently revert to a search');
    }else{
      expect(html.includes('data-amazon-search-id="'+model.id+'"'),'unverified model must use a labeled search');
      expect(!html.includes('data-amazon-product="'+model.id+'"'),'unverified model must not claim an exact ASIN');
      expect(html.includes('https://www.amazon.fr/s?k='),'Amazon.fr search destination missing');
    }
    expect(/rel="[^"]*sponsored/.test(html),'paid outbound link must be labeled sponsored');
  }
}
async function audit(){
  const robots=await fetchText('robots.txt','text/plain');
  if(robots!==null){
    if(!robots.includes('Sitemap: '+new URL('sitemap.xml',base).href)){
      issues.push('robots.txt: advertised sitemap URL is missing');
    }
    if(/^\s*Disallow:\s*\/\s*$/im.test(robots))issues.push('robots.txt: root is disallowed');
  }
  const xml=await fetchText('sitemap.xml','xml');
  let urls=[];
  if(xml!==null){
    if(!/<urlset\b/.test(xml))issues.push('sitemap.xml: missing urlset root');
    urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decodeXml(m[1].trim()));
    if(urls.length!==43)issues.push('sitemap.xml: expected exactly 43 documented pages (15 core + 13 supplemental + editorial routes), found '+urls.length);
    if(!urls.includes(new URL('montres/methode-selection.html',base).href)){
      issues.push('sitemap.xml: published selection methodology is missing');
    }
    if(new Set(urls).size!==urls.length)issues.push('sitemap.xml: duplicated URLs');
    for(const url of urls){
      try{
        const parsed=new URL(url);
        if(parsed.origin!==origin||parsed.search||parsed.hash||!['/','.html'].some(s=>s==='/'?parsed.pathname==='/':parsed.pathname.endsWith(s))){
          issues.push('sitemap.xml: unexpected or cross-domain URL '+url);
        }
      }catch{issues.push('sitemap.xml: invalid URL '+url);}
    }
  }
  const manifestText=await fetchText('seo-manifest.json','application/json');
  if(manifestText!==null){
    try{
      const manifest=JSON.parse(manifestText);
      if(manifest.siteUrl!==base.href||!Array.isArray(manifest.paths)||
          manifest.paths.length!==urls.length||
          new Set(manifest.paths).size!==manifest.paths.length||
          manifest.paths.some(url=>!urls.includes(url))){
        issues.push('seo-manifest.json: manifest and sitemap disagree');
      }
    }catch(e){issues.push('seo-manifest.json: invalid JSON ('+e.message+')');}
  }
  for(const p of popular){
    if(!urls.includes(new URL('montres/'+p.id+'.html',base).href))
      issues.push('sitemap.xml: missing individual commercial landing page '+p.id);
  }
    report.pages=urls.length;
  const queue=urls.filter(url=>{
    try{return new URL(url).origin===origin;}catch{return false;}
  });
  await Promise.all(Array.from({length:4},async()=>{
    while(queue.length){
      const url=queue.shift();
      if(url)await auditPage(url);
    }
  }));
  if(report.commercialPages!==popular.length)
    issues.push('Commercial routes fetched: expected '+popular.length+', got '+report.commercialPages);
  // Check that Google can retrieve the HTML verification proof without relying
  // on environment variables or on a browser executing JavaScript.
  const verificationPath='google6d385495b6d15d5e.html';
  const verification=await fetchText(verificationPath,'text/html');
  if(verification!==null &&
      verification.trim()!=='google-site-verification: google6d385495b6d15d5e.html'){
    issues.push(verificationPath+': verification body does not match the Google Search Console token');
  }
  // Verify that the largest published images have smaller responsive variants.
  for(const filename of ['citizen-tsuyosa-480.webp','casio-mtp-1302-480.webp']){
    const asset='assets/watch-responsive/'+filename;
    try{
      const response=await request(new URL(asset,base));
      if(!response.ok||!(response.headers.get('content-type')||'').includes('image/webp')){
        issues.push(asset+': missing optimized WebP in production (HTTP '+response.status+')');
      }
      await response.body?.cancel();
    }catch(error){issues.push(asset+': '+error.message);}
  }
  // A same-origin real photo is a production asset, not a stock-image substitute.
  const imagePath='assets/watches/citizen-tsuyosa.webp';
  try{
    const response=await request(new URL(imagePath,base));
    if(!response.ok||(response.headers.get('content-type')||'').toLowerCase().indexOf('image/webp')<0){
      issues.push(imagePath+': unavailable or wrong MIME type (HTTP '+response.status+')');
    }
    await response.body?.cancel();
  }catch(e){issues.push(imagePath+': fetch failed: '+e.message);}
}
try{await audit();}
catch(e){issues.push('Audit interrupted: '+e.message);}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/live-seo-audit.json',JSON.stringify(report,null,2)+'\n');
const summary='### Atelier Montres — live SEO audit\n\n'
  +'- Pages in sitemap: '+report.pages+'\n'
  +'- Pages fetched successfully: '+checked.length+'\n'\n  +'- Commercial landing pages checked: '+report.commercialPages+' / '+popular.length+' ('+report.commercialChecks+' integrity assertions)\n'
  +'- Issues: '+issues.length+'\n\n'
  +(issues.length?'#### Detected problems\n'+issues.map(x=>'- '+x).join('\n'):'All public technical SEO checks passed.')+'\n';
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
console.log(summary);
if(issues.length)process.exitCode=1;
