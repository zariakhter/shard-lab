(function(root){
  'use strict';
  const EPS=1e-8;
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  function on(a,b,p){return Math.abs(cross(a,b,p))<EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.y>=Math.min(a.y,b.y)-EPS&&p.y<=Math.max(a.y,b.y)+EPS;}
  function intersects(a,b,c,d){const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);return ((x>EPS&&y< -EPS||x< -EPS&&y>EPS)&&(z>EPS&&w< -EPS||z< -EPS&&w>EPS))||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
  function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(on(a,b,p))return true;if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
  function pointDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
  function distance(a,b){let min=Infinity;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];if(intersects(p,q,r,s))return 0;min=Math.min(min,pointDistance(p,r,s),pointDistance(q,r,s),pointDistance(r,p,q),pointDistance(s,p,q));}return inside(a[0],b)||inside(b[0],a)?0:min;}
  function area(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0))/2;}
  function transform(p,x,y,degrees){const r=degrees*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return p.map(a=>({x:x+a.x*c-a.y*s,y:y+a.x*s+a.y*c}));}
  function validate(poly,placed,width,height,gap){if(poly.some(p=>p.x< -EPS||p.y< -EPS||p.x>width+EPS||p.y>height+EPS))return {valid:false,reason:'Outside the panel boundary.',collision:null};for(const shard of placed){const d=distance(poly,shard.world);if(d<gap-EPS||d<EPS)return {valid:false,reason:d<EPS?'Touches or overlaps '+shard.id+'.':'Joint to '+shard.id+' is '+d.toFixed(2)+' mm; '+gap+' mm required.',collision:shard.id};}return {valid:true,reason:'Valid placement · all geometric constraints satisfied.',collision:null};}
  const api={area,distance,transform,validate,inside};if(typeof module!=='undefined')module.exports=api;else root.Geometry=api;
})(typeof window!=='undefined'?window:globalThis);
