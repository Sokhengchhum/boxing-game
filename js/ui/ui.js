let selectedP1 = 0, selectedP2 = 1;

// Draw a mini boxer portrait onto a canvas element
function drawMiniPortrait(canvas, r, isLeft) {
  const W = canvas.width, H = canvas.height;
  const c = canvas.getContext('2d');
  // Background gradient
  const bg = c.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, '#1a1a2a'); bg.addColorStop(1, '#050508');
  c.fillStyle = bg; c.fillRect(0,0,W,H);
  // Glow
  const gl = c.createRadialGradient(W/2,H*0.7,2,W/2,H*0.7,W*0.55);
  gl.addColorStop(0,'rgba(200,100,50,0.12)'); gl.addColorStop(1,'transparent');
  c.fillStyle=gl; c.fillRect(0,0,W,H);

  const img = SPRITES[r.id];
  if(img && img.complete && img.naturalWidth > 0) {
      // Draw upper body for portrait
      const sx = img.naturalWidth * 0.1;
      const sy = 0;
      const sw = img.naturalWidth * 0.8;
      const sh = img.naturalHeight * 0.45;
      
      c.save();
      if(!isLeft) { c.translate(W, 0); c.scale(-1, 1); }
      c.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      c.restore();
  } else {
    const cx = W/2;
    // Torso
    const tg = c.createLinearGradient(cx-16,H*0.4,cx+16,H);
    tg.addColorStop(0, r.skin); tg.addColorStop(1, r.skinD);
    c.fillStyle = tg;
    c.beginPath();
    c.moveTo(cx-14, H);
    c.bezierCurveTo(cx-20,H*0.7,cx-18,H*0.44,cx-10,H*0.36);
    c.bezierCurveTo(cx-4,H*0.3,cx+4,H*0.3,cx+10,H*0.36);
    c.bezierCurveTo(cx+18,H*0.44,cx+20,H*0.7,cx+14,H);
    c.fill();
    // Pecs
    c.fillStyle = r.skinD;
    c.beginPath(); c.ellipse(cx-6,H*0.52,6,4,-0.3,0,Math.PI); c.fill();
    c.beginPath(); c.ellipse(cx+6,H*0.52,6,4, 0.3,0,Math.PI); c.fill();
    // Neck
    c.fillStyle = r.skin; c.fillRect(cx-5,H*0.32,10,H*0.08);
    // Head
    const hg = c.createRadialGradient(cx+2,H*0.2,1,cx,H*0.2,H*0.19);
    hg.addColorStop(0, r.skin); hg.addColorStop(1, r.skinD);
    c.fillStyle = hg;
    c.beginPath(); c.ellipse(cx,H*0.2,H*0.14,H*0.19,0,0,Math.PI*2); c.fill();
    // Hair
    c.fillStyle = r.hair;
    c.beginPath(); c.ellipse(cx,H*0.06,H*0.14,H*0.1,0,Math.PI,Math.PI*2); c.fill();
    // Eye
    c.fillStyle='#111';
    c.beginPath(); c.ellipse(cx+5,H*0.18,3,2.5,0,0,Math.PI*2); c.fill();
    c.fillStyle='rgba(255,255,255,0.7)';
    c.beginPath(); c.arc(cx+6.5,H*0.17,1,0,Math.PI*2); c.fill();
    // Jaw shadow
    c.fillStyle = r.skinD+'aa';
    c.beginPath(); c.ellipse(cx,H*0.3,H*0.12,H*0.06,0,0,Math.PI); c.fill();
    // Gloves (both sides — big red boxing glove look)
    function drawGlove(gx,gy,angle){
      c.save(); c.translate(gx,gy); c.rotate(angle);
      const gg = c.createRadialGradient(0,0,2,0,0,16);
      gg.addColorStop(0,'#ff3322'); gg.addColorStop(0.6,r.gloveC); gg.addColorStop(1,'#7a0808');
      c.fillStyle=gg;
      c.beginPath(); c.ellipse(0,0,15,11,0,0,Math.PI*2); c.fill();
      // Knuckle line
      c.strokeStyle='rgba(255,255,255,0.18)'; c.lineWidth=1;
      c.beginPath(); c.moveTo(-8,-3); c.lineTo(6,-3); c.stroke();
      // EVERLAST text hint
      c.fillStyle='rgba(255,255,255,0.2)'; c.font='bold '+(H*0.06)+'px sans-serif';
      c.textAlign='center'; c.fillText('E',0,3);
      // Wrist wrap
      c.fillStyle='rgba(240,235,220,0.7)';
      c.beginPath(); c.ellipse(-10,4,5,4,0.3,0,Math.PI*2); c.fill();
      c.restore();
    }
    drawGlove(cx-18, H*0.6, -0.3);
    drawGlove(cx+18, H*0.55, 0.3);
  }
  // Trunk color accent at bottom
  c.fillStyle = r.trunkC+'cc';
  c.fillRect(W/2-14,H*0.82,28,H*0.18);
  c.fillStyle='rgba(255,255,255,0.12)';
  c.fillRect(W/2-14,H*0.82,28,3);
}

