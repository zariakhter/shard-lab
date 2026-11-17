(function(root){
'use strict';
function area(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-a.y*b.x;},0))/2;}
function homography(from,to){
 const rows=[],rhs=[];
 for(let i=0;i<4;i++){const {x,y}=from[i],u=to[i].x,v=to[i].y;rows.push([x,y,1,0,0,0,-u*x,-u*y]);rhs.push(u);rows.push([0,0,0,x,y,1,-v*x,-v*y]);rhs.push(v);}
 for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;if(Math.abs(rows[pivot][i])<1e-10)throw Error('Calibration points do not define a usable rectangle.');[rows[i],rows[pivot]]=[rows[pivot],rows[i]];[rhs[i],rhs[pivot]]=[rhs[pivot],rhs[i]];const d=rows[i][i];for(let k=i;k<8;k++)rows[i][k]/=d;rhs[i]/=d;for(let j=0;j<8;j++)if(j!==i){const f=rows[j][i];for(let k=i;k<8;k++)rows[j][k]-=f*rows[i][k];rhs[j]-=f*rhs[i];}}
 return [...rhs,1];
}
function project(h,p){const d=h[6]*p.x+h[7]*p.y+1;if(Math.abs(d)<1e-10)throw Error('Unusable perspective calibration.');return {x:(h[0]*p.x+h[1]*p.y+h[2])/d,y:(h[3]*p.x+h[4]*p.y+h[5])/d};}
function validQuad(p){if(p.length!==4)return false;const signs=p.map((a,i)=>{const b=p[(i+1)%4],c=p[(i+2)%4];return (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);});return signs.every(s=>s>1e-4)&&area(p)>100;}
function rectification(data,srcW,srcH,quad,widthMm,heightMm,maxSide=900){
 if(!validQuad(quad)||!Number.isFinite(widthMm)||!Number.isFinite(heightMm)||widthMm<=0||heightMm<=0)throw Error('Mark the mat corners in order: top-left, top-right, bottom-right, bottom-left.');
 const scale=Math.min(maxSide/widthMm,maxSide/heightMm),w=Math.max(2,Math.round(widthMm*scale)),h=Math.max(2,Math.round(heightMm*scale));
 const mmRect=[{x:0,y:0},{x:widthMm,y:0},{x:widthMm,y:heightMm},{x:0,y:heightMm}],toImage=homography(mmRect,quad),toMm=homography(quad,mmRect),out=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=project(toImage,{x:(x+.5)*widthMm/w,y:(y+.5)*heightMm/h}),sx=Math.max(0,Math.min(srcW-1,Math.round(p.x))),sy=Math.max(0,Math.min(srcH-1,Math.round(p.y))),i=(y*w+x)*4,j=(sy*srcW+sx)*4;out[i]=data[j];out[i+1]=data[j+1];out[i+2]=data[j+2];out[i+3]=255;}
 return {data:out,width:w,height:h,widthMm,heightMm,mmPerPixelX:widthMm/w,mmPerPixelY:heightMm/h,toImage,toMm};
}
function background(data,w,h,p){const channels=[[],[],[]];for(let y=Math.max(0,Math.round(p.y)-4);y<Math.min(h,p.y+5);y++)for(let x=Math.max(0,Math.round(p.x)-4);x<Math.min(w,p.x+5);x++)for(let k=0;k<3;k++)channels[k].push(data[(y*w+x)*4+k]);return channels.map(c=>c.sort((a,b)=>a-b)[Math.floor(c.length/2)]||0);}
function morph(mask,w,h,radius,erode){const out=new Uint8Array(mask.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let value=erode?1:0;scan:for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=x+dx,yy=y+dy,v=xx>=0&&yy>=0&&xx<w&&yy<h?mask[yy*w+xx]:0;if(erode&&!v){value=0;break scan;}if(!erode&&v){value=1;break scan;}}out[y*w+x]=value;}return out;}
function segDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function rdp(p,e){if(p.length<=2)return p;let max=0,index=0;for(let i=1;i<p.length-1;i++){const d=segDistance(p[i],p[0],p[p.length-1]);if(d>max){max=d;index=i;}}return max>e?[...rdp(p.slice(0,index+1),e).slice(0,-1),...rdp(p.slice(index),e)]:[p[0],p[p.length-1]];}
function simplify(p){if(p.length<4)return p;let far=1;for(let i=2;i<p.length;i++)if(Math.hypot(p[i].x-p[0].x,p[i].y-p[0].y)>Math.hypot(p[far].x-p[0].x,p[far].y-p[0].y))far=i;let e=.75,out;do{out=[...rdp(p.slice(0,far+1),e).slice(0,-1),...rdp([...p.slice(far),p[0]],e).slice(0,-1)];e*=1.4;}while(out.length>64);return out;}
function simple(poly){if(poly.length<3||poly.length>96||area(poly)<1e-6)return false;
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-8&&p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8&&p.y>=Math.min(a.y,b.y)-1e-8&&p.y<=Math.max(a.y,b.y)+1e-8;
 for(let i=0;i<poly.length;i++)for(let j=i+1;j<poly.length;j++){if(j===i+1||(i===0&&j===poly.length-1))continue;const a=poly[i],b=poly[(i+1)%poly.length],c=poly[j],d=poly[(j+1)%poly.length],x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),v=cross(c,d,b);if(x*y<0&&z*v<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return false;}
 return true;
}
function detect(data,w,h,bg,threshold=65,opening=1,minPixels=80){
 let mask=new Uint8Array(w*h);for(let i=0;i<mask.length;i++)mask[i]=Math.hypot(data[i*4]-bg[0],data[i*4+1]-bg[1],data[i*4+2]-bg[2])>threshold?1:0;
 if(opening>0)mask=morph(morph(mask,w,h,opening,true),w,h,opening,false);
 const labels=new Int32Array(w*h),queue=new Int32Array(w*h),pieces=[];let label=0,skipped=0;
 for(let seed=0;seed<mask.length;seed++){if(!mask[seed]||labels[seed])continue;label++;let head=0,tail=1;queue[0]=seed;labels[seed]=label;
  while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w);for(const next of [x>0?at-1:-1,x<w-1?at+1:-1,y>0?at-w:-1,y<h-1?at+w:-1])if(next>=0&&mask[next]&&!labels[next]){labels[next]=label;queue[tail++]=next;}}
  if(tail<minPixels)continue;
  let clipped=false;const edges=new Map();const add=(x1,y1,x2,y2)=>{const key=y1*(w+1)+x1;if(!edges.has(key))edges.set(key,[]);edges.get(key).push(y2*(w+1)+x2);};let rr=0,gg=0,bb=0;
  for(let k=0;k<tail;k++){const at=queue[k],x=at%w,y=Math.floor(at/w);if(!x||!y||x===w-1||y===h-1)clipped=true;rr+=data[at*4];gg+=data[at*4+1];bb+=data[at*4+2];if(y===0||labels[at-w]!==label)add(x,y,x+1,y);if(x===w-1||labels[at+1]!==label)add(x+1,y,x+1,y+1);if(y===h-1||labels[at+w]!==label)add(x+1,y+1,x,y+1);if(x===0||labels[at-1]!==label)add(x,y+1,x,y);}
  // Follow actual pixel boundary loops; never substitute a convex hull.
  let contour=[],loopCount=0;while(edges.size){loopCount++;const start=edges.keys().next().value,loop=[];let at=start,guard=0;do{loop.push({x:at%(w+1),y:Math.floor(at/(w+1))});const options=edges.get(at);if(!options?.length)break;const next=options.pop();if(!options.length)edges.delete(at);at=next;}while(at!==start&&guard++<tail*8);if(area(loop)>area(contour))contour=loop;}
  const polygon=simplify(contour);if(!simple(polygon)){skipped++;continue;}
  const color='#'+[rr,gg,bb].map(v=>Math.round(v/tail).toString(16).padStart(2,'0')).join('');pieces.push({polygon,color,pixels:tail,clipped,hasHoles:loopCount>1});
  if(pieces.length>=80)break;
 }
 return {pieces,skipped};
}
function measure(polygon,mmX,mmY){const physical=polygon.map(p=>({x:p.x*mmX,y:p.y*mmY}));if(!simple(physical))throw Error('Outline crosses itself or has too many vertices. Trace a simple boundary in order.');
 const xs=physical.map(p=>p.x),ys=physical.map(p=>p.y),widthMm=Math.max(...xs)-Math.min(...xs),heightMm=Math.max(...ys)-Math.min(...ys),cx=physical.reduce((s,p)=>s+p.x,0)/physical.length,cy=physical.reduce((s,p)=>s+p.y,0)/physical.length;
 return {poly:physical.map(p=>({x:p.x-cx,y:p.y-cy})),widthMm,heightMm,area:area(physical),perimeterMm:physical.reduce((s,p,i)=>s+Math.hypot(p.x-physical[(i+1)%physical.length].x,p.y-physical[(i+1)%physical.length].y),0)};
}
const api={homography,project,validQuad,rectification,background,detect,measure,simple,area};if(typeof module!=='undefined')module.exports=api;else root.PhotoCore=api;
})(typeof window!=='undefined'?window:globalThis);
