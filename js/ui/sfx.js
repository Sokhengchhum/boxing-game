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
