(function(root){
'use strict';
const bounds=p=>({minX:Math.min(...p.map(v=>v.x)),maxX:Math.max(...p.map(v=>v.x)),minY:Math.min(...p.map(v=>v.y)),maxY:Math.max(...p.map(v=>v.y))});
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
function anchor(poly){const b=bounds(poly);let best=poly[0],clearance=-1;
 for(let iy=0;iy<14;iy++)for(let ix=0;ix<14;ix++){const p={x:b.minX+(ix+.5)*(b.maxX-b.minX)/14,y:b.minY+(iy+.5)*(b.maxY-b.minY)/14};if(!inside(p,poly))continue;let d=Infinity;
  for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],dx=c.x-a.x,dy=c.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));d=Math.min(d,Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy));}if(d>clearance){clearance=d;best=p;}}
 return {point:best,clearance:Math.max(0,clearance)};
}
function layout(placed,widthMm,heightMm,filler,gap){
 const scale=Math.min(2800/widthMm,2200/heightMm),bedW=widthMm*scale,bedH=heightMm*scale,margin=Math.max(190,(1200-bedW)/2),top=120;
 const pieces=placed.map(s=>{const a=anchor(s.world),p={x:a.point.x*scale,y:a.point.y*scale},textWidth=s.id.length*9+12;return {id:s.id,color:s.color,polygon:s.world.map(v=>({x:v.x*scale,y:v.y*scale})),anchor:p,callout:a.clearance*scale<Math.hypot(textWidth,20)/2,rotation:s.rotation,xMm:s.x,yMm:s.y,libraryId:s.libraryId};});
 const left=pieces.filter(p=>p.callout&&p.anchor.x<bedW/2).sort((a,b)=>a.anchor.y-b.anchor.y),right=pieces.filter(p=>p.callout&&p.anchor.x>=bedW/2).sort((a,b)=>a.anchor.y-b.anchor.y),bodyH=Math.max(bedH,Math.max(left.length,right.length)*25),offsetY=top+(bodyH-bedH)/2;
 for(const [list,side] of [[left,'left'],[right,'right']])list.forEach((p,i)=>{p.label={x:side==='left'?margin-20:margin+bedW+20,y:top+(i+.5)*bodyH/list.length,side};});
 return {width:Math.ceil(bedW+2*margin),height:Math.ceil(bodyH+top+85),bed:{x:margin,y:offsetY,width:bedW,height:bedH},widthMm,heightMm,scale,filler,gap,pieces};
}
function draw(ctx,m){
 ctx.fillStyle='#f5f2ea';ctx.fillRect(0,0,m.width,m.height);ctx.fillStyle='#303b34';ctx.font='bold 25px Arial';ctx.textAlign='left';ctx.fillText('THE SHARD LAB · PLACEMENT GUIDE',28,38);ctx.font='17px Arial';ctx.fillText((m.widthMm/25.4).toFixed(2)+' × '+(m.heightMm/25.4).toFixed(2)+' inches  |  Joint '+m.gap+' mm  |  '+m.pieces.length+' unique pieces',28,69);
 const b=m.bed;ctx.fillStyle=m.filler;ctx.fillRect(b.x,b.y,b.width,b.height);
 for(const p of m.pieces){ctx.beginPath();p.polygon.forEach((v,i)=>i?ctx.lineTo(b.x+v.x,b.y+v.y):ctx.moveTo(b.x+v.x,b.y+v.y));ctx.closePath();ctx.fillStyle=p.color;ctx.fill();ctx.strokeStyle='#394338';ctx.lineWidth=1;ctx.stroke();}
 for(const p of m.pieces){const x=b.x+p.anchor.x,y=b.y+p.anchor.y;ctx.font='bold 17px Arial';ctx.textBaseline='middle';
  if(p.callout){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(p.label.x,p.label.y);ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#354438';ctx.lineWidth=.9;ctx.stroke();ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle='#263b2c';ctx.fill();ctx.textAlign=p.label.side==='left'?'right':'left';ctx.fillStyle='#303b34';ctx.fillText(p.id,p.label.x,p.label.y);}
  else{ctx.textAlign='center';ctx.strokeStyle='#fffffff0';ctx.lineWidth=5;ctx.strokeText(p.id,x,y);ctx.fillStyle='#172e20';ctx.fillText(p.id,x,y);}}
 ctx.textBaseline='alphabetic';ctx.strokeStyle='#303b34';ctx.lineWidth=2;ctx.strokeRect(b.x,b.y,b.width,b.height);ctx.fillStyle='#303b34';ctx.textAlign='left';ctx.font='bold 16px Arial';ctx.fillText('TOP LEFT · START HERE',b.x,b.y-12);ctx.font='15px Arial';ctx.fillText('IDs match your library. Small pieces use leader lines. Preserve this orientation when arranging.',28,m.height-44);ctx.fillText('Reference image — printing is not automatically at 1:1 physical scale. Filler '+m.filler,28,m.height-20);
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function svg(m){const b=m.bed,out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}" viewBox="0 0 ${m.width} ${m.height}"><title>The Shard Lab placement guide</title><metadata>${escape(JSON.stringify({units:'mm',bedWidth:m.widthMm,bedHeight:m.heightMm,gap:m.gap,pieces:m.pieces.map(p=>({id:p.id,x:p.xMm,y:p.yMm,rotation:p.rotation,libraryId:p.libraryId}))}))}</metadata><rect width="100%" height="100%" fill="#f5f2ea"/><g font-family="Arial" fill="#303b34"><text x="28" y="38" font-size="25" font-weight="bold">THE SHARD LAB · PLACEMENT GUIDE</text><text x="28" y="69" font-size="17">${(m.widthMm/25.4).toFixed(2)} × ${(m.heightMm/25.4).toFixed(2)} inches | Joint ${m.gap} mm | ${m.pieces.length} unique pieces</text></g><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="${escape(m.filler)}"/>`];
 for(const p of m.pieces)out.push(`<polygon points="${p.polygon.map(v=>(b.x+v.x)+','+(b.y+v.y)).join(' ')}" fill="${escape(p.color)}" stroke="#394338" stroke-width="1"/>`);
 for(const p of m.pieces){const x=b.x+p.anchor.x,y=b.y+p.anchor.y;if(p.callout)out.push(`<path d="M${x},${y} L${p.label.x},${p.label.y}" fill="none" stroke="#354438" stroke-width="1"/><circle cx="${x}" cy="${y}" r="3" fill="#263b2c"/><text x="${p.label.x}" y="${p.label.y}" text-anchor="${p.label.side==='left'?'end':'start'}" dominant-baseline="middle" font-family="Arial" font-size="17" font-weight="bold" fill="#172e20">${escape(p.id)}</text>`);else out.push(`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="17" font-weight="bold" stroke="white" stroke-width="5" paint-order="stroke" fill="#172e20">${escape(p.id)}</text>`);}
 out.push(`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="none" stroke="#303b34" stroke-width="2"/><g font-family="Arial" fill="#303b34"><text x="${b.x}" y="${b.y-12}" font-size="16" font-weight="bold">TOP LEFT · START HERE</text><text x="28" y="${m.height-44}" font-size="15">IDs match your library. Small pieces use leader lines. Preserve this orientation.</text><text x="28" y="${m.height-20}" font-size="15">Reference image — printing is not automatically at 1:1 physical scale.</text></g></svg>`);return out.join('');
}
const api={anchor,layout,draw,svg};if(typeof module!=='undefined')module.exports=api;else root.MosaicGuide=api;
})(typeof window!=='undefined'?window:globalThis);
