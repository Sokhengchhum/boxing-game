// ======== VFX DRAWING ========
function drawLightningBolt(x1,y1,x2,y2,alpha){
  ctx.save();ctx.globalAlpha=alpha;
  ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.shadowColor='#66aaff';ctx.shadowBlur=16;
  const segs=10,dx=(x2-x1)/segs,dy=(y2-y1)/segs;
  ctx.beginPath();ctx.moveTo(x1,y1);
  for(let i=1;i<segs;i++){ctx.lineTo(x1+dx*i+(Math.random()-.5)*32,y1+dy*i+(Math.random()-.5)*20);}
  ctx.lineTo(x2,y2);ctx.stroke();
  ctx.strokeStyle='#aaddff';ctx.lineWidth=1.5;ctx.shadowBlur=4;
  ctx.beginPath();ctx.moveTo(x1,y1);
  for(let i=1;i<segs;i++){ctx.lineTo(x1+dx*i+(Math.random()-.5)*14,y1+dy*i+(Math.random()-.5)*10);}
  ctx.lineTo(x2,y2);ctx.stroke();
  ctx.restore();
}

function drawHitSparks(x,y,alpha){
  ctx.save();ctx.globalAlpha=alpha;
  const cols=['#ffcc00','#ff6600','#ffffff','#ff3300'];
  for(let i=0;i<14;i++){
    const ang=(i/14)*Math.PI*2,len=16+Math.random()*26;
    ctx.strokeStyle=cols[i%cols.length];ctx.lineWidth=1.5+Math.random()*2;
    ctx.shadowColor=cols[i%cols.length];ctx.shadowBlur=8;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(ang)*len,y+Math.sin(ang)*len);ctx.stroke();
  }
  ctx.restore();
}

function drawActiveVFX(){
  activeVFX=activeVFX.filter(v=>v.life>0);
  activeVFX.forEach(v=>{
    const a=v.life/v.maxLife;
    if(v.type==='lightning') drawLightningBolt(v.x1,v.y1,v.x2,v.y2,a);
    else if(v.type==='sparks') drawHitSparks(v.x,v.y,a);
    v.life--;
  });
}

function drawScreenFlashFX(){
  if(screenFlash.alpha>0.01){
    ctx.save();ctx.globalAlpha=screenFlash.alpha;ctx.fillStyle=screenFlash.color;
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);ctx.restore();
    screenFlash.alpha=Math.max(0,screenFlash.alpha-0.055);
  }
}

