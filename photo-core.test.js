const assert=require('node:assert/strict'),P=require('./photo-core.js');
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const quad=[{x:30,y:20},{x:270,y:45},{x:240,y:220},{x:10,y:190}],mm=[{x:0,y:0},{x:254,y:0},{x:254,y:127},{x:0,y:127}];
assert.ok(P.validQuad(quad));const h=P.homography(quad,mm),inverse=P.homography(mm,quad);
quad.forEach((v,i)=>{const r=P.project(h,v);near(r.x,mm[i].x);near(r.y,mm[i].y);});
const point={x:83,y:62},round=P.project(h,P.project(inverse,point));near(round.x,point.x);near(round.y,point.y);
assert.throws(()=>P.homography([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}],mm));
console.log('PASS perspective calibration, inverse mapping, and degenerate rejection');
const w=120,ht=100,data=new Uint8ClampedArray(w*ht*4);
function pixel(x,y,rgb){data.set([...rgb,255],(y*w+x)*4);}
for(let y=0;y<ht;y++)for(let x=0;x<w;x++)pixel(x,y,x%20===0||y%20===0?[70,75,70]:[230,232,222]);
for(let y=12;y<42;y++)for(let x=12;x<38;x++)pixel(x,y,[180,85,55]);
// A concave L-shaped shard must keep the missing corner, rather than use its hull.
for(let y=50;y<85;y++)for(let x=65;x<102;x++)if(y<62||x<77)pixel(x,y,[70,115,165]);
const bg=P.background(data,w,ht,{x:7,y:7});assert.deepEqual(bg,[230,232,222]);
const result=P.detect(data,w,ht,bg,65,1,40);assert.equal(result.pieces.length,2);assert.equal(result.skipped,0);
const rect=result.pieces.find(p=>p.color.startsWith('#b4')),concave=result.pieces.find(p=>p!==rect);assert.ok(rect);assert.ok(concave.polygon.length>=6);assert.ok(P.area(concave.polygon)<37*35*.7);
const measure=P.measure(rect.polygon,2.54,2.54);near(measure.widthMm,26*2.54,3);near(measure.heightMm,30*2.54,3);assert.ok(P.simple(concave.polygon));
console.log('PASS real pixel segmentation removes grid lines and retains concavity');
const rectified=P.rectification(data,w,ht,[{x:0,y:0},{x:119,y:0},{x:119,y:99},{x:0,y:99}],304.8,254,120);
near(rectified.mmPerPixelX,2.54);near(rectified.mmPerPixelY,2.54);assert.equal(rectified.width,120);assert.equal(rectified.height,100);
const triangle=P.measure([{x:0,y:0},{x:10,y:0},{x:0,y:20}],2,2);near(triangle.area,400);near(triangle.widthMm,20);near(triangle.heightMm,40);
const closed=P.measure([{x:0,y:0},{x:10,y:0},{x:10,y:0},{x:0,y:20},{x:0,y:0}],2,2);near(closed.area,400);assert.equal(closed.poly.length,3);
assert.equal(P.simple([{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}]),false);
assert.throws(()=>P.measure([{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}],1,1));
console.log('PASS physical dimensions, area, scale, rectification, and invalid manual outline rejection');
const clipping=new Uint8ClampedArray(30*30*4);for(let i=0;i<900;i++)clipping.set([240,240,240,255],i*4);for(let y=5;y<20;y++)for(let x=0;x<12;x++)clipping.set([130,60,20,255],(y*30+x)*4);
assert.ok(P.detect(clipping,30,30,[240,240,240],65,0,10).pieces[0].clipped);
console.log('PASS photo-edge clipping is flagged for review');
