const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),timers=new Map();let timerId=0;
const context2d=new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
function element(id){if(elements.has(id))return elements.get(id);const el={value:id==='seed'?'1847':id==='strategy'?'Largest-first':id==='effort'?'80':'3',children:[],style:{setProperty(){}},setAttribute(k,v){this[k]=v;},disabled:false,replaceChildren(){this.children=[];},append(x){this.children.push(x);},addEventListener(){},getBoundingClientRect(){return {width:600,height:450,left:0,top:0};},getContext(){return context2d;},focus(){},setPointerCapture(){}};elements.set(id,el);return el;}
const browserStore=new Map();
const sandbox={console,localStorage:{getItem:k=>browserStore.get(k)||null,setItem:(k,v)=>browserStore.set(k,v)},document:{getElementById:element,createElement:()=>element('el'+Math.random()),addEventListener(){}},window:{devicePixelRatio:1},ResizeObserver:class{observe(){}},setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);}};
vm.createContext(sandbox);for(const name of ['geometry.js','proposer.js','libraries.js','app.js']){vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),sandbox);if(name==='geometry.js')sandbox.Geometry=sandbox.window.Geometry;if(name==='proposer.js')sandbox.Proposer=sandbox.window.Proposer;}
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
function sizeBed(wf,wi,hf,hi){for(const [id,v] of Object.entries({bedWidthFeet:wf,bedWidthInches:wi,bedHeightFeet:hf,bedHeightInches:hi}))element(id).value=String(v);element('bedSizeForm').onsubmit({preventDefault(){}});}
delete sandbox.requestAnimationFrame;
run('generate()');const fixedLibrary=run('JSON.stringify(shards)');
sizeBed(2,6,3,0);assert.ok(Math.abs(run('W')-762)<1e-8);assert.ok(Math.abs(run('H')-914.4)<1e-8);assert.equal(run('placed.length'),0);assert.equal(run('running'),false);
assert.equal(run('JSON.stringify(shards)'),fixedLibrary);
assert.ok(run('shards.every(s=>s.widthMm>0&&s.heightMm>0)'));
const dimensions=run('[W,H].join()');sizeBed(0,0,3,0);assert.equal(run('[W,H].join()'),dimensions);assert.ok(element('bedSizeError').textContent);
sizeBed(1,0.5,2,3.25);assert.ok(Math.abs(run('W')-317.5)<1e-8);assert.ok(Math.abs(run('H')-692.15)<1e-8);
assert.equal(run('JSON.stringify(shards)'),fixedLibrary);run('generate()');assert.equal(run('JSON.stringify(shards)'),fixedLibrary);
const relativeWidth=run('shards[0].widthMm/W');sizeBed(5,0,4,0);assert.ok(run('shards[0].widthMm/W')<relativeWidth);assert.equal(run('JSON.stringify(shards)'),fixedLibrary);
run('suggestMove()');flush();assert.equal(run('placed.every((s,i)=>G.validate(s.world,placed.filter((_,j)=>i!==j),W,H,gap).valid)'),true);
console.log('PASS feet/inches conversion, fixed shard dimensions across beds, same-seed regeneration, and resized geometry');
assert.ok(Math.abs(run('GRID_MM')-76.2)<1e-10);
sizeBed(4,0,2,0);assert.equal(element('dimensions').textContent,'4 ft 0 in × 2 ft 0 in');
assert.ok(Math.abs(parseFloat(element('board').style.width)/parseFloat(element('board').style.height)-2)<1e-10);
sizeBed(2,0,4,0);assert.ok(Math.abs(parseFloat(element('board').style.width)/parseFloat(element('board').style.height)-.5)<1e-10);
assert.equal(run('Math.ceil(W/GRID_MM)'),8);assert.equal(run('Math.ceil(H/GRID_MM)'),16);
console.log('PASS outer bed frame proportions in both orientations and fixed three-inch grid');
run('generate()');const originalCount=run('shards.length');
const blueId=run("createLibrary('Blue ceramics')");assert.equal(run('inventoryForView().length'),0);assert.equal(run('libraries.length'),2);
run("addLibraryPiece(activeLibrary,'Long triangle',4,1,'#718e9c',()=>.4);saveLibraries();refresh()");
assert.equal(run('inventoryForView().length'),1);assert.ok(Math.abs(run('inventoryForView()[0].widthMm')-101.6)<1e-8);assert.ok(Math.abs(run('inventoryForView()[0].heightMm')-25.4)<1e-8);
run('suggestMove()');flush();assert.equal(run('placed.length'),1);assert.equal(run('placed[0].libraryId'),blueId);
run("openLibrary('original')");assert.equal(run('placed.length'),1);assert.equal(run('inventoryForView().length'),originalCount);
run("openLibrary('all')");assert.equal(run('inventoryForView().length'),originalCount+1);
run("createLibrary('Warm ceramics')");element('randomPieces').onclick();assert.equal(run('inventoryForView().length'),20);
assert.equal(run('new Set(shards.map(s=>s.id)).size'),run('shards.length'));
const savedGeometry=run('JSON.stringify(shards.map(s=>({id:s.id,poly:s.poly,libraryId:s.libraryId,widthMm:s.widthMm})))');
run("saveLibraries();shards=[];libraries=[{id:'original',name:'Original collection'}];activeLibrary='original';initializeLibraries()");
assert.equal(run('JSON.stringify(shards.map(s=>({id:s.id,poly:s.poly,libraryId:s.libraryId,widthMm:s.widthMm})))'),savedGeometry);assert.equal(run('libraries.length'),3);
run('generate()');assert.equal(run('shards.length'),originalCount+21);
run("openLibrary('all');suggestMove();openLibrary('original')");assert.equal(timers.size,0);
console.log('PASS library creation, exact custom dimensions, filtered proposals, combined inventory, placed-shard preservation, random additions, storage restore, and timer cancellation');
global.Geometry=require('./geometry.js');
const proposer=require('./proposer.js');
(async()=>{let polls=0;const library=JSON.parse(run('JSON.stringify(shards)'));const result=await proposer.suggestAsync([library,[],400,300,3,'Best-fit',20,()=>.5],()=>++polls>1);assert.equal(result,null);assert.equal(polls,2);console.log('PASS asynchronous search cancellation between shards');})().catch(error=>{console.error(error);process.exitCode=1;});





