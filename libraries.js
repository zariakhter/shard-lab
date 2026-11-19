'use strict';
const LIBRARY_KEY='shard-lab-libraries-v1';
let libraries=[{id:'original',name:'Original collection'}],activeLibrary='original',librarySerial=0,pieceSerial=0;
function inventoryForLibrary(id){return id==='all'?shards:shards.filter(s=>(s.libraryId||'original')===id);}
function inventoryForView(){return inventoryForLibrary(activeLibrary);}
let stockCacheArray=null,stockCacheLength=-1,stockCacheGroups;
function stockGroups(){if(stockCacheArray!==shards||stockCacheLength!==shards.length){stockCacheArray=shards;stockCacheLength=shards.length;stockCacheGroups=StockInventory.groups(shards);}return stockCacheGroups;}
function stockKey(s){return stockGroups().get(s.id)||s.stockKey||s.id;}
function isShardUsed(s){return placed.some(p=>stockKey(p)===stockKey(s));}
function availableInventory(id=activeLibrary){return StockInventory.available(inventoryForLibrary(id),placed,stockGroups());}
function libraryName(id){return libraries.find(l=>l.id===id)?.name||'Original collection';}
function restoredDimension(assigned,coordinates){const measured=Math.max(...coordinates)-Math.min(...coordinates);return Number.isFinite(assigned)&&Math.abs(assigned-measured)<1e-6?assigned:measured;}
function saveLibraries(){
  try{localStorage.setItem(LIBRARY_KEY,JSON.stringify({libraries,activeLibrary,librarySerial,pieceSerial,seed:$('seed').value,shards:shards.map(s=>({...s,rotation:0}))}));$('librarySaveStatus').textContent='Libraries saved in this browser.';return true;}
  catch(error){$('librarySaveStatus').textContent='Browser storage unavailable or full. Keep this tab open to retain your libraries.';return false;}
}
function renderLibraries(){
  $('libraryTabs').replaceChildren();
  for(const l of [{id:'all',name:'All inventory'},...libraries]){const button=document.createElement('button');button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-selected',String(activeLibrary===l.id));button.textContent=l.name;button.onclick=()=>openLibrary(l.id);$('libraryTabs').append(button);}
  const oldTarget=$('pieceLibrary').value;$('pieceLibrary').replaceChildren();
  for(const l of libraries){const option=document.createElement('option');option.value=l.id;option.textContent=l.name;$('pieceLibrary').append(option);}
  $('pieceLibrary').value=activeLibrary==='all'?(libraries.some(l=>l.id===oldTarget)?oldTarget:libraries[0].id):activeLibrary;
  if(typeof updatePhotoLibraries==='function')updatePhotoLibraries();
}
function openLibrary(id){
  if(id!=='all'&&!libraries.some(l=>l.id===id))return;
  manualControl();activeLibrary=id;selected=null;preview=null;dragging=false;saveLibraries();refresh();
  message((id==='all'?'All libraries':libraryName(id))+' open. Suggestions use this inventory; existing placements stay on the bed.');
}
function createLibrary(name){
  name=name.trim();if(!name||name.length>40){$('libraryError').textContent='Enter a library name of 1–40 characters.';return null;}
  if(name.toLowerCase()==='all inventory'||libraries.some(l=>l.name.toLowerCase()===name.toLowerCase())){$('libraryError').textContent='Choose a different name; that tab already exists.';return null;}
  $('libraryError').textContent='';
  const id='library-'+(++librarySerial);libraries.push({id,name});$('libraryForm').hidden=true;$('libraryName').value='';openLibrary(id);return id;
}
function addLibraryPiece(libraryId,shape,widthIn,heightIn,color,rng=Math.random){
  if(!libraries.some(l=>l.id===libraryId)||![widthIn,heightIn].every(n=>Number.isFinite(n)&&n>=.125&&n<=24))throw new Error('Choose a library and dimensions between 0.125 and 24 inches.');
  let poly;
  if(shape==='Scalene triangle'||shape==='Long triangle')poly=[{x:0,y:.05+rng()*.2},{x:1,y:0},{x:.15+rng()*.55,y:1}];
  else if(shape==='Chipped triangle')poly=[{x:0,y:.1},{x:.5,y:.18},{x:1,y:0},{x:.72,y:.55},{x:.3,y:1}];
  else{const n=5+Math.floor(rng()*4);poly=Array.from({length:n},(_,i)=>{const angle=(i+rng()*.2)*Math.PI*2/n,r=.7+rng()*.3;return{x:Math.cos(angle)*r,y:Math.sin(angle)*r};});}
  const xs=poly.map(p=>p.x),ys=poly.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),sx=Math.max(...xs)-minX,sy=Math.max(...ys)-minY;
  const widthMm=widthIn*25.4,heightMm=heightIn*25.4;
  poly=poly.map(p=>({x:(p.x-minX)/sx*widthMm,y:(p.y-minY)/sy*heightMm}));
  const cx=poly.reduce((sum,p)=>sum+p.x,0)/poly.length,cy=poly.reduce((sum,p)=>sum+p.y,0)/poly.length;poly=poly.map(p=>({x:p.x-cx,y:p.y-cy}));
  const piece={id:'P'+String(++pieceSerial).padStart(4,'0'),libraryId,kind:shape,widthMm,heightMm,poly,area:G.area(poly),color:/^#[0-9a-f]{6}$/i.test(color)?color:'#8fa7b4',rotation:0};shards.push(piece);return piece;
}
function initializeLibraries(){
  let restored=false;
  try{const saved=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'null');
    if(saved&&Array.isArray(saved.libraries)&&saved.libraries.some(l=>l.id==='original')&&Array.isArray(saved.shards)&&saved.shards.length){
      const ids=new Set(saved.libraries.map(l=>l.id)),seen=new Set();
      if(saved.libraries.every(l=>typeof l.id==='string'&&typeof l.name==='string'&&l.name.length<=40)&&ids.size===saved.libraries.length&&saved.shards.every(s=>typeof s.id==='string'&&!seen.has(s.id)&&seen.add(s.id)&&ids.has(s.libraryId)&&Array.isArray(s.poly)&&s.poly.length>=3&&s.poly.length<=96&&s.poly.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))&&G.area(s.poly)>0&&/^#[0-9a-f]{6}$/i.test(s.color))){
        libraries=saved.libraries;shards=saved.shards.map(s=>({...s,rotation:0,area:G.area(s.poly),widthMm:restoredDimension(s.widthMm,s.poly.map(p=>p.x)),heightMm:restoredDimension(s.heightMm,s.poly.map(p=>p.y))}));activeLibrary=ids.has(saved.activeLibrary)||saved.activeLibrary==='all'?saved.activeLibrary:'original';
        librarySerial=Math.max(Number(saved.librarySerial)||0,...libraries.map(l=>Number(l.id.replace('library-',''))||0));pieceSerial=Math.max(Number(saved.pieceSerial)||0,...shards.map(s=>Number(s.id.replace(/^P/,''))||0));if(saved.seed!==undefined)$('seed').value=String(saved.seed);restored=true;
      }
    }
  }catch(error){/* A missing or invalid save starts the original seeded collection. */}
  if(restored){searchRng=random((Number($('seed').value)>>>0)^98765);saveLibraries();refresh();message('Your saved shard libraries are ready. Choose a tab to begin.');}else generate();
}
function bindLibraryControls(){
$('newLibrary').onclick=()=>{$('libraryForm').hidden=false;$('libraryName').focus();};
$('cancelLibrary').onclick=()=>{$('libraryForm').hidden=true;};
$('libraryForm').onsubmit=e=>{e.preventDefault();createLibrary($('libraryName').value);};
$('pieceForm').onsubmit=e=>{
  e.preventDefault();try{manualControl();const piece=addLibraryPiece($('pieceLibrary').value,$('pieceShape').value,Number($('pieceWidth').value),Number($('pieceHeight').value),$('pieceColor').value);activeLibrary=piece.libraryId;selected=null;preview=null;$('pieceError').textContent='';saveLibraries();refresh();message(piece.id+' added to '+libraryName(piece.libraryId)+'.','good');}catch(error){$('pieceError').textContent=error.message;}
};
$('randomPieces').onclick=()=>{
  try{manualControl();const id=$('pieceLibrary').value;if(!libraries.some(l=>l.id===id))throw new Error('Create or choose a library first.');
    for(let i=0;i<20;i++){const shape=['Broad fragment','Long sliver','Scalene triangle','Long triangle','Chipped triangle'][i%5],width=.25+Math.random()*7.75,height=shape.includes('Long')?Math.max(.125,width/(3+Math.random()*3)):.25+Math.random()*4.75;addLibraryPiece(id,shape,width,height,colors[i%colors.length]);}
    activeLibrary=id;selected=null;preview=null;$('pieceError').textContent='';saveLibraries();refresh();message('20 fixed-size random pieces added to '+libraryName(id)+'.','good');
  }catch(error){$('pieceError').textContent=error.message;}
};
}

