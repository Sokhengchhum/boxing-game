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
    this.powerMult=1.0;this.defMult=1.0;this.speedMult=1.0;this.stamMult=1.0;
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
      
      // ======== DYNAMIC DAMAGE CALCULATION ========
      const baseDmg = isCb ? (type === 'combo_3' ? 22 : 8) : 
                     type === 'super' ? 30 : 
                     type === 'dash' ? 28 : 
                     type === 'kick' ? 26 : 
                     type === 'hook' ? 20 : 
                     type === 'overhand' ? 18 : 
                     type === 'upcut' ? 14 : 
                     type === 'cross' ? 10 : 
                     type === 'body' ? 6 : 7;
      
      const baseKb = isCb ? (type === 'combo_3' ? 14 : 3) : 
                    type === 'super' ? 10 : 
                    type === 'dash' ? 12 : 
                    type === 'kick' ? 14 : 
                    type === 'hook' ? 9 : 
                    type === 'overhand' ? 6 : 
                    type === 'upcut' ? 4 : 
                    type === 'cross' ? 3 : 
                    type === 'body' ? 2 : 2;

      // Stats multipliers (default to 1.0 if not set by applyStats)
      const pMult = this.powerMult || 1.0;
      const dMult = enemy.defMult || 1.0;
      
      // Random variance +/- 8%
      const variance = 0.92 + Math.random() * 0.16;
      
      // Stamina penalty: if stamina is very low, power drops
      const stamFactor = this.stamina < 15 ? 0.7 : 1.0;
      
      // Combo scaling: damage increases slightly per hit in a combo
      const comboScaling = 1.0 + (Math.min(this.comboCount, 10) * 0.05);
      
      // Counter hit: extra damage if enemy is attacking or just started an attack
      const isCounter = enemy.isAttacking() || enemy.stateTimer > 0;
      const counterMult = isCounter ? 1.25 : 1.0;

      // Critical Hit chance (5%)
      const isCrit = Math.random() < 0.05;
      const critMult = isCrit ? 1.5 : 1.0;

      let dmg = (baseDmg * pMult * variance * stamFactor * comboScaling * counterMult * critMult) / dMult;
      let kb = baseKb * (pMult / dMult) * counterMult;

      if(enemy.blocking && type!=='overhand'){
        const blockReduction = type === 'super' ? 0.3 : 0.15; // Supers chip more
        enemy.hp = Math.max(0, enemy.hp - (dmg * blockReduction));
        this.spawnPfx(enemy.x, enemy.y - 50, '#aaa', 4);
        if(isCrit) showMoveBanner('CRITICAL BLOCK!');
      } else {
        if(enemy.blocking && type==='overhand'){ 
          enemy.blocking=false; 
          dmg *= 0.8; // guard break does slightly less than full hit but stuns
          kb = 8; 
          showMoveBanner('GUARD BREAK!');
        }
        
        if(enemy.state==='duck' && type==='upcut') dmg *= 1.6; // Massive counter for ducking into upcut
        
        enemy.hp=Math.max(0,enemy.hp-dmg);
        enemy.hitCooldown = isCb ? (type==='combo_3'?18:6) : (type==='super'?25:18);
        enemy.flashTimer = isCb ? (type==='combo_3'?14:4) : 12;
        enemy.knockbackVx=(enemy.x>this.x?1:-1)*kb;
        enemy.state='hurt';
        enemy.stateTimer= isCb ? 12 : (type==='super'?30:14);
        
        if(isCrit) {
          triggerScreenFlash('#ffffff', 0.6);
          showMoveBanner('CRITICAL HIT!');
          addVFX('sparks',{x:enemy.x,y:enemy.y-70,life:35});
        }

        if(isCounter && !isCrit) showMoveBanner('COUNTER HIT!');

        if(type==='body') { enemy.stamina=Math.max(0, enemy.stamina-35); showMoveBanner('BODY SHOT!'); }
        if(type==='upcut'){ enemy.vy=-7; enemy.onGround=false; if(!isCrit && !isCounter) showMoveBanner('UPPERCUT!'); }
        if(type==='overhand' && !enemy.blocking){ showMoveBanner('OVERHAND!'); }
        
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
          enemy.vy=-4; enemy.onGround=false;
          triggerScreenFlash('#ff3300',0.5); triggerSlowMo(15);
          addVFX('sparks',{x:enemy.x,y:enemy.y-50,life:45});
          showMoveBanner('POWER COMBO!');
        }
        
        if(type==='kick'){
          enemy.vy=-6; enemy.onGround=false;
          triggerScreenFlash('#ff0033',0.4); triggerSlowMo(20);
          addVFX('sparks',{x:enemy.x,y:enemy.y-50,life:35});
          showMoveBanner('HIGH KICK!');
        }
        
        this.superCharge=Math.min(100,this.superCharge+(isCrit?30:18));
        this.comboCount++;this.comboTimer=90;
        this.spawnPfx(enemy.x,enemy.y-50,isCrit?'#ffffff':type==='super'?'#ffcc00':type==='dash'?'#00ccff':isCb?'#ff3366':type==='hook'?'#ff9900':type==='kick'?'#ff00ff':this.gloveColor,type==='super'||type==='dash'||type==='combo_3'||isCrit?16:6);
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
    if(!this.isAttacking())this.stamina=Math.min(100,this.stamina+(0.25 * (this.stamMult || 1.0)));
    const canAct=this.state==='idle'||this.state==='walk';
    if(canAct && !roundOver && !matchOver){
      const walkSpd = 3 * (this.speedMult || 1.0);
      if(isLeft){this.x-=walkSpd;this.state='walk';mv=true;}
      if(isRight){this.x+=walkSpd;this.state='walk';mv=true;}
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


