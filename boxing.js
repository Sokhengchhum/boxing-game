const CANVAS_W=780,CANVAS_H=450;
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
canvas.width=CANVAS_W;canvas.height=CANVAS_H;
const container=document.getElementById('game-container');
container.style.cssText='width:'+CANVAS_W+'px;height:'+CANVAS_H+'px;position:relative;';
function resizeGame(){
  const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
  container.style.transform = 'scale(' + scale + ')';
  container.style.transformOrigin = 'center center';
}
window.addEventListener('resize', resizeGame);
resizeGame();

// ======== SPRITE LOADER ========
const SPRITES = {};
const SPRITE_IDS = ['barrera','jackson','santos','titan','lee','blaze', 'thereal', 'viper', 'blitz', 'mako'];
// Offscreen canvas used for white-background removal
const _spriteOffC = document.createElement('canvas');
const _spriteOffX = _spriteOffC.getContext('2d');
function loadSprites(){
  SPRITE_IDS.forEach(id=>{
    const img = new Image();
    img.src = 'img/'+id+'.png?v=' + Date.now();
    SPRITES[id] = img;
  });
}
loadSprites();

let gameMode='2p',cpuDiff='easy';
function setMode(m){
  gameMode=m;
  const btn2p = document.getElementById('btn2p');
  const btn1p = document.getElementById('btn1p');
  if(btn2p) btn2p.classList.toggle('active',m==='2p');
  if(btn1p) btn1p.classList.toggle('active',m==='1p');
  
  const dSec = document.getElementById('diff-section');
  if(dSec) dSec.style.display=m==='1p'?'flex':'none';
  
  if(typeof window.updateSelUI === 'function') {
    window.wsSelectingPlayer=1; 
    window.updateSelUI();
  }
}
window.selectModeAndContinue = function(m) {
  setMode(m);
  document.getElementById('mode-selection').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  
  // Start the background loop for the selection screen if it was paused
  if(!gameRunning) {
    cancelAnimationFrame(wsPreviewTimer);
    drawPreviewStage();
  }
};
function setDiff(d){
  cpuDiff=d;
  ['Easy','Medium','Hard','Boss'].forEach(x=>document.getElementById('d'+x).classList.toggle('active',x.toLowerCase()===d));
}

let gameRunning=false,roundTime=99,roundNum=1,lastRoundTick=0,roundOver=false,matchOver=false;
const P1C='#c8102e',P2C='#1a5fc8',FLOORY=355,GRAV=0.6,MAX_ROUNDS=3;

// Global VFX state
let activeVFX = [];
let slowMoTimer = 0;
let screenFlash = {alpha:0, color:'#fff'};

function addVFX(type, data) { activeVFX.push({type, ...data, life:data.life||30, maxLife:data.life||30}); }
function triggerScreenFlash(color='#fff', alpha=0.7){ screenFlash={alpha,color}; }
function triggerSlowMo(frames=30){ slowMoTimer=frames; }

const annEl=document.getElementById('announce');
let annT=null;
function announce(msg,dur=1500){annEl.innerHTML=msg;annEl.classList.add('show');if(annT)clearTimeout(annT);annT=setTimeout(()=>annEl.classList.remove('show'),dur);}

// Move-name banner (like "BLOCK BREAKER!")
const moveBanEl=document.getElementById('move-banner');
let moveBanT=null;
function showMoveBanner(text,dur=1400){
  moveBanEl.textContent=text;
  moveBanEl.classList.add('show');
  if(moveBanT)clearTimeout(moveBanT);
  moveBanT=setTimeout(()=>moveBanEl.classList.remove('show'),dur);
}

// ======== CPU AI ========
class CPU{
  constructor(diff){
    this.diff=diff;
    this.timer=0;this.action=null;this.retreating=false;this.retreatTimer=0;this.lastHp=100;
    const C={
      easy:  {rt:[45,90],agg:0.32,blk:0.12,pull:0.04,sup:0.35,miss:0.45},
      medium:{rt:[18,45],agg:0.55,blk:0.32,pull:0.10,sup:0.68,miss:0.18},
      hard:  {rt:[6,18], agg:0.78,blk:0.52,pull:0.16,sup:0.88,miss:0.05},
      boss:  {rt:[2,6],  agg:0.95,blk:0.72,pull:0.22,sup:1.00,miss:0.00},
    };
    this.c=C[diff]||C.easy;
  }
  think(me,enemy){
    if(!me.isAlive()||roundOver)return{};
    const c=this.c,dist=Math.abs(me.x-enemy.x);
    if(this.timer>0){this.timer--;} else {
      const[rMin,rMax]=c.rt;this.timer=rMin+Math.floor(Math.random()*(rMax-rMin));
      // React to getting hit
      if(me.hp<this.lastHp-8&&Math.random()<0.42){this.retreating=true;this.retreatTimer=18+Math.floor(Math.random()*18);this.action='retreat';}
      else if(enemy.isAttacking()&&dist<115&&Math.random()<c.blk){
        const r=Math.random();this.action=r<0.4?'block':r<0.6?'pull':r<0.8?'slip':'duck';
      }
      else if(dist<110&&Math.random()<c.agg){
        if(me.superCharge>=100&&Math.random()<c.sup)this.action='super';
        else if(enemy.blocking && Math.random()<0.4)this.action='overhand';
        else if(enemy.stamina > 40 && Math.random()<0.35)this.action='body';
        else if(dist<65 && Math.random()<0.4)this.action='upcut';
        else if(dist>80 && Math.random()<0.25)this.action='dash';
        else if(Math.random()<0.2)this.action='hook';
        else if(me.stamina>30&&Math.random()<0.55)this.action='cross';
        else if(me.stamina>10)this.action='jab';
        else this.action='idle';
      } else if(dist>=110){
        if(this.retreating&&this.retreatTimer>0){this.retreatTimer--;this.action='retreat';}
        else{this.retreating=false;this.action=dist>200?'approach_fast':'approach';}
      }
      if(Math.random()<c.pull&&me.onGround&&enemy.isAttacking()){this.action='pull';}
      if(Math.random()<c.miss&&(this.action==='jab'||this.action==='cross'))this.action='idle';
      this.lastHp=me.hp;
    }
    const a=this.action;
    const goRight=me.x<enemy.x;
    return {
      left:  a==='retreat'? goRight : (a==='approach'||a==='approach_fast')? !goRight : false,
      right: a==='retreat'? !goRight : (a==='approach'||a==='approach_fast')? goRight : false,
      pull:  a==='pull',
      slip:  a==='slip',
      duck:  a==='duck',
      block: a==='block',
      jab:   a==='jab',
      cross: a==='cross',
      super: a==='super',
      overhand: a==='overhand',
      upcut:  a==='upcut',
      body:   a==='body',
      dash:   a==='dash',
      hook:   a==='hook',
      kick:   a==='kick',
    };
  }
}