// Render full-body sprite thumbnail for the grid slot
function drawHeadOnly(canvas, r) {
  const W = canvas.width, H = canvas.height;
  const c = canvas.getContext('2d');
  c.clearRect(0,0,W,H);
  
  // Slot background
  const bg = c.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0d1a2e'); bg.addColorStop(1,'#050a14');
  c.fillStyle=bg; c.fillRect(0,0,W,H);
  
  if(!r) {
    // Dark locked silhouette
    c.fillStyle='rgba(0,0,0,0.7)';
    c.beginPath(); c.ellipse(W/2,H*0.3,W*0.22,H*0.18,0,0,Math.PI*2); c.fill();
    c.beginPath();
    c.moveTo(W*0.2,H*0.54);
    c.bezierCurveTo(W*0.06,H*0.54,W*0.04,H,W*0.14,H);
    c.lineTo(W*0.86,H);
    c.bezierCurveTo(W*0.96,H,W*0.94,H*0.54,W*0.80,H*0.54);
    c.fill();
    // Lock icon
    c.strokeStyle='rgba(100,120,160,0.5)'; c.lineWidth=1.5;
    c.beginPath(); c.arc(W/2,H*0.42,W*0.12,Math.PI,Math.PI*2); c.stroke();
    c.fillStyle='rgba(100,120,160,0.5)';
    c.fillRect(W/2-W*0.1,H*0.42,W*0.2,H*0.14);
    return;
  }

  // Try to draw the real sprite image
  const img = SPRITES[r.id];
  if(img && img.complete && img.naturalWidth > 0) {
    const isSheet = img.naturalWidth > img.naturalHeight * 1.5;
    let sW = img.naturalWidth, sH = img.naturalHeight;
    let sx = 0;
    if (isSheet) {
      sW = Math.round(img.naturalWidth / 6);
      sx = sW; // Use idle pose (frame index 1)
    }

    // Draw full body sprite, centered and fitted
    const aspect = sW / sH;
    const drawH = H * 0.98;
    const drawW = aspect * drawH;
    c.drawImage(img, sx, 0, sW, sH, W/2 - drawW/2, H - drawH, drawW, drawH);
    return;
  }

  // Fallback if sprite not loaded yet
  img && img.addEventListener('load', ()=>drawHeadOnly(canvas,r), {once:true});
  
  const skin = r.skin, trunk = r.trunkC, glove = r.gloveC, hair = r.hair;
  
  c.save();
  c.translate(W/2, H - 2);
  const sc = H / 180;
  c.scale(sc, sc);
  
  // Shadow
  c.fillStyle='rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0,2,16,4,0,0,Math.PI*2); c.fill();
  
  // Boots
  c.fillStyle='#111';
  c.fillRect(-9,0,8,14); c.fillRect(1,0,8,14);
  c.fillStyle='#eee'; c.fillRect(-9,1,8,3); c.fillRect(1,1,8,3);
  
  // Legs
  c.fillStyle=skin;
  c.fillRect(-8,-14,6,14); c.fillRect(2,-14,6,14);
  
  // Shorts
  const tg=c.createLinearGradient(-12,-16,12,-4);
  tg.addColorStop(0,lightenColor(trunk,15)); tg.addColorStop(1,darkenColor(trunk,15));
  c.fillStyle=tg;
  c.beginPath(); c.roundRect(-12,-32,24,17,3); c.fill();
  c.fillStyle='rgba(255,255,255,0.3)'; c.fillRect(-12,-34,24,4);
  
  // Torso
  const tsg=c.createLinearGradient(-9,-58,9,-32);
  tsg.addColorStop(0,lightenColor(skin,15)); tsg.addColorStop(1,darkenColor(skin,10));
  c.fillStyle=tsg;
  c.beginPath(); c.moveTo(-9,-32); c.bezierCurveTo(-13,-44,-13,-58,-5,-60); c.bezierCurveTo(-2,-62,2,-62,5,-60); c.bezierCurveTo(13,-58,13,-44,9,-32); c.fill();
  
  // Gloves
  const gg=c.createRadialGradient(13,-47,1,13,-47,8);
  gg.addColorStop(0,lightenColor(glove,20)); gg.addColorStop(1,darkenColor(glove,10));
  c.fillStyle=gg; c.beginPath(); c.ellipse(13,-47,8,6,0.3,0,Math.PI*2); c.fill();
  const gg2=c.createRadialGradient(-13,-54,1,-13,-54,7);
  gg2.addColorStop(0,lightenColor(glove,15)); gg2.addColorStop(1,darkenColor(glove,15));
  c.fillStyle=gg2; c.beginPath(); c.ellipse(-13,-54,7,5,-0.2,0,Math.PI*2); c.fill();
  
  // Head
  const hg=c.createRadialGradient(-1,-72,2,0,-68,12);
  hg.addColorStop(0,lightenColor(skin,20)); hg.addColorStop(1,darkenColor(skin,10));
  c.fillStyle=hg; c.beginPath(); c.ellipse(0,-68,9,12,0,0,Math.PI*2); c.fill();
  // Hair
  c.fillStyle=hair;
  c.beginPath(); c.ellipse(0,-76,9,7,0,Math.PI,Math.PI*2); c.fill();
  if(r.beard){ c.fillStyle=darkenColor(hair,5); c.beginPath(); c.ellipse(0,-62,6,4,0,0,Math.PI); c.fill(); }
  // Eyes
  c.fillStyle='#fff';
  c.beginPath(); c.ellipse(-3.5,-68,2.5,1.8,0,0,Math.PI*2); c.fill();
  c.beginPath(); c.ellipse(3.5,-68,2.5,1.8,0,0,Math.PI*2); c.fill();
  c.fillStyle='#222';
  c.beginPath(); c.arc(-3.5,-68,1.2,0,Math.PI*2); c.fill();
  c.beginPath(); c.arc(3.5,-68,1.2,0,Math.PI*2); c.fill();
  
  c.restore();
}

