// ======== ANIMATION POSE SYSTEM ========
// Real-fighter movement engine. Every pose parameter maps to a visible body part.
//
// ── POSE PARAMETER REFERENCE ──
// upperLean     : torso forward/back rotation in degrees (+forward, –back)
// lowerSpread   : leg stance width offset in px (wider = more stable / power)
// bob           : idle breathing amplitude (0 = frozen, 1+ = alive)
// lungeX        : forward translation in px (weight commitment)
// squash        : vertical scale (1=normal, <1=crouch/compress, >1=stretch/extend)
// upperY        : vertical body offset in px (+down, –up)
// hipX          : hip lateral shift in px (weight transfer between legs)
// frontElbow    : punch arm elbow angle in ° (0=full extension, 48=guard, 90=hook)
// shoulderTwist : shoulder rotation in degrees (+forward, –back)
// headTilt      : head lean offset in ° (+forward/toward punch, –back/away)
// backElbow     : guard/rear hand elbow angle (lower=tucked, higher=wide guard)
// rearFootLift  : rear heel lift in px (0=flat, higher=pivoting on ball of foot)
// guardY        : vertical offset of guard hand (–up, +down from default chin)

const POSE_DEFS = {
  // ─── NEUTRAL / MOVEMENT ───────────────────────────────────────────
  idle: {
    upperLean:0,   lowerSpread:0,  bob:1,   lungeX:0,  squash:1,    upperY:0,
    hipX:0,        frontElbow:48,  shoulderTwist:0,  headTilt:0,
    backElbow:55,  rearFootLift:0, guardY:0
  },
  walk: {
    upperLean:3,   lowerSpread:2,  bob:1.5, lungeX:0,  squash:1,    upperY:0,
    hipX:0,        frontElbow:46,  shoulderTwist:2,  headTilt:0,
    backElbow:54,  rearFootLift:0, guardY:0
  },

  // ─── CORE 4 PUNCHES (Real Boxing: Jab / Cross / Hook / Uppercut) ──

  // JAB — Lead hand straight punch. Body stays tall and balanced.
  //   • Minimal hip rotation, just a shoulder pop
  //   • Lead foot steps slightly forward
  //   • Rear hand stays glued to chin (guard discipline)
  //   • Reference image: upright posture, arm fully extended
  jab: {
    upperLean:10,  lowerSpread:3,  bob:0,   lungeX:22, squash:1.02, upperY:-2,
    hipX:6,        frontElbow:-8,  shoulderTwist:18, headTilt:4,
    backElbow:62,  rearFootLift:0, guardY:-2
  },

  // CROSS — Rear hand power straight. Full kinetic chain from floor to fist.
  //   • Rear foot pivots hard (ball of foot), heel lifts
  //   • Hips rotate ~90°, shoulders follow
  //   • Weight transfers completely to lead leg
  //   • Reference image: deep body rotation, full extension
  cross: {
    upperLean:28,  lowerSpread:6,  bob:0,   lungeX:20, squash:0.95, upperY:-4,
    hipX:20,       frontElbow:-14, shoulderTwist:38, headTilt:6,
    backElbow:72,  rearFootLift:14, guardY:-4
  },

  // HOOK — Lead hand circular punch. Elbow locked at 90°.
  //   • Power comes from hip snap, NOT arm extension
  //   • Body torques laterally around the centerline
  //   • Compact range, devastating power
  //   • Reference image: bent arm, horizontal fist trajectory
  hook: {
    upperLean:-12, lowerSpread:5,  bob:0,   lungeX:8,  squash:0.98, upperY:-5,
    hipX:16,       frontElbow:88,  shoulderTwist:-28, headTilt:-6,
    backElbow:58,  rearFootLift:6, guardY:0
  },

  // UPPERCUT — Explosive upward from crouch. Ground power.
  //   • Deep knee bend → explosive leg extension
  //   • Fist travels tight upward arc: hip to chin
  //   • Short range, punishing on ducking opponents
  //   • Reference image: crouched fighter, fist rising from below
  upcut: {
    upperLean:-14, lowerSpread:8,  bob:0,   lungeX:4,  squash:1.06, upperY:-16,
    hipX:8,        frontElbow:20,  shoulderTwist:-16, headTilt:-8,
    backElbow:60,  rearFootLift:4, guardY:4
  },

  // ─── OTHER ATTACKS ────────────────────────────────────────────────
  overhand: {
    upperLean:22,  lowerSpread:5,  bob:0,   lungeX:12, squash:0.92, upperY:5,
    hipX:14,       frontElbow:-28, shoulderTwist:32, headTilt:8,
    backElbow:68,  rearFootLift:10, guardY:2
  },
  body: {
    upperLean:30,  lowerSpread:6,  bob:0,   lungeX:12, squash:0.86, upperY:12,
    hipX:10,       frontElbow:24,  shoulderTwist:24, headTilt:10,
    backElbow:52,  rearFootLift:4, guardY:8
  },
  dash: {
    upperLean:32,  lowerSpread:10, bob:0,   lungeX:24, squash:0.92, upperY:-2,
    hipX:22,       frontElbow:-6,  shoulderTwist:36, headTilt:4,
    backElbow:70,  rearFootLift:8, guardY:-2
  },
  super: {
    upperLean:28,  lowerSpread:8,  bob:0,   lungeX:20, squash:0.94, upperY:-4,
    hipX:18,       frontElbow:-18, shoulderTwist:40, headTilt:6,
    backElbow:72,  rearFootLift:12, guardY:-4
  },

  // ─── DEFENSIVE ────────────────────────────────────────────────────
  block: {
    upperLean:-6,  lowerSpread:2,  bob:0,   lungeX:-4, squash:0.96, upperY:3,
    hipX:-4,       frontElbow:62,  shoulderTwist:-4, headTilt:-12,
    backElbow:72,  rearFootLift:0, guardY:-8
  },
  duck: {
    upperLean:10,  lowerSpread:12, bob:0,   lungeX:0,  squash:0.76, upperY:20,
    hipX:0,        frontElbow:44,  shoulderTwist:0,  headTilt:-16,
    backElbow:56,  rearFootLift:0, guardY:-6
  },
  pull: {
    upperLean:-20, lowerSpread:2,  bob:0,   lungeX:-10,squash:1,    upperY:0,
    hipX:-8,       frontElbow:52,  shoulderTwist:-14, headTilt:-18,
    backElbow:58,  rearFootLift:0, guardY:-4
  },
  slip: {
    upperLean:14,  lowerSpread:4,  bob:0,   lungeX:4,  squash:0.95, upperY:6,
    hipX:6,        frontElbow:42,  shoulderTwist:8,  headTilt:14,
    backElbow:50,  rearFootLift:0, guardY:2
  },

  // ─── REACTIONS ────────────────────────────────────────────────────
  hurt: {
    upperLean:-42, lowerSpread:4,  bob:0,   lungeX:-14,squash:1.05, upperY:0,
    hipX:-10,      frontElbow:30,  shoulderTwist:-20, headTilt:-24,
    backElbow:40,  rearFootLift:0, guardY:6
  },
  ko: {
    upperLean:-85, lowerSpread:-5, bob:0,   lungeX:-25,squash:1.1,  upperY:45,
    hipX:-10,      frontElbow:5,   shoulderTwist:-30, headTilt:-40,
    backElbow:20,  rearFootLift:0, guardY:20
  },

  // ─── SPECIAL ──────────────────────────────────────────────────────
  kick: {
    upperLean:-22, lowerSpread:-15,bob:0,   lungeX:16, squash:0.85, upperY:25,
    hipX:12,       frontElbow:62,  shoulderTwist:-10, headTilt:0,
    backElbow:58,  rearFootLift:0, guardY:0
  },
  jump: {
    upperLean:0,   lowerSpread:6,  bob:0,   lungeX:0,  squash:1.04, upperY:-6,
    hipX:0,        frontElbow:46,  shoulderTwist:0,  headTilt:0,
    backElbow:54,  rearFootLift:0, guardY:0
  },
};
const POSE_DEFAULT = POSE_DEFS.idle;


// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PHASE ANIMATION KEYFRAMES — Real Fighter Movement
// ═══════════════════════════════════════════════════════════════════════════
// Each phase: { p = pose overrides, dur = frame count, sp = lerp speed }
//
// Real boxing punch sequence (kinetic chain):
//   Floor → Ankles → Knees → Hips → Core → Shoulders → Elbow → Fist
//
// Each punch encoded with these sub-phases:
//   1. LOAD    — weight shift, stance adjustment, breath in
//   2. COIL    — hip pre-rotation, shoulder loading
//   3. FIRE    — explosive hip drive, arm extension begins 
//   4. IMPACT  — maximum extension, peak power transfer
//   5. FREEZE  — impact hold (hit-stop feel for game juice)
//   6. RETRACT — arm pulls back, weight recenters
//   7. RESET   — return to guard stance
const ANIM_PHASES = {

  // ─────────────────────────────────────────────────────────────────
  //  JAB — The bread and butter. Speed punch.
  //  Real mechanics: Shoulder pops, arm pistons out, body stays 
  //  upright and balanced. Rear hand NEVER leaves chin.
  //  From guard → slight shoulder load → snap out → snap back.
  //  Total: ~20 frames at 60fps ≈ 0.33 seconds (realistic jab speed)
  // ─────────────────────────────────────────────────────────────────
  jab: [
    // 1. LOAD — Settle weight, rear hand tightens to chin
    { p:{
      upperLean:-2, lungeX:-3, squash:1.02, upperY:2,  lowerSpread:2,
      hipX:-2,      frontElbow:54, shoulderTwist:-4,  headTilt:-2,
      backElbow:62, rearFootLift:0, guardY:-3
    }, dur:2, sp:0.55 },

    // 2. COIL — Lead shoulder rotates back fractionally (loading the spring)
    { p:{
      upperLean:-1, lungeX:-2, squash:1.03, upperY:2,  lowerSpread:2,
      hipX:-3,      frontElbow:52, shoulderTwist:-6,  headTilt:-2,
      backElbow:64, rearFootLift:0, guardY:-4
    }, dur:2, sp:0.60 },

    // 3. FIRE — Shoulder POPS forward, arm shoots straight out like a piston
    //    Lead foot pushes slightly, hip barely rotates (that's what makes it fast)
    { p:{
      upperLean:12, lungeX:24, squash:1.04, upperY:-3, lowerSpread:3,
      hipX:6,       frontElbow:-4, shoulderTwist:16,  headTilt:4,
      backElbow:64, rearFootLift:2, guardY:-3
    }, dur:4, sp:0.90 },

    // 4. IMPACT — Arm locked out, fist at maximum reach, shoulder forward
    //    Body stays tall and centered (not overcommitted like a cross)
    { p:{
      upperLean:14, lungeX:28, squash:1.02, upperY:-3, lowerSpread:3,
      hipX:7,       frontElbow:-10, shoulderTwist:20, headTilt:5,
      backElbow:66, rearFootLift:2, guardY:-2
    }, dur:3, sp:0.96 },

    // 5. FREEZE — Impact hold (1 game-frame for responsive feel)
    { p:{
      upperLean:13, lungeX:26, squash:1.02, upperY:-3, lowerSpread:3,
      hipX:6,       frontElbow:-8,  shoulderTwist:18, headTilt:5,
      backElbow:64, rearFootLift:1, guardY:-2
    }, dur:2, sp:0.98 },

    // 6. RETRACT — Fast snap-back (jab's defining quality)
    { p:{
      upperLean:4,  lungeX:6,  squash:1,    upperY:-1, lowerSpread:1,
      hipX:2,       frontElbow:40, shoulderTwist:4,  headTilt:1,
      backElbow:58, rearFootLift:0, guardY:-1
    }, dur:3, sp:0.78 },

    // 7. RESET — Return to guard
    { p:{
      upperLean:0,  lungeX:0,  squash:1,    upperY:0,  lowerSpread:0,
      hipX:0,       frontElbow:48, shoulderTwist:0,  headTilt:0,
      backElbow:55, rearFootLift:0, guardY:0
    }, dur:4, sp:0.30 },
  ],

  // ─────────────────────────────────────────────────────────────────
  //  CROSS — The power straight. Full kinetic chain.
  //  Real mechanics: Power starts at the FLOOR. Rear foot pivots
  //  (heel lifts), hips SNAP forward, shoulders rotate through,
  //  arm extends LAST. Full body weight transfers to lead leg.
  //  Total: ~32 frames ≈ 0.53 seconds (realistic cross speed)
  // ─────────────────────────────────────────────────────────────────
  cross: [
    // 1. LOAD — Weight settles onto rear leg, stance widens for base
    //    Rear heel is planted, preparing to pivot
    { p:{
      upperLean:-6, lungeX:-4, squash:0.97, upperY:4,  lowerSpread:6,
      hipX:-14,     frontElbow:56, shoulderTwist:-12, headTilt:-4,
      backElbow:60, rearFootLift:0, guardY:-2
    }, dur:4, sp:0.38 },

    // 2. COIL — Hips pre-rotate AWAY from punch (loading the whip)
    //    Rear shoulder pulls back, creating maximum rotation potential
    //    Rear foot begins to pivot (heel starts lifting)
    { p:{
      upperLean:-10, lungeX:-6, squash:0.96, upperY:5, lowerSpread:7,
      hipX:-18,      frontElbow:58, shoulderTwist:-18, headTilt:-5,
      backElbow:62,  rearFootLift:3, guardY:-3
    }, dur:3, sp:0.45 },

    // 3. FIRE — EXPLOSIVE HIP DRIVE. This is THE moment.
    //    Rear foot pivots hard (heel way up), hips SNAP forward,
    //    shoulders begin rotating, arm starts extending.
    //    Weight rushing onto lead leg.
    { p:{
      upperLean:18, lungeX:18, squash:0.92, upperY:-1, lowerSpread:7,
      hipX:14,      frontElbow:-2, shoulderTwist:28, headTilt:4,
      backElbow:68, rearFootLift:12, guardY:-4
    }, dur:5, sp:0.70 },

    // 4. IMPACT — Maximum rotation achieved. Arm fully locked out.
    //    Rear shoulder is now FORWARD. Hips fully committed.
    //    Feel the weight of the whole body behind the fist.
    { p:{
      upperLean:36, lungeX:34, squash:0.87, upperY:-5, lowerSpread:8,
      hipX:22,      frontElbow:-16, shoulderTwist:42, headTilt:7,
      backElbow:74, rearFootLift:16, guardY:-5
    }, dur:5, sp:0.92 },

    // 5. FREEZE — Impact hold for game feel, slight recoil absorption
    { p:{
      upperLean:34, lungeX:32, squash:0.89, upperY:-4, lowerSpread:7,
      hipX:20,      frontElbow:-14, shoulderTwist:40, headTilt:6,
      backElbow:72, rearFootLift:14, guardY:-4
    }, dur:4, sp:0.96 },

    // 6. RETRACT — Arm pulls back, hips begin derotating
    //    Weight starts recentering. Rear foot settles.
    { p:{
      upperLean:14, lungeX:12, squash:0.95, upperY:0,  lowerSpread:4,
      hipX:8,       frontElbow:28, shoulderTwist:14, headTilt:2,
      backElbow:60, rearFootLift:6, guardY:-1
    }, dur:5, sp:0.42 },

    // 7. RESET — Return to guard
    { p:{
      upperLean:0,  lungeX:0,  squash:1,    upperY:0,  lowerSpread:0,
      hipX:0,       frontElbow:48, shoulderTwist:0,  headTilt:0,
      backElbow:55, rearFootLift:0, guardY:0
    }, dur:6, sp:0.25 },
  ],

  // ─────────────────────────────────────────────────────────────────
  //  HOOK — Circular power punch. Close range devastation.
  //  Real mechanics: Elbow STAYS at 90° the entire time.
  //  Power comes ENTIRELY from hip torque + foot pivot.
  //  Arm doesn't extend — it SWINGS horizontally.
  //  Like a door slamming shut: the hinge (shoulder) rotates,
  //  the edge (fist) whips around in an arc.
  //  Total: ~28 frames ≈ 0.47 seconds
  // ─────────────────────────────────────────────────────────────────
  hook: [
    // 1. LOAD — Elbow rises to 90°, weight shifts to rear leg
    //    Hips coil AWAY from punch direction to load the spring
    { p:{
      upperLean:-8, lungeX:2,  squash:1.02, upperY:-3, lowerSpread:5,
      hipX:-10,     frontElbow:88, shoulderTwist:-20, headTilt:-6,
      backElbow:56, rearFootLift:2, guardY:-2
    }, dur:4, sp:0.42 },

    // 2. COIL — Maximum load. Hips coiled fully opposite.
    //    Like winding up a corkscrew. Energy stored in obliques.
    { p:{
      upperLean:-14, lungeX:2, squash:1.03, upperY:-4, lowerSpread:6,
      hipX:-14,      frontElbow:92, shoulderTwist:-26, headTilt:-8,
      backElbow:58,  rearFootLift:4, guardY:-3
    }, dur:3, sp:0.50 },

    // 3. FIRE — HIP SNAP! Explosive uncoiling.
    //    Lead foot pivots, hips FIRE around. Elbow stays bent.
    //    Fist begins horizontal arc toward target.
    { p:{
      upperLean:-26, lungeX:10, squash:0.94, upperY:-7, lowerSpread:7,
      hipX:14,       frontElbow:88, shoulderTwist:-34, headTilt:-4,
      backElbow:54,  rearFootLift:8, guardY:-2
    }, dur:4, sp:0.78 },

    // 4. IMPACT — Peak rotation. Fist at widest arc point.
    //    Entire body weight rotating INTO the punch.
    //    This is where the hook LANDS — devastating lateral force.
    { p:{
      upperLean:-34, lungeX:14, squash:0.91, upperY:-8, lowerSpread:8,
      hipX:20,       frontElbow:86, shoulderTwist:-40, headTilt:-2,
      backElbow:52,  rearFootLift:10, guardY:-1
    }, dur:4, sp:0.94 },

    // 5. FREEZE — Impact hold
    { p:{
      upperLean:-32, lungeX:12, squash:0.92, upperY:-7, lowerSpread:7,
      hipX:18,       frontElbow:86, shoulderTwist:-38, headTilt:-2,
      backElbow:52,  rearFootLift:8, guardY:-1
    }, dur:3, sp:0.96 },

    // 6. FOLLOW-THROUGH — Rotation continues past target naturally
    //    Body decelerates. Weight settling.
    { p:{
      upperLean:-18, lungeX:6,  squash:0.96, upperY:-4, lowerSpread:4,
      hipX:10,       frontElbow:76, shoulderTwist:-20, headTilt:-1,
      backElbow:54,  rearFootLift:4, guardY:0
    }, dur:4, sp:0.42 },

    // 7. RESET
    { p:{
      upperLean:0,   lungeX:0,  squash:1,    upperY:0,  lowerSpread:0,
      hipX:0,        frontElbow:48, shoulderTwist:0,  headTilt:0,
      backElbow:55,  rearFootLift:0, guardY:0
    }, dur:6, sp:0.25 },
  ],

  // ─────────────────────────────────────────────────────────────────
  //  UPPERCUT — Explosive upward strike from below.
  //  Real mechanics: Fighter DIPS (deep knee bend), drops center
  //  of mass, then EXPLODES upward. Fist travels tight vertical
  //  arc from hip to chin. Power generated by LEG EXTENSION.
  //  Short range, but the most punishing punch in boxing.
  //  Total: ~28 frames ≈ 0.47 seconds
  // ─────────────────────────────────────────────────────────────────
  upcut: [
    // 1. LOAD — Begin dropping. Knees start bending.
    //    Weight sinks, stance widens for stability.
    { p:{
      upperLean:4,  lungeX:0,  squash:0.82, upperY:18, lowerSpread:10,
      hipX:-2,      frontElbow:58, shoulderTwist:-4,  headTilt:-6,
      backElbow:56, rearFootLift:0, guardY:2
    }, dur:3, sp:0.40 },

    // 2. DEEP DIP — Maximum compression. Knees deeply bent.
    //    Center of mass at lowest point. Fist drops to hip level.
    //    This is the "loaded spring" — all energy stored in quads.
    { p:{
      upperLean:6,  lungeX:0,  squash:0.68, upperY:32, lowerSpread:14,
      hipX:-4,      frontElbow:62, shoulderTwist:-6,  headTilt:-8,
      backElbow:54, rearFootLift:0, guardY:4
    }, dur:4, sp:0.50 },

    // 3. SECONDARY DIP — Arm curls down ready for upward fire.
    //    Slight extra loading, fist at waist level now.
    { p:{
      upperLean:5,  lungeX:2,  squash:0.66, upperY:34, lowerSpread:14,
      hipX:-3,      frontElbow:55, shoulderTwist:-4,  headTilt:-6,
      backElbow:52, rearFootLift:0, guardY:5
    }, dur:2, sp:0.55 },

    // 4. FIRE — EXPLOSIVE UPWARD DRIVE!
    //    Legs EXTEND powerfully. Body rockets upward.
    //    Fist rips straight up from hip toward chin.
    //    (squash goes from 0.66 → 1.20, dramatic stretch!)
    { p:{
      upperLean:-14, lungeX:6, squash:1.20, upperY:-6, lowerSpread:8,
      hipX:10,       frontElbow:26, shoulderTwist:-14, headTilt:2,
      backElbow:60,  rearFootLift:6, guardY:-2
    }, dur:4, sp:0.88 },

    // 5. IMPACT — Fist at MAXIMUM HEIGHT. Body fully extended.
    //    Fighter may be on tippy-toes from the explosive extension.
    //    Devastating upward force under opponent's chin.
    { p:{
      upperLean:-28, lungeX:5, squash:1.16, upperY:-24, lowerSpread:7,
      hipX:12,       frontElbow:12, shoulderTwist:-18, headTilt:4,
      backElbow:62,  rearFootLift:8, guardY:-4
    }, dur:4, sp:0.94 },

    // 6. FREEZE — Impact hold
    { p:{
      upperLean:-26, lungeX:4, squash:1.12, upperY:-20, lowerSpread:6,
      hipX:10,       frontElbow:14, shoulderTwist:-16, headTilt:3,
      backElbow:60,  rearFootLift:6, guardY:-3
    }, dur:2, sp:0.96 },

    // 7. RETRACT — Fist comes back, body settles from stretch
    { p:{
      upperLean:-8, lungeX:2,  squash:1.02, upperY:-6, lowerSpread:4,
      hipX:4,       frontElbow:40, shoulderTwist:-6,  headTilt:0,
      backElbow:56, rearFootLift:2, guardY:0
    }, dur:4, sp:0.38 },

    // 8. RESET
    { p:{
      upperLean:0,  lungeX:0,  squash:1,    upperY:0,  lowerSpread:0,
      hipX:0,       frontElbow:48, shoulderTwist:0,  headTilt:0,
      backElbow:55, rearFootLift:0, guardY:0
    }, dur:5, sp:0.25 },
  ],

  // ─────────────────────────────────────────────────────────────────
  //  OVERHAND — Looping rear punch that arcs OVER the guard.
  //  Real mechanics: Similar chain to cross but trajectory goes
  //  UP and OVER, crashing down past the opponent's raised guard.
  // ─────────────────────────────────────────────────────────────────
  overhand: [
    // 1. LOAD — Weight back, rear hand lifts HIGH
    { p:{
      upperLean:-6, lungeX:-4, squash:0.96, upperY:3,  lowerSpread:5,
      hipX:-10,     frontElbow:-18, shoulderTwist:-14, headTilt:-4,
      backElbow:62, rearFootLift:2,  guardY:-2
    }, dur:4, sp:0.38 },

    // 2. COIL — Arm arcs UP. Shoulder loads. Trajectory going overhead.
    { p:{
      upperLean:8,  lungeX:8,  squash:0.94, upperY:-10, lowerSpread:5,
      hipX:6,       frontElbow:-26, shoulderTwist:18,  headTilt:4,
      backElbow:66, rearFootLift:8,  guardY:-4
    }, dur:4, sp:0.55 },

    // 3. OVER-THE-TOP — Arm at apex, crashing DOWN
    { p:{
      upperLean:28, lungeX:22, squash:0.90, upperY:4,  lowerSpread:6,
      hipX:16,      frontElbow:-32, shoulderTwist:34,  headTilt:8,
      backElbow:70, rearFootLift:14, guardY:0
    }, dur:5, sp:0.78 },

    // 4. IMPACT — Crashes down past guard
    { p:{
      upperLean:38, lungeX:28, squash:0.86, upperY:10, lowerSpread:6,
      hipX:20,      frontElbow:-28, shoulderTwist:38,  headTilt:10,
      backElbow:72, rearFootLift:16, guardY:2
    }, dur:5, sp:0.94 },

    // 5. FREEZE
    { p:{
      upperLean:36, lungeX:26, squash:0.88, upperY:8,  lowerSpread:5,
      hipX:18,      frontElbow:-26, shoulderTwist:36,  headTilt:8,
      backElbow:70, rearFootLift:12, guardY:1
    }, dur:3, sp:0.96 },

    // 6. RESET
    { p:{
      upperLean:0,  lungeX:0,  squash:1,    upperY:0,  lowerSpread:0,
      hipX:0,       frontElbow:48, shoulderTwist:0,   headTilt:0,
      backElbow:55, rearFootLift:0, guardY:0
    }, dur:7, sp:0.25 },
  ],

  // ─────────────────────────────────────────────────────────────────
  //  BODY SHOT — Dip down and dig into the ribs/liver.
  //  Real mechanics: Fighter crouches to get below opponent's
  //  elbows, then drives fist into midsection.
  // ─────────────────────────────────────────────────────────────────
  body: [
    // 1. DIP — Crouch down, get below the elbows
    { p:{
      upperLean:12, lungeX:4,  squash:0.76, upperY:26, lowerSpread:8,
      hipX:4,       frontElbow:34, shoulderTwist:8,   headTilt:8,
      backElbow:52, rearFootLift:2, guardY:4
    }, dur:4, sp:0.45 },

    // 2. DIG — Drive fist into body, compact and mean
    { p:{
      upperLean:32, lungeX:18, squash:0.80, upperY:20, lowerSpread:8,
      hipX:14,      frontElbow:16, shoulderTwist:22,  headTilt:12,
      backElbow:50, rearFootLift:6, guardY:6
    }, dur:5, sp:0.85 },

    // 3. IMPACT
    { p:{
      upperLean:38, lungeX:22, squash:0.82, upperY:18, lowerSpread:7,
      hipX:16,      frontElbow:18, shoulderTwist:26,  headTilt:12,
      backElbow:48, rearFootLift:6, guardY:6
    }, dur:4, sp:0.94 },

    // 4. RESET
    { p:{
      upperLean:0,  lungeX:0,  squash:1,    upperY:0,  lowerSpread:0,
      hipX:0,       frontElbow:48, shoulderTwist:0,   headTilt:0,
      backElbow:55, rearFootLift:0, guardY:0
    }, dur:7, sp:0.25 },
  ],
};


function lerpPose(cur, tgt, speed) {
  const out = {};
  for (const k in tgt) {
    const c = cur[k] !== undefined ? cur[k] : tgt[k];
    out[k] = c + (tgt[k] - c) * speed;
  }
  return out;
}