function drawRingBack(){
  const W=CANVAS_W, H=CANVAS_H;
  const t=Date.now();

  // 3D Perspective coords (Wide Angle)
  const BLx = 60, BLy = 210;
  const BRx = 720, BRy = 210;
  const FLx = -50,  FLy = 550;
  const FRx = 830,  FRy = 550;

  // ── ARENA BACKGROUND (DARK GRADIENT) ──
  const sky=ctx.createLinearGradient(0,0,0,210);
  sky.addColorStop(0,'#110505');
  sky.addColorStop(0.6,'#220a0a');
  sky.addColorStop(1,'#331111');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,210);

  // ── SPOTLIGHT BEAMS ──
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const beamColors = ['rgba(255,255,255,0.18)', 'rgba(255,240,220,0.12)'];
  const sources = [W*0.15, W*0.35, W*0.65, W*0.85];
  sources.forEach((sx, i) => {
    const targetX = W/2 + (sx - W/2) * 1.5;
    const beamG = ctx.createLinearGradient(sx, 0, targetX, 250);
    beamG.addColorStop(0, beamColors[i%2]);
    beamG.addColorStop(1, 'transparent');
    ctx.fillStyle = beamG;
    ctx.beginPath();
    ctx.moveTo(sx-15, -10); ctx.lineTo(sx+15, -10);
    ctx.lineTo(targetX + 180, 450); ctx.lineTo(targetX - 180, 450);
    ctx.closePath(); ctx.fill();
  });
  ctx.restore();

  // ── CROWD SILHOUETTE (WARM TONES) ──
  function drawSilhouette(x,y,scale,col){
    ctx.fillStyle=col; ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
    ctx.beginPath(); ctx.arc(0,-18,7,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12,0); ctx.bezierCurveTo(-12,-12,-7,-16,0,-16);
    ctx.bezierCurveTo(7,-16,12,-12,12,0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  
  const crowds = [
    {y: 90, sc: 0.65, cols: ['#2a0a0a','#250808','#2c0c0c'], count: 52},
    {y: 125, sc: 0.85, cols: ['#3a1010','#350e0e','#3e1212'], count: 42},
    {y: 165, sc: 1.1,  cols: ['#4a1515','#451212','#4e1818'], count: 32},
    {y: 200, sc: 1.4,  cols: ['#5a1a1a','#551616','#5e1e1e'], count: 24}
  ];
  crowds.forEach(row => {
    for(let i=0; i<row.count; i++){
      const hx = 10 + i * (W-20)/(row.count-1) + Math.sin(i*2.3+row.y)*5;
      drawSilhouette(hx, row.y + Math.sin(i*1.8)*4, row.sc, row.cols[i % row.cols.length]);
    }
  });

  // Camera Flash dots
  for(let i=0;i<10;i++){
    const fx=(Math.sin(i*137.5+t*0.0004)*0.5+0.5)*W, fy=(Math.sin(i*97.3+t*0.0003)*0.5+0.5)*150+20;
    const fa=Math.max(0,Math.sin(t*0.004+i*2.1));
    if(fa>0.88){
      ctx.fillStyle=`rgba(255,255,255,${(fa-0.88)*6})`;
      ctx.beginPath(); ctx.arc(fx,fy,Math.random()*3+1,0,Math.PI*2); ctx.fill();
    }
  }

  // ── RING CANVAS FLOOR (TAN/SAND) ──
  const floorGrad=ctx.createLinearGradient(0, BLy, 0, FLy);
  floorGrad.addColorStop(0,'#d49d79'); // Warmer tan
  floorGrad.addColorStop(1,'#ebc1a0');
  ctx.fillStyle=floorGrad;
  ctx.beginPath();
  ctx.moveTo(BLx,BLy); ctx.lineTo(BRx,BRy);
  ctx.lineTo(FRx,FRy); ctx.lineTo(FLx,FLy);
  ctx.closePath(); ctx.fill();

  // ── CENTER RING LOGO ("BOXING") ──
  ctx.save();
  const logoX=W/2, logoY=340;
  ctx.globalAlpha=0.75;
  // Use a slight transform to render the text in perspective
  ctx.translate(logoX, logoY);
  ctx.scale(1, 0.45); // flatten it
  ctx.font='900 120px "Barlow Condensed", sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.strokeStyle='rgba(100,20,5,0.4)'; ctx.lineWidth=6;
  ctx.strokeText('BOXING', 0, 0);
  ctx.fillStyle='rgba(180,60,30,0.6)';
  ctx.fillText('BOXING', 0, 0);
  ctx.restore();

  // ── SIDE SOLID APRON WALLS ──
  ctx.fillStyle = '#6a0a0a';
  ctx.beginPath(); ctx.moveTo(BLx, BLy); ctx.lineTo(FLx, FLy); ctx.lineTo(FLx, FLy+60); ctx.lineTo(BLx, BLy+20); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#101a5a';
  ctx.beginPath(); ctx.moveTo(BRx, BRy); ctx.lineTo(FRx, FRy); ctx.lineTo(FRx, FRy+60); ctx.lineTo(BRx, BRy+20); ctx.closePath(); ctx.fill();

  // ── BACK POSTS ──
  const backPostH = 80;
  drawRingPost(BLx, BLy, backPostH, '#1133cc', 0.85); // Back left blue
  drawRingPost(BRx, BRy, backPostH, '#1133cc', 0.85); // Back right blue

  // ── ROPES (BACK AND SIDES) ──
  const rColors=['#dd1111','#f5f5f5','#1144dd'];
  const bYOffs = [-75, -55, -35];
  const fYOffs = [-150, -110, -70]; // Front rope attachments at posts
  
  rColors.forEach((col, i) => {
    let by1 = BLy + bYOffs[i], by2 = BRy + bYOffs[i];
    // Back ropes
    drawRopeSag(BLx, by1, BRx, by2, col, 5, 2);
    // Side ropes (Left)
    let fy1 = FLy + fYOffs[i];
    drawRopeSag(BLx, by1, FLx, fy1, col, 6, 4);
    // Side ropes (Right)
    let fy2 = FRy + fYOffs[i];
    drawRopeSag(BRx, by2, FRx, fy2, col, 6, -4);
  });
}

function drawRingFront(){
  // Only draws the front ropes and front posts accurately in perspective foreground space
  const FLx = -50,  FLy = 550;
  const FRx = 830,  FRy = 550;

  // Front Posts
  const frontPostH = 160;
  drawRingPost(FLx, FLy, frontPostH, '#1133cc', 1.4);
  drawRingPost(FRx, FRy, frontPostH, '#1133cc', 1.4);

  // Front ropes
  const rColors=['#dd1111','#f5f5f5','#1144dd'];
  const fYOffs = [-150, -110, -70];
  
  rColors.forEach((col, i) => {
    let fy1 = FLy + fYOffs[i];
    let fy2 = FRy + fYOffs[i];
    drawRopeSag(FLx, fy1, FRx, fy2, col, 8, 2); 
  });

  // Front apron face
  ctx.fillStyle='#4e0505'; 
  ctx.beginPath(); 
  ctx.moveTo(FLx, FLy); ctx.lineTo(FRx, FRy); 
  ctx.lineTo(FRx, FRy+60); ctx.lineTo(FLx, FLy+60); 
  ctx.closePath(); ctx.fill();
  
  // Front edge highlight
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(FLx,FLy+1); ctx.lineTo(FRx,FLy+1); ctx.stroke();
}

function drawRingPost(x, y, h, padColor, scale){
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
  const pw=9, ph=h/scale;
  const pg=ctx.createLinearGradient(-pw,0,pw,0);
  pg.addColorStop(0,'#666'); pg.addColorStop(0.3,'#ccc'); pg.addColorStop(0.7,'#aaa'); pg.addColorStop(1,'#555');
  ctx.fillStyle=pg; ctx.fillRect(-pw,-ph,pw*2,ph);
  ctx.fillStyle=padColor;
  ctx.beginPath(); ctx.roundRect(-pw*1.4,-ph, pw*2.8, Math.min(60,ph*0.45), 4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillRect(-pw*1.4,-ph, pw*2.8, 5);
  ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(-pw*1.4,-ph+18, pw*2.8, 6);
  const cap=ctx.createRadialGradient(-2,-ph-3,2,-2,-ph-3,10);
  cap.addColorStop(0,'#eee'); cap.addColorStop(0.6,'#bbb'); cap.addColorStop(1,'#666');
  ctx.fillStyle=cap; ctx.beginPath(); ctx.arc(0,-ph-1,10,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawRopeSag(x1, y1, x2, y2, col, thick, sag) {
  ctx.save();
  // Shadow
  ctx.strokeStyle='rgba(0,0,0,0.45)'; ctx.lineWidth=thick+2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1, y1+2); 
  ctx.quadraticCurveTo((x1+x2)/2, (y1+y2)/2 + sag, x2, y2+2); ctx.stroke();
  
  // Main rope
  const rg=ctx.createLinearGradient(Math.min(x1,x2),Math.min(y1,y2)-thick, Math.max(x1,x2),Math.max(y1,y2)+thick);
  rg.addColorStop(0, shadeColor(col,30)); rg.addColorStop(0.5, col); rg.addColorStop(1, shadeColor(col,-30));
  ctx.strokeStyle = rg; ctx.lineWidth = thick;
  ctx.beginPath(); ctx.moveTo(x1, y1); 
  ctx.quadraticCurveTo((x1+x2)/2, (y1+y2)/2 + sag, x2, y2); ctx.stroke();
  
  // Highlight
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=Math.max(1, thick*0.3);
  ctx.beginPath(); ctx.moveTo(x1, y1-thick*0.25); 
  ctx.quadraticCurveTo((x1+x2)/2, (y1+y2)/2 + sag - thick*0.25, x2, y2-thick*0.25); ctx.stroke();
  ctx.restore();
}


function drawSuperBars(f1,f2){
  const draw=(x,pct,align)=>{
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(x,160,120,10);
    const sg=ctx.createLinearGradient(x,0,x+120,0);sg.addColorStop(0,'#ff6600');sg.addColorStop(1,'#ffcc00');
    ctx.fillStyle=pct>=1?'#ffdd00':sg;ctx.fillRect(x,160,120*pct,10);
    ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.strokeRect(x,160,120,10);
    ctx.fillStyle='#888';ctx.font='700 9px "Barlow Condensed"';ctx.textAlign=align;
    ctx.fillText('SUPER',align==='left'?x:x+120,158);
  };
  draw(16,f1.superCharge/100,'left');
  draw(CANVAS_W-136,f2.superCharge/100,'right');
}

