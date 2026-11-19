const assert=require('node:assert/strict');global.Geometry=require('./geometry.js');const I=require('./inspiration.js'),P=require('./proposer.js');
const data=new Uint8ClampedArray(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;data[i]=x<32?255:0;data[i+2]=x<32?0:255;data[i+3]=255;}
const target=I.create(data,64,64),rect=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];const red={id:'red',color:'#ff0000',poly:rect(-15,-8,30,16),area:480},blue={...red,id:'blue',color:'#0000ff'};
assert.equal(target.score(red,rect(0,0,20,20),100,100),0);assert.ok(target.score(blue,rect(0,0,20,20),100,100)>.8);
for(const shard of [red,blue]){const move=P.suggest([shard],[],100,100,3,'Largest-first',80,()=>.5,false,target),world=Geometry.transform(shard.poly,move.x,move.y,move.rotation);assert.ok(Geometry.validate(world,[],100,100,3).valid);assert.equal(target.score(shard,world,100,100),0);}
assert.equal(P.suggest([red],[{...red,world:rect(0,0,30,16)}],100,100,3,'Best-fit',20,()=>.5,false,target),null);
const packed=P.suggest([red],[{id:'wall',world:rect(0,0,48,100)}],100,100,3,'Best-fit',20,()=>.5,false,target);assert.ok(Geometry.validate(Geometry.transform(red.poly,packed.x,packed.y,packed.rotation),[{world:rect(0,0,48,100)}],100,100,3).valid);
console.log('PASS inspiration favors matching color regions, preserves valid geometry and unique inventory, and fills when matching region is blocked');
