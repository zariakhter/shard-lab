'use strict';
const G=Geometry,$=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
const W=400,H=300,colors=['#bc7d63','#91a58e','#8fa7b4','#c3a15d','#ddd1b7'];
let shards=[],placed=[],selected=null,preview=null,gap=3,rejected=0,journal=[],dragging=false;
let proposalTimer=null,nextTimer=null,running=false,proposalSource='Manual',searchRng,searchId=0;
let finishProgress=0,baking=false,baked=false,bakeEpoch=0,fillerColor='#d7cbb4';
function clearFinish(){bakeEpoch++;finishProgress=0;baking=false;baked=false;$('bake').textContent='Bake ↗';$('editMosaic').hidden=true;$('completion').hidden=true;}
function pauseSearch(){searchId++;clearTimeout(proposalTimer);clearTimeout(nextTimer);proposalTimer=null;nextTimer=null;running=false;$('run').disabled=false;$('pause').disabled=true;$('suggest').disabled=false;}
function manualControl(){pauseSearch();clearFinish();proposalSource='Manual';}
function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function generate(){
  manualControl();searchRng=random((Number($('seed').value)>>>0)^98765);
  const r=random(Number($('seed').value)>>>0);shards=[];let total=0;
  function add(size,forcedKind){
    const kinds=['Long sliver','Scalene triangle','Long triangle','Tapered wedge','Chipped triangle','Broad fragment','Chipped fragment','Long sliver'];
    const kind=forcedKind||kinds[shards.length%kinds.length];
    const n=5+Math.floor(r()*4);
    let poly=Array.from({length:n},(_,j)=>{const a=(j+.15*r())*2*Math.PI/n,rad=size*(.75+.25*r());return {x:Math.cos(a)*rad,y:Math.sin(a)*rad};});
    if(['Scalene triangle','Long triangle','Chipped triangle'].includes(kind)){
      const a={x:-size*(.7+r()*.4),y:-size*(.25+r()*.4)},b={x:size*(.75+r()*.4),y:-size*(.1+r()*.3)},c={x:size*(-.55+r()*.7),y:size*(.65+r()*.35)};
      poly=[a,b,c];
      if(kind==='Chipped triangle')poly=[a,{x:a.x*.45+b.x*.55,y:a.y*.45+b.y*.55+size*.12},b,{x:b.x*.55+c.x*.45-size*.12,y:b.y*.55+c.y*.45},c];
      if(kind==='Long triangle'){const stretch=1.8+r()*.8;poly=poly.map(p=>({x:p.x*stretch,y:p.y/stretch}));}
    }
    if(kind==='Long sliver'){const stretch=1.7+r()*.6;poly=poly.map(p=>({x:p.x*stretch,y:p.y/stretch}));}
    if(kind==='Tapered wedge')poly=poly.map(p=>({x:p.x*1.5,y:p.y*(.35+.65*(p.x/size+1)/2)}));
    if(kind==='Chipped fragment')poly[1]={x:poly[1].x*.55,y:poly[1].y*.55};
    const cx=poly.reduce((s,p)=>s+p.x,0)/poly.length,cy=poly.reduce((s,p)=>s+p.y,0)/poly.length;
    poly=poly.map(p=>({x:p.x-cx,y:p.y-cy}));const area=G.area(poly);
    shards.push({id:'S'+String(shards.length+1).padStart(3,'0'),poly,kind,color:colors[shards.length%5],rotation:0,area});total+=area;
  }
  while(total<W*H*2)add(29+r()*24);
  for(let i=0;i<35;i++)add(9+r()*15);
  for(let i=0;i<80;i++)add(4+r()*5);
  for(let i=0;i<32;i++)add(12+r()*16,['Long sliver','Long triangle','Scalene triangle','Chipped triangle'][i%4]);
  placed=[];selected=null;preview=null;rejected=0;journal=[];$('gap').disabled=false;
  message('New study · '+shards.length+' shards · ceramic area '+Math.round(total/(W*H)*100)+'% of bed. Best-fit searches edges and rotations.');refresh();
}
function message(s,type=''){$('status').textContent=s;$('status').className=type;}
function verdict(){return G.validate(G.transform(selected.poly,preview.x,preview.y,selected.rotation),placed,W,H,gap);}
function choose(shard){if(placed.some(s=>s.id===shard.id))return;manualControl();selected=shard;preview={x:W/2,y:H/2};refresh();check();}
function check(){if(!selected||!preview)return;const v=verdict();message(selected.id+' · '+selected.rotation+'° · '+v.reason,v.valid?'good':'bad');draw();}
function refresh(){const area=placed.reduce((s,p)=>s+p.area,0),coverage=100*area/(W*H);$('coverage').innerHTML=coverage.toFixed(1)+'<span>%</span>';$('meter').style.width=coverage+'%';$('placed').textContent=placed.length+' / '+shards.length;$('rejected').textContent=rejected;$('remaining').textContent=(shards.length-placed.length)+' AVAILABLE';$('dimensions').textContent=W+' × '+H+' mm';$('gap').disabled=placed.length>0;
  $('inventory').replaceChildren();shards.forEach(s=>{const used=placed.some(p=>p.id===s.id),b=document.createElement('button');b.className='shard'+(used?' used':'')+(selected===s?' selected':'');b.disabled=used;const xs=s.poly.map(p=>p.x),ys=s.poly.map(p=>p.y),width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys);b.title=s.id+' · '+s.kind+' · '+s.area.toFixed(0)+' mm² · '+(used?'Placed':'Available');b.innerHTML='<svg viewBox="'+(Math.min(...xs)-5)+' '+(Math.min(...ys)-5)+' '+(width+10)+' '+(height+10)+'" aria-hidden="true"><polygon points="'+s.poly.map(p=>p.x+','+p.y).join(' ')+'" fill="'+s.color+'" stroke="#41483c" stroke-width="1"/></svg><span>'+s.id+'<small>'+Math.round(width)+' × '+Math.round(height)+'</small></span>';b.onpointerdown=e=>{if(e.button!==0)return;choose(s);dragging=true;};$('inventory').append(b);});
  $('log').replaceChildren();if(!journal.length)$('log').innerHTML='<li class="empty">Your first arrangement starts here.</li>';journal.slice().reverse().forEach(item=>{const li=document.createElement('li');li.textContent=item;$('log').append(li);});draw();}
