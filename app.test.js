const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),timers=new Map();let timerId=0;
const context2d=new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
function element(id){if(elements.has(id))return elements.get(id);const el={value:id==='seed'?'1847':id==='strategy'?'Largest-first':id==='effort'?'80':'3',children:[],style:{},disabled:false,replaceChildren(){this.children=[];},append(x){this.children.push(x);},addEventListener(){},getBoundingClientRect(){return {width:600,height:450,left:0,top:0};},getContext(){return context2d;},focus(){},setPointerCapture(){}};elements.set(id,el);return el;}
const sandbox={console,document:{getElementById:element,createElement:()=>element('el'+Math.random()),addEventListener(){}},window:{devicePixelRatio:1},ResizeObserver:class{observe(){}},setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);}};
vm.createContext(sandbox);for(const name of ['geometry.js','proposer.js','app.js']){vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),sandbox);if(name==='geometry.js')sandbox.Geometry=sandbox.window.Geometry;if(name==='proposer.js')sandbox.Proposer=sandbox.window.Proposer;}
const run=s=>vm.runInContext(s,sandbox);
global.Geometry=require('./geometry.js');sandbox.Proposer=require('./proposer.js');
const flush=()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);fn();};
assert.ok(run('shards.length')>60);assert.ok(run('shards.reduce((a,s)=>a+s.area,0)')>240000);
assert.ok(run("shards.filter(s=>s.kind==='Long sliver').length")>=24);
for(const kind of ['Scalene triangle','Long triangle','Chipped triangle'])assert.ok(run('shards.filter(s=>s.kind==='+JSON.stringify(kind)+').length')>=8);
assert.ok(run("shards.filter(s=>s.kind==='Scalene triangle'||s.kind==='Long triangle').every(s=>s.poly.length===3)"));
assert.ok(run("shards.some(s=>{const xs=s.poly.map(p=>p.x),ys=s.poly.map(p=>p.y);return (Math.max(...xs)-Math.min(...xs))/(Math.max(...ys)-Math.min(...ys))>4;})"));
const inventorySnapshot=run('JSON.stringify(shards)');run('generate()');assert.equal(run('JSON.stringify(shards)'),inventorySnapshot);
console.log('PASS long slivers, varied outlines, and reproducible inventory');
run('suggestMove()');assert.equal(run('placed.length'),0);assert.equal(timers.size,1);flush();assert.equal(run('journal.length'),1);
run('suggestMove();pauseSearch()');assert.equal(timers.size,0);
run('suggestMove()');element('reset').onclick();assert.equal(timers.size,0);assert.equal(run('placed.length'),0);
if(!process.env.SHARD_FAST)for(const strategy of ['Largest-first','Smallest-first','Best-fit'].filter(s=>!process.env.SHARD_STRATEGY||s===process.env.SHARD_STRATEGY)){
  element('strategy').value=strategy;run('generate()');
  for(let i=0;i<45;i++){run('suggestMove()');if(timers.size)flush();}
  assert.ok(run('placed.length')>0,strategy+' places fragments');
  if(strategy!=='Smallest-first')assert.ok(run('100*placed.reduce((a,s)=>a+s.area,0)/(W*H)')>65,strategy+' fills most of bed: '+run('100*placed.reduce((a,s)=>a+s.area,0)/(W*H)'));
  assert.equal(run('placed.every((s,i)=>G.validate(s.world,placed.filter((_,j)=>i!==j),W,H,gap).valid)'),true);
  console.log('PASS '+strategy+' safe sequence: '+run('placed.length')+' placed, '+run('rejected')+' rejected, '+run('(100*placed.reduce((a,s)=>a+s.area,0)/(W*H)).toFixed(1)')+'% coverage');
}
run('generate();suggestMove()');element('pause').onclick();assert.equal(timers.size,0);assert.ok(run('selected!==null'));
console.log('PASS preview delay, pause, reset cancellation, application initialization');
run("pauseSearch();placed=[];selected=null;preview=null;shards=[{id:'giant',area:1000000,rotation:0,color:'#aaa',poly:[{x:-500,y:-500},{x:500,y:-500},{x:500,y:500},{x:-500,y:500}]}]");
element('run').onclick();assert.equal(run('running'),true);flush();assert.equal(run('running'),false);assert.equal(timers.size,0);
console.log('PASS automatic no-fit verdict stops the run and clears timers');
run("placed=[];shards=[{id:'tiny',area:16,rotation:0,color:'#aaa',poly:[{x:-2,y:-2},{x:2,y:-2},{x:2,y:2},{x:-2,y:2}]}]");
element('run').onclick();flush();assert.equal(run('placed.length'),1);assert.equal(run('running'),true);flush();assert.equal(run('running'),false);assert.equal(timers.size,0);
console.log('PASS automatic placement continues and stops on exhausted inventory');
assert.equal(element('completion').hidden,false);
const mosaicBefore=run('JSON.stringify(placed)');
const frames=[];sandbox.requestAnimationFrame=fn=>frames.push(fn);sandbox.performance={now:()=>0};
element('bake').onclick();assert.equal(run('baking'),true);assert.equal(run('running'),false);
frames.shift()(1400);assert.equal(run('finishProgress'),.5);frames.shift()(2800);
assert.equal(run('baked'),true);assert.equal(run('finishProgress'),1);assert.equal(run('JSON.stringify(placed)'),mosaicBefore);
element('fillerColor').value='#343b38';element('fillerColor').oninput();assert.equal(run('fillerColor'),'#343b38');assert.equal(run('baked'),true);
element('fillerPreset').value='#718e9c';element('fillerPreset').onchange();assert.equal(run('fillerColor'),'#718e9c');
element('editMosaic').onclick();assert.equal(run('baked'),false);assert.equal(run('JSON.stringify(placed)'),mosaicBefore);
element('bake').onclick();element('reset').onclick();frames.shift()(2800);assert.equal(run('baked'),false);assert.equal(run('finishProgress'),0);
element('bake').onclick();assert.equal(run('baking'),false);
console.log('PASS completion banner, animated bake, live filler colors, editing, and animation cancellation');
global.Geometry=require('./geometry.js');
const proposer=require('./proposer.js');
(async()=>{let polls=0;const library=JSON.parse(run('JSON.stringify(shards)'));const result=await proposer.suggestAsync([library,[],400,300,3,'Best-fit',20,()=>.5],()=>++polls>1);assert.equal(result,null);assert.equal(polls,2);console.log('PASS asynchronous search cancellation between shards');})().catch(error=>{console.error(error);process.exitCode=1;});


