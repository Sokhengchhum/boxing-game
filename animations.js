// ======== ANIMATION POSE SYSTEM ========
// Full-body articulated fighter animation — modeled after real boxing mechanics.
//
// POSE PARAMS:
//   upperLean   : torso forward/backward lean in degrees (+forward, –back)
//   lowerSpread : stance width offset (wider = more planted)
//   bob         : idle breathing amplitude
//   lungeX      : forward translation in px (weight transfer)
//   squash      : vertical scale (1=normal, <1=crouch, >1=stretch)
//   upperY      : vertical body offset (+down, –up)
//   hipX        : lateral hip shift for weight transfer
//   frontElbow  : punch arm elbow angle (0°=fully extended, 90°=hook bend, 48°=guard)
//
// NEW — Real fighter body mechanics:
//   shoulderRot : shoulder-line rotation in ° (independent of hip). +ve = front shoulder forward
//   rearArmX    : rear (guard) glove X offset from default (-26)
//   rearArmY    : rear (guard) glove Y offset from default (-86)
//   headTiltX   : head lateral tilt in px (+right, -left) — chin tuck / slip
//   headTiltY   : head vertical offset in px (+down, -up)
//   frontFootX  : front foot step forward/back offset (px)
//   rearFootX   : rear foot step forward/back offset (px)
//   frontKnee   : front knee bend angle (0=straight, + = more bent)
//   rearKnee    : rear knee bend angle
//   torsoTwist  : upper body twist relative to hips (simulates separate hip/shoulder turn)
//   armDirDeg   : override arm direction angle (forward angle from straight-down)