function draw(){const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);ctx.lineWidth=.3;ctx.strokeStyle='#dfe2d6';for(let x=20;x<W;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=20;y<H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  if(finishProgress>0){
    const level=H*finishProgress;
    ctx.fillStyle=fillerColor;ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,H-level);
    for(let x=0;x<=W;x+=4)ctx.lineTo(x,H-level+(baking?Math.sin(x/15+finishProgress*24)*2.5*Math.sin(finishProgress*Math.PI):0));
    ctx.lineTo(W,H);ctx.closePath();ctx.fill();
    if(baking){const spout=W*(.5+.28*Math.sin(finishProgress*8));ctx.fillRect(spout-2,0,4,H-level);ctx.strokeStyle='#ffffff65';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(spout,H-level,12,3,0,0,Math.PI*2);ctx.stroke();}
  }
  const v=selected&&preview?verdict():null;function paint(poly,color,stroke,alpha=1){ctx.globalAlpha=alpha;ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();ctx.globalAlpha=1;}
  placed.forEach(s=>{paint(s.world,s.color,v&&v.collision===s.id?'#b54235':'#41483c');ctx.fillStyle='#41483c';ctx.font='5px Arial';ctx.textAlign='center';if(!baking&&!baked)ctx.fillText(s.id,s.x,s.y+2);});if(v){paint(G.transform(selected.poly,preview.x,preview.y,selected.rotation),v.valid?'#6a9b70':'#c56b5b',v.valid?'#367343':'#b54235',.55);ctx.fillStyle='#3d473b';ctx.font='5px Arial';ctx.textAlign='center';ctx.fillText(selected.id+' · '+selected.rotation.toFixed(1)+'°',preview.x,preview.y);}}