// ======== FIGHTER ========
class Fighter{
  constructor(x,facing,trunkColor,gloveColor,beltColor,skinColor,name,controls,beard=false,rosterId=null,spriteH=185){
    this.spriteH = spriteH; // per-character display height
    this.x=x;this.y=FLOORY;this.vy=0;this.onGround=true;
    this.facing=facing;this.trunkColor=trunkColor;this.gloveColor=gloveColor;this.beltColor=beltColor;this.skinColor=skinColor;this.name=name;this.controls=controls;
    this.beard=beard; this.rosterId=rosterId;
    this.hp=100;this.maxHp=100;this.stamina=100;this.roundsWon=0;
    this.state='idle';this.stateTimer=0;this.blocking=false;
    this.hitCooldown=0;this.superCharge=0;
    this.particles=[];this.comboCount=0;this.comboTimer=0;
    this.flashTimer=0;this.knockbackVx=0;this.cpu=null;
    // Animation pose interpolation state
    this.curPose = {...POSE_DEFAULT};
    this.prevState = 'idle';
    this.motionTrail = [];
    // Multi-phase animation state
    this.animKey = null;
    this.animPhase = 0;
    this.animPhaseTimer = 0;
  }
  // Start a multi-phase keyframe animation for an attack
  startPhaseAnim(key) {
    const phases = ANIM_PHASES[key];
    if(!phases || !phases.length) return;
    this.animKey = key;
    this.animPhase = 0;
    this.animPhaseTimer = phases[0].dur;
  }
  // Advance phase timer; call once per game-tick in update()
  tickPhaseAnim() {
    if(!this.animKey) return;
    if(this.animPhaseTimer > 0) { this.animPhaseTimer--; return; }
    this.animPhase++;
    const phases = ANIM_PHASES[this.animKey];
    if(!phases || this.animPhase >= phases.length) {
      this.animKey = null; this.animPhase = 0; return;
    }
    this.animPhaseTimer = phases[this.animPhase].dur;
  }
  // Returns current phase pose target + lerp speed, or null if not active
  getPhaseData() {
    if(!this.animKey) return null;
    const phases = ANIM_PHASES[this.animKey];
    if(!phases) return null;
    const ph = phases[Math.min(this.animPhase, phases.length - 1)];
    return ph ? { pose: ph.p, sp: ph.sp } : null;
  }
  isAttacking(){return ['jab','cross','super','upcut','overhand','body','dash','hook','kick'].includes(this.state);}
  isAlive(){return this.hp>0;}
  punch(type,enemy){
    if(!this.isAlive()||roundOver||this.isAttacking()||this.state==='pull')return;
    const cost = type==='super'?30 : type==='dash'?35 : type==='hook'?28 : type==='kick'?22 : type==='overhand'?25 : type==='upcut'?20 : type==='body'?15 : type==='cross'?12 : 6;
    if(this.stamina<cost)return;
    this.stamina=Math.max(0,this.stamina-cost);
    this.state=type;
    // stateTimer updated to fit new longer phase durations
    this.stateTimer = type==='jab'?22 : type==='cross'?32 : type==='hook'?30 : type==='upcut'?28 : type==='overhand'?27 : type==='body'?18 : type==='super'?40 : type==='dash'?30 : type==='kick'?38 : 22;
    this.startPhaseAnim(type); // ── begin multi-phase keyframe animation ──
    const delay = type==='super'?200 : type==='dash'?80 : type==='kick'?210 : type==='hook'?180 : type==='overhand'?220 : type==='upcut'?160 : type==='body'?90 : type==='cross'?250 : 120;
    if(type==='dash'){ this.knockbackVx = this.facing * 8; }
    if(type==='combo'){
      this.knockbackVx = this.facing * 4.0; 
      setTimeout(()=>{if(this.state==='combo'){this.knockbackVx=this.facing*2.5;this.checkHit('combo_1',enemy);}}, 200);   // Light Punch
      setTimeout(()=>{if(this.state==='combo'){this.knockbackVx=this.facing*3.0;this.checkHit('combo_2',enemy);}}, 500);   // Medium Punch
      setTimeout(()=>{if(this.state==='combo'){this.knockbackVx=this.facing*4.0;this.checkHit('combo_3',enemy);}}, 850);   // Heavy Punch
      return;
    }
    setTimeout(()=>this.checkHit(type,enemy),delay);
  }
  checkHit(type,enemy){
    if(!enemy.isAlive()||roundOver)return;
    const dist=Math.abs(this.x-enemy.x);
    const isCb = type.startsWith('combo_');
    const reach = isCb?130 : type==='super'?140 : type==='dash'?130 : type==='kick'?155 : type==='hook'?105 : type==='overhand'?110 : type==='upcut'?80 : type==='body'?85 : type==='cross'?100 : 80;
    if(dist<reach&&enemy.hitCooldown<=0){
      if(enemy.state==='pull' && type!=='body' && type!=='upcut' && type!=='dash') return;
      if(enemy.state==='slip' && (type==='jab' || type==='cross')) return;
      if(enemy.state==='duck' && (type==='jab' || type==='cross' || type==='overhand' || type==='super' || type==='kick')) return;
      
      let dmg = isCb?(type==='combo_3'?22:8) : type==='super'?22 : type==='dash'?28 : type==='kick'?26 : type==='hook'?20 : type==='overhand'?18 : type==='upcut'?12 : type==='cross'?10 : type==='body'?4 : 6;
      let kb  = isCb?(type==='combo_3'?14:3) : type==='super'?8  : type==='dash'?12 : type==='kick'?14 : type==='hook'?9  : type==='overhand'?5  : type==='upcut'?3  : type==='cross'?3  : type==='body'?2 : 2;
      
      if(enemy.blocking && type!=='overhand'){
        enemy.hp=Math.max(0,enemy.hp-(type==='super'?5:2));
        this.spawnPfx(enemy.x,enemy.y-50,'#aaa',4);
      } else {
        if(enemy.blocking && type==='overhand'){ enemy.blocking=false; dmg=10; kb=6; }
        if(enemy.state==='duck' && type==='upcut') dmg = Math.floor(dmg * 1.5);
        
        enemy.hp=Math.max(0,enemy.hp-dmg);
        enemy.hitCooldown = isCb ? (type==='combo_3'?18:6) : 18;
        enemy.flashTimer = isCb ? (type==='combo_3'?14:4) : 12;
        enemy.knockbackVx=(enemy.x>this.x?1:-1)*kb;
        enemy.state='hurt';enemy.stateTimer= isCb ? 12 : 14;
        
        if(type==='body') { enemy.stamina=Math.max(0, enemy.stamina-30); showMoveBanner('BODY SHOT!'); }
        if(type==='upcut'){ enemy.vy=-6; enemy.onGround=false; showMoveBanner('UPPERCUT!'); }
        if(type==='overhand'&&enemy.blocking){ showMoveBanner('GUARD BREAK!'); }
        else if(type==='overhand'){ showMoveBanner('OVERHAND!'); }
        if(type==='dash'){ 
          enemy.vy=-4; enemy.onGround=false;
          triggerScreenFlash('#fff',0.5); triggerSlowMo(18);
          addVFX('lightning',{x1:this.x,y1:this.y-50,x2:enemy.x,y2:enemy.y-50,life:18});
          showMoveBanner('DASH STRIKE!');
        }
        if(type==='hook'){ 
          enemy.vy=-3;
          triggerScreenFlash('#ff6600',0.4);
          addVFX('sparks',{x:enemy.x,y:enemy.y-60,life:20});
          showMoveBanner('SPINNING HOOK!');
        }
        if(type==='super'){
          triggerScreenFlash('#ffcc00',0.7); triggerSlowMo(25);
          addVFX('lightning',{x1:this.x,y1:this.y-60,x2:enemy.x,y2:enemy.y-60,life:25});
          addVFX('sparks',{x:enemy.x,y:enemy.y-60,life:30});
          showMoveBanner('⚡ SUPER PUNCH!');
        }
        if(isCb && type !== 'combo_3'){
          addVFX('sparks',{x:enemy.x,y:enemy.y-50,life:15});
        }
        if(type==='combo_3'){
          enemy.vy=-3; enemy.onGround=false;
          triggerScreenFlash('#ff3300',0.5); triggerSlowMo(15);
          addVFX('sparks',{x:enemy.x,y:enemy.y-50,life:45});
          showMoveBanner('POWER COMBO!');
        }
        
        if(type==='kick'){
          enemy.vy=-5; enemy.onGround=false;
          triggerScreenFlash('#ff0033',0.4); triggerSlowMo(20);
          addVFX('sparks',{x:enemy.x,y:enemy.y-50,life:35});
          showMoveBanner('HIGH KICK!');
        }
        
        this.superCharge=Math.min(100,this.superCharge+18);
        this.comboCount++;this.comboTimer=90;
        this.spawnPfx(enemy.x,enemy.y-50,type==='super'?'#ffcc00':type==='dash'?'#00ccff':isCb?'#ff3366':type==='hook'?'#ff9900':type==='kick'?'#ff00ff':this.gloveColor,type==='super'||type==='dash'||type==='combo_3'?16:6);
        if(enemy.hp<=0){enemy.state='ko';enemy.stateTimer=999;}
      }
    }
  }
  spawnPfx(px,py,color,n){
    const neonColors = ['#00ffff', '#ff00ff', '#ffffff', '#ffcc00', '#00ffcc', '#ff3366'];
    for(let i=0;i<n*2;i++) {
      const c = (this.state==='super'||this.state==='kick'||this.state==='hook') ? neonColors[Math.floor(Math.random()*neonColors.length)] : color;
      this.particles.push({
        x:px+(Math.random()-.5)*25, 
        y:py+(Math.random()-.5)*25, 
        vx:(Math.random()-.5)*12, 
        vy:(Math.random()-.8)*10, 
        life:25+Math.random()*25,
        maxLife:50, 
        color: c, 
        size:2+Math.random()*6
      });
    }
  }
  update(humanKeys,enemy){
    if(!this.isAlive())return;
    const c=this.controls;
    const cpuAct=this.cpu?this.cpu.think(this,enemy):null;
    const isLeft  = cpuAct ? cpuAct.left  : !!humanKeys[c.left];
    const isRight = cpuAct ? cpuAct.right : !!humanKeys[c.right];
    const isUp    = cpuAct ? cpuAct.up    : !!humanKeys[c.up];
    const isPull  = cpuAct ? cpuAct.pull  : !!humanKeys[c.pull];
    const isSlip  = cpuAct ? cpuAct.slip  : !!humanKeys[c.slip];
    const isDuck  = cpuAct ? cpuAct.duck  : !!humanKeys[c.duck];
    const isBlock = cpuAct ? cpuAct.block : !!humanKeys[c.block];
    const isJab   = cpuAct ? cpuAct.jab   : !!humanKeys[c.jab];
    const isCross = cpuAct ? cpuAct.cross : !!humanKeys[c.cross];
    const isSuper = cpuAct ? cpuAct.super : !!humanKeys[c.super];
    const isUpcut = cpuAct ? cpuAct.upcut : !!humanKeys[c.upcut];
    const isOver  = cpuAct ? cpuAct.overhand : !!humanKeys[c.overhand];
    const isBody  = cpuAct ? cpuAct.body  : !!humanKeys[c.body];
    const isDash  = cpuAct ? cpuAct.dash  : !!humanKeys[c.dash];
    const isHook  = cpuAct ? cpuAct.hook  : !!humanKeys[c.hook];
    const isKick  = cpuAct ? cpuAct.kick  : !!humanKeys[c.kick];
    this.facing=this.x<enemy.x?1:-1;
    if(this.knockbackVx!==0){this.x+=this.knockbackVx;this.knockbackVx*=0.7;if(Math.abs(this.knockbackVx)<0.2)this.knockbackVx=0;}
    if(this.stateTimer>0)this.stateTimer--;else if(this.state!=='ko')this.state='idle';
    this.tickPhaseAnim(); // ── advance multi-phase animation ──
    if(this.hitCooldown>0)this.hitCooldown--;
    if(this.flashTimer>0)this.flashTimer--;
    if(this.comboTimer>0)this.comboTimer--;else this.comboCount=0;
    if(!this.isAttacking())this.stamina=Math.min(100,this.stamina+0.25);
    const canAct=this.state==='idle'||this.state==='walk';
    if(canAct && !roundOver && !matchOver){
      let mv=false;
      if(isLeft){this.x-=3;this.state='walk';mv=true;}
      if(isRight){this.x+=3;this.state='walk';mv=true;}
      if(!mv&&this.state==='walk')this.state='idle';
      
      if(isUp&&this.onGround){this.vy=-14;this.onGround=false;this.state='jump';this.stateTimer=40;}
      else if(isPull&&this.onGround&&!mv){this.state='pull';this.stateTimer=20;this.knockbackVx=(this.facing===-1?1:-1)*2;}
      else if(isSlip&&this.onGround&&!mv){this.state='slip';this.stateTimer=14;}
      else if(isDuck&&this.onGround&&!mv){this.state='duck';this.stateTimer=22;}
      
      this.blocking=isBlock;
      if(isJab)this.punch('jab',enemy);
      if(isCross)this.punch('cross',enemy);
      if(isUpcut)this.punch('upcut',enemy);
      if(isOver)this.punch('overhand',enemy);
      if(isBody)this.punch('body',enemy);
      if(isDash)this.punch('dash',enemy);
      if(isHook)this.punch('hook',enemy);
      if(isKick)this.punch('kick',enemy);
      if(isSuper&&this.superCharge>=100){this.superCharge=0;this.punch('super',enemy);announce('&#9889; SUPER PUNCH!',900);}
    }
    this.vy+=GRAV;this.y+=this.vy;
    if(this.y>=FLOORY){this.y=FLOORY;this.vy=0;this.onGround=true;if(this.state==='jump')this.state='idle';}
    this.x=Math.max(60,Math.min(CANVAS_W-60,this.x));
    this.particles=this.particles.filter(p=>p.life>0);
    this.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.life--;});
  }
  draw(ctx){
    // Particles
    this.particles.forEach(p=>{ctx.save();ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.restore();});

    const flash=this.flashTimer>0&&Math.floor(this.flashTimer/3)%2===0;

    // ── Ground shadow ──
    ctx.save();ctx.translate(this.x,this.y);
    const shadowW = this.state==='duck'?30:25;
    ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.ellipse(0,4,shadowW,8,0,0,Math.PI*2);ctx.fill();
    ctx.restore();

    // ── Animated sprite rendering ──
    // Sprites used for: selection screen, HUD portraits, VS intro.
    // During GAMEPLAY we always use canvas-drawn boxer for full articulated animation.
    // Pose lerp still runs here so curPose stays updated.
    let state=this.state;
    if(state==='combo'){
       if(this.stateTimer>46)state='jab';
       else if(this.stateTimer>38)state='block';
       else if(this.stateTimer>26)state='cross';
       else if(this.stateTimer>18)state='block';
       else state='overhand';
    }
    const isKO=this.state==='ko', isHurt=this.state==='hurt';

    // Pose interpolation
    const poseKey=(this.blocking&&state==='idle')?'block':state;
    const phaseData=this.getPhaseData();
    const isAttack=this.isAttacking()||this.state==='combo';
    let tgtPose, lerpSpeed;
    if(phaseData){
      const base=POSE_DEFS[poseKey]||POSE_DEFAULT;
      tgtPose={...base,...phaseData.pose}; lerpSpeed=phaseData.sp;
    } else {
      tgtPose=POSE_DEFS[poseKey]||POSE_DEFAULT;
      lerpSpeed=isAttack?0.32:(isHurt?0.22:0.12);
    }
    this.curPose=lerpPose(this.curPose,tgtPose,lerpSpeed);
    const p=this.curPose;
    const breathBob=p.bob*Math.sin(Date.now()/180)*2.5;

    // Motion trail (dash/super/hook)
    if(state==='dash'||state==='super'||state==='hook'){
      this.motionTrail.push({x:this.x,y:this.y,lean:p.upperLean,lunge:p.lungeX,alpha:0.35,life:6});
    }
    for(let ti=this.motionTrail.length-1;ti>=0;ti--){
      const t=this.motionTrail[ti];
      t.life--;t.alpha*=0.75;
      if(t.life<=0){this.motionTrail.splice(ti,1);continue;}
      const ghost={...this,curPose:{...this.curPose,upperLean:t.lean,lungeX:t.lunge},state};
      ctx.save();ctx.globalAlpha=t.alpha*0.35;
      ctx.translate(t.x,t.y+breathBob);
      if(this.facing===-1)ctx.scale(-1,1);
      ctx.scale(1.0,1.0); 
      drawBoxer(ctx,ghost);
      ctx.restore();
    }

    // ══ PRIMARY: canvas-animated articulated boxer ══
    ctx.save();
    ctx.translate(this.x,this.y+breathBob);
    if(this.facing===-1)ctx.scale(-1,1);
    if(flash)ctx.globalAlpha=0.35;
    ctx.scale(1.0,1.0);  // scaled to match original pixel art size
    const isDuck2=this.state==='duck';
    if(isDuck2){ctx.save();ctx.translate(0,16);ctx.scale(1,0.85);}
    const origS=this.state; this.state=state;
    drawBoxer(ctx,this);
    this.state=origS;
    if(isDuck2)ctx.restore();
    // Super charge ring
    if(this.superCharge>=100){ctx.save();ctx.globalAlpha=0.3+0.15*Math.sin(Date.now()/120);ctx.strokeStyle='#ffcc00';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-40,42,0,Math.PI*2);ctx.stroke();ctx.restore();}
    // CPU label
    if(this.cpu){ctx.save();ctx.globalAlpha=0.7;ctx.fillStyle='#ffcc00';ctx.font='700 10px "Barlow Condensed"';ctx.textAlign='center';ctx.fillText('CPU',0,-100);ctx.restore();}
    // Attack aura
    if(isAttack&&!isKO&&(state==='super'||state==='dash')){
      ctx.save();ctx.globalAlpha=0.5;
      const aura=state==='dash'?'#00ccff':'#ffcc00';
      ctx.fillStyle=aura;ctx.shadowColor=aura;ctx.shadowBlur=35;
      ctx.beginPath();ctx.arc((p.lungeX||0)+30,-80,28,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    if(this.comboCount>=2&&this.comboTimer>0){ctx.save();ctx.font='bold 14px "Barlow Condensed"';ctx.fillStyle='#ffcc00';ctx.textAlign='center';ctx.fillText(this.comboCount+'x COMBO!',this.x,this.y-175);ctx.restore();}
  }
}


