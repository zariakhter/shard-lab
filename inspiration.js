(function(root){
'use strict';
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
function create(data,width,height){
 const target=(x,y)=>{const i=(Math.min(height-1,Math.max(0,Math.floor(y*height)))*width+Math.min(width-1,Math.max(0,Math.floor(x*width))))*4;return [data[i],data[i+1],data[i+2]];};
 return {score(shard,world,W,H){const c=rgb(shard.color),xs=world.map(p=>p.x),ys=world.map(p=>p.y),a=Math.min(...xs),b=Math.max(...xs),d=Math.min(...ys),e=Math.max(...ys);let sum=0,n=0;
 for(let j=0;j<5;j++)for(let i=0;i<5;i++){const p={x:a+(i+.5)*(b-a)/5,y:d+(j+.5)*(e-d)/5};if(!Geometry.inside(p,world))continue;const t=target(p.x/W,p.y/H);sum+=Math.hypot(c[0]-t[0],c[1]-t[1],c[2]-t[2])/441.673;n++;}
 return n?sum/n:1;
 }};
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.Inspiration=api;
})(typeof window!=='undefined'?window:globalThis);
