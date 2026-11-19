'use strict';
let photoState={image:null,file:null,quad:[],rect:null,bg:null,pieces:[],trace:[],mode:'corners',sourceId:null,generation:0};
function photoMessage(text){$('photoStatus').textContent=text;}
function updatePhotoLibraries(){
 const el=$('photoLibrary'),previous=el.value;el.replaceChildren();for(const lib of libraries){const option=document.createElement('option');option.value=lib.id;option.textContent=lib.name;el.append(option);}el.value=activeLibrary!=='all'?activeLibrary:libraries.some(l=>l.id===previous)?previous:libraries[0].id;
}
function drawPhoto(){
 const c=$('photoCanvas'),p=c.getContext('2d'),state=photoState;if(!state.image)return;
 const source=state.rect?state.rect.canvas:state.image;c.width=source.width;c.height=source.height;c.style.aspectRatio=source.width+'/'+source.height;
 p.drawImage(source,0,0);p.lineWidth=Math.max(1,c.width/450);p.font=Math.max(12,c.width/60)+'px Arial';
 if(!state.rect){state.quad.forEach((point,i)=>{p.beginPath();p.arc(point.x,point.y,c.width/100,0,Math.PI*2);p.fillStyle='#b84b32';p.fill();p.fillText(['TL','TR','BR','BL'][i],point.x+12,point.y-10);});if(state.quad.length){p.beginPath();state.quad.forEach((v,i)=>i?p.lineTo(v.x,v.y):p.moveTo(v.x,v.y));if(state.quad.length===4)p.closePath();p.strokeStyle='#b84b32';p.stroke();}}
 else{for(let i=0;i<state.pieces.length;i++){const piece=state.pieces[i];p.beginPath();piece.polygon.forEach((v,j)=>j?p.lineTo(v.x,v.y):p.moveTo(v.x,v.y));p.closePath();p.fillStyle=piece.selected?'#4f8c5240':'#ffffff15';p.fill();p.strokeStyle=piece.selected?'#236b39':'#b94c39';p.stroke();p.fillStyle='#182f22';p.fillText(String(i+1),piece.polygon[0].x+4,piece.polygon[0].y+16);}
  if(state.trace.length){p.beginPath();state.trace.forEach((v,i)=>i?p.lineTo(v.x,v.y):p.moveTo(v.x,v.y));p.strokeStyle='#2966bc';p.stroke();for(const v of state.trace){p.beginPath();p.arc(v.x,v.y,3,0,Math.PI*2);p.fillStyle='#2966bc';p.fill();}}
 }
}
function resetPhotoCalibration(){$('photoReview').checked=false;photoState.quad=[];photoState.rect=null;photoState.bg=null;photoState.pieces=[];photoState.trace=[];photoState.mode='corners';$('photoResults').replaceChildren();$('photoSave').disabled=true;$('photoDetect').disabled=true;photoMessage('Click four grid intersections around the pieces: top-left, top-right, bottom-right, bottom-left.');drawPhoto();}
async function loadShardPhoto(file){
 const ticket=++photoState.generation;
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>30*1024*1024){photoMessage('Choose a JPEG, PNG, or WebP photo under 30 MB.');return;}
 try{photoMessage('Reading photo locally…');const bitmap=await createImageBitmap(file);if(ticket!==photoState.generation){bitmap.close();return;}if(bitmap.width*bitmap.height>65000000){bitmap.close();throw Error('Use a photo under 65 megapixels.');}
  const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height)),source=document.createElement('canvas');source.width=Math.round(bitmap.width*scale);source.height=Math.round(bitmap.height*scale);source.getContext('2d').drawImage(bitmap,0,0,source.width,source.height);
  photoState={image:source,file,originalWidth:bitmap.width,originalHeight:bitmap.height,quad:[],rect:null,bg:null,pieces:[],trace:[],mode:'corners',sourceId:null,generation:ticket};bitmap.close();resetPhotoCalibration();
 }catch(error){photoMessage('Photo could not be read: '+error.message);}
}
function calibratePhoto(){
 try{if(!photoState.image)throw Error('Upload a photo first.');const wi=Number($('photoSpanWidth').value),hi=Number($('photoSpanHeight').value);if(!(wi>0&&hi>0&&wi<=($('photoUnit').value==='mm'?6096:240)&&hi<=($('photoUnit').value==='mm'?6096:240)))throw Error('Enter the known rectangle width and height in the selected unit (up to 240 in / 6096 mm).');
  const factor=$('photoUnit').value==='mm'?1:25.4;const src=photoState.image,rect=PhotoCore.rectification(src.getContext('2d').getImageData(0,0,src.width,src.height).data,src.width,src.height,photoState.quad,wi*factor,hi*factor,Math.min(900,Math.max(src.width,src.height)));
  const c=document.createElement('canvas');c.width=rect.width;c.height=rect.height;const imageData=c.getContext('2d').createImageData(rect.width,rect.height);imageData.data.set(rect.data);c.getContext('2d').putImageData(imageData,0,0);rect.canvas=c;rect.referenceUnit=$('photoUnit').value;rect.referenceInputWidth=wi;rect.referenceInputHeight=hi;
  $('photoReview').checked=false;photoState.rect=rect;photoState.pieces=[];photoState.trace=[];photoState.bg=null;photoState.mode='background';$('photoResults').replaceChildren();$('photoSave').disabled=true;$('photoDetect').disabled=true;
  photoMessage('Perspective corrected. Click a clear part of the mat between grid lines to sample its background.');drawPhoto();
 }catch(error){photoMessage(error.message);}
}
function renderPhotoResults(){
 $('photoResults').replaceChildren();let selectedCount=0;
 photoState.pieces.forEach((piece,i)=>{const row=document.createElement('div');row.className='photo-result';const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=piece.selected;check.disabled=!!piece.clipped;check.onchange=()=>{piece.selected=check.checked;renderPhotoResults();drawPhoto();};label.append(check);const text=document.createElement('span');const m=PhotoCore.measure(piece.polygon,photoState.rect.mmPerPixelX,photoState.rect.mmPerPixelY);text.textContent=(i+1)+'. '+(m.widthMm/25.4).toFixed(2)+' × '+(m.heightMm/25.4).toFixed(2)+' in · '+m.area.toFixed(1)+' mm²'+(piece.clipped?' · CUT OFF: trace or exclude':'')+(piece.hasHoles?' · INTERNAL GAPS / GRID: verify the outer edge before selecting':'');label.append(text);row.append(label);
  const retrace=document.createElement('button');retrace.type='button';retrace.textContent='Retrace';retrace.onclick=()=>{photoState.replaceIndex=i;startPhotoTrace();};row.append(retrace);$('photoResults').append(row);if(piece.selected)selectedCount++;
 });$('photoSave').disabled=selectedCount===0||!$('photoReview').checked;$('photoSave').textContent='Save '+selectedCount+' reviewed piece'+(selectedCount===1?'':'s')+' to library';
 $('photoSaveHelp').textContent=!photoState.pieces.length?'Detect pieces or finish a traced outline first.':!selectedCount?'No pieces selected. Check the boxes beside the outlines you want. Internal grid warnings can be reviewed and selected; cut-off pieces need a wider photo/calibration.':!$('photoReview').checked?'Check the measurement review confirmation below to enable Save.':selectedCount+' selected. Ready to save to '+libraryName($('photoLibrary').value)+'.';
}
async function detectPhotoPieces(){
 if(!photoState.rect||!photoState.bg){photoMessage('Calibrate the mat, then click its clear background first.');return;}
 const ticket=photoState.generation;$('photoDetect').disabled=true;photoMessage('Detecting ceramic against the sampled mat; removing thin grid lines…');await new Promise(resolve=>setTimeout(resolve,30));
 try{if(ticket!==photoState.generation)return;const r=photoState.rect,result=PhotoCore.detect(r.data,r.width,r.height,photoState.bg,Number($('photoContrast').value),Number($('photoGridRemoval').value),Math.max(20,Number($('photoMinArea').value)/(r.mmPerPixelX*r.mmPerPixelY)));
  $('photoReview').checked=false;photoState.pieces=result.pieces.map(p=>({...p,selected:!p.clipped&&!p.hasHoles,method:'background-segmentation',settings:{backgroundRGB:[...photoState.bg],contrastThreshold:Number($('photoContrast').value),gridOpeningRadiusPixels:Number($('photoGridRemoval').value)}}));photoState.mode='inspect';photoState.trace=[];
  renderPhotoResults();drawPhoto();photoMessage(result.pieces.length+' outlines found. Review every outline and measurement. Deselect shadows/grid artifacts; Retrace errors. '+(result.skipped?result.skipped+' complex outlines need manual tracing. ':'')+'Detection is an estimate, not a guarantee.');
 }catch(error){photoMessage('Detection failed: '+error.message);}finally{if(ticket===photoState.generation)$('photoDetect').disabled=false;}
}
function startPhotoTrace(){if(!photoState.rect){photoMessage('Calibrate the mat before tracing.');return;}photoState.mode='trace';photoState.trace=[];photoMessage('Click around ONE shard boundary in order (3–96 points), then Finish outline. Do not cross edges.');drawPhoto();}
function finishPhotoTrace(){
 try{const r=photoState.rect;if(!r)throw Error('Calibrate first.');if(photoState.trace.length>3&&Math.hypot(photoState.trace[0].x-photoState.trace.at(-1).x,photoState.trace[0].y-photoState.trace.at(-1).y)<4)photoState.trace.pop();PhotoCore.measure(photoState.trace,r.mmPerPixelX,r.mmPerPixelY);$('photoReview').checked=false;const piece={polygon:photoState.trace.map(p=>({...p})),color:$('photoManualColor').value,selected:true,clipped:false,hasHoles:false,method:'manual-reviewed-trace'};
  if(Number.isInteger(photoState.replaceIndex)){photoState.pieces[photoState.replaceIndex]=piece;delete photoState.replaceIndex;}else photoState.pieces.push(piece);photoState.trace=[];photoState.mode='inspect';renderPhotoResults();drawPhoto();photoMessage('Outline ready. Inspect its dimensions before saving.');
 }catch(error){photoMessage(error.message);}
}
function photoThumbnail(piece){
 const rect=photoState.rect,poly=piece.polygon,x=Math.min(...poly.map(p=>p.x)),y=Math.min(...poly.map(p=>p.y)),w=Math.max(...poly.map(p=>p.x))-x,h=Math.max(...poly.map(p=>p.y))-y,scale=Math.min(128/w,128/h),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));const context=c.getContext('2d');context.scale(scale,scale);context.translate(-x,-y);context.beginPath();poly.forEach((v,i)=>i?context.lineTo(v.x,v.y):context.moveTo(v.x,v.y));context.closePath();context.clip();context.drawImage(rect.canvas,0,0);return c.toDataURL('image/webp',.75);
}
async function storeOriginalPhoto(){
 if(photoState.sourceId)return photoState.sourceId;
 const state=photoState,id=typeof crypto.randomUUID==='function'?crypto.randomUUID():'photo-'+Date.now();
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('shard-lab-photos',1);request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put({id,name:state.file.name,blob:state.file,width:state.originalWidth,height:state.originalHeight,savedAt:new Date().toISOString()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Photo storage aborted.'));});state.sourceId=id;return id;}finally{db.close();}
}
async function savePhotoPieces(){
 const state=photoState,destination=$('photoLibrary').value,chosen=state.pieces.filter(p=>p.selected);if(!$('photoReview').checked||!state.rect||!chosen.length||!libraries.some(l=>l.id===destination)){photoMessage('Choose a destination library and reviewed outlines.');return;}
 $('photoSave').disabled=true;photoMessage('Saving source photo and calibrated measurement records in this browser…');
 try{
  const calibratedRect=state.rect;const sourceId=await storeOriginalPhoto();if(state!==photoState||state.rect!==calibratedRect)throw Error('The photo changed. Review it again.');manualControl();
  const r=state.rect,created=chosen.map(d=>{const measured=PhotoCore.measure(d.polygon,r.mmPerPixelX,r.mmPerPixelY);return {id:'P'+String(++pieceSerial).padStart(4,'0'),libraryId:destination,kind:'Photographed shard',...measured,color:d.color,rotation:0,thumbnail:photoThumbnail(d),photo:{sourceId,fileName:state.file.name,originalPixelWidth:state.originalWidth,originalPixelHeight:state.originalHeight,originalCoordinateSystem:'Browser-oriented image pixels',calibration:{referenceWidthMm:r.widthMm,referenceHeightMm:r.heightMm,referenceUnit:r.referenceUnit,referenceInputWidth:r.referenceInputWidth,referenceInputHeight:r.referenceInputHeight,referenceCornersOriginalPixels:state.quad.map(p=>({x:p.x*state.originalWidth/state.image.width,y:p.y*state.originalHeight/state.image.height})),rectifiedPixelWidth:r.width,rectifiedPixelHeight:r.height,mmPerPixelX:r.mmPerPixelX,mmPerPixelY:r.mmPerPixelY,mmToWorkingImageHomography:r.toImage,workingImagePixelWidth:state.image.width,workingImagePixelHeight:state.image.height},outlineRectifiedPixels:d.polygon,outlineOriginalPixels:d.polygon.map(p=>{const v=PhotoCore.project(r.toImage,{x:p.x*r.mmPerPixelX,y:p.y*r.mmPerPixelY});return {x:v.x*state.originalWidth/state.image.width,y:v.y*state.originalHeight/state.image.height};}),method:d.method,settings:d.settings||null,internalRegionsIgnored:!!d.hasHoles,areaDefinition:'Area enclosed by reviewed outer outline; internal holes are not modeled.',reviewed:true,measuredAt:new Date().toISOString(),limitation:'Estimated planar outline from calibrated photograph; thickness, shadows, lens distortion and out-of-plane height are not corrected.'}};});
  const previous=shards,previousLibrary=activeLibrary;shards=shards.concat(created);activeLibrary=destination;if(!saveLibraries()){shards=previous;activeLibrary=previousLibrary;throw Error('Browser library storage is full. Export measurements and free storage before retrying.');}selected=null;preview=null;refresh();photoMessage(created.length+' measured shards saved to '+libraryName(destination)+'. Their fixed millimeter outlines are ready for nesting.');state.pieces.forEach(p=>p.selected=false);renderPhotoResults();message(created.length+' photographed shards added to '+libraryName(destination)+'.','good');
 }catch(error){photoMessage('Could not save: '+error.message+' No pieces were added. Allow browser storage and try again.');$('photoSave').disabled=false;}
}
function bindPhotoControls(){
 $('photoReview').onchange=renderPhotoResults;$('photoLibrary').onchange=renderPhotoResults;
 $('openPhotoImport').onclick=()=>{pauseSearch();updatePhotoLibraries();$('photoDialog').showModal();};
 $('closePhotoImport').onclick=()=>{$('photoDialog').close();};
 $('photoUpload').onchange=e=>loadShardPhoto(e.target.files[0]);$('photoCalibrate').onclick=calibratePhoto;$('photoRestart').onclick=resetPhotoCalibration;$('photoDetect').onclick=detectPhotoPieces;
 $('photoBackground').onclick=()=>{if(!photoState.rect){photoMessage('Calibrate first.');return;}photoState.mode='background';photoMessage('Click a clear patch of mat, away from grid lines.');};
 $('photoTrace').onclick=()=>{delete photoState.replaceIndex;startPhotoTrace();};$('photoFinishTrace').onclick=finishPhotoTrace;$('photoUndoPoint').onclick=()=>{if(photoState.mode==='trace')photoState.trace.pop();else if(!photoState.rect)photoState.quad.pop();drawPhoto();};$('photoSave').onclick=savePhotoPieces;
 $('photoCanvas').onclick=e=>{if(!photoState.image)return;const canvas=$('photoCanvas'),bounds=canvas.getBoundingClientRect(),p={x:(e.clientX-bounds.left)*canvas.width/bounds.width,y:(e.clientY-bounds.top)*canvas.height/bounds.height};
  if(!photoState.rect){if(photoState.quad.length>=4){photoMessage('Four corners marked. Enter their real span and click Calibrate mat.');return;}photoState.quad.push(p);photoMessage(photoState.quad.length===4?'Enter the width and height of this marked rectangle, then Calibrate mat.':'Mark '+['top-left','top-right','bottom-right','bottom-left'][photoState.quad.length]+' grid intersection.');}
  else if(photoState.mode==='background'){const r=photoState.rect;photoState.bg=PhotoCore.background(r.data,r.width,r.height,p);photoState.mode='inspect';$('photoDetect').disabled=false;photoMessage('Mat color sampled. Click Detect pieces.');}
  else if(photoState.mode==='trace'){if(photoState.trace.length>=96){photoMessage('Maximum 96 outline points. Finish the outline or undo a point.');return;}photoState.trace.push(p);}
  drawPhoto();
 };
 $('photoExport').onclick=()=>{const pieces=shards.filter(s=>s.photo),blob=new Blob([JSON.stringify({units:'mm',pieces},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shard-photo-measurements.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
}