// Selection screen fighter preview — simple boxer drawing
function drawSelectionFighter(ctx, f) {
  const origX = f.x; f.x = 0;
  drawBoxer(ctx, f);
  f.x = origX;
}

function drawBoxer(ctx, f) {
  const state = f.state;
  const pp = f.curPose || {};
  const pAnimLean   = pp.upperLean  ?? 0;
  const pAnimY      = pp.upperY     ?? 0;
  const pAnimLungeX = pp.lungeX     ?? 0;
  const pAnimSquash = pp.squash     ?? 1;
  // New real-fighter params
  const pShoulderTwist = pp.shoulderTwist ?? 0;  // shoulder rotation degrees
  const pHeadTilt      = pp.headTilt      ?? 0;  // head lean toward/away from punch
  const pLowerSpread   = pp.lowerSpread   ?? 0;  // leg stance width offset
  const pHipX          = pp.hipX          ?? 0;  // hip lateral shift (weight transfer)
  const pBackElbow     = pp.backElbow     ?? 55; // guard hand elbow angle
  const pRearFootLift  = pp.rearFootLift  ?? 0;  // rear heel lift for foot pivot
  const pGuardY        = pp.guardY        ?? 0;  // guard hand vertical offset

  const isDuck2   = state === 'duck';
  const hurt      = state === 'hurt';
  const isPull    = state === 'pull';
  const isSlip    = state === 'slip';
  const isDash    = state === 'dash';

  let bodyLean = hurt ? 14 : isPull ? -18 : isSlip ? 12 : isDash ? -15 : 0;
  bodyLean += pAnimLean;  
  let bodyY = isDuck2 ? 16 : 0;
  bodyY += pAnimY;        

  // ── RENDER HIGH-FIDELITY PIXEL ART SPRITES IF AVAILABLE ──
  const img = SPRITES[f.rosterId];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    
    // Check if it's a multi-frame sprite sheet (e.g. 6 frame strip)
    const isSheet = img.naturalWidth > img.naturalHeight * 1.5;
    let sx = 0, sy = 0, sW = img.naturalWidth, sH = img.naturalHeight;
    
    if (isSheet) {
      // Divide by 6 frames horizontally to match the processed sheet
      const cols = 6;
      sW = img.naturalWidth / cols;
      let frameIdx = 1; // Default to Idle / Walking pose
      
      if (state === 'jab' || state === 'cross' || state === 'upcut' || state === 'super') frameIdx = 0; // Extending Punch
      else if (state === 'block') frameIdx = 2; // Guard up
      else if (state === 'dash' || state === 'hook' || state === 'overhand' || state === 'kick') frameIdx = 3; // Lunge action
      else if (state === 'duck') frameIdx = 4; // Crouch stance
      else if (state === 'hurt' || state === 'ko') frameIdx = 5; // Hit reaction
      
      sx = frameIdx * sW;
    }

    // Core animation physics (Translating rigid sprite with squash/stretch!)
    ctx.translate(pAnimLungeX, bodyY);
    ctx.rotate(bodyLean * Math.PI / 180);
    // Mild procedural squash alongside frame data
    ctx.scale(1, isSheet ? 1.0 + (pAnimSquash-1.0)*0.5 : pAnimSquash);

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(-pAnimLungeX, 4, 30, 8, 0, 0, Math.PI*2); ctx.fill();

    // Sprite drawing (origin is bottom-center, matching Fighter coordinate system)
    const aspect = sW / sH;
    const drawH = f.spriteH || 185; 
    const drawW = aspect * drawH;
    
    // Draw the cropped frame!
    ctx.drawImage(img, sx, sy, sW, sH, -drawW/2, -drawH, drawW, drawH);

    // Attack Auras
    if (state === 'super' || state === 'dash') {
      ctx.save(); ctx.globalAlpha = 0.5;
      const aura = state === 'dash' ? '#00ccff' : '#ffcc00';
      ctx.fillStyle = aura; ctx.shadowColor = aura; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(0, -drawH/2, 40, 0, Math.PI*2); ctx.fill();
      if (state === 'dash') {
        ctx.strokeStyle='rgba(0,220,255,0.7)'; ctx.lineWidth=2.5; ctx.shadowBlur=10;
        for(let li=0;li<6;li++){
          ctx.beginPath(); ctx.moveTo(-20,-20-li*14); ctx.lineTo(-62,-20-li*14); ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  // ── FALLBACK: PROCEDURAL CANVAS DRAWING ──
  const skin  = f.skinColor;
  const trunk = f.trunkColor;
  const glove = f.gloveColor;
  const isSuper   = state === 'super';
  const isHook    = state === 'hook';
  const isUpcut   = state === 'upcut';
  const isOver    = state === 'overhand';
  const isBody    = state === 'body';
  const isJab     = state === 'jab';
  const isCross   = state === 'cross';
  const blocking  = f.blocking || state === 'block';
  const jumping   = !f.onGround;

  // ── ELBOW-BASED ARM POSITIONING (driven by ANIM_PHASES frontElbow) ──
  // frontElbow: 0° = full extension (jab/cross peak), 90° = hook, 48° = guard
  const elbowAngle = (f.curPose && f.curPose.frontElbow !== undefined) ? f.curPose.frontElbow : 48;

  // Shoulder anchor
  const sX = 16, sY = -74;
  // Reach: shortens as elbow bends  (cosine mapping)
  const maxReach = 58;
  const bendFactor = Math.max(0, Math.cos(elbowAngle * Math.PI / 180));
  const reach = maxReach * (0.38 + 0.62 * bendFactor);
  // Arm direction (forward angle from straight-down, depends on move type)
  let armDirDeg;
  if (isJab || isCross || isSuper)    armDirDeg = 82;
  else if (isDash)                    armDirDeg = 80;
  else if (isHook)                    armDirDeg = 30;
  else if (isUpcut)                   armDirDeg = -14;
  else if (isOver)                    armDirDeg = 66;
  else if (isBody)                    armDirDeg = 54;
  else if (blocking)                  armDirDeg = -18;
  else                                armDirDeg = 50;

  const aRad = (armDirDeg - 90) * Math.PI / 180;
  const pGx = sX + Math.cos(aRad) * reach;
  const pGy = sY + Math.sin(aRad) * reach;
  const pGr = (isSuper || isDash) ? 20 : 17;

  // Elbow joint (midpoint bent perpendicular to arm axis by sin of angle)
  const mX = (sX + pGx) * 0.5, mY = (sY + pGy) * 0.5;
  const perpBend = Math.sin(elbowAngle * Math.PI / 180) * 18;
  const dX = pGx - sX, dY = pGy - sY;
  const dLen = Math.sqrt(dX*dX + dY*dY) || 1;
  const hookMul = isHook ? -1 : 1;  // hook elbow pops backward
  const elbX = mX + (-dY / dLen) * perpBend * hookMul;
  const elbY = mY + ( dX / dLen) * perpBend * hookMul;

  // Guard / back glove — now driven by pose data for fluid animation
  const guardBend = Math.max(0, Math.cos(pBackElbow * Math.PI / 180));
  let gGx = -20 - guardBend * 8, gGy = -86 + pGuardY, gGr = 15;
  if (blocking)  { gGx = -16; gGy = -100 + pGuardY; gGr = 16; }
  if (hurt)      { gGx = -14; gGy = -70 + pGuardY; }
  if (isHook)    { gGx = -28 - guardBend * 4; gGy = -76 + pGuardY; }
  if (isUpcut)   { gGx = -22; gGy = -80 + pGuardY; }

  ctx.save();
  ctx.translate(pAnimLungeX, bodyY);   // << LUNGE — cross lunges 30px, jab 28px forward!

  // ── GROUND SHADOW ──
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 4, 28, 8, 0, 0, Math.PI*2); ctx.fill();

  ctx.save();
  ctx.rotate(bodyLean * Math.PI / 180);
  ctx.scale(1, pAnimSquash);            // << SQUASH/STRETCH — uppercut dip=0.74, explode=1.18!


  // ══════════════════════════════════
  // BOOTS / LEGS  (real footwork: stance width + weight shift + foot pivot)
  // ══════════════════════════════════
  function drawLeg(side) {
    // side: -1 = back leg (rear), +1 = front leg (lead)
    const baseStance = isDuck2 ? 16 : jumping ? 12 : 10;
    const stanceW = baseStance + pLowerSpread * 0.5;  // wider during power punches
    const hipShift = pHipX * 0.3 * side;  // weight transfer shifts legs
    const kx = side * stanceW + hipShift;
    const ky = isDuck2 ? -14 : jumping ? -16 : -10;
    const ankleX = side * (stanceW - 2) + hipShift;
    let ankleY = isDuck2 ? 8 : jumping ? 10 : 4;
    // Rear foot lift (heel pivot during cross/hooks) — only back leg
    const heelLift = (side === -1) ? pRearFootLift : 0;
    ankleY -= heelLift * 0.4;

    // Thigh (shorts color)
    ctx.fillStyle = trunk;
    ctx.beginPath();
    ctx.moveTo(side * -12 + hipShift, -18);
    ctx.quadraticCurveTo(kx, ky, ankleX - side*8, ankleY);
    ctx.quadraticCurveTo(kx + side*4, ky+8, side * 12 + hipShift, -18);
    ctx.closePath(); ctx.fill();

    // Shin (skin)
    const skinG = ctx.createLinearGradient(ankleX-8, ankleY, ankleX+8, ankleY+34);
    skinG.addColorStop(0, shadeColor(skin,12)); skinG.addColorStop(1, shadeColor(skin,-10));
    ctx.fillStyle = skinG;
    ctx.beginPath();
    ctx.moveTo(ankleX-8, ankleY);
    ctx.quadraticCurveTo(ankleX+side*3, ankleY+16, ankleX-4, ankleY+34 - heelLift*0.3);
    ctx.quadraticCurveTo(ankleX+side*6, ankleY+18, ankleX+9, ankleY);
    ctx.closePath(); ctx.fill();

    // Boot (tall boxing boot)
    const bx = ankleX + side*1;
    const by = ankleY + 30 - heelLift*0.3;
    const bootTilt = (side === -1) ? pRearFootLift * 0.02 : 0;  // rear boot tilts when pivoting
    ctx.save();
    if(bootTilt) { ctx.translate(bx, by+6); ctx.rotate(bootTilt); ctx.translate(-bx, -(by+6)); }
    // Boot shaft
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.roundRect(bx-9, by-14, 18, 20, 3); ctx.fill();
    // Boot white top cuff
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(bx-9, by-14, 18, 5);
    // Boot sole
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.ellipse(bx+side*1, by+6, 11, 5, 0.1*side, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ddd';
    ctx.beginPath(); ctx.ellipse(bx+side*1, by+7, 10, 2, 0.1*side, 0, Math.PI*2); ctx.fill();
    // Boot lace dots
    ctx.fillStyle = '#555';
    for(let li=0;li<3;li++){
      ctx.beginPath(); ctx.arc(bx-3, by-11+li*4, 1.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx+3, by-11+li*4, 1.2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  // Back leg first, front leg on top
  drawLeg(-1); drawLeg(1);

  // ══════════════════════════════════
  // SHORTS (wide, pro boxer style)
  // ══════════════════════════════════
  const sg = ctx.createLinearGradient(-22, -20, 0, 14);
  sg.addColorStop(0, shadeColor(trunk,15));
  sg.addColorStop(0.6, trunk);
  sg.addColorStop(1, shadeColor(trunk,-30));
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(-22, -22);
  ctx.lineTo(22, -22);
  ctx.lineTo(20, 14);
  ctx.lineTo(3, 14);
  ctx.lineTo(0, 6);
  ctx.lineTo(-3, 14);
  ctx.lineTo(-20, 14);
  ctx.closePath(); ctx.fill();
  // Side stripes
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.beginPath();
  ctx.moveTo(13,-20); ctx.lineTo(20,-20); ctx.lineTo(18,14); ctx.lineTo(11,14); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-13,-20); ctx.lineTo(-20,-20); ctx.lineTo(-18,14); ctx.lineTo(-11,14); ctx.closePath(); ctx.fill();
  // Waistband
  const wb = ctx.createLinearGradient(-22,-26,22,-18);
  wb.addColorStop(0, shadeColor(trunk,25)); wb.addColorStop(1, trunk);
  ctx.fillStyle = wb;
  ctx.beginPath(); ctx.roundRect(-22,-28,44,9,3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(-22,-28,44,3);

  // ══════════════════════════════════
  // TORSO (muscular, wide-shoulder cartoon + shoulder twist)
  // ══════════════════════════════════
  // Shoulder twist: simulate 3D rotation by scaling torso width
  const twistScale = 1 - Math.abs(pShoulderTwist) * 0.004; // subtle narrowing when twisted
  const twistShift = pShoulderTwist * 0.15; // lateral shift for rotation feel
  ctx.save();
  ctx.translate(twistShift, 0);
  ctx.scale(twistScale, 1);
  const tg = ctx.createLinearGradient(-26,-80, 26,-20);
  tg.addColorStop(0, shadeColor(skin,25));
  tg.addColorStop(0.5, skin);
  tg.addColorStop(1, shadeColor(skin,-25));
  ctx.fillStyle = tg;
  
  // V-taper body shape
  ctx.beginPath();
  ctx.moveTo(-18,-20); // waist left
  ctx.quadraticCurveTo(-22,-45, -30,-72); // lat left
  ctx.quadraticCurveTo(-32,-85, -16,-82); // shoulder left
  ctx.lineTo(16,-82); // collarbone
  ctx.quadraticCurveTo(32,-85, 30,-72); // shoulder right
  ctx.quadraticCurveTo(22,-45, 18,-20); // waist right
  ctx.closePath(); ctx.fill();
  
  // Collarbones
  ctx.strokeStyle = shadeColor(skin,-30); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18,-80); ctx.lineTo(-4,-76); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 18,-80); ctx.lineTo( 4,-76); ctx.stroke();
  ctx.restore();

  // Pecs (square/muscular)
  ctx.fillStyle = shadeColor(skin,-15);
  ctx.beginPath(); 
  ctx.moveTo(-2,-74); ctx.lineTo(-14,-74); ctx.quadraticCurveTo(-22,-70,-22,-60); ctx.quadraticCurveTo(-14,-56,-2,-58); ctx.closePath(); ctx.fill();
  ctx.beginPath(); 
  ctx.moveTo( 2,-74); ctx.lineTo( 14,-74); ctx.quadraticCurveTo( 22,-70, 22,-60); ctx.quadraticCurveTo( 14,-56, 2,-58); ctx.closePath(); ctx.fill();

  // Center abs line
  ctx.strokeStyle = shadeColor(skin,-35); ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(0,-58); ctx.lineTo(0,-24); ctx.stroke();
  
  // 6-pack Abs
  ctx.fillStyle = shadeColor(skin,-20);
  for(let ai=0;ai<3;ai++){
    ctx.beginPath(); ctx.roundRect(-10, -52+ai*10, 8, 7, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect( 2, -52+ai*10, 8, 7, 2); ctx.fill();
  }
  // Obliques
  ctx.fillStyle = shadeColor(skin,-25);
  ctx.beginPath(); ctx.moveTo(-18,-45); ctx.lineTo(-11,-35); ctx.lineTo(-16,-25); ctx.fill();
  ctx.beginPath(); ctx.moveTo( 18,-45); ctx.lineTo( 11,-35); ctx.lineTo( 16,-25); ctx.fill();

  // ══════════════════════════════════
  // BACK GLOVE (guard, left arm)
  // ══════════════════════════════════
  // Back arm
  ctx.fillStyle = shadeColor(skin,-10);
  ctx.beginPath();
  ctx.moveTo(-18,-74);
  ctx.quadraticCurveTo(gGx-8, gGy+20, gGx, gGy+gGr);
  ctx.quadraticCurveTo(gGx+10, gGy+20, -8,-74);
  ctx.closePath(); ctx.fill();
  // Back glove
  const ggr = ctx.createRadialGradient(gGx,gGy,2,gGx,gGy,gGr+5);
  ggr.addColorStop(0,shadeColor(glove,30)); ggr.addColorStop(1,shadeColor(glove,-20));
  ctx.fillStyle = ggr;
  ctx.beginPath(); ctx.ellipse(gGx,gGy,gGr,gGr-2,0,0,Math.PI*2); ctx.fill();
  // Back Glove wrist wrap
  ctx.fillStyle = '#f0e8d0';
  ctx.beginPath(); ctx.ellipse(gGx-2,gGy+gGr-2,gGr*0.7,5,0,0,Math.PI*2); ctx.fill();
  // Glove thumb
  ctx.fillStyle = shadeColor(glove,-25);
  ctx.beginPath(); ctx.ellipse(gGx-9,gGy-5,6,4,-0.5,0,Math.PI*2); ctx.fill();
  // Glove seam
  ctx.strokeStyle = shadeColor(glove,-35); ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(gGx,gGy,gGr*0.65,Math.PI*0.2,Math.PI*0.9); ctx.stroke();
  // Glove shine
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath(); ctx.ellipse(gGx+5,gGy-6,7,5,-0.3,0,Math.PI*2); ctx.fill();

  // ══════════════════════════════════
  // HEAD (Realistic, fierce fighter)
  // ══════════════════════════════════
  const headY = hurt ? -100 : isPull ? -108 : -106;
  // Head tilt: fighters tuck chin behind shoulder during punches
  const headShiftX = pHeadTilt * 0.12;  // lateral head movement
  const headShiftY = Math.abs(pHeadTilt) * 0.06; // slight dip when tilting
  ctx.save();
  ctx.translate(headShiftX, headShiftY);
  ctx.rotate(pHeadTilt * Math.PI / 180 * 0.3); // subtle head rotation
  
  // Neck (thicker, muscular)
  const neckG = ctx.createLinearGradient(-10,-85,10,-85);
  neckG.addColorStop(0,shadeColor(skin,-15)); neckG.addColorStop(0.5,skin); neckG.addColorStop(1,shadeColor(skin,-25));
  ctx.fillStyle = neckG;
  ctx.beginPath(); ctx.moveTo(-10, -82); ctx.lineTo(-11, -95); ctx.lineTo(11, -95); ctx.lineTo(10, -82); ctx.fill();
  // Trapezius muscles slope
  ctx.beginPath(); ctx.moveTo(-20,-82); ctx.quadraticCurveTo(-15,-92,-10,-95); ctx.lineTo(10,-95); ctx.quadraticCurveTo(15,-92,20,-82); ctx.fill();

  // Head base - jawline and cheekbones
  const hg = ctx.createRadialGradient(4, headY-4, 2, 0, headY, 22);
  hg.addColorStop(0, shadeColor(skin,15));
  hg.addColorStop(0.6, skin);
  hg.addColorStop(1, shadeColor(skin,-20));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(0, headY+14); // Chin
  ctx.quadraticCurveTo(14, headY+12, 16, headY); // Right Jaw
  ctx.quadraticCurveTo(17, headY-18, 10, headY-22); // Right Temple
  ctx.quadraticCurveTo(0, headY-26, -10, headY-22); // Top Head
  ctx.quadraticCurveTo(-17, headY-18, -16, headY); // Left Temple
  ctx.quadraticCurveTo(-14, headY+12, 0, headY+14); // Left Jaw
  ctx.closePath(); ctx.fill();

  // Ears
  ctx.fillStyle = shadeColor(skin,-15);
  ctx.beginPath(); ctx.ellipse(-16, headY-2, 4, 7, 0.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 16, headY-2, 4, 7, -0.1, 0, Math.PI*2); ctx.fill();

  // Eye sockets / Brow ridge (deep shadow for fierce look)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.moveTo(-14, headY-10); ctx.quadraticCurveTo(-6, headY-12, -2, headY-8); ctx.quadraticCurveTo(6, headY-12, 14, headY-10); ctx.quadraticCurveTo(10, headY-2, 2, headY-6); ctx.quadraticCurveTo(-10, headY-2, -14, headY-10); ctx.fill();

  // Hair / Bald shadowing
  if (!f.beard) { /* default to bald/buzzcut fade */
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.moveTo(-16, headY-6); ctx.quadraticCurveTo(0, headY-18, 16, headY-6); ctx.quadraticCurveTo(10, headY-22, 0, headY-26); ctx.quadraticCurveTo(-10, headY-22, -16, headY-6); ctx.fill();
  }

  // Eyebrows (angry V shape)
  ctx.strokeStyle = '#050505'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-12, headY-10); ctx.lineTo(-4, headY-7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 12, headY-10); ctx.lineTo( 4, headY-7); ctx.stroke();

  // Eyes (serious squint)
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-7, headY-6, 3.5, 1.5, 0.1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 7, headY-6, 3.5, 1.5, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#111'; // Iris
  ctx.beginPath(); ctx.arc(-7, headY-6, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 7, headY-6, 1.2, 0, Math.PI*2); ctx.fill();

  // Nose (strong boxing nose)
  ctx.fillStyle = shadeColor(skin,-15);
  ctx.beginPath(); ctx.moveTo(-3, headY-6); ctx.lineTo(3, headY-6); ctx.lineTo(4, headY+4); ctx.lineTo(-4, headY+4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shadeColor(skin,-35);
  ctx.beginPath(); ctx.arc(-3, headY+4, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 3, headY+4, 2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; // Nose bridge highlight
  ctx.fillRect(-1, headY-4, 2, 7);

  // Mouthpiece / Lips
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(0, headY+9, 5, 1.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ff3333'; // mouthpiece color
  ctx.beginPath(); ctx.ellipse(0, headY+9, 4, 1, 0, 0, Math.PI*2); ctx.fill();

  // Beard — short boxer stubble (not a big blob)
  if(f.beard){
    ctx.save();
    ctx.globalAlpha = 0.82;
    // Jawline stubble
    ctx.fillStyle = shadeColor(skin, -38);
    ctx.beginPath();
    // Bottom of face stubble area
    ctx.ellipse(0, headY+12, 14, 9, 0, 0, Math.PI*2); ctx.fill();
    // Chin
    ctx.beginPath(); ctx.ellipse(0, headY+18, 9, 5, 0, 0, Math.PI*2); ctx.fill();
    // Upper lip / mustache
    ctx.fillStyle = shadeColor(skin, -44);
    ctx.beginPath(); ctx.ellipse(-4, headY+6, 5, 2.5, 0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 4, headY+6, 5, 2.5, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Headband sweat
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, headY, 18, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
  ctx.restore(); // end headTilt transform

  // ══════════════════════════════════
  // FRONT ARM + PUNCH GLOVE  (elbow-articulated)
  // ══════════════════════════════════
  // Upper arm  (shoulder → elbow)
  const armG = ctx.createLinearGradient(sX, sY, elbX, elbY);
  armG.addColorStop(0, skin); armG.addColorStop(1, shadeColor(skin, -8));
  ctx.fillStyle = armG;
  ctx.beginPath();
  ctx.moveTo(sX - 7, sY + 2);
  ctx.quadraticCurveTo(elbX - 5, elbY, elbX - 3, elbY + 5);
  ctx.quadraticCurveTo(elbX + 6, elbY + 2, sX + 7, sY + 2);
  ctx.closePath(); ctx.fill();
  // Elbow cap
  ctx.fillStyle = shadeColor(skin, -14);
  ctx.beginPath(); ctx.ellipse(elbX, elbY, 5, 4, Math.atan2(dY,dX), 0, Math.PI*2); ctx.fill();
  // Forearm  (elbow → glove)
  const foreG = ctx.createLinearGradient(elbX, elbY, pGx, pGy);
  foreG.addColorStop(0, shadeColor(skin, -6)); foreG.addColorStop(1, shadeColor(skin, -14));
  ctx.fillStyle = foreG;
  ctx.beginPath();
  const fMx = (elbX + pGx) * 0.5, fMy = (elbY + pGy) * 0.5;
  ctx.moveTo(elbX - 5, elbY + 2);
  ctx.quadraticCurveTo(fMx - 4, fMy, pGx - 2, pGy + pGr - 2);
  ctx.quadraticCurveTo(fMx + 5, fMy, elbX + 5, elbY + 2);
  ctx.closePath(); ctx.fill();

  // Punch Glove
  const pgr2 = ctx.createRadialGradient(pGx,pGy,2,pGx,pGy,pGr+6);
  pgr2.addColorStop(0,shadeColor(glove,35)); pgr2.addColorStop(0.5,glove); pgr2.addColorStop(1,shadeColor(glove,-15));
  ctx.fillStyle = pgr2;
  ctx.beginPath(); ctx.ellipse(pGx,pGy,pGr,pGr-2,0,0,Math.PI*2); ctx.fill();
  // Glove wrist wrap
  ctx.fillStyle = '#f0e8d0';
  ctx.beginPath(); ctx.ellipse(pGx-2,pGy+pGr-2,pGr*0.7,5,0,0,Math.PI*2); ctx.fill();
  // Glove thumb
  ctx.fillStyle = shadeColor(glove,-22);
  ctx.beginPath(); ctx.ellipse(pGx-10,pGy-6,7,5,-0.5,0,Math.PI*2); ctx.fill();
  // Glove seam
  ctx.strokeStyle = shadeColor(glove,-30); ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(pGx,pGy,pGr*0.6,Math.PI*0.2,Math.PI*0.8); ctx.stroke();
  // Glove shine
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath(); ctx.ellipse(pGx+6,pGy-7,8,6,-0.3,0,Math.PI*2); ctx.fill();

  // ══════════════════════════════════
  // SPECIAL AURAS
  // ══════════════════════════════════
  if (isSuper || isDash) {
    ctx.save(); ctx.globalAlpha = 0.7;
    const aura = isDash ? '#00ccff' : '#ffcc00';
    ctx.fillStyle = aura; ctx.shadowColor = aura; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(pGx, pGy, pGr+10, 0, Math.PI*2); ctx.fill();
    if (isDash) {
      ctx.strokeStyle='rgba(0,220,255,0.7)'; ctx.lineWidth=2.5; ctx.shadowBlur=10;
      for(let li=0;li<6;li++){
        ctx.beginPath(); ctx.moveTo(-20,-20-li*14); ctx.lineTo(-62,-20-li*14); ctx.stroke();
      }
    }
    ctx.restore();
  }
  if (isHook) {
    ctx.save(); ctx.globalAlpha=0.5;
    ctx.strokeStyle='#ff9900'; ctx.lineWidth=3.5; ctx.shadowColor='#ff6600'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(0,-78,42,-Math.PI*0.4,Math.PI*0.7); ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // end bodyLean
  ctx.restore(); // end bodyY
}

function shadeColor(hex, amt) {
  let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.max(0,Math.min(255,r+amt)); g = Math.max(0,Math.min(255,g+amt)); b = Math.max(0,Math.min(255,b+amt));
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}


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

const keys={};
document.addEventListener('keydown',e=>{keys[e.key]=true;keys[e.code]=true;e.preventDefault();});
document.addEventListener('keyup',e=>{keys[e.key]=false;keys[e.code]=false;});

const P1CTL={left:'a',right:'d',up:'w',pull:'s',slip:'q',duck:'z',jab:'f',cross:'g',upcut:'t',overhand:'e',body:'c',block:'r',dash:'x',hook:'b',super:'v',kick:'h',combo:'y'};
const P2CTL={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',pull:'ArrowDown',slip:'p',duck:'m',jab:'k',cross:'l',upcut:'i',overhand:'u',body:',',block:'o',dash:'n',hook:'j',super:';',kick:'/',combo:'0'};

const tMap = {'t-left':'a', 't-right':'d', 't-up':'w', 't-jump':'w', 't-pull':'s', 't-slip':'q', 't-duck':'z', 't-block':'r', 't-super':'v', 't-jab':'f', 't-cross':'g', 't-upcut':'t', 't-over':'e', 't-body':'c', 't-kick':'h', 't-combo':'y'};
for(let id in tMap) {
  const el = document.getElementById(id);
  if(!el) continue;
  el.addEventListener('touchstart', e=>{ e.preventDefault(); keys[tMap[id]]=true; });
  el.addEventListener('touchend', e=>{ e.preventDefault(); keys[tMap[id]]=false; });
  el.addEventListener('touchcancel', e=>{ e.preventDefault(); keys[tMap[id]]=false; });
}
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  document.getElementById('mobile-controls').style.display = 'block';
}

// ======== ROSTER ========
const ROSTER = [
  { id:'barrera',  name:'BARRERA',     archetype:'Slugger',
    skin:'#d4956a', skinD:'#b87548', hair:'#1a1010', trunkC:'#111111', gloveC:'#cc1100',
    weight:4, height:3, flying:2, speed:3, recov:3, def:4, beard:true, sh:190 },
  { id:'jackson',  name:'JACKSON',     archetype:'Speedster',
    skin:'#5c3a1e', skinD:'#3d2510', hair:'#111111', trunkC:'#004400', gloveC:'#cc1100',
    weight:3, height:4, flying:4, speed:5, recov:3, def:3, sh:185 },
  { id:'santos',   name:'SANTOS',      archetype:'All-Rounder',
    skin:'#c8885a', skinD:'#a86840', hair:'#1a1010', trunkC:'#006600', gloveC:'#cc1100',
    weight:3, height:3, flying:3, speed:4, recov:4, def:3, sh:182 },
  { id:'titan',    name:'TITAN',       archetype:'Tank',
    skin:'#e0a060', skinD:'#c07840', hair:'#0a0808', trunkC:'#550000', gloveC:'#881100',
    weight:5, height:5, flying:1, speed:1, recov:5, def:5, beard:true, sh:200 },
  { id:'thereal',  name:'THE REAL',    archetype:'Boxing Purist',
    skin:'#9e6440', skinD:'#7a492b', hair:'#111111', trunkC:'#eeeeee', gloveC:'#111111',
    weight:4, height:4, flying:1, speed:4, recov:4, def:5, beard:false, sh:188 },
];


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
  const cv = document.getElementById('ws-preview-canvas');
  if(!cv) return;
  const screen = document.getElementById('start-screen');
  if(screen && screen.style.display !== 'none' && !gameRunning) {
    const c = cv.getContext('2d');
    const W=cv.width, H=cv.height;
    c.clearRect(0,0,W,H);

    const cx = W/2;
    // ── 3D Wide Angle Geometry for Preview ──
    const BLx = cx - W*0.35, BLy = H * 0.45;
    const BRx = cx + W*0.35, BRy = H * 0.45;
    const FLx = cx - W*0.48, FLy = H * 0.88;
    const FRx = cx + W*0.48, FRy = H * 0.88;
    const ringFrontY = FLy;

    // Floor
    const floorG = c.createLinearGradient(0, BLy, 0, FLy);
    floorG.addColorStop(0,'#d49d79'); floorG.addColorStop(1,'#ebc1a0');
    c.fillStyle = floorG;
    c.beginPath(); c.moveTo(BLx, BLy); c.lineTo(BRx, BRy); c.lineTo(FRx, FRy); c.lineTo(FLx, FLy); c.closePath(); c.fill();

    // Logo
    c.save();
    c.globalAlpha = 0.6;
    c.translate(cx, BLy + (FLy-BLy)*0.45);
    c.scale(1, 0.45);
    c.font = '900 '+Math.round(W*0.08)+'px "Barlow Condensed", sans-serif'; c.textAlign = 'center'; c.textBaseline='middle';
    c.strokeStyle = 'rgba(100,20,5,0.4)'; c.lineWidth = 4; c.strokeText('BOXING', 0, 0);
    c.fillStyle = 'rgba(180,60,30,0.6)'; c.fillText('BOXING', 0, 0);
    c.restore();

    // Side apron walls
    c.fillStyle = '#6a0a0a';
    c.beginPath(); c.moveTo(BLx, BLy); c.lineTo(FLx, FLy); c.lineTo(FLx, FLy+W*0.04); c.lineTo(BLx, BLy+W*0.015); c.closePath(); c.fill();
    c.fillStyle = '#101a5a';
    c.beginPath(); c.moveTo(BRx, BRy); c.lineTo(FRx, FRy); c.lineTo(FRx, FRy+W*0.04); c.lineTo(BRx, BRy+W*0.015); c.closePath(); c.fill();

    // Local Post Helper
    function pPost(x, y, h, col, scale) {
      c.save(); c.translate(x,y); c.scale(scale,scale);
      const pw=7, ph=h/scale;
      c.fillStyle='#888'; c.fillRect(-pw,-ph,pw*2,ph);
      c.fillStyle=col; c.beginPath(); c.roundRect(-pw*1.4,-ph, pw*2.8, Math.min(45,ph*0.5), 3); c.fill();
      c.fillStyle='rgba(255,255,255,0.2)'; c.fillRect(-pw*1.4,-ph, pw*2.8, 4);
      c.restore();
    }
    const backPostH = H*0.22, frontPostH = H*0.45;
    pPost(BLx, BLy, backPostH, '#1133cc', 0.8);
    pPost(BRx, BRy, backPostH, '#1133cc', 0.8);
    
    // Front Posts
    pPost(FLx, FLy, frontPostH, '#1133cc', 1.3);
    pPost(FRx, FRy, frontPostH, '#1133cc', 1.3);

    function pRope(x1, y1, x2, y2, col, thick) {
      c.strokeStyle='rgba(0,0,0,0.4)'; c.lineWidth=thick+2; c.lineCap='round';
      c.beginPath(); c.moveTo(x1, y1+2); c.lineTo(x2, y2+2); c.stroke();
      c.strokeStyle=col; c.lineWidth=thick; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    }

    const rColors=['#dd1111','#f5f5f5','#1144dd'];
    const bYOffs = [-backPostH*0.8, -backPostH*0.6, -backPostH*0.4];
    const fYOffs = [-frontPostH*0.8, -frontPostH*0.6, -frontPostH*0.4];
    
    rColors.forEach((col, i) => {
      let by1 = BLy + bYOffs[i], by2 = BRy + bYOffs[i];
      pRope(BLx, by1, BRx, by2, col, 3); // Back
      let fy1 = FLy + fYOffs[i], fy2 = FRy + fYOffs[i];
      pRope(BLx, by1, FLx, fy1, col, 4); // Left side
      pRope(BRx, by2, FRx, fy2, col, 4); // Right side
      pRope(FLx, fy1, FRx, fy2, col, 6); // Front
    });

    // ── Fighter sprites ──
    const r1 = ROSTER[selectedP1];
    const r2 = ROSTER[selectedP2];

    const drawOneFighter = (r, offset, isFlipped) => {
      const img = SPRITES[r.id];
      if(img && img.complete && img.naturalWidth>0) {
        const isSheet = img.naturalWidth > img.naturalHeight * 1.5;
        let sW = img.naturalWidth, sH = img.naturalHeight;
        let sx = 0;
        if (isSheet) {
          sW = Math.round(img.naturalWidth / 6);
          sx = sW; // Use idle pose (frame index 1)
        }
        
        const sprH = H * 0.72;
        const sprW = sW / sH * sprH;
        c.save();
        if(isFlipped) {
          c.translate(cx + offset + sprW/2, 0);
          c.scale(-1, 1);
          c.drawImage(img, sx, 0, sW, sH, 0, ringFrontY-sprH*0.85, sprW, sprH);
        } else {
          c.drawImage(img, sx, 0, sW, sH, cx + offset - sprW/2, ringFrontY-sprH*0.85, sprW, sprH);
        }
        c.restore();
      }
    };
    
    // Draw P1 (left) and P2 (right)
    drawOneFighter(r1, -W*0.2, false);
    drawOneFighter(r2,  W*0.2, true);

    wsPreviewTimer = requestAnimationFrame(drawPreviewStage);
  }
}



function buildRoster(){
  const grid = document.getElementById('ws-grid');
  if(!grid) return;
  // Draw crowd background first
  drawCrowdBg();
  grid.innerHTML = '';
  // Fill 16 valid slots to match 8x2 layout
  for(let i=0; i<16; i++) {
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

window.selectChar = function(idx) {
  if(idx >= ROSTER.length) return; // can't pick locked slot
  if (window.wsSelectingPlayer === 1) {
    selectedP1 = idx;
    if (gameMode === '1p') {
      // CPU mode: auto-pick opponent and go straight to ready
      selectedP2 = (idx+1)%ROSTER.length;
      window.wsSelectingPlayer = 2;
    } else {
      // 2P mode: now it's Player 2's turn
      window.wsSelectingPlayer = 2;
    }
  } else {
    // Player 2 selecting
    selectedP2 = idx;
  }
  window.updateSelUI();
};

window.updateSelUI = function() {
  const isP1Turn = window.wsSelectingPlayer === 1;
  const rIdx = isP1Turn ? selectedP1 : selectedP2;
  const currR = ROSTER[rIdx];
  
  // Update grid selection highlights
  const slots = document.querySelectorAll('.ws-head-slot');
  slots.forEach((s,i)=>{
    s.classList.remove('selected','p1-sel','p2-sel');
    // Always show P1's locked-in pick with red border
    if(i === selectedP1 && !isP1Turn) s.classList.add('selected','p1-sel');
    // Show current selecting player's pick
    if(isP1Turn && i === selectedP1) s.classList.add('selected','p1-sel');
    if(!isP1Turn && i === selectedP2) s.classList.add('selected','p2-sel');
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
  setSegs('ws-p1-stat-weight',   r1.weight, 'red');
  setSegs('ws-p1-stat-height',   r1.height, 'blue');
  setSegs('ws-p1-stat-flying',   r1.flying, 'red');
  setSegs('ws-p1-stat-speed',    r1.speed,  'blue');
  setSegs('ws-p1-stat-recovery', r1.recov,  'red');
  setSegs('ws-p1-stat-defense',  r1.def,    'blue');

  // Update P2 Side
  const r2 = ROSTER[selectedP2];
  const name2 = document.getElementById('ws-p2-name');
  if(name2) name2.textContent = r2.name;
  setSegs('ws-p2-stat-weight',   r2.weight, 'red');
  setSegs('ws-p2-stat-height',   r2.height, 'blue');
  setSegs('ws-p2-stat-flying',   r2.flying, 'red');
  setSegs('ws-p2-stat-speed',    r2.speed,  'blue');
  setSegs('ws-p2-stat-recovery', r2.recov,  'red');
  setSegs('ws-p2-stat-defense',  r2.def,    'blue');

  // Manage Turn Visibility & Status Labels
  const p1Sec = document.getElementById('ws-p1-section');
  const p2Sec = document.getElementById('ws-p2-section');
  const p1Stat = document.getElementById('ws-p1-status');
  const p2Stat = document.getElementById('ws-p2-status');

  if (p1Sec && p2Sec && p1Stat && p2Stat) {
    if (window.wsSelectingPlayer === 1) {
      p1Sec.classList.remove('inactive','locked');
      p2Sec.classList.add('inactive');
      p2Sec.classList.remove('locked');
      p1Stat.textContent = 'CHOOSING';  p1Stat.className = 'ws-player-status choosing';
      p2Stat.textContent = 'WAITING';   p2Stat.className = 'ws-player-status';
    } else {
      // Player 2 is choosing
      p1Sec.classList.add('locked');
      p1Sec.classList.remove('inactive');
      p2Sec.classList.remove('inactive');
      p1Stat.textContent = 'LOCKED';    p1Stat.className = 'ws-player-status locked';
      p2Stat.textContent = (gameMode === '1p' ? 'READY' : 'CHOOSING');
      p2Stat.className = 'ws-player-status choosing';
    }
  }

  if (!wsPreviewFighter || wsPreviewFighter.id !== currR.id) {
    wsPreviewFighter = new Fighter(0, 1, currR.trunkC, currR.gloveC, currR.gloveC, currR.skin, currR.name, null, !!currR.beard, currR.id);
  }

  // Prompt text — tells the user whose turn it is
  const prompt = document.getElementById('ws-prompt');
  if(prompt) {
    if (gameMode === '1p') {
      prompt.textContent = isP1Turn ? 'PLAYER 1 — SELECT YOUR FIGHTER' : 'VS CPU — PRESS READY!';
      prompt.style.color = isP1Turn ? '#ff4444' : '#44ff88';
    } else {
      if (isP1Turn) {
        prompt.textContent = 'PLAYER 1 — SELECT YOUR FIGHTER';
        prompt.style.color = '#ff4444';
      } else {
        prompt.textContent = 'PLAYER 2 — SELECT YOUR FIGHTER';
        prompt.style.color = '#44aaff';
      }
    }
  }

  // READY button: only fully active when both have selected (P2 turn)
  const btn = document.getElementById('startBtn');
  if(btn) {
    if (window.wsSelectingPlayer === 2) {
      btn.classList.add('ready-active');
      btn.textContent = 'FIGHT!';
    } else {
      btn.classList.remove('ready-active');
      btn.textContent = 'WAITING...';
    }
  }
};

buildRoster();

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
function gameLoop(ts){
  if(!gameRunning)return;
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

document.getElementById('startBtn').addEventListener('click',()=>{
  // Only start fight when both players have selected
  if(window.wsSelectingPlayer !== 2) return;
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
});

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

// ======== BOXING SOUND ENGINE ========
// All sounds are procedurally generated via Web Audio API — no files needed.
const SFX = (() => {
  let ctx_a = null;
  let masterGain = null;
  let crowdGain = null;      // crowd bus
  let musicGain = null;     // music bus
  let crowdNode = null;     // running crowd loop
  let musicNodes = [];      // running music oscillators
  let enabled = true;
  let musicPlaying = false;
  let crowdExcitement = 0;  // 0–1 excitement level

  function getCtx() {
    if (!ctx_a) {
      ctx_a = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx_a.createGain();
      masterGain.gain.value = 0.82;
      masterGain.connect(ctx_a.destination);

      // Crowd bus — separate gain so we can swell it
      crowdGain = ctx_a.createGain();
      crowdGain.gain.value = 0.0;
      crowdGain.connect(ctx_a.destination);

      // Music bus
      musicGain = ctx_a.createGain();
      musicGain.gain.value = 0.0;
      musicGain.connect(ctx_a.destination);
    }
    if (ctx_a.state === 'suspended') ctx_a.resume();
    return ctx_a;
  }

  // ─── CROWD AMBIENCE ENGINE ───────────────────────────────────────────────
  // Generates a looping layered crowd roar using filtered noise buffers.
  function startCrowd() {
    if (crowdNode) return;
    const c = getCtx();
    const duration = 4.0;
    const sr = c.sampleRate;
    const buf = c.createBuffer(2, Math.ceil(sr * duration), sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    function makeCrowdLayer(filterFreq, filterQ, gainVal, loop) {
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = 0.35 + Math.random() * 0.15;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = filterFreq;
      f.Q.value = filterQ;
      const g = c.createGain();
      g.gain.value = gainVal;
      src.connect(f); f.connect(g); g.connect(crowdGain);
      src.start();
      return src;
    }
    // Three texture layers: low rumble, mid chatter, high energy
    crowdNode = [
      makeCrowdLayer(280, 0.6, 0.6),
      makeCrowdLayer(700, 0.5, 0.45),
      makeCrowdLayer(1400, 0.4, 0.25),
    ];
    // Warm up crowd slowly
    crowdGain.gain.setValueAtTime(0, c.currentTime);
    crowdGain.gain.linearRampToValueAtTime(0.09, c.currentTime + 2.5);
  }

  function swellCrowd(targetGain, duration) {
    if (!crowdGain) return;
    const c = getCtx();
    crowdGain.gain.cancelScheduledValues(c.currentTime);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, c.currentTime);
    crowdGain.gain.linearRampToValueAtTime(targetGain, c.currentTime + duration);
    crowdGain.gain.linearRampToValueAtTime(Math.max(0.09, targetGain * 0.5), c.currentTime + duration + 1.2);
  }

  // Crowd reacts to a hit — excitement builds up over time
  function crowdReact(intensity) {  // intensity 0–1
    crowdExcitement = Math.min(1, crowdExcitement + intensity * 0.3);
    const peak = 0.09 + crowdExcitement * 0.28;
    swellCrowd(peak, 0.18);
    // Excitement fades slowly
    setTimeout(() => { crowdExcitement = Math.max(0, crowdExcitement - 0.12); }, 2000);
  }

  function crowdRoar(duration=1.5) {
    // Big cheer — KO, super, etc.
    if (!crowdGain) return;
    const c = getCtx();
    crowdGain.gain.cancelScheduledValues(c.currentTime);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, c.currentTime);
    crowdGain.gain.linearRampToValueAtTime(0.45, c.currentTime + 0.2);
    crowdGain.gain.linearRampToValueAtTime(0.28, c.currentTime + 0.6);
    crowdGain.gain.linearRampToValueAtTime(0.38, c.currentTime + 1.1);
    crowdGain.gain.linearRampToValueAtTime(0.12, c.currentTime + duration);
    crowdGain.gain.linearRampToValueAtTime(0.09, c.currentTime + duration + 0.8);
    crowdExcitement = 1.0;
  }

  // ─── ARENA BACKGROUND MUSIC ENGINE ───────────────────────────────────────
  // Procedural hip-hop/boxing arcade beat
  function startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    const c = getCtx();
    musicGain.gain.setValueAtTime(0, c.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.11, c.currentTime + 3.0);

    const bpm = 92;
    const beat = 60 / bpm;

    // ─ Bass line (pattern repeating every 4 beats)
    const bassFreqs = [55, 55, 73.4, 61.7, 55, 55, 73.4, 82.4];
    function scheduleBass(startT) {
      bassFreqs.forEach((f, i) => {
        const t = startT + i * beat * 0.5;
        const osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        // Subtle bass filter
        const flt = c.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.value = 180;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.55, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.42);
        osc.connect(flt); flt.connect(g); g.connect(musicGain);
        osc.start(t); osc.stop(t + beat * 0.5);
        musicNodes.push(osc);
      });
    }

    // ─ Hi-hat (16th note rhythm)
    function scheduleHats(startT, bars=2) {
      const steps = bars * 16;
      for (let i = 0; i < steps; i++) {
        const t = startT + i * beat * 0.25;
        const onBeat = i % 4 === 0;
        const open   = i % 8 === 6;
        const vol = onBeat ? 0.22 : open ? 0.28 : 0.10;
        const dur = open ? 0.18 : 0.04;
        // Noise burst for hat
        const buf2 = c.createBuffer(1, Math.ceil(c.sampleRate * (dur + 0.01)), c.sampleRate);
        const d2 = buf2.getChannelData(0);
        for (let j = 0; j < d2.length; j++) d2[j] = Math.random() * 2 - 1;
        const s2 = c.createBufferSource(); s2.buffer = buf2;
        const f2 = c.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 8000;
        const g2 = c.createGain();
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(vol, t + 0.003);
        g2.gain.exponentialRampToValueAtTime(0.001, t + dur);
        s2.connect(f2); f2.connect(g2); g2.connect(musicGain);
        s2.start(t); s2.stop(t + dur + 0.01);
        musicNodes.push(s2);
      }
    }

    // ─ Kick drum (4 on the floor with accents)
    function scheduleKick(startT, bars=2) {
      const pattern = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0];
      const steps = bars * 16;
      for (let i = 0; i < steps; i++) {
        if (!pattern[i % 16]) continue;
        const t = startT + i * beat * 0.25;
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        const g = c.createGain();
        g.gain.setValueAtTime(0.9, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
        osc.connect(g); g.connect(musicGain);
        osc.start(t); osc.stop(t + 0.25);
        musicNodes.push(osc);
      }
    }

    // ─ Snare (beats 2 & 4)
    function scheduleSnare(startT, bars=2) {
      const steps = bars * 4;
      for (let i = 0; i < steps; i++) {
        if (i % 2 === 0) continue; // only beats 2 & 4
        const t = startT + i * beat;
        const buf3 = c.createBuffer(1, Math.ceil(c.sampleRate * 0.18), c.sampleRate);
        const d3 = buf3.getChannelData(0);
        for (let j = 0; j < d3.length; j++) d3[j] = Math.random() * 2 - 1;
        const s3 = c.createBufferSource(); s3.buffer = buf3;
        const f3 = c.createBiquadFilter(); f3.type = 'bandpass'; f3.frequency.value = 1800; f3.Q.value = 1.1;
        const g3 = c.createGain();
        g3.gain.setValueAtTime(0.42, t);
        g3.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        s3.connect(f3); f3.connect(g3); g3.connect(musicGain);
        s3.start(t); s3.stop(t + 0.2);
        // Tone body
        const osc2 = c.createOscillator(); osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(280, t); osc2.frequency.exponentialRampToValueAtTime(140, t + 0.12);
        const g3b = c.createGain(); g3b.gain.setValueAtTime(0.3, t); g3b.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc2.connect(g3b); g3b.connect(musicGain);
        osc2.start(t); osc2.stop(t + 0.15);
        musicNodes.push(s3, osc2);
      }
    }

    // ─ Pad chord (every 4 beats)
    const padFreqs = [
      [110, 138.6, 164.8],   // Am
      [110, 138.6, 164.8],
      [98,  123.5, 146.8],   // Gm
      [116.5, 146.8, 174.6], // Bbm
    ];
    function schedulePad(startT) {
      padFreqs.forEach((chord, ci) => {
        const t = startT + ci * beat * 4;
        chord.forEach(f => {
          const osc = c.createOscillator(); osc.type = 'sine';
          osc.frequency.value = f;
          const g = c.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.06, t + 0.3);
          g.gain.linearRampToValueAtTime(0.04, t + beat * 3.5);
          g.gain.linearRampToValueAtTime(0, t + beat * 4.1);
          osc.connect(g); g.connect(musicGain);
          osc.start(t); osc.stop(t + beat * 4.2);
          musicNodes.push(osc);
        });
      });
    }

    // ─ Schedule one loop-block (2 bars) then repeat
    let loopStart = c.currentTime + 0.1;
    const loopDuration = beat * 8; // 2 bars
    function scheduleLoop(t) {
      scheduleBass(t);
      scheduleHats(t, 2);
      scheduleKick(t, 2);
      scheduleSnare(t, 2);
      schedulePad(t);
      // Schedule the next loop slightly before this one ends
      const nextT = t + loopDuration;
      const delay = (nextT - c.currentTime - 0.25) * 1000;
      setTimeout(() => { if (musicPlaying) scheduleLoop(nextT); }, Math.max(0, delay));
    }
    scheduleLoop(loopStart);
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicGain && ctx_a) {
      musicGain.gain.setValueAtTime(musicGain.gain.value, ctx_a.currentTime);
      musicGain.gain.linearRampToValueAtTime(0, ctx_a.currentTime + 1.5);
    }
  }

  // ── Core noise burst helper ──
  function noise(duration, filterFreq, filterQ, gainPeak, gainDecay, detune=0, startDelay=0) {
    const c = getCtx();
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.detune.value = detune;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;
    const g = c.createGain();
    g.gain.setValueAtTime(0, c.currentTime + startDelay);
    g.gain.linearRampToValueAtTime(gainPeak, c.currentTime + startDelay + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + gainDecay);
    src.connect(filter); filter.connect(g); g.connect(masterGain);
    src.start(c.currentTime + startDelay);
    src.stop(c.currentTime + startDelay + duration);
  }

  // ── Sine / tone helper ──
  function tone(freq, type, gainPeak, gainDecay, startDelay=0, pitchSweep=0) {
    const c = getCtx();
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + startDelay);
    if (pitchSweep) osc.frequency.exponentialRampToValueAtTime(pitchSweep, c.currentTime + startDelay + gainDecay);
    const g = c.createGain();
    g.gain.setValueAtTime(0, c.currentTime + startDelay);
    g.gain.linearRampToValueAtTime(gainPeak, c.currentTime + startDelay + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + gainDecay);
    osc.connect(g); g.connect(masterGain);
    osc.start(c.currentTime + startDelay);
    osc.stop(c.currentTime + startDelay + gainDecay + 0.05);
  }

  // ── Distorted punch body ──
  function punchBody(freq, gainPeak, decayTime, startDelay=0) {
    const c = getCtx();
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + startDelay);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.35, c.currentTime + startDelay + decayTime);
    const wave = c.createWaveShaper();
    const k = 200;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    wave.curve = curve;
    const g = c.createGain();
    g.gain.setValueAtTime(gainPeak, c.currentTime + startDelay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + decayTime);
    osc.connect(wave); wave.connect(g); g.connect(masterGain);
    osc.start(c.currentTime + startDelay);
    osc.stop(c.currentTime + startDelay + decayTime + 0.05);
  }

  // ╔══════════════════════════════╗
  // ║   PUBLIC SOUND FUNCTIONS     ║
  // ╚══════════════════════════════╝

  function jab() {
    if (!enabled) return;
    // Crisp, fast snap
    noise(0.08, 2800, 3.5, 0.55, 0.06);
    punchBody(140, 0.35, 0.09);
    noise(0.05, 5500, 2, 0.25, 0.04, 200);
  }

  function cross() {
    if (!enabled) return;
    // Heavier smack
    noise(0.12, 1800, 2.8, 0.75, 0.10);
    punchBody(110, 0.5, 0.12);
    noise(0.06, 4200, 1.8, 0.4, 0.07, -100);
  }

  function hook() {
    if (!enabled) return;
    // Wide sweeping thud
    noise(0.15, 1200, 2.2, 0.85, 0.14);
    punchBody(90, 0.6, 0.16);
    noise(0.08, 3000, 1.5, 0.35, 0.11, -200);
    tone(80, 'sine', 0.18, 0.14);
  }

  function uppercut() {
    if (!enabled) return;
    // Rising crack
    noise(0.10, 2400, 3.0, 0.68, 0.09);
    punchBody(160, 0.45, 0.11);
    tone(220, 'triangle', 0.22, 0.10, 0, 80);
  }

  function bodyShot() {
    if (!enabled) return;
    // Deep meaty thud
    noise(0.18, 600, 1.8, 0.9, 0.17);
    punchBody(65, 0.7, 0.20);
    noise(0.10, 1400, 2.5, 0.45, 0.14);
    tone(55, 'sine', 0.25, 0.18);
  }

  function overhand() {
    if (!enabled) return;
    // Heavy overhead crash
    noise(0.16, 1400, 2.5, 0.82, 0.14);
    punchBody(100, 0.58, 0.17);
    noise(0.08, 3500, 1.5, 0.42, 0.10, -300);
    tone(70, 'sine', 0.20, 0.15);
  }

  function dashStrike() {
    if (!enabled) return;
    // Explosive impact + whoosh
    noise(0.04, 8000, 2, 0.35, 0.03); // whoosh pre-sound
    noise(0.20, 800, 1.5, 1.0, 0.18, 0, 0.04);
    punchBody(75, 0.85, 0.22, 0.04);
    noise(0.12, 4000, 1.8, 0.55, 0.12, -400, 0.04);
    tone(60, 'sine', 0.3, 0.22, 0.04);
    // Small whoosh trail
    noise(0.08, 9000, 1.5, 0.2, 0.06, 1200, 0);
  }

  function superPunch() {
    if (!enabled) return;
    // Cinematic multi-layer massive impact
    noise(0.05, 10000, 1.5, 0.5, 0.04); // crack
    noise(0.30, 500, 1.2, 1.2, 0.28, 0, 0.03);  // deep boom
    punchBody(55, 1.0, 0.30, 0.03);
    noise(0.12, 3000, 2.0, 0.65, 0.14, -600, 0.03);
    tone(50, 'sine', 0.35, 0.30, 0.03);
    tone(440, 'sawtooth', 0.06, 0.08, 0); // electric zap shimmer
    tone(660, 'sawtooth', 0.04, 0.06, 0.02);
    // Crowd gasp + roar
    noise(0.5, 400, 0.8, 0.15, 0.45, 0, 0.05);
    setTimeout(() => crowdRoar(2.5), 80);
  }

  function block() {
    if (!enabled) return;
    // Glove-on-glove dull thud
    noise(0.10, 900, 3.0, 0.5, 0.09);
    punchBody(130, 0.3, 0.09);
    noise(0.05, 3000, 2, 0.18, 0.06, 400);
  }

  function guardBreak() {
    if (!enabled) return;
    // Crunch — block shattered
    noise(0.14, 1100, 2.2, 0.9, 0.13);
    punchBody(95, 0.6, 0.16);
    noise(0.08, 2500, 1.8, 0.5, 0.10, -300);
    tone(160, 'sawtooth', 0.12, 0.08);
  }

  function whoosh() {
    if (!enabled) return;
    // Slip / duck dodge whoosh
    noise(0.12, 7000, 1.8, 0.28, 0.10, 800);
    noise(0.08, 3500, 1.4, 0.18, 0.07, 400, 0.02);
  }

  function footstep() {
    if (!enabled) return;
    // Soft canvas footstep
    noise(0.06, 300, 2.5, 0.22, 0.055);
    punchBody(60, 0.12, 0.06);
  }

  function knockdown() {
    if (!enabled) return;
    // KO — big boom + crowd
    noise(0.04, 9000, 2, 0.6, 0.03);
    noise(0.40, 300, 0.9, 1.5, 0.38, 0, 0.02);
    punchBody(45, 1.2, 0.42, 0.02);
    noise(0.20, 600, 1.2, 0.7, 0.18, -200, 0.02);
    tone(40, 'sine', 0.45, 0.4, 0.02);
    // Ringing bell tones (KO bell)
    [0, 0.12, 0.26, 0.40].forEach((d, i) => {
      tone(880 - i * 40, 'sine', 0.18 - i * 0.03, 0.6, d);
    });
    // Crowd ERUPTS on KO
    setTimeout(() => crowdRoar(4.0), 120);
  }

  function roundBell() {
    if (!enabled) return;
    // Classic boxing bell — DING!
    const c = getCtx();
    [660, 880, 1100, 1320].forEach((f, i) => {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.22 - i * 0.03, c.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.8);
      osc.connect(g); g.connect(masterGain);
      osc.start(c.currentTime); osc.stop(c.currentTime + 2.0);
    });
    // Bell body thud
    noise(0.12, 1800, 4.0, 0.35, 0.1);
    // Crowd murmur
    noise(0.6, 600, 0.6, 0.12, 0.55, 0, 0.1);
  }

  function fightStart() {
    if (!enabled) return;
    // Bell + crowd swell + start music
    roundBell();
    setTimeout(() => { startCrowd(); startMusic(); }, 200);
    setTimeout(() => crowdRoar(2.0), 300);
  }

  function comboImpact(comboNum) {
    if (!enabled) return;
    // Escalating combo hits
    const pitch = Math.min(comboNum - 1, 4) * 150;
    noise(0.10, 2000 + pitch, 2.8, 0.5 + comboNum * 0.07, 0.09);
    punchBody(120 + comboNum * 10, 0.35, 0.10);
  }

  function superReady() {
    if (!enabled) return;
    // Charge-up shimmer when super is full
    tone(440, 'sine', 0.06, 0.25);
    tone(550, 'sine', 0.05, 0.20, 0.05);
    tone(660, 'sine', 0.07, 0.18, 0.10);
  }

  return { jab, cross, hook, uppercut, bodyShot, overhand, dashStrike, superPunch,
           block, guardBreak, whoosh, footstep, knockdown, roundBell, fightStart,
           comboImpact, superReady, crowdReact, crowdRoar, startCrowd, startMusic, stopMusic,
           setEnabled(v){ enabled = v; if (!v) stopMusic(); },
           init(){ getCtx(); } };
})();

// ── Patch Fighter.checkHit to trigger sounds ──
const _origCheckHit = Fighter.prototype.checkHit;
Fighter.prototype.checkHit = function(type, enemy) {
  const prevHp = enemy.hp;
  const wasBlocking = enemy.blocking;
  _origCheckHit.call(this, type, enemy);
  const didHit = enemy.hp < prevHp || (wasBlocking && enemy.hp <= prevHp && type !== 'overhand');
  const hitLanded = enemy.hp < prevHp;

  if (enemy.state === 'ko' && prevHp > 0) {
    setTimeout(() => SFX.knockdown(), 60);
    return;
  }

  if (hitLanded) {
    if (wasBlocking && type !== 'overhand') {
      SFX.block();
      SFX.crowdReact(0.1);
    } else if (type === 'overhand' && wasBlocking) {
      SFX.guardBreak();
      SFX.crowdReact(0.35);
    } else {
      // Crowd intensity per punch type
      const crowdI = { jab:0.12, cross:0.22, hook:0.35, kick:0.45, upcut:0.3, body:0.28, overhand:0.4, dash:0.55, super:0.9 };
      switch(type) {
        case 'jab':      SFX.jab(); break;
        case 'cross':    SFX.cross(); break;
        case 'hook':     SFX.hook(); break;
        case 'kick':     SFX.overhand(); break; // heavy sound
        case 'upcut':    SFX.uppercut(); break;
        case 'body':     SFX.bodyShot(); break;
        case 'overhand': SFX.overhand(); break;
        case 'dash':     SFX.dashStrike(); break;
        case 'super':    SFX.superPunch(); break;
      }
      SFX.crowdReact(crowdI[type] || 0.2);
      // Combo sounds + crowd roar on big combos
      if (this.comboCount >= 3) {
        SFX.comboImpact(this.comboCount);
        if (this.comboCount >= 5) SFX.crowdRoar(1.5);
      }
    }
  }
};

// ── Patch Fighter.punch for miss whoosh & footstep ──
const _origPunch = Fighter.prototype.punch;
Fighter.prototype.punch = function(type, enemy) {
  _origPunch.call(this, type, enemy);
  // Trigger whoosh on miss checks (when state was set)
  if (this.state === type && (type === 'slip' || type === 'duck')) SFX.whoosh();
};

// ── Patch Fighter.update for dodge sounds and footsteps ──
const _origUpdate = Fighter.prototype.update;
let _footstepThrottle = 0;
Fighter.prototype.update = function(humanKeys, enemy) {
  const prevState = this.state;
  const prevSuper = this.superCharge;
  _origUpdate.call(this, humanKeys, enemy);
  // Dodge sounds
  if (prevState !== this.state) {
    if (this.state === 'slip' || this.state === 'duck' || this.state === 'pull') SFX.whoosh();
  }
  // Footstep (throttled)
  if (this.state === 'walk') {
    _footstepThrottle++;
    if (_footstepThrottle % 22 === 0) SFX.footstep();
  }
  // Super ready shimmer (once when it fills)
  if (prevSuper < 100 && this.superCharge >= 100) SFX.superReady();
};

// ── Round bell: fired via roundOver polling ──
// Also detects fight start to play the opening bell
let _prevRoundOver = false;
let _prevGameRunning = false;
const _sfxRoundWatcher = setInterval(() => {
  if (typeof roundOver !== 'undefined' && roundOver !== _prevRoundOver) {
    if (roundOver) SFX.roundBell();
    _prevRoundOver = roundOver;
  }
  if (typeof gameRunning !== 'undefined' && gameRunning !== _prevGameRunning) {
    if (gameRunning) SFX.fightStart();
    _prevGameRunning = gameRunning;
  }
}, 80);

// ── Initialise audio context on first user interaction ──
document.addEventListener('click', () => SFX.init(), { once: true });
document.addEventListener('keydown', () => SFX.init(), { once: true });
document.addEventListener('touchstart', () => SFX.init(), { once: true });

// ── 🔊 Mute toggle ──
let _soundEnabled = true;
function toggleMute() {
  _soundEnabled = !_soundEnabled;
  SFX.setEnabled(_soundEnabled);
  const btn = document.getElementById('mute-btn');
  if (btn) {
    btn.textContent = _soundEnabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !_soundEnabled);
  }
}

// Initial call to start the game flow with mode selection
showStartScreen();
