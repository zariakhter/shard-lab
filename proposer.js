(function(root){
'use strict';
const bounds=p=>({minX:Math.min(...p.map(v=>v.x)),minY:Math.min(...p.map(v=>v.y)),maxX:Math.max(...p.map(v=>v.x)),maxY:Math.max(...p.map(v=>v.y))});
const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
function* search(shards,placed,width,height,gap,strategy,effort,rng,explore=false){
 const available=shards.filter(s=>!placed.some(p=>p.id===s.id));if(!available.length)return null;
 available.sort((a,b)=>strategy==='Smallest-first'?a.area-b.area:b.area-a.area);
 const obstacles=placed.map(s=>({...s,box:bounds(s.world)}));
 const envelope=placed.length?bounds(placed.flatMap(s=>s.world)):{maxX:0,maxY:0};
 const walls=[[{x:0,y:0},{x:width,y:0}],[{x:width,y:0},{x:width,y:height}],[{x:width,y:height},{x:0,y:height}],[{x:0,y:height},{x:0,y:0}]];
 const edges=obstacles.flatMap(s=>s.world.map((a,i)=>[a,s.world[(i+1)%s.world.length]]));
 let best=null,bestScore=Infinity,failed=null,failedScore=Infinity,checked=0;
 function evaluate(shard,poly,x,y,rotation){
  const world=poly.map(p=>({x:p.x+x,y:p.y+y})),box=bounds(world);checked++;
  const nearby=obstacles.filter(s=>!(box.maxX+gap<s.box.minX||box.minX-gap>s.box.maxX||box.maxY+gap<s.box.minY||box.minY-gap>s.box.maxY));
  const verdict=Geometry.validate(world,nearby,width,height,gap);
  const overflow=Math.max(0,-box.minX)+Math.max(0,-box.minY)+Math.max(0,box.maxX-width)+Math.max(0,box.maxY-height);
  const growth=Math.max(envelope.maxX,box.maxX)*Math.max(envelope.maxY,box.maxY)-envelope.maxX*envelope.maxY;
  let score=growth/shard.area*25+(box.minY/height+box.minX/width)*12;
  if(strategy==='Best-fit')score-=Math.sqrt(shard.area)*3;
  if(verdict.valid){if(score<bestScore){bestScore=score;best={shard,x,y,rotation,exploratory:false};}}
  else if(score+overflow*30<failedScore){failedScore=score+overflow*30;failed={shard,x,y,rotation,exploratory:false,stalled:true};}
 }
 for(const shard of available){
  const budget=Math.max(32,Math.floor(effort*2));
  for(let n=0;n<budget;n++){
   const edgeIndex=n%shard.poly.length,a=shard.poly[edgeIndex],b=shard.poly[(edgeIndex+1)%shard.poly.length];
   const wall=n<shard.poly.length*4;
   const edge=wall?walls[Math.floor(n/shard.poly.length)%4]:edges.length?edges[Math.floor(rng()*edges.length)]:walls[n%4];
   // Align reversed neighbor edges so interiors lie on opposing sides.
   const rotation=(angle(edge[0],edge[1])-angle(a,b)+(wall?0:180)+360)%360;
   const poly=Geometry.transform(shard.poly,0,0,rotation),pa=poly[edgeIndex],pb=poly[(edgeIndex+1)%poly.length];
   const dx=edge[1].x-edge[0].x,dy=edge[1].y-edge[0].y,len=Math.hypot(dx,dy),offset=wall?0:gap+.015;
   const nx=(wall?-dy:dy)/len,ny=(wall?dx:-dx)/len;
   const f=n%3===0?0:n%3===1?1:.5;
   const x=edge[0].x+dx*f-(wall?pa.x+(pb.x-pa.x)*f:pb.x+(pa.x-pb.x)*f)+nx*offset;
   const y=edge[0].y+dy*f-(wall?pa.y+(pb.y-pa.y)*f:pb.y+(pa.y-pb.y)*f)+ny*offset;
   evaluate(shard,poly,x,y,rotation);
   if(wall){const box=bounds(poly);evaluate(shard,poly,edge[0].x===width?width-box.maxX:-box.minX,edge[0].y===height?height-box.maxY:-box.minY,rotation);}
  }
  if(best&&best.shard===shard)for(let i=0;i<12;i++){const rotation=(best.rotation+(rng()-.5)*8+360)%360;evaluate(shard,Geometry.transform(shard.poly,0,0,rotation),best.x+(rng()-.5)*5,best.y+(rng()-.5)*5,rotation);}
  if(strategy!=='Best-fit'&&best)break;
  yield null;
 }
 // Before declaring the bed full, scan free-space centers, including interior pockets.
 // This is a finite 4 mm / 15 degree search, not a mathematical infeasibility proof.
 if(!best){
  const centers=[];
  const pointSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
  for(let y=2;y<height;y+=4){
   for(let x=2;x<width;x+=4){const p={x,y};let free=Math.min(x,y,width-x,height-y);
    for(const s of obstacles){const box=s.box;if(x<box.minX-free||x>box.maxX+free||y<box.minY-free||y>box.maxY+free)continue;
     if(Geometry.inside(p,s.world)){free=0;break;}
     for(let i=0;i<s.world.length;i++)free=Math.min(free,Math.max(0,pointSegment(p,s.world[i],s.world[(i+1)%s.world.length])-gap));
    }
    if(free>1)centers.push({x,y,free});
   }
   yield null;
  }
  centers.sort((a,b)=>b.free-a.free);
  // Smallest shards first in the rescue pass, regardless of the main strategy.
  for(const shard of available.slice().sort((a,b)=>a.area-b.area)){
   const inner=Math.min(...shard.poly.map((a,i)=>pointSegment({x:0,y:0},a,shard.poly[(i+1)%shard.poly.length])));
   const rotations=Array.from({length:24},(_,i)=>Geometry.transform(shard.poly,0,0,i*15));let count=0;
   for(const p of centers){if(p.free+1e-8<inner)continue;
    for(let i=0;i<rotations.length;i++){evaluate(shard,rotations[i],p.x,p.y,i*15);if(++count%120===0)yield null;}
    if(best)break;
   }
   yield null;if(best){best.rescue=true;break;}
  }
 }
 const result=explore&&best&&failed&&rng()<.2?{...failed,stalled:false,exploratory:true}:best||failed;
 if(result)result.checked=checked;return result;
}
function suggest(...args){const steps=search(...args);let step;do{step=steps.next();}while(!step.done);return step.value;}
async function suggestAsync(args,cancelled){const steps=search(...args);while(!cancelled()){const step=steps.next();if(step.done)return step.value;await new Promise(resolve=>setTimeout(resolve,0));}return null;}
if(typeof module!=='undefined')module.exports={suggest,suggestAsync};else root.Proposer={suggest,suggestAsync};
})(typeof window!=='undefined'?window:globalThis);