const POSE_DEFS = {
  // ─── NEUTRAL STATES ───
  idle: {
    upperLean:0, lowerSpread:0, bob:1, lungeX:0, squash:1, upperY:0, hipX:0, frontElbow:48,
    shoulderRot:0, rearArmX:0, rearArmY:0, headTiltX:0, headTiltY:0,
    frontFootX:0, rearFootX:0, frontKnee:0, rearKnee:0, torsoTwist:0
  },
  walk: {
    upperLean:3, lowerSpread:0, bob:1.5, lungeX:0, squash:1, upperY:0, hipX:0, frontElbow:47,
    shoulderRot:0, rearArmX:0, rearArmY:0, headTiltX:0, headTiltY:0,
    frontFootX:0, rearFootX:0, frontKnee:0, rearKnee:0, torsoTwist:0
  },

  // ─── JAB — lead hand, fast, body stays upright ───
  // Reference row 1: guard → shoulder pops → arm straight out, body upright
  jab: {
    upperLean:10, lowerSpread:3, bob:0, lungeX:22, squash:1.02, upperY:-2, hipX:6, frontElbow:-8,
    shoulderRot:12, rearArmX:4, rearArmY:6, headTiltX:-2, headTiltY:2,
    frontFootX:6, rearFootX:-2, frontKnee:4, rearKnee:2, torsoTwist:8
  },

  // ─── CROSS — rear hand, full rotation ───
  // Reference row 2: coil back → full hip drive → arm extended, body deeply rotated
  cross: {
    upperLean:28, lowerSpread:6, bob:0, lungeX:20, squash:0.95, upperY:-4, hipX:18, frontElbow:-14,
    shoulderRot:28, rearArmX:10, rearArmY:8, headTiltX:-3, headTiltY:3,
    frontFootX:8, rearFootX:6, frontKnee:6, rearKnee:8, torsoTwist:22
  },

  // ─── HOOK — 90° elbow, circular, close-range ───
  // Reference row 3: setup → hip torque → circular arc impact
  hook: {
    upperLean:-12, lowerSpread:5, bob:0, lungeX:8, squash:0.98, upperY:-5, hipX:14, frontElbow:90,
    shoulderRot:-18, rearArmX:-6, rearArmY:4, headTiltX:4, headTiltY:1,
    frontFootX:4, rearFootX:2, frontKnee:5, rearKnee:6, torsoTwist:-14
  },

  // ─── UPPERCUT — dip then explosive upward ───
  upcut: {
    upperLean:-14, lowerSpread:8, bob:0, lungeX:4, squash:1.06, upperY:-16, hipX:6, frontElbow:20,
    shoulderRot:-8, rearArmX:2, rearArmY:10, headTiltX:0, headTiltY:-4,
    frontFootX:2, rearFootX:4, frontKnee:10, rearKnee:12, torsoTwist:-6
  },

  // ─── OTHER ATTACKS ───
  overhand: {
    upperLean:22, lowerSpread:5, bob:0, lungeX:12, squash:0.92, upperY:5, hipX:14, frontElbow:-28,
    shoulderRot:20, rearArmX:6, rearArmY:6, headTiltX:-2, headTiltY:4,
    frontFootX:6, rearFootX:4, frontKnee:6, rearKnee:4, torsoTwist:16
  },
  body: {
    upperLean:30, lowerSpread:6, bob:0, lungeX:12, squash:0.86, upperY:12, hipX:10, frontElbow:24,
    shoulderRot:16, rearArmX:4, rearArmY:14, headTiltX:-1, headTiltY:6,
    frontFootX:4, rearFootX:2, frontKnee:10, rearKnee:6, torsoTwist:12
  },
  dash: {
    upperLean:32, lowerSpread:10, bob:0, lungeX:24, squash:0.92, upperY:-2, hipX:20, frontElbow:-6,
    shoulderRot:24, rearArmX:8, rearArmY:4, headTiltX:-4, headTiltY:2,
    frontFootX:14, rearFootX:-4, frontKnee:4, rearKnee:2, torsoTwist:18
  },
  super: {
    upperLean:28, lowerSpread:8, bob:0, lungeX:20, squash:0.94, upperY:-4, hipX:18, frontElbow:-18,
    shoulderRot:26, rearArmX:8, rearArmY:6, headTiltX:-3, headTiltY:2,
    frontFootX:10, rearFootX:4, frontKnee:6, rearKnee:6, torsoTwist:20
  },

  // ─── DEFENSIVE ───
  block: {
    upperLean:-6, lowerSpread:2, bob:0, lungeX:-4, squash:0.96, upperY:3, hipX:-4, frontElbow:62,
    shoulderRot:-4, rearArmX:8, rearArmY:-14, headTiltX:0, headTiltY:4,
    frontFootX:-2, rearFootX:0, frontKnee:4, rearKnee:4, torsoTwist:0
  },
  duck: {
    upperLean:10, lowerSpread:10, bob:0, lungeX:0, squash:0.78, upperY:18, hipX:0, frontElbow:42,
    shoulderRot:0, rearArmX:4, rearArmY:10, headTiltX:0, headTiltY:12,
    frontFootX:2, rearFootX:-2, frontKnee:14, rearKnee:14, torsoTwist:0
  },
  pull: {
    upperLean:-18, lowerSpread:2, bob:0, lungeX:-8, squash:1, upperY:0, hipX:-6, frontElbow:52,
    shoulderRot:-6, rearArmX:0, rearArmY:0, headTiltX:3, headTiltY:-2,
    frontFootX:-6, rearFootX:4, frontKnee:2, rearKnee:6, torsoTwist:-4
  },
  slip: {
    upperLean:14, lowerSpread:3, bob:0, lungeX:4, squash:0.95, upperY:6, hipX:4, frontElbow:42,
    shoulderRot:6, rearArmX:2, rearArmY:4, headTiltX:8, headTiltY:4,
    frontFootX:2, rearFootX:0, frontKnee:4, rearKnee:2, torsoTwist:4
  },

  // ─── REACTIONS ───
  hurt: {
    upperLean:-40, lowerSpread:2, bob:0, lungeX:-12, squash:1.05, upperY:0, hipX:-8, frontElbow:32,
    shoulderRot:-10, rearArmX:-8, rearArmY:6, headTiltX:-6, headTiltY:8,
    frontFootX:-4, rearFootX:4, frontKnee:4, rearKnee:2, torsoTwist:-8
  },
  ko: {
    upperLean:-85, lowerSpread:-5, bob:0, lungeX:-25, squash:1.1, upperY:45, hipX:-10, frontElbow:5,
    shoulderRot:-30, rearArmX:-14, rearArmY:20, headTiltX:-10, headTiltY:20,
    frontFootX:-8, rearFootX:8, frontKnee:0, rearKnee:0, torsoTwist:-20
  },

  // ─── SPECIAL ───
  kick: {
    upperLean:-22, lowerSpread:-15, bob:0, lungeX:16, squash:0.85, upperY:25, hipX:12, frontElbow:62,
    shoulderRot:-12, rearArmX:-4, rearArmY:8, headTiltX:0, headTiltY:0,
    frontFootX:20, rearFootX:0, frontKnee:-10, rearKnee:8, torsoTwist:-8
  },
  jump: {
    upperLean:0, lowerSpread:6, bob:0, lungeX:0, squash:1.04, upperY:-6, hipX:0, frontElbow:46,
    shoulderRot:0, rearArmX:0, rearArmY:-4, headTiltX:0, headTiltY:-2,
    frontFootX:0, rearFootX:0, frontKnee:6, rearKnee:6, torsoTwist:0
  },
};
const POSE_DEFAULT = POSE_DEFS.idle;


