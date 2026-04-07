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

