import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const script = readFileSync(resolve(import.meta.dirname, '../site/app.js'), 'utf8');

function simulate(newsletterUrl) {
  const elements = new Map();
  const make = (name) => ({
    id:name,
    hidden:name==='chatPanel'||name==='newsletterCta',
    children:[],
    textContent:'',
    value:'',
    attrs:{},
    listeners:{},
    addEventListener(event, handler){this.listeners[event]=handler;},
    setAttribute(name,value){this.attrs[name]=value;},
    getAttribute(name){return this.attrs[name];},
    appendChild(node){this.children.push(node);},
    get firstElementChild(){return this.children[0];},
    focus(){this.focused=true;},
    remove(){ /* overridden per node */ }
  });
  for(const name of ['chatLauncher','chatPanel','chatClose','chatHistory','chatForm','chatInput','chatTopics','newsletterCta','newsletterComing']){
    elements.set(name,make(name));
  }
  const history=elements.get('chatHistory');
  const doc={listeners:{},
    getElementById(id){return elements.get(id)||null;},
    createElement(tag){
      assert.equal(tag,'p');
      const node=make('message');
      node.remove=()=>{const idx=history.children.indexOf(node);if(idx>=0)history.children.splice(idx,1)};
      return node;
    },
    addEventListener(event,handler){this.listeners[event]=handler;}
  };
  let requests=0;
  const context={
    document:doc, URL, console,
    fetch: async (url)=>{requests++;assert.equal(url,'./config.json');return {ok:true,json:async()=>({status:'prelaunch',squareStoreUrl:null,newsletterUrl})};}
  };
  runInNewContext(script,context,{timeout:3000});
  const $=(name)=>elements.get(name);
  const open=()=> $('chatLauncher').listeners.click();
  const send=(message)=>{$('chatInput').value=message;$('chatForm').listeners.submit({preventDefault(){}});};
  return {elements,$,open,send,doc,get requests(){return requests}};
}

const ui=simulate(null);
assert.equal(ui.$('chatPanel').hidden,true,'Chat must start closed');
ui.open();
assert.equal(ui.$('chatPanel').hidden,false,'Chat must open');
assert.equal(ui.$('chatLauncher').attrs['aria-expanded'],'true');
assert.ok(ui.$('chatHistory').children[0].textContent.includes('Bienvenue'));
ui.send('Quelle livraison ?');
assert.match(ui.$('chatHistory').children.at(-1).textContent,/France/);
ui.send('Quelle est la garantie ?');
assert.match(ui.$('chatHistory').children.at(-1).textContent,/14 jours/);
ui.send('<img src=x onerror=alert(1)>');
assert.match(ui.$('chatHistory').children.at(-1).textContent,/assistant d'information local/);
assert.ok(ui.$('chatHistory').children.some(node=>node.textContent.includes('<img')),'User HTML is inert text only');
ui.doc.listeners.keydown({key:'Escape'});
assert.equal(ui.$('chatPanel').hidden,true,'ESC closes chatbot');
assert.equal(ui.$('chatLauncher').attrs['aria-expanded'],'false');

const valid=simulate('https://example.sibforms.com/serve/form-abc');
await new Promise((r)=>setImmediate(r));
assert.equal(valid.$('newsletterCta').hidden,false,'Verified Brevo newsletter link should be offered');
assert.equal(valid.$('newsletterComing').hidden,true);
assert.equal(valid.$('newsletterCta').href,'https://example.sibforms.com/serve/form-abc');
const malicious=simulate('https://sibforms.com.evil.example/subscribe');
await new Promise((r)=>setImmediate(r));
assert.equal(malicious.$('newsletterCta').hidden,true,'Lookalike provider host must not be accepted');
const disabled=simulate(null);
await new Promise((r)=>setImmediate(r));
assert.equal(disabled.$('newsletterCta').hidden,true,'No provider, no subscription link');

console.log('Interactive chatbot and gated newsletter tests — OK');
