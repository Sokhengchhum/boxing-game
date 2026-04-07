let p1,p2;
function initFighters(){
  const r1=ROSTER[selectedP1], r2=ROSTER[selectedP2];
  function applyStats(f,r){
    f.speedMult = 0.7+r.spd*0.12;
    f.powerMult = 0.7+r.pow*0.12;
    f.stamMult  = 0.7+r.stam*0.12;
    f.defMult   = 0.7+r.def*0.12;
    f.maxStamina= Math.round(60+r.stam*8);
    f.stamina   = f.maxStamina;
  }
  p1=new Fighter(220, 1, r1.trunkC, r1.gloveC, r1.gloveC, r1.skin, r1.name, P1CTL, !!r1.beard, r1.id, r1.sh||185);
  p2=new Fighter(560,-1, r2.trunkC, r2.gloveC, r2.gloveC, r2.skin, r2.name, P2CTL, !!r2.beard, r2.id, r2.sh||185);

  applyStats(p1,r1); applyStats(p2,r2);
  document.getElementById('p1name').textContent=r1.name;
  // Refresh slot portraits into HUD portraits
  ['p1head','p2head'].forEach((id,pi)=>{
    const r=pi===0?r1:r2;
    const wrap=document.getElementById(id);
    wrap.innerHTML=''; const cv=document.createElement('canvas'); cv.width=72; cv.height=72;
    drawMiniPortrait(cv,r,pi===0); wrap.appendChild(cv);
    wrap.style.padding='0';
  });
  if(gameMode==='1p'){
    p2.cpu=new CPU(cpuDiff);
    document.getElementById('p2name').textContent=r2.name+' (CPU)';
  } else {
    document.getElementById('p2name').textContent=r2.name;
  }
}

function updateHUD(){
  const p1hpPct = Math.max(0,p1.hp);
  const p2hpPct = Math.max(0,p2.hp);
  const p1hpEl = document.getElementById('p1hp');
  const p2hpEl = document.getElementById('p2hp');
  p1hpEl.style.width = p1hpPct+'%';
  p2hpEl.style.width = p2hpPct+'%';
  // HP bar color: green->yellow->red
  p1hpEl.style.background = p1hpPct>60 ? 'linear-gradient(90deg,#2adb52,#a0ff50)' : p1hpPct>30 ? 'linear-gradient(90deg,#d4a020,#ffe066)' : 'linear-gradient(90deg,#cc1010,#ff4433)';
  p2hpEl.style.background = p2hpPct>60 ? 'linear-gradient(90deg,#2adb52,#a0ff50)' : p2hpPct>30 ? 'linear-gradient(90deg,#d4a020,#ffe066)' : 'linear-gradient(90deg,#cc1010,#ff4433)';
  document.getElementById('p1st').style.width = Math.max(0,p1.stamina)+'%';
  document.getElementById('p2st').style.width = Math.max(0,p2.stamina)+'%';
  document.getElementById('p1superui').style.width = Math.min(100,p1.superCharge)+'%';
  document.getElementById('p2superui').style.width = Math.min(100,p2.superCharge)+'%';
  // Timer - pulse red when &lt;10s
  const timerEl = document.getElementById('roundTimer');
  const t = Math.max(0,Math.ceil(roundTime));
  timerEl.textContent = t;
  timerEl.style.color = t<=10 ? (Math.floor(Date.now()/300)%2===0?'#ff3333':'#ff9900') : '#fff';
  document.getElementById('roundNum').textContent = 'ROUND '+roundNum;
  document.getElementById('p1score').innerHTML = '&#9733;'.repeat(p1.roundsWon) + '&#9734;'.repeat(Math.max(0,2-p1.roundsWon));
  document.getElementById('p2score').innerHTML = '&#9733;'.repeat(p2.roundsWon) + '&#9734;'.repeat(Math.max(0,2-p2.roundsWon));
  const dmgVig = document.getElementById('damage-vignette');
  if(dmgVig){
    if(p1.hp <= 35 && p1.hp > 0){
      const pulse = 0.5 + 0.5*Math.sin(Date.now()/150);
      dmgVig.style.background = 'radial-gradient(circle, transparent 40%, rgba(220,10,30,'+(pulse*0.7)+') 100%)';
    } else {
      dmgVig.style.background = 'transparent';
    }
  }
}

function endRound(winner){
  if(roundOver)return;roundOver=true;
  if(winner){
    winner.roundsWon++;
    announce('&#127942; '+winner.name+' WINS ROUND!',2800);
  } else announce('&#8987; TIME!',1500);
  updateHUD();
  setTimeout(()=>{
    if(roundNum>=MAX_ROUNDS||p1.roundsWon>=2||p2.roundsWon>=2)endMatch();
    else{roundNum++;nextRound();}
  },3000);
}

function nextRound(){
  roundTime=99;lastRoundTick=performance.now();roundOver=false;
  p1.hp=100;p1.stamina=100;p1.superCharge=0;p1.state='idle';p1.comboCount=0;
  p2.hp=100;p2.stamina=100;p2.superCharge=0;p2.state='idle';p2.comboCount=0;
  p1.x=220;p2.x=560;p1.vy=p2.vy=0;p1.y=p2.y=FLOORY;
  setTimeout(()=>announce('ROUND '+roundNum,1200),300);
}