function move(e){if(!selected)return;const r=canvas.getBoundingClientRect();preview={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};check();}
canvas.onpointerdown=e=>{if(selected){dragging=true;canvas.setPointerCapture(e.pointerId);move(e);canvas.focus();}};
document.addEventListener('pointermove',e=>{if(dragging)move(e);});document.addEventListener('pointerup',()=>{dragging=false;});
function rotate(amount){if(!selected)return;manualControl();selected.rotation=(selected.rotation+amount+360)%360;check();}
function commit(){if(!selected||!preview)return;const v=verdict(),pos=Math.round(preview.x)+', '+Math.round(preview.y)+' mm',id=selected.id; journal.push('#'+(journal.length+1)+' '+id+' @ '+pos+' / '+selected.rotation+'° · '+proposalSource+' · '+(v.valid?'Accepted':v.reason));if(v.valid){placed.push({...selected,...preview,world:G.transform(selected.poly,preview.x,preview.y,selected.rotation)});selected=null;preview=null;message(id+' placed. Select another fragment.','good');}else{rejected++;message('Rejected · '+v.reason,'bad');}refresh();}
function cancel(){manualControl();selected=null;preview=null;dragging=false;message('Preview cancelled. Select a fragment to continue.');refresh();}
$('left').onclick=()=>rotate(-15);$('right').onclick=()=>rotate(15);$('place').onclick=commit;$('cancel').onclick=cancel;
$('undo').onclick=()=>{const s=placed.pop();if(s){journal.push('Undo · '+s.id+' returned to the library.');message(s.id+' returned to the library.');refresh();}};
$('reset').onclick=()=>{placed=[];selected=null;preview=null;rejected=0;journal=[];message('Panel reset. The same inventory is ready for another study.');refresh();};
$('regenerate').onclick=generate;$('gap').oninput=()=>{gap=Number($('gap').value);$('gapLabel').textContent=gap+' mm';check();};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON'].includes(e.target.tagName))return;if(e.key==='Escape'){cancel();return;}if(!selected)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','r','R'].includes(e.key))e.preventDefault();const step=e.shiftKey?10:1;if(e.key==='r'||e.key==='R')rotate(e.shiftKey?-15:15);if(e.key==='Enter')commit();if(preview){if(e.key==='ArrowLeft')preview.x-=step;if(e.key==='ArrowRight')preview.x+=step;if(e.key==='ArrowUp')preview.y-=step;if(e.key==='ArrowDown')preview.y+=step;check();}});
$('inventory').addEventListener('click',e=>{if(e.detail!==0)return;const button=e.target.closest('button');if(button)choose(shards[Array.from($('inventory').children).indexOf(button)]);});
function suggestMove(){
  clearFinish();draw();
  clearTimeout(nextTimer);
  const strategy=$('strategy').value,ticket=++searchId;
  const args=[shards,placed,W,H,gap,strategy,Number($('effort').value),searchRng,$('explore').checked&&!running];
  $('suggest').disabled=true;$('pause').disabled=false;
  message('Searching remaining shards, rotations and small interior gaps…');
  if(typeof requestAnimationFrame==='function')Proposer.suggestAsync(args,()=>ticket!==searchId).then(candidate=>{if(ticket===searchId)presentCandidate(candidate,strategy);}).catch(error=>{pauseSearch();message('Search failed: '+error.message,'bad');});
  else presentCandidate(Proposer.suggest(...args),strategy);
}
function presentCandidate(candidate,strategy){
  if(!candidate){pauseSearch();showCompletion(true);return;}
  selected=candidate.shard;selected.rotation=candidate.rotation;preview={x:candidate.x,y:candidate.y};dragging=false;
  proposalSource=strategy+(candidate.rescue?' / small-gap scan':candidate.exploratory?' / exploratory':' / edge fit');
  refresh();message('Proposed · '+selected.id+' · '+proposalSource+' · '+selected.rotation+'°. Checking geometry…');
  $('suggest').disabled=true;$('pause').disabled=false;
  proposalTimer=setTimeout(()=>{proposalTimer=null;commit();$('suggest').disabled=false;if(candidate.stalled){pauseSearch();showCompletion(false);}else if(running)nextTimer=setTimeout(suggestMove,200);else $('pause').disabled=true;},1200);
}
$('suggest').onclick=()=>{pauseSearch();suggestMove();};
$('run').onclick=()=>{pauseSearch();running=true;$('run').disabled=true;suggestMove();};
$('pause').onclick=()=>{pauseSearch();if(selected&&preview)check();};
$('effort').oninput=()=>{$('effortLabel').textContent=$('effort').value+' samples / shard';};
for(const id of ['undo','reset','place']){const action=$(id).onclick;$(id).onclick=()=>{pauseSearch();if(id!=='place')clearFinish();if(id==='reset'){proposalSource='Manual';searchRng=random((Number($('seed').value)>>>0)^98765);}action();};}
const boardAction=canvas.onpointerdown;canvas.onpointerdown=e=>{manualControl();boardAction(e);};
document.addEventListener('keydown',e=>{if(!['INPUT','SELECT','BUTTON'].includes(e.target.tagName)&&['Enter','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','r','R'].includes(e.key))manualControl();},true);
$('strategy').onchange=pauseSearch;
function showCompletion(exhausted){
  selected=null;preview=null;dragging=false;
  $('completion').hidden=false;
  $('completion').innerHTML=exhausted?'<strong>All shards placed — ready to bake.</strong><p>Your library is empty. Bake to preview filler in the remaining spaces.</p>':'<strong>No more fits found — ready to bake.</strong><p>All remaining shards were checked with edge alignments and a 4 mm / 15° gap scan. No valid placement was found. A different arrangement may produce other fits.</p>';
  message(exhausted?'All shards placed. Click Bake to finish.':'No more valid fits found in this search. Click Bake to finish the mosaic.','good');draw();
}
function bakeMosaic(){
  if(!placed.length){message('Place some shards before baking.','bad');return;}
  pauseSearch();selected=null;preview=null;dragging=false;
  const epoch=++bakeEpoch;baked=false;baking=true;finishProgress=0;
  $('bake').textContent='Pouring filler…';$('editMosaic').hidden=false;
  message('Pouring filler into the joints and empty spaces…');
  function complete(){finishProgress=1;baking=false;baked=true;$('bake').textContent='Bake again ↗';message('Mosaic finished · change the filler color to explore different finishes.','good');draw();}
  if(typeof requestAnimationFrame!=='function'){complete();return;}
  const start=performance.now();
  function frame(now){if(epoch!==bakeEpoch)return;finishProgress=Math.min(1,(now-start)/2800);if(finishProgress>=1){complete();return;}draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
}
$('bake').onclick=bakeMosaic;
$('fillerColor').oninput=()=>{fillerColor=$('fillerColor').value;$('fillerPreset').value='';draw();};
$('fillerPreset').onchange=()=>{fillerColor=$('fillerPreset').value;$('fillerColor').value=fillerColor;draw();};
$('editMosaic').onclick=()=>{clearFinish();message('Back to arranging. Your placed shards are preserved.');draw();};
new ResizeObserver(draw).observe(canvas);generate();










