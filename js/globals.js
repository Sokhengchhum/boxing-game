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
const SPRITE_IDS = ['barrera','lee','blaze', 'viper', 'blitz', 'mako', 'samnang', 'piti'];

// Offscreen canvas used for white-background removal
const _spriteOffC = document.createElement('canvas');
const _spriteOffX = _spriteOffC.getContext('2d');
function loadSprites(){
  SPRITE_IDS.forEach(id=>{
    SPRITES[id] = { type: 'folder', frames: {}, loadedFrames: 0 };
    // Comprehensive list of ideal boxing sprites
    // (with built-in fallback to the basic 6: punch, lunge)
    const actions = [
      'idle', 'walk', 'dash', 
      'jab', 'cross', 'hook', 'uppercut', 'super', 
      'block', 'duck', 'slip', 
      'hurt', 'ko', 
      'punch', 'lunge',
      'overhand', 'body', 'combo', 'kick',
      'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6'
    ];
    
    // Test if the folder exists by checking for idle.png
    const probe = new Image();
    probe.onload = () => {
      // Folder exists! Use individual action images
      SPRITES[id].frames['idle'] = probe;
      SPRITES[id].loadedFrames = 1;
      if(typeof window.redrawRosterThumbnails === 'function') window.redrawRosterThumbnails();
      
      actions.filter(a => a !== 'idle').forEach(action => {
        const fallImg = new Image();
        fallImg.onload = () => { SPRITES[id].frames[action] = fallImg; SPRITES[id].loadedFrames++; };
        fallImg.onerror = () => { /* Optional frame not found, fallback logic in engine will handle it */ };
        fallImg.src = `img/${id}/${action}.png`;
      });
    };
    probe.onerror = () => {
      // Folder probe failed? Fallback to standard spritesheet!
      SPRITES[id].type = 'sheet';
      SPRITES[id].loaded = false;
      SPRITES[id].img = new Image();
      SPRITES[id].img.onload = () => { 
        SPRITES[id].loaded = true; 
        if(typeof window.redrawRosterThumbnails === 'function') window.redrawRosterThumbnails();
      };
      SPRITES[id].img.src = `img/${id}.png`;
    };
    
    probe.src = `img/${id}/idle.png`;
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
  { id:'lee',      name:'LEE',         archetype:'Muay Thai',
    skin:'#c27b40', skinD:'#9a5b28', hair:'#4d2c14', trunkC:'#ffaa00', gloveC:'#c8102e',
    pow:3, height:3, flying:5, spd:5, stam:4, def:3, sh:180 },
  { id:'samnang',  name:'SAMNANG',     archetype:'Kun Khmer',
    skin:'#d4a373', skinD:'#b5835a', hair:'#111111', trunkC:'#1a5fc8', gloveC:'#c8102e',
    pow:4, height:3, flying:4, spd:4, stam:5, def:3, beard:false, sh:178 },
  { id:'piti',     name:'PITI',        archetype:'Brawler',
    skin:'#e2c5a0', skinD:'#c3a47d', hair:'#2c1910', trunkC:'#5a2020', gloveC:'#e03030',
    pow:5, height:4, flying:2, spd:3, stam:4, def:2, beard:true, sh:192 },
];


