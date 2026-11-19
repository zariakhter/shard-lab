(function(root){
'use strict';
function bounds(p){return {x0:Math.min(...p.map(v=>v.x)),x1:Math.max(...p.map(v=>v.x)),y0:Math.min(...p.map(v=>v.y)),y1:Math.max(...p.map(v=>v.y))};}
function sameScan(a,b){
 if(!a.photo||!b.photo)return false;const x=a.photo,y=b.photo;
 const sameHash=x.fileSha256&&y.fileSha256?x.fileSha256===y.fileSha256:null;
 if(sameHash===false)return false;
 const sameSource=!!x.sourceId&&x.sourceId===y.sourceId,sameLegacy=!!x.fileName&&x.fileName===y.fileName&&x.originalPixelWidth>0&&x.originalPixelWidth===y.originalPixelWidth&&x.originalPixelHeight>0&&x.originalPixelHeight===y.originalPixelHeight;
 if(!sameHash&&!sameSource&&!sameLegacy)return false;
 if(!Array.isArray(x.outlineOriginalPixels)||!Array.isArray(y.outlineOriginalPixels)||x.outlineOriginalPixels.length<3||y.outlineOriginalPixels.length<3)return false;
 const p=bounds(x.outlineOriginalPixels),q=bounds(y.outlineOriginalPixels),wp=p.x1-p.x0,hp=p.y1-p.y0,wq=q.x1-q.x0,hq=q.y1-q.y0;if(Math.min(wp,hp,wq,hq)<=0)return false;
 const overlap=Math.max(0,Math.min(p.x1,q.x1)-Math.max(p.x0,q.x0))*Math.max(0,Math.min(p.y1,q.y1)-Math.max(p.y0,q.y0));
 return overlap/(wp*hp+wq*hq-overlap)>.8&&Math.abs((p.x0+p.x1)-(q.x0+q.x1))/2<Math.max(wp,wq)*.08&&Math.abs((p.y0+p.y1)-(q.y0+q.y1))/2<Math.max(hp,hq)*.08;
}
function groups(shards){const parent=shards.map((_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<shards.length;i++)for(let j=0;j<i;j++)if(shards[i].id===shards[j].id||sameScan(shards[i],shards[j])){const a=find(i),b=find(j);parent[Math.max(a,b)]=Math.min(a,b);}
 return new Map(shards.map((s,i)=>[s.id,shards[find(i)].id]));
}
function available(pool,placed,map){const key=s=>map.get(s.id)||s.stockKey||s.id,used=new Set(placed.map(key)),seen=new Set();return pool.filter(s=>{const k=key(s);if(used.has(k)||seen.has(k))return false;seen.add(k);return true;}).map(s=>({...s,stockKey:key(s)}));}
const api={sameScan,groups,available};if(typeof module!=='undefined')module.exports=api;else root.StockInventory=api;
})(typeof window!=='undefined'?window:globalThis);