function endMatch(){
  matchOver=true;
  const w=p1.roundsWon>p2.roundsWon?p1.name:p2.roundsWon>p1.roundsWon?p2.name:null;
  setTimeout(()=>{
    if(w)announce('&#129354; '+w+' WINS MATCH!',4000);
    else announce('&#129309; DRAW!',4000);
    setTimeout(showStartScreen,4500);
  },400);
}

function showStartScreen(){
  gameRunning=false;
  window.wsSelectingPlayer=1; // reset so P1 picks first
  document.getElementById('start-screen').style.display='none';
  const ms = document.getElementById('mode-selection');
  ms.style.display='flex';
  drawModeBg();
  window.selectChar(0); // auto-hover first character for P1
}

let lastTime=0;

window.isPaused = false;
window.pauseTimerInt = null;
window.pauseTimerVal = 0;

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    window.togglePause();
  }
});

window.togglePause = function() {
  if (!gameRunning || matchOver || roundOver) return;
  window.isPaused = !window.isPaused;
  const overlay = document.getElementById('pause-overlay');
  
  if (window.isPaused) {
    if(overlay) overlay.style.display = 'flex';
    if (gameMode === '2p') {
      const pTimer = document.getElementById('pause-timer');
      if(pTimer) pTimer.style.display = 'block';
      window.pauseTimerVal = 30; // 30s pause timeout for online
      const pVal = document.getElementById('pause-timer-val');
      if(pVal) pVal.textContent = window.pauseTimerVal;
      
      if(window.pauseTimerInt) clearInterval(window.pauseTimerInt);
      window.pauseTimerInt = setInterval(() => {
        window.pauseTimerVal--;
        if(pVal) pVal.textContent = window.pauseTimerVal;
        if (window.pauseTimerVal <= 0) {
          window.togglePause(); // forceful resume!
        }
      }, 1000);
    } else {
      const pTimer = document.getElementById('pause-timer');
      if(pTimer) pTimer.style.display = 'none';
    }
  } else {
    if(overlay) overlay.style.display = 'none';
    if(window.pauseTimerInt) clearInterval(window.pauseTimerInt);
    
    // Adjust lastRoundTick so we don't instantly jump time
    let now = performance.now();
    lastRoundTick += (now - lastTime);
    lastTime = now;
  }
};

function gameLoop(ts){
  if(!gameRunning)return;
  if(window.isPaused) {
    lastRoundTick += (ts - lastTime); // keep timer stable while paused!
    lastTime = ts;
    requestAnimationFrame(gameLoop);
    return;
  }
  if(ts-lastRoundTick>=1000&&!roundOver&&!matchOver){
    roundTime=Math.max(0,roundTime-1);lastRoundTick=ts;
    if(roundTime<=0)endRound(p1.hp>p2.hp?p1:p2.hp>p1.hp?p2:null);
  }
  if(!matchOver){
    p1.update(keys,p2);p2.update(keys,p1);
    if(!roundOver){
      if(p1.hp<=0)endRound(p2);else if(p2.hp<=0)endRound(p1);
    }
  }
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
  const dt = slowMoTimer>0 ? 0.35 : 1.0;
  if(slowMoTimer>0) slowMoTimer--;
  drawRingBack();drawSuperBars(p1,p2);
  if(p1.x<p2.x){p2.draw(ctx);p1.draw(ctx);}else{p1.draw(ctx);p2.draw(ctx);}
  drawRingFront();
  drawActiveVFX();
  drawScreenFlashFX();
  updateHUD();lastTime=ts;
  requestAnimationFrame(gameLoop);
}

window.forceStartGame = function() {
  if(typeof window.stopSelectionTimer === 'function') window.stopSelectionTimer();
  document.getElementById('start-screen').style.display='none';
  gameRunning=false;
  roundNum=1; roundOver=false; matchOver=false; roundTime=99;
  initFighters();
  updateHUD();
  playVSIntro(()=>{
    gameRunning=true;
    lastTime=performance.now(); lastRoundTick=performance.now();
    setTimeout(()=>announce('ROUND 1',1200),300);
    requestAnimationFrame(gameLoop);
  });
};

document.getElementById('startBtn').addEventListener('click',()=>{
  if (gameMode === '2p') {
    window.p1Locked = true;
    window.updateSelUI();
    // If online opponent also locked in, start match. Else, they just wait!
    if (window.p2Locked) {
      window.forceStartGame();
    }
    return;
  }

  // Fallback for Single Player
  if (window.wsSelectingPlayer === 1) {
    window.wsSelectingPlayer = 2;
    window.updateSelUI();
    return;
  }
  // Only start fight when both players have selected
  if(window.wsSelectingPlayer !== 2) return;
  
  if(typeof window.stopSelectionTimer === 'function') window.stopSelectionTimer();
  
  window.forceStartGame();
});