function lightenColor(hex,amt){
  let n=parseInt(hex.replace('#',''),16);
  return '#'+[n>>16&255,n>>8&255,n&255].map(v=>Math.min(255,v+amt).toString(16).padStart(2,'0')).join('');
}
function darkenColor(hex,amt){
  let n=parseInt(hex.replace('#',''),16);
  return '#'+[n>>16&255,n>>8&255,n&255].map(v=>Math.max(0,v-amt).toString(16).padStart(2,'0')).join('');
}

window.wsSelectingPlayer = 1; // 1 or 2
let wsPreviewFighter = null;
let wsPreviewTimer = 0;

// Draw the arena crowd background — uses crowd_bg.png if available
function drawCrowdBg() {
  const bgCanvas = document.getElementById('ws-crowd-bg');
  if(!bgCanvas) return;
  const ss = document.getElementById('start-screen');
  bgCanvas.width = ss.offsetWidth || 780;
  bgCanvas.height = ss.offsetHeight || 450;
  const c = bgCanvas.getContext('2d');
  const W=bgCanvas.width, H=bgCanvas.height;

  // Try to use the real crowd photo first
  const crowdImg = new Image();
  crowdImg.onload = () => {
    c.drawImage(crowdImg, 0, 0, W, H);
    // Overlay a warm dark maroon tint
    const tint = c.createLinearGradient(0,0,0,H);
    tint.addColorStop(0,'rgba(30,10,10,0.55)');
    tint.addColorStop(0.6,'rgba(25,8,8,0.4)');
    tint.addColorStop(1,'rgba(20,5,5,0.75)');
    c.fillStyle=tint; c.fillRect(0,0,W,H);
  };
  crowdImg.onerror = () => {
    // Fallback: Warm painted crowd
    c.fillStyle='#1a0505'; c.fillRect(0,0,W,H);
    for(let row=0;row<8;row++){
      const rowY=H*0.04+row*(H*0.5/8), rowH=H*0.055+row*2;
      const redCh=25+row*5;
      c.fillStyle=`rgba(${redCh},${redCh-5},${redCh-10},0.85)`;
      c.fillRect(0,rowY,W,rowH);
      const cnt=Math.floor(W/26)+2;
      for(let i=0;i<cnt;i++){
        const hx=(i/(cnt-1))*W+(Math.random()-0.5)*10;
        const hy=rowY+rowH*0.2+(Math.random()-0.5)*3;
        const hr=4+Math.random()*5;
        c.fillStyle=`rgba(${redCh+15},${redCh+5},${redCh-5},0.9)`;
        c.beginPath(); c.ellipse(hx,hy,hr*0.7,hr,0,0,Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(hx,hy+hr*1.3,hr*0.85,hr*0.65,0,0,Math.PI*2); c.fill();
        if(Math.random()<0.06){ c.fillStyle='rgba(255,100,50,0.6)'; c.fillRect(hx-5,hy-hr*2,10,10); }
      }
    }
    const fg=c.createLinearGradient(0,H*0.55,0,H);
    fg.addColorStop(0,'transparent'); fg.addColorStop(1,'rgba(35,10,10,0.85)');
    c.fillStyle=fg; c.fillRect(0,H*0.55,W,H*0.45);
  };
  crowdImg.src = 'img/crowd_bg.png';
}

function drawModeBg() {
  const bgCanvas = document.getElementById('mode-bg');
  if(!bgCanvas) return;
  const ms = document.getElementById('mode-selection');
  bgCanvas.width = ms.offsetWidth || 780;
  bgCanvas.height = ms.offsetHeight || 450;
  const c = bgCanvas.getContext('2d');
  const W=bgCanvas.width, H=bgCanvas.height;

  function draw() {
    if (ms.style.display === 'none') return;
    
    // Warm burnt copper background
    const bg = c.createRadialGradient(W/2, H/2, 50, W/2, H/2, W*0.7);
    bg.addColorStop(0, '#2a0a0a');
    bg.addColorStop(1, '#0e0505');
    c.fillStyle = bg;
    c.fillRect(0,0,W,H);
    
    // Abstract grid in copper
    c.strokeStyle = 'rgba(255,160,100,0.06)';
    c.lineWidth = 1;
    for(let i=0; i<W; i+=40) {
      c.beginPath(); c.moveTo(i,0); c.lineTo(i,H); c.stroke();
    }
    for(let i=0; i<H; i+=40) {
      c.beginPath(); c.moveTo(0,i); c.lineTo(W,i); c.stroke();
    }
    
    // Floating glows
    const time = Date.now() / 2000;
    for(let i=0; i<3; i++) {
      const gx = W/2 + Math.cos(time + i*2) * W * 0.3;
      const gy = H/2 + Math.sin(time*0.8 + i*2) * H * 0.2;
      const gr = 180 + Math.sin(time) * 40;
      const g = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
      const gCol = i === 0 ? '50,15,5' : i === 1 ? '70,25,10' : '40,10,10';
      g.addColorStop(0, `rgba(${gCol}, 0.35)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0,0,W,H);
    }
    
    requestAnimationFrame(draw);
  }
  draw();
}

function drawPreviewStage() {
  const cv1 = document.getElementById('ws-p1-canvas');
  const cv2 = document.getElementById('ws-p2-canvas');
  const screen = document.getElementById('start-screen');
  
  if(screen && screen.style.display !== 'none' && !gameRunning) {
    const r1 = ROSTER[selectedP1];
    const r2 = ROSTER[selectedP2];

    const drawOne = (cv, r, isFlipped) => {
      if(!cv) return;
      const c = cv.getContext('2d');
      const W=cv.width, H=cv.height;
      c.clearRect(0,0,W,H);
      
      // Shadow podium
      c.fillStyle='rgba(0,0,0,0.6)';
      c.beginPath(); c.ellipse(W/2, H*0.85, W*0.35, 12, 0, 0, Math.PI*2); c.fill();
      c.fillStyle='rgba(255,255,255,0.05)';
      c.beginPath(); c.ellipse(W/2, H*0.85, W*0.25, 8, 0, 0, Math.PI*2); c.fill();

      const img = SPRITES[r.id];
      if(img && img.complete && img.naturalWidth>0) {
        let sW = img.naturalWidth, sH = img.naturalHeight;
        let sx = 0;
        if (sW > sH * 1.5) {
          sW = Math.round(sW / 6);
          sx = sW; // Use idle pose frame
        }
        
        const sprH = H * 0.82;
        const sprW = (sW/sH) * sprH;
        
        c.save();
        if(isFlipped) {
          c.translate(W/2 + sprW/2, 0); c.scale(-1, 1);
          c.drawImage(img, sx, 0, sW, sH, 0, H*0.85 - sprH, sprW, sprH);
        } else {
          c.drawImage(img, sx, 0, sW, sH, W/2 - sprW/2, H*0.85 - sprH, sprW, sprH);
        }
        c.restore();
      }
    };
    
    drawOne(cv1, r1, false);
    drawOne(cv2, r2, true);

    wsPreviewTimer = requestAnimationFrame(drawPreviewStage);
  }
}



function buildRoster(){
  const grid = document.getElementById('ws-grid');
  if(!grid) return;
  // Draw crowd background first
  drawCrowdBg();
  grid.innerHTML = '';
  const totalSlots = ROSTER.length + 2; // Show only 2 empty cards as requested
  for(let i=0; i<totalSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'ws-head-slot';
    const ptr = document.createElement('div'); ptr.className='ws-head-pointer';
    slot.appendChild(ptr);
    
    if(i < ROSTER.length) {
      const r = ROSTER[i];
      const cv = document.createElement('canvas');
      cv.className = 'ws-head-cv'; cv.width=62; cv.height=80;
      drawHeadOnly(cv, r);
      slot.appendChild(cv);
      slot.addEventListener('click', ()=>{ window.selectChar(i); });
    } else {
      // Locked silhouette canvas
      const cv = document.createElement('canvas');
      cv.className = 'ws-head-cv'; cv.width=62; cv.height=80;
      drawHeadOnly(cv, null);
      slot.appendChild(cv);
    }
    grid.appendChild(slot);
  }
  window.updateSelUI();
  // Auto-select first character so ring preview and stats show immediately
  window.selectChar(0);
  cancelAnimationFrame(wsPreviewTimer);
  drawPreviewStage();
}

window.goBackStage = function() {
  if (window.wsSelectingPlayer === 2) {
    window.wsSelectingPlayer = 1;
    window.updateSelUI();
  } else {
    document.getElementById('start-screen').style.display = 'none';
    if(typeof window.stopSelectionTimer === 'function') window.stopSelectionTimer();
    const modeSel = document.getElementById('mode-selection');
    if (modeSel) modeSel.style.display = 'flex';
  }
};

window.selectChar = function(idx) {
  if(idx >= ROSTER.length) return; // can't pick locked slot
  if (window.wsSelectingPlayer === 1) {
    selectedP1 = idx;
  } else {
    // Player 2 selecting
    selectedP2 = idx;
  }
  window.updateSelUI();
};

window.pickRandomChar = function() {
  const rIdx = Math.floor(Math.random() * ROSTER.length);
  window.selectChar(rIdx);
};

window.updateSelUI = function() {
  const isP1Turn = window.wsSelectingPlayer === 1;
  const rIdx = isP1Turn ? selectedP1 : selectedP2;
  const currR = ROSTER[rIdx];
  
  const slots = document.querySelectorAll('.ws-head-slot');
  slots.forEach((s,i)=>{
    s.classList.remove('selected','p1-sel','p2-sel');
    if (gameMode === '2p') {
      // In online mode, show both cursors at the same time
      if(i === selectedP1) s.classList.add('selected','p1-sel');
      if(i === selectedP2) s.classList.add('selected','p2-sel');
    } else {
      // Single player step-by-step
      if(i === selectedP1 && !isP1Turn) s.classList.add('selected','p1-sel');
      if(isP1Turn && i === selectedP1) s.classList.add('selected','p1-sel');
      if(!isP1Turn && i === selectedP2) s.classList.add('selected','p2-sel');
    }
  });

  // Segmented stat bars (10 segments each)
  function setSegs(id, val, color) {
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = '';
    const filled = Math.round((val||0) * 2); // val is 1-5, segments 1-10
    for(let s=0;s<10;s++) {
      const seg = document.createElement('div');
      seg.className = 'ws-seg' + (s < filled ? (color==='red'?' on-red':' on-blue') : '');
      el.appendChild(seg);
    }
  }

  // Update P1 Side
  const r1 = ROSTER[selectedP1];
  const name1 = document.getElementById('ws-p1-name');
  if(name1) name1.textContent = r1.name;
  setSegs('ws-p1-stat-weight',   r1.pow,    'red');
  setSegs('ws-p1-stat-height',   r1.height, 'blue');
  setSegs('ws-p1-stat-flying',   r1.flying, 'red');
  setSegs('ws-p1-stat-speed',    r1.spd,    'blue');
  setSegs('ws-p1-stat-recovery', r1.stam,   'red');
  setSegs('ws-p1-stat-defense',  r1.def,    'blue');

  // Update P2 Side
  const r2 = ROSTER[selectedP2];
  const name2 = document.getElementById('ws-p2-name');
  if(name2) name2.textContent = r2.name;
  setSegs('ws-p2-stat-weight',   r2.pow,    'red');
  setSegs('ws-p2-stat-height',   r2.height, 'blue');
  setSegs('ws-p2-stat-flying',   r2.flying, 'red');
  setSegs('ws-p2-stat-speed',    r2.spd,    'blue');
  setSegs('ws-p2-stat-recovery', r2.stam,   'red');
  setSegs('ws-p2-stat-defense',  r2.def,    'blue');

  // Manage Turn Visibility & Status Labels
  const p1Sec = document.getElementById('ws-p1-section');
  const p2Sec = document.getElementById('ws-p2-section');
  const p1Stat = document.getElementById('ws-p1-status');
  const p2Stat = document.getElementById('ws-p2-status');

  if (p1Sec && p2Sec && p1Stat && p2Stat) {
    if (gameMode === '2p') {
      // Both active simultaneously
      p1Sec.classList.remove('inactive');
      p2Sec.classList.remove('inactive');
      if(window.p1Locked) { p1Sec.classList.add('locked'); p1Stat.textContent = 'READY'; p1Stat.className = 'ws-player-status locked'; }
      else { p1Sec.classList.remove('locked'); p1Stat.textContent = 'CHOOSING'; p1Stat.className = 'ws-player-status choosing'; }
      
      if(window.p2Locked) { p2Sec.classList.add('locked'); p2Stat.textContent = 'READY'; p2Stat.className = 'ws-player-status locked'; }
      else { p2Sec.classList.remove('locked'); p2Stat.textContent = 'CHOOSING'; p2Stat.className = 'ws-player-status choosing'; }
    } else {
      if (window.wsSelectingPlayer === 1) {
        p1Sec.classList.remove('inactive','locked');
        p2Sec.classList.add('inactive'); p2Sec.classList.remove('locked');
        p1Stat.textContent = 'CHOOSING';  p1Stat.className = 'ws-player-status choosing';
        p2Stat.textContent = 'WAITING';   p2Stat.className = 'ws-player-status';
      } else {
        p1Sec.classList.add('locked'); p1Sec.classList.remove('inactive');
        p2Sec.classList.remove('inactive');
        p1Stat.textContent = 'LOCKED';    p1Stat.className = 'ws-player-status locked';
        p2Stat.textContent = 'CHOOSING';  p2Stat.className = 'ws-player-status choosing';
      }
    }
  }

  if (!wsPreviewFighter || wsPreviewFighter.id !== currR.id) {
    wsPreviewFighter = new Fighter(0, 1, currR.trunkC, currR.gloveC, currR.gloveC, currR.skin, currR.name, null, !!currR.beard, currR.id);
  }

  // Prompt text
  const prompt = document.getElementById('ws-prompt');
  if(prompt) {
    if (gameMode === '2p') {
      prompt.textContent = 'ONLINE MATCHMAKING — SELECT YOUR FIGHTER!';
      prompt.style.color = '#ffaa00';
    } else {
      prompt.textContent = isP1Turn ? 'PLAYER 1 — SELECT YOUR FIGHTER' : 'CPU — SELECT OR RANDOM!';
      prompt.style.color = isP1Turn ? '#ff4444' : '#44ff88';
    }
  }

  // READY button
  const btn = document.getElementById('startBtn');
  if(btn) {
    if (gameMode === '2p') {
      if(window.p1Locked) {
        btn.textContent = 'WAITING ON OPPONENT...';
        btn.classList.remove('ready-active');
        btn.style.pointerEvents = 'none';
        btn.style.background = '#444';
      } else {
        btn.classList.add('ready-active');
        btn.textContent = 'READY!';
        btn.style.pointerEvents = 'all';
        btn.style.background = ''; // restore css
      }
    } else {
      btn.style.pointerEvents = 'all';
      btn.style.background = '';
      btn.classList.add('ready-active');
      btn.textContent = window.wsSelectingPlayer === 1 ? 'CONFIRM P1' : 'FIGHT!';
    }
  }

  // Difficulty Selector: only show when actually choosing the CPU (Player 2) in Single Player mode
  const dSec = document.getElementById('diff-section');
  if (dSec) {
    if (gameMode === '1p' && !isP1Turn) {
      dSec.style.display = 'flex';
    } else {
      dSec.style.display = 'none';
    }
  }
};

window.selectionTimerVal = 30;
window.selectionTimerInt = null;
window.simP2Int = null;
window.p1Locked = false;
window.p2Locked = false;

window.startSelectionTimer = function() {
  if (gameMode !== '2p') return; 
  window.selectionTimerVal = 30;
  window.wsSelectingPlayer = 1;
  window.p1Locked = false;
  window.p2Locked = false;
  
  const tmrEl = document.getElementById('ws-sel-timer');
  if(!tmrEl) return;
  tmrEl.style.display = 'block';
  tmrEl.textContent = window.selectionTimerVal;
  
  if(window.selectionTimerInt) clearInterval(window.selectionTimerInt);
  if(window.simP2Int) clearInterval(window.simP2Int);
  
  // Simulate remote opponent picking at the same time
  window.simP2Int = setInterval(() => {
    if (!window.p2Locked) {
      selectedP2 = Math.floor(Math.random() * ROSTER.length);
      window.updateSelUI();
      // Randomly lock after 5-20 seconds
      if (window.selectionTimerVal < (10 + Math.random()*15) && Math.random() < 0.2) {
        window.p2Locked = true;
        window.updateSelUI();
      }
    }
  }, 1500);

  window.selectionTimerInt = setInterval(() => {
    window.selectionTimerVal--;
    if(window.selectionTimerVal <= 0) {
      window.selectionTimerVal = 0;
      tmrEl.textContent = '00';
      clearInterval(window.selectionTimerInt);
      clearInterval(window.simP2Int);
      // Auto confirm for BOTH players and start fight instantly!
      window.p1Locked = true;
      window.p2Locked = true;
      window.updateSelUI();
      const sb = document.getElementById('startBtn');
      if(sb) sb.style.pointerEvents = 'all'; // Temporarily allow click
      window.forceStartGame();
    } else {
      tmrEl.textContent = (window.selectionTimerVal < 10 ? '0' : '') + window.selectionTimerVal;
    }
  }, 1000);
};

window.stopSelectionTimer = function() {
  if(window.selectionTimerInt) clearInterval(window.selectionTimerInt);
  if(window.simP2Int) clearInterval(window.simP2Int);
  const tmrEl = document.getElementById('ws-sel-timer');
  if(tmrEl) tmrEl.style.display = 'none';
};

buildRoster();

function playVSIntro(onDone){
  const r1=ROSTER[selectedP1], r2=ROSTER[selectedP2];
  const intro=document.getElementById('vs-intro');

  // Fill portraits
  const port1=document.getElementById('vi-port1');
  const port2=document.getElementById('vi-port2');
  drawMiniPortrait(port1,r1,true);
  drawMiniPortrait(port2,r2,false);

  document.getElementById('vi-name1').textContent=r1.name;
  document.getElementById('vi-name2').textContent=r2.name;
  document.getElementById('vi-arch1').textContent=r1.archetype;
  document.getElementById('vi-arch2').textContent=r2.archetype;
  document.getElementById('vi-round-lbl').textContent='ROUND 1  •  BEST OF '+MAX_ROUNDS;

  // Stat pips P1 (power)
  ['vi-pips1','vi-pips2'].forEach((id,pi)=>{
    const r=pi===0?r1:r2;
    document.getElementById(id).innerHTML=[...Array(5)].map((_,d)=>
      `<div class="vi-pip${d<r.pow?' on':''}"></div>`).join('');
  });

  // Reset animation classes so they replay
  const f1=document.getElementById('vi-f1'), f2=document.getElementById('vi-f2');
  const vs=document.getElementById('vi-vs');
  [f1,f2,vs].forEach(el=>{ el.style.animation='none'; void el.offsetWidth; el.style.animation=''; });

  const countEl=document.getElementById('vi-count');
  const fightEl=document.getElementById('vi-fight');
  countEl.style.display='none'; fightEl.style.display='none';

  // Show intro
  intro.classList.add('active');

  // Flash effect
  const flash=document.createElement('div');
  flash.className='vi-flash';
  intro.appendChild(flash);
  setTimeout(()=>{ if(flash.parentNode)flash.parentNode.removeChild(flash); },200);

  // Countdown sequence: 1.8s after start
  const counts=['3','2','1'];
  let ci=0;
  function nextCount(){
    if(ci>=counts.length){
      // FIGHT!
      countEl.style.display='none';
      fightEl.style.display='block';
      fightEl.style.animation='none'; void fightEl.offsetWidth;
      fightEl.style.animation='fightSlam 0.45s cubic-bezier(0.16,1,0.3,1) forwards';
      setTimeout(()=>{
        intro.classList.remove('active');
        fightEl.style.display='none';
        onDone();
      },600);
      return;
    }
    countEl.style.display='block';
    countEl.textContent=counts[ci];
    countEl.style.animation='none'; void countEl.offsetWidth;
    countEl.style.animation='countPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards';
    // color cycle
    const colors=['#ff3333','#ff9900','#ffcc00'];
    countEl.style.color=colors[ci];
    countEl.style.textShadow='0 0 40px '+colors[ci]+', 4px 4px 0 #000';
    ci++;
    setTimeout(nextCount, 650);
  }
  setTimeout(nextCount, 1800);
}

