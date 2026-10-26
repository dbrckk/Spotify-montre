'use strict';
/* Handcrafted vector drawings, not official product photography. No third-party image rights needed. */
(() => {
  const NS='http://www.w3.org/2000/svg';
  const colors={turquoise:['#ade8dc','#4d8d94'],blue:['#bdd5e8','#285474'],green:['#7eba9c','#185a41'],black:['#6c8075','#142522'],ivory:['#fbf5e5','#beb49b'],silver:['#e5e9e2','#879b91'],transparent:['#d8f1ea','#88b9b3']};
  const types={
   'casio-a168wa':'digital','casio-mtp-b145':'square','casio-mtp-1302':'date',
   'casio-mdv107':'diver','casio-ltp1302':'date-small','swatch-clearly':'transparent',
   'citizen-eco':'eco','citizen-openheart':'openheart','citizen-tsuyosa':'integrated',
   'orient-bambino':'leather','seiko-5':'diver','tissot-prx-quartz':'integrated',
   'tissot-prx-auto':'textured','hamilton-khaki':'field','seiko-sharp':'textured'
  };
  function el(tag,attrs,txt){
   const e=document.createElementNS(NS,tag);
   for(const [k,v] of Object.entries(attrs||{})) if(v!==null&&v!==undefined)e.setAttribute(k,String(v));
   if(txt!==undefined)e.textContent=String(txt);
   return e;
  }
  function put(parent,tag,attrs,txt){const child=el(tag,attrs,txt);parent.appendChild(child);return child;}
  function render(mount,p,compact){
   if(!mount||!p)return;
   const id=String(p.id||'dial').replace(/[^a-z0-9-]/gi,'').slice(0,64);
   const type=types[id]||'date';
   const tone=colors[p.tone]||colors.green;
   const svg=el('svg',{xmlns:NS,viewBox:'0 0 340 380',role:'img',focusable:'false','aria-label':'Interprétation vectorielle du style '+p.brand+' '+p.model+', différente de la photo réelle',class:'am-watch-svg'});
   const defs=put(svg,'defs');
   let g=put(defs,'linearGradient',{id:'steel-'+id,x1:'0%',y1:'0%',x2:'100%',y2:'30%'});
   for(const [offset,color] of [['0%','#495c53'],['24%','#ecefe8'],['50%','#7f9188'],['74%','#ecede4'],['100%','#62756b']])put(g,'stop',{offset,'stop-color':color});
   g=put(defs,'radialGradient',{id:'face-'+id,cx:'30%',cy:'22%',r:'87%'});
   put(g,'stop',{offset:'0%','stop-color':tone[0]});put(g,'stop',{offset:'100%','stop-color':tone[1]});
   put(svg,'ellipse',{cx:174,cy:348,rx:75,ry:13,fill:'#18261c',opacity:'.11'});
   const body=put(svg,'g',{transform:'rotate(-13 170 186)'});
   const metal='url(#steel-'+id+')';
   const face='url(#face-'+id+')';
   const darkStrap=type==='leather'||type==='diver'&&id==='casio-mdv107';
   const strap=type==='transparent'?'#e1f1ecaa':darkStrap?'#353c35':metal;
   for(const y of [13,230])put(body,'rect',{x:124,y,width:92,height:136,rx:darkStrap?18:9,fill:strap,stroke:'#82948b','stroke-width':1.5});
   if(!darkStrap&&type!=='transparent')for(const yBase of [24,240])for(let i=0;i<6;i++)put(body,'line',{x1:127,y1:yBase+i*18,x2:213,y2:yBase+i*18,stroke:'#6f8479','stroke-width':1.2,opacity:'.72'});
   if(type==='integrated'||type==='textured')put(body,'path',{d:'M125 139 L133 102 L207 102 L216 140 L216 225 L204 255 L134 255 L123 220Z',fill:metal,stroke:'#84958a','stroke-width':2});
   const square=type==='digital'||type==='square';
   const cx=170,cy=184;
   if(square){
     put(body,'rect',{x:98,y:112,width:144,height:147,rx:type==='digital'?15:25,fill:metal,stroke:'#a0a594','stroke-width':2.5});
     put(body,'rect',{x:110,y:125,width:120,height:121,rx:9,fill:type==='digital'?'#243b36':face,stroke:'#556f60','stroke-width':3});
     if(type==='digital'){
       put(body,'rect',{x:120,y:157,width:100,height:57,rx:4,fill:'#c3d2b6',stroke:'#253d30','stroke-width':1});
       put(body,'text',{x:170,y:185,'text-anchor':'middle','font-family':'monospace','font-size':28,'font-weight':700,fill:'#17352a'},'10:28');
       put(body,'text',{x:170,y:141,'text-anchor':'middle','font-family':'system-ui','font-size':10,fill:'#d0d4c3'},'DIGITAL');
       put(body,'text',{x:170,y:233,'text-anchor':'middle','font-family':'system-ui','font-size':8,fill:'#d0d4c3'},'ILLUSTRATION');
     } else {
       for(let i=0;i<12;i++){const a=i*Math.PI/6;put(body,'line',{x1:cx+41*Math.sin(a),y1:cy-41*Math.cos(a),x2:cx+48*Math.sin(a),y2:cy-48*Math.cos(a),stroke:'#f7eccd','stroke-width':i%3===0?3:1.5});}
     }
   } else {
     if(type==='diver'){put(body,'circle',{cx,cy,r:89,fill:'#23382e',stroke:'#a9b1a4','stroke-width':11});for(let i=0;i<12;i++){const a=i*Math.PI/6;put(body,'circle',{cx:cx+84*Math.sin(a),cy:cy-84*Math.cos(a),r:i%3===0?2.5:1.1,fill:'#eee9cd'});}}
     else put(body,'circle',{cx,cy,r:88,fill:metal,stroke:'#7c806e','stroke-width':3});
     put(body,'circle',{cx,cy,r:type==='diver'?71:77,fill:face,stroke:type==='transparent'?'#a4c7ba':'#ecdfc0','stroke-width':2});
     if(type==='textured')for(let y=123;y<249;y+=11)for(let x=110;x<231;x+=11)if(Math.hypot(x-cx,y-cy)<67)put(body,'rect',{x,y,width:7,height:7,fill:'#e3f0df',opacity:'.13'});
     if(type==='field')for(let i=1;i<=12;i++){const a=i*Math.PI/6;put(body,'text',{x:cx+54*Math.sin(a),y:cy-54*Math.cos(a)+4,'text-anchor':'middle','font-family':'system-ui','font-size':10,'font-weight':700,fill:'#f3e7cc'},i);}
     else for(let i=0;i<12;i++){const a=i*Math.PI/6;put(body,'line',{x1:cx+59*Math.sin(a),y1:cy-59*Math.cos(a),x2:cx+66*Math.sin(a),y2:cy-66*Math.cos(a),stroke:p.tone==='ivory'?'#625f53':'#f2e9d3','stroke-width':i%3===0?4:2,'stroke-linecap':'round'});}
     if(type==='openheart'){put(body,'circle',{cx:176,cy:211,r:18,fill:'#3a4235',stroke:'#e2c58a','stroke-width':3});put(body,'circle',{cx:176,cy:211,r:9,fill:'#d0ba83'});}
     if(['date','date-small','eco','integrated','textured','field','diver'].includes(type)){put(body,'rect',{x:204,y:176,width:21,height:17,rx:2,fill:'#eadfc6'});put(body,'text',{x:214,y:188,'text-anchor':'middle','font-size':10,'font-family':'system-ui',fill:'#203529','font-weight':700},'26');}
   }
   if(type!=='digital'){
     const handColor=p.tone==='ivory'?'#615b4d':'#fff1d4';
     put(body,'line',{x1:cx,y1:cy,x2:151,y2:146,stroke:handColor,'stroke-width':5,'stroke-linecap':'round'});
     put(body,'line',{x1:cx,y1:cy,x2:211,y2:198,stroke:handColor,'stroke-width':3,'stroke-linecap':'round'});
     put(body,'line',{x1:cx,y1:cy,x2:183,y2:121,stroke:'#c88e6d','stroke-width':1.5});
     put(body,'circle',{cx,cy,r:5,fill:'#e8c893'});
   }
   put(body,'rect',{x:254,y:177,width:11,height:21,rx:3,fill:'#b4a27a',stroke:'#4e564b','stroke-width':1});
   mount.replaceChildren(svg);
   return svg;
  }
  window.AtelierWatch=Object.freeze({render});
})();