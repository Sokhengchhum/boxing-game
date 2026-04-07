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
  if (m === '2p') {
    const overlay = document.getElementById('matchmaking-overlay');
    if(overlay) overlay.style.display = 'flex';
    
    // Simulate matchmaking delay between 1.5 - 3.0s
    setTimeout(() => {
      if(overlay) overlay.style.display = 'none';
      document.getElementById('mode-selection').style.display = 'none';
      document.getElementById('start-screen').style.display = 'flex';
      if(!gameRunning) {
        cancelAnimationFrame(wsPreviewTimer);
        drawPreviewStage();
      }
      if(typeof window.startSelectionTimer === 'function') window.startSelectionTimer();
    }, 1500 + Math.random() * 1500);
  } else {
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
    if(!gameRunning) {
      cancelAnimationFrame(wsPreviewTimer);
      drawPreviewStage();
    }
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
    pow:4, height:3, flying:2, spd:3, stam:3, def:4, beard:true, sh:190 },
  { id:'jackson',  name:'JACKSON',     archetype:'Speedster',
    skin:'#5c3a1e', skinD:'#3d2510', hair:'#111111', trunkC:'#004400', gloveC:'#cc1100',
    pow:3, height:4, flying:4, spd:5, stam:3, def:3, sh:185 },
  { id:'santos',   name:'SANTOS',      archetype:'All-Rounder',
    skin:'#c8885a', skinD:'#a86840', hair:'#1a1010', trunkC:'#006600', gloveC:'#cc1100',
    pow:3, height:3, flying:3, spd:4, stam:4, def:3, sh:182 },
  { id:'titan',    name:'TITAN',       archetype:'Tank',
    skin:'#e0a060', skinD:'#c07840', hair:'#0a0808', trunkC:'#550000', gloveC:'#881100',
    pow:5, height:5, flying:1, spd:1, stam:5, def:5, beard:true, sh:200 },
  { id:'thereal',  name:'THE REAL',    archetype:'Boxing Purist',
    skin:'#9e6440', skinD:'#7a492b', hair:'#111111', trunkC:'#eeeeee', gloveC:'#111111',
    pow:4, height:4, flying:1, spd:4, stam:4, def:5, beard:false, sh:188 },
];