// ═══════════════════════════════════════════════════════════════════════════════
//  MULTI-PHASE ANIMATION KEYFRAMES
//  Each phase: { p = pose deltas, dur = frames, sp = lerp speed }
//
//  Based on the 3-pose reference images showing real boxing mechanics:
//    Image 1 (guard → extend → full extension): shows each punch as 3-step sequence
//    Guard position → body loads/coils → full extension with weight transfer
//
//  NEW: each phase now includes full-body mechanical data:
//    - shoulderRot: independent shoulder rotation (separate from hip)
//    - torsoTwist: upper/lower body separation (kinetic chain)
//    - rearArmX/Y: rear guard hand tracks independently
//    - frontFootX/rearFootX: feet step and pivot
//    - frontKnee/rearKnee: knee bend for power generation
//    - headTiltX/Y: head protection and natural tilt
// ═══════════════════════════════════════════════════════════════════════════════
const ANIM_PHASES = {

  // ═══════════════════════════════════════════════════════════════════════
  //  JAB — Quick lead-hand piston punch
  //  Reference: 3 poses showing guard → shoulder pop → full arm extension
  //  Real mechanics: Front shoulder pops forward, rear hand stays at chin,
  //  minimal hip rotation, body stays upright, front foot plants.
  // ═══════════════════════════════════════════════════════════════════════
  jab: [
    // Phase 1: LOAD — slight shoulder cock, rear hand tightens to chin
    //   Rear knee bends slightly to load. Head tilts behind front shoulder for protection.
    { p:{
      upperLean:-2, lungeX:-2, squash:1.03, upperY:2, lowerSpread:2, hipX:-3, frontElbow:55,
      shoulderRot:-4, rearArmX:6, rearArmY:-4, headTiltX:-1, headTiltY:1,
      frontFootX:-1, rearFootX:1, frontKnee:3, rearKnee:4, torsoTwist:-3
    }, dur:3, sp:0.55 },

    // Phase 2: PUSH — front shoulder fires forward, arm extends fast
    //   Weight shifts to front foot. Shoulder leads the fist. Rear hand guards chin.
    //   Reference pose 2: body still upright, arm shooting forward.
    { p:{
      upperLean:10, lungeX:24, squash:1.04, upperY:-2, lowerSpread:3, hipX:6, frontElbow:-4,
      shoulderRot:14, rearArmX:5, rearArmY:4, headTiltX:-2, headTiltY:2,
      frontFootX:5, rearFootX:-1, frontKnee:2, rearKnee:3, torsoTwist:10
    }, dur:4, sp:0.90 },

    // Phase 3: IMPACT — fully locked out arm, maximum reach
    //   Reference pose 3: Full extension, front shoulder rotated forward,
    //   head tucked behind shoulder for protection, rear hand at chin.
    { p:{
      upperLean:14, lungeX:30, squash:1.02, upperY:-3, lowerSpread:3, hipX:8, frontElbow:-10,
      shoulderRot:16, rearArmX:6, rearArmY:6, headTiltX:-3, headTiltY:2,
      frontFootX:7, rearFootX:-2, frontKnee:1, rearKnee:3, torsoTwist:12
    }, dur:4, sp:0.96 },

    // Phase 4: SNAP-BACK — fast arm retract (jab's signature speed)
    //   Shoulder pulls back, head returns to center, feet resettle.
    { p:{
      upperLean:4, lungeX:8, squash:1, upperY:-1, lowerSpread:1, hipX:2, frontElbow:38,
      shoulderRot:4, rearArmX:2, rearArmY:1, headTiltX:-1, headTiltY:0,
      frontFootX:2, rearFootX:0, frontKnee:1, rearKnee:1, torsoTwist:3
    }, dur:4, sp:0.78 },

    // Phase 5: RETURN TO GUARD
    { p:{
      upperLean:0, lungeX:0, squash:1, upperY:0, lowerSpread:0, hipX:0, frontElbow:48,
      shoulderRot:0, rearArmX:0, rearArmY:0, headTiltX:0, headTiltY:0,
      frontFootX:0, rearFootX:0, frontKnee:0, rearKnee:0, torsoTwist:0
    }, dur:5, sp:0.30 },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  //  CROSS — Powerful rear-hand straight punch
  //  Reference: 3 poses showing the kinetic chain (ground → hip → shoulder → fist)
  //  Real mechanics: Rear foot pivots on ball, hip drives forward and rotates,
  //  shoulders follow hips with delay (torsoTwist), rear hand becomes the
  //  punching hand, lead hand drops to guard body.
  // ═══════════════════════════════════════════════════════════════════════
  cross: [
    // Phase 1: COIL — Weight loads onto rear leg, torso coils
    //   Rear foot plants hard, rear knee bends for power. Shoulders pull back
    //   OPPOSITE to the punch direction (loading the whip). Head stays protected.
    { p:{
      upperLean:-10, lungeX:-6, squash:0.96, upperY:5, lowerSpread:7, hipX:-16, frontElbow:58,
      shoulderRot:-14, rearArmX:-4, rearArmY:-6, headTiltX:2, headTiltY:2,
      frontFootX:-2, rearFootX:2, frontKnee:4, rearKnee:10, torsoTwist:-12
    }, dur:6, sp:0.40 },

    // Phase 2: HIP DRIVE — hips fire first (kinetic chain starts from ground)
    //   Rear foot pivots (rearFootX increases). Hips rotate before shoulders
    //   (torsoTwist separates hip and shoulder timing). Rear knee extends.
    //   This is the "torque gap" — hips lead, shoulders lag = maximum power.
    { p:{
      upperLean:14, lungeX:14, squash:0.94, upperY:0, lowerSpread:7, hipX:10, frontElbow:8,
      shoulderRot:8, rearArmX:2, rearArmY:4, headTiltX:-1, headTiltY:2,
      frontFootX:4, rearFootX:6, frontKnee:3, rearKnee:6, torsoTwist:8
    }, dur:5, sp:0.65 },

    // Phase 3: SHOULDER WHIP — shoulders catch up to hips, arm extends
    //   Shoulder rotation overtakes hip rotation. The "whip" crack effect.
    //   Arm rapidly extends. Weight fully on front foot. Head behind shoulder.
    { p:{
      upperLean:30, lungeX:28, squash:0.90, upperY:-3, lowerSpread:8, hipX:18, frontElbow:-10,
      shoulderRot:26, rearArmX:8, rearArmY:8, headTiltX:-4, headTiltY:3,
      frontFootX:8, rearFootX:8, frontKnee:4, rearKnee:4, torsoTwist:20
    }, dur:5, sp:0.82 },

    // Phase 4: FULL IMPACT — maximum rotation, arm locked, body committed
    //   Reference final pose: body has rotated ~90°, arm fully extended,
    //   rear foot on ball, front knee slightly bent absorbing weight.
    { p:{
      upperLean:36, lungeX:34, squash:0.88, upperY:-5, lowerSpread:8, hipX:22, frontElbow:-16,
      shoulderRot:30, rearArmX:10, rearArmY:10, headTiltX:-4, headTiltY:3,
      frontFootX:10, rearFootX:10, frontKnee:5, rearKnee:2, torsoTwist:24
    }, dur:5, sp:0.94 },

    // Phase 5: RECOVERY — partial retract for combo chaining
    { p:{
      upperLean:12, lungeX:10, squash:0.96, upperY:0, lowerSpread:4, hipX:6, frontElbow:30,
      shoulderRot:8, rearArmX:4, rearArmY:4, headTiltX:-1, headTiltY:1,
      frontFootX:4, rearFootX:4, frontKnee:2, rearKnee:2, torsoTwist:6
    }, dur:5, sp:0.42 },

    // Phase 6: RETURN TO GUARD
    { p:{
      upperLean:0, lungeX:0, squash:1, upperY:0, lowerSpread:0, hipX:0, frontElbow:48,
      shoulderRot:0, rearArmX:0, rearArmY:0, headTiltX:0, headTiltY:0,
      frontFootX:0, rearFootX:0, frontKnee:0, rearKnee:0, torsoTwist:0
    }, dur:6, sp:0.25 },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  //  LEAD HOOK — Compact circular punch at close range
  //  Reference: 3 poses showing setup → lateral rotation → circular impact
  //  Real mechanics: Elbow LOCKS at 90°, arm is one rigid unit from elbow to fist.
  //  Power comes from explosive hip rotation. Front foot pivots. Head drops behind
  //  shoulder. Rear hand stays at chin for protection.
  // ═══════════════════════════════════════════════════════════════════════
  hook: [
    // Phase 1: SETUP — Elbow rises to 90°, hips coil opposite
    //   Front foot adjusts for pivot. Shoulders pull back to load rotation.
    //   Head tucks slightly. Rear hand tightens to chin.
    { p:{
      upperLean:-12, lungeX:2, squash:1.03, upperY:-3, lowerSpread:5, hipX:-12, frontElbow:92,
      shoulderRot:-16, rearArmX:-4, rearArmY:-6, headTiltX:3, headTiltY:1,
      frontFootX:2, rearFootX:-1, frontKnee:5, rearKnee:6, torsoTwist:-12
    }, dur:5, sp:0.45 },

    // Phase 2: HIP SNAP — Explosive lateral rotation
    //   Front foot pivots (toes turn in). Both knees drive the rotation.
    //   Shoulders begin whipping around. Elbow stays locked at 90°.
    //   This is the "door swinging" mechanic — body IS the hinge.
    { p:{
      upperLean:-26, lungeX:8, squash:0.95, upperY:-6, lowerSpread:7, hipX:14, frontElbow:90,
      shoulderRot:-24, rearArmX:-6, rearArmY:2, headTiltX:5, headTiltY:2,
      frontFootX:4, rearFootX:3, frontKnee:6, rearKnee:7, torsoTwist:-18
    }, dur:5, sp:0.75 },

    // Phase 3: IMPACT — Peak circular force, fist arrives at target
    //   Maximum body rotation. Fist has traveled full 90° arc.
    //   Front foot fully pivoted. Head is down behind shoulder.
    //   Reference: fist horizontal, body deeply torqued, compact deadly arc.
    { p:{
      upperLean:-34, lungeX:12, squash:0.92, upperY:-8, lowerSpread:8, hipX:20, frontElbow:86,
      shoulderRot:-30, rearArmX:-8, rearArmY:4, headTiltX:6, headTiltY:3,
      frontFootX:6, rearFootX:4, frontKnee:5, rearKnee:5, torsoTwist:-22
    }, dur:5, sp:0.94 },

    // Phase 4: FOLLOW-THROUGH — rotation continues past impact
    { p:{
      upperLean:-20, lungeX:6, squash:0.96, upperY:-4, lowerSpread:4, hipX:10, frontElbow:72,
      shoulderRot:-14, rearArmX:-4, rearArmY:2, headTiltX:3, headTiltY:1,
      frontFootX:3, rearFootX:2, frontKnee:3, rearKnee:3, torsoTwist:-10
    }, dur:5, sp:0.42 },

    // Phase 5: RETURN TO GUARD
    { p:{
      upperLean:0, lungeX:0, squash:1, upperY:0, lowerSpread:0, hipX:0, frontElbow:48,
      shoulderRot:0, rearArmX:0, rearArmY:0, headTiltX:0, headTiltY:0,
      frontFootX:0, rearFootX:0, frontKnee:0, rearKnee:0, torsoTwist:0
    }, dur:7, sp:0.25 },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  //  UPPERCUT — Deep crouch → explosive upward fist
  //  Reference: 3 poses showing dip → load → explosive rise
  //  Real mechanics: Both knees bend DEEP, center of mass drops significantly.
  //  Then legs extend explosively, driving fist upward in tight arc from waist
  //  to chin level. Short range. Fighter may rise to toes at peak.
  // ═══════════════════════════════════════════════════════════════════════
  upcut: [
    // Phase 1: DEEP DIP — knees bend, COM drops, fist drops to waist
    //   Both legs compress. Body crouches. Head drops with body.
    //   Rear hand stays up. Punching arm coils below for upward launch.
    { p:{
      upperLean:8, lungeX:0, squash:0.72, upperY:28, lowerSpread:14, hipX:-5, frontElbow:65,
      shoulderRot:-4, rearArmX:4, rearArmY:10, headTiltX:0, headTiltY:8,
      frontFootX:0, rearFootX:0, frontKnee:16, rearKnee:18, torsoTwist:-4
    }, dur:5, sp:0.40 },

    // Phase 2: SECONDARY LOAD — extra dip, arm drops lower
    //   This is the "spring loading" moment. Maximum knee bend.
    //   Fist is at its lowest point before exploding up.
    { p:{
      upperLean:6, lungeX:2, squash:0.68, upperY:32, lowerSpread:14, hipX:-3, frontElbow:58,
      shoulderRot:-6, rearArmX:4, rearArmY:12, headTiltX:0, headTiltY:10,
      frontFootX:1, rearFootX:1, frontKnee:18, rearKnee:20, torsoTwist:-5
    }, dur:3, sp:0.55 },

    // Phase 3: EXPLOSIVE DRIVE — legs extend, body rockets upward
    //   Knees straighten explosively (frontKnee/rearKnee drop toward 0).
    //   Squash goes to stretch. Hip drives upward. Fist rips from below.
    //   Shoulder rotates to drive the upward arc.
    { p:{
      upperLean:-14, lungeX:6, squash:1.18, upperY:-4, lowerSpread:8, hipX:10, frontElbow:28,
      shoulderRot:-10, rearArmX:2, rearArmY:6, headTiltX:0, headTiltY:-4,
      frontFootX:3, rearFootX:3, frontKnee:4, rearKnee:4, torsoTwist:-8
    }, dur:5, sp:0.85 },

    // Phase 4: PEAK IMPACT — fist at maximum height, arm extended up
    //   Body fully stretched. Fighter slightly on toes. Maximum upward force.
    //   Head pulls back to avoid opponent. Devastating chin-level impact.
    { p:{
      upperLean:-26, lungeX:5, squash:1.14, upperY:-22, lowerSpread:7, hipX:12, frontElbow:14,
      shoulderRot:-12, rearArmX:2, rearArmY:4, headTiltX:0, headTiltY:-6,
      frontFootX:4, rearFootX:3, frontKnee:2, rearKnee:2, torsoTwist:-10
    }, dur:4, sp:0.94 },

    // Phase 5: RETRACT — fist comes down, body settles
    { p:{
      upperLean:-8, lungeX:2, squash:1.02, upperY:-6, lowerSpread:4, hipX:4, frontElbow:40,
      shoulderRot:-4, rearArmX:1, rearArmY:2, headTiltX:0, headTiltY:-1,
      frontFootX:1, rearFootX:1, frontKnee:2, rearKnee:2, torsoTwist:-3
    }, dur:5, sp:0.38 },

    // Phase 6: RETURN TO GUARD
    { p:{
      upperLean:0, lungeX:0, squash:1, upperY:0, lowerSpread:0, hipX:0, frontElbow:48,
      shoulderRot:0, rearArmX:0, rearArmY:0, headTiltX:0, headTiltY:0,
      frontFootX:0, rearFootX:0, frontKnee:0, rearKnee:0, torsoTwist:0
    }, dur:6, sp:0.25 },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  //  OVERHAND — Looping over-the-top punch
  // ═══════════════════════════════════════════════════════════════════════
  overhand: [
    // 1. Windup — rear hand lifts high, weight coils back
    { p:{
      upperLean:-8, lungeX:-4, squash:0.96, upperY:4, lowerSpread:5, hipX:-10, frontElbow:-22,
      shoulderRot:-10, rearArmX:-4, rearArmY:-8, headTiltX:2, headTiltY:1,
      frontFootX:-2, rearFootX:2, frontKnee:4, rearKnee:8, torsoTwist:-8
    }, dur:5, sp:0.38 },
    // 2. Arm rises up for the over-the-top arc
    { p:{
      upperLean:10, lungeX:10, squash:0.94, upperY:-10, lowerSpread:5, hipX:6, frontElbow:-28,
      shoulderRot:12, rearArmX:4, rearArmY:6, headTiltX:-2, headTiltY:0,
      frontFootX:4, rearFootX:4, frontKnee:4, rearKnee:4, torsoTwist:10
    }, dur:4, sp:0.60 },
    // 3. Over-the-top crash down
    { p:{
      upperLean:32, lungeX:24, squash:0.88, upperY:8, lowerSpread:6, hipX:16, frontElbow:-32,
      shoulderRot:24, rearArmX:8, rearArmY:10, headTiltX:-4, headTiltY:5,
      frontFootX:8, rearFootX:6, frontKnee:6, rearKnee:3, torsoTwist:18
    }, dur:6, sp:0.80 },
    // 4. Impact
    { p:{
      upperLean:36, lungeX:26, squash:0.86, upperY:10, lowerSpread:5, hipX:18, frontElbow:-28,
      shoulderRot:26, rearArmX:8, rearArmY:10, headTiltX:-4, headTiltY:6,
      frontFootX:8, rearFootX:6, frontKnee:5, rearKnee:2, torsoTwist:20
    }, dur:5, sp:0.94 },
    // 5. Return
    { p:{
      upperLean:0, lungeX:0, squash:1, upperY:0, lowerSpread:0, hipX:0, frontElbow:48,
      shoulderRot:0, rearArmX:0, rearArmY:0, headTiltX:0, headTiltY:0,
      frontFootX:0, rearFootX:0, frontKnee:0, rearKnee:0, torsoTwist:0
    }, dur:8, sp:0.25 },
  ],

  // ═══════════════════════════════════════════════════════════════════════
  //  BODY SHOT — Dip and dig low
  // ═══════════════════════════════════════════════════════════════════════
  body: [
    // 1. Dip — crouching toward the body
    { p:{
      upperLean:14, lungeX:4, squash:0.78, upperY:24, lowerSpread:8, hipX:4, frontElbow:32,
      shoulderRot:8, rearArmX:2, rearArmY:10, headTiltX:-1, headTiltY:6,
      frontFootX:2, rearFootX:0, frontKnee:12, rearKnee:10, torsoTwist:6
    }, dur:4, sp:0.45 },
    // 2. Drive into the body
    { p:{
      upperLean:34, lungeX:18, squash:0.82, upperY:18, lowerSpread:8, hipX:14, frontElbow:18,
      shoulderRot:18, rearArmX:6, rearArmY:14, headTiltX:-2, headTiltY:8,
      frontFootX:6, rearFootX:2, frontKnee:8, rearKnee:6, torsoTwist:14
    }, dur:5, sp:0.85 },
    // 3. Impact hold
    { p:{
      upperLean:38, lungeX:20, squash:0.84, upperY:16, lowerSpread:7, hipX:14, frontElbow:20,
      shoulderRot:20, rearArmX:6, rearArmY:14, headTiltX:-2, headTiltY:8,
      frontFootX:6, rearFootX:2, frontKnee:7, rearKnee:5, torsoTwist:16
    }, dur:4, sp:0.94 },
    // 4. Return
    { p:{
      upperLean:0, lungeX:0, squash:1, upperY:0, lowerSpread:0, hipX:0, frontElbow:48,
      shoulderRot:0, rearArmX:0, rearArmY:0, headTiltX:0, headTiltY:0,
      frontFootX:0, rearFootX:0, frontKnee:0, rearKnee:0, torsoTwist:0
    }, dur:7, sp:0.25 },
  ],
};


// ── Smooth pose interpolation ──
function lerpPose(cur, tgt, speed) {
  const out = {};
  for (const k in tgt) {
    const c = cur[k] !== undefined ? cur[k] : tgt[k];
    out[k] = c + (tgt[k] - c) * speed;
  }
  return out;
}
