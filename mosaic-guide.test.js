const assert=require('node:assert/strict'),G=require('./geometry.js'),M=require('./mosaic-guide.js');
const piece=(id,x,y,w,h)=>({id,x,y,rotation:0,libraryId:'original',color:'#bc7d63',world:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]});
const shards=[piece('S001',10,10,100,60),piece('P0002',200,30,2,2),{...piece('B003',250,80,70,45),rotation:37}];
const snapshot=JSON.stringify(shards),m=M.layout(shards,400,300,'#343b38',3);assert.equal(JSON.stringify(shards),snapshot);assert.equal(m.pieces.length,3);assert.equal(m.filler,'#343b38');assert.ok(m.pieces.find(p=>p.id==='P0002').callout);
for(let i=0;i<shards.length;i++){const p=m.pieces[i],world={x:p.anchor.x/m.scale,y:p.anchor.y/m.scale};assert.ok(G.inside(world,shards[i].world));}
const xml=M.svg(m);for(const p of shards)assert.ok(xml.includes(p.id));assert.ok(xml.includes('#343b38'));assert.ok(xml.includes('TOP LEFT'));assert.ok(xml.includes('37'));assert.ok(xml.includes('bedWidth'));
const labels=[],context=new Proxy({fillText:(text)=>labels.push(text),strokeText:()=>{}},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});M.draw(context,m);for(const p of shards)assert.equal(labels.filter(s=>s===p.id).length,1);
const narrow=M.layout(shards,76.2,6096,'#ddd1b7',8);assert.ok(narrow.width>=1200);
const concave=[{x:0,y:0},{x:100,y:0},{x:100,y:10},{x:10,y:10},{x:10,y:100},{x:0,y:100}],anchor=M.anchor(concave);assert.ok(G.inside(anchor.point,concave));
console.log('PASS every piece ID rendered once, readable small-piece callouts, interior anchors, filler, orientation, dimensions, vector metadata, and unchanged arrangement');
