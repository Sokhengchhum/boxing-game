// ── Base Class (The "Genus" equivalent) ──
class Boxer {
  constructor(id, name, weight, height) {
    this.id = id;
    this.name = name;
    this.weight = weight;
    this.height = height;
  }

  // Common method for all boxers
  getDetails() {
    return `${this.name} (Weight Class: ${this.weight}/5, Height: ${this.height}/5)`;
  }
}

// ── Sub-Classes (The "Species" equivalent) ──

// Slugger archetype emphasizes power and recovery
class Slugger extends Boxer {
  constructor(id, name, weight, height, hasBeard) {
    super(id, name, weight, height);
    this.archetype = "Slugger";
    this.powerModifier = 1.3;
    this.speed = 3;
    this.hasBeard = hasBeard;
  }

  performHeavyAttack() {
    return `${this.name} winds up for a devastating slugger punch!`;
  }
}

// Speedster archetype emphasizes dodging and speed
class Speedster extends Boxer {
  constructor(id, name, weight, height) {
    super(id, name, weight, height);
    this.archetype = "Speedster";
    this.powerModifier = 0.8;
    this.speed = 5;
  }

  performDodge() {
    return `${this.name} swiftly slips the punch using max speed!`;
  }
}

// ── Creating Instances ──
const barrera = new Slugger("barrera", "BARRERA", 4, 3, true);
const jackson = new Speedster("jackson", "JACKSON", 3, 4);

console.log(barrera.getDetails());
// "BARRERA (Weight Class: 4/5, Height: 3/5)"
console.log(barrera.performHeavyAttack());
// "BARRERA winds up for a devastating slugger punch!"

console.log(jackson.getDetails());
// "JACKSON (Weight Class: 3/5, Height: 4/5)"
console.log(jackson.performDodge());
// "JACKSON swiftly slips the punch using max speed!"
