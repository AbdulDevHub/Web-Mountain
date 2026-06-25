// p5.js — Bouncing Balloons
// Click to add balloons. Press 'r' to reset.

let balloons = [];
const NUM_START = 75;
let font;

let link;

function preload() {
  font = loadFont("TitanOne.ttf");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(RADIANS);

  resetBalloons(NUM_START);

  textFont(font);

  link = createA(
    "https://forms.office.com/r/ZSd26JX5hN",
    "Participate here!"
  );

  link.style("font-size", "75px");
  link.style("font-family", "helvetica");
  link.attribute("target", "_blank");
}

function draw() {
  background(245);

  noStroke();

  for (let i = 0; i < 30; i++) {
    fill(0, 0, 0, 10);

    circle(
      (frameCount * 3 + i * 29) % width,
      (i * 61) % height,
      2
    );
  }

  for (const b of balloons) {
    b.update();
    b.bounceEdges();
    b.drawString();
    b.drawBalloon();
  }

  fill(0, 120);
  noStroke();
  textSize(13);
  text("click: add balloon | r: reset", 12, height - 14);

  push();

  fill(255, 193, 110);

  textAlign(CENTER);

  textSize(180);
  text("ICCIT", width / 2 + 10, height / 2 - 150);

  textSize(100);
  text("End of Year", width / 2 + 10, height / 2 - 50);

  textSize(150);
  text("Showcase", width / 2 + 10, height / 2 + 75);

  textSize(50);
  text(
    "April 7th, 2026. 12-3:30pm.",
    width / 2 + 10,
    height / 2 + 125
  );

  fill(255, 230, 25);

  textSize(180);
  text("ICCIT", width / 2, height / 2 - 150);

  textSize(100);
  text("End of Year", width / 2, height / 2 - 55);

  textSize(150);
  text("Showcase", width / 2, height / 2 + 70);

  textSize(50);
  text(
    "April 7th, 2026. 12-3:30pm.",
    width / 2 + 5,
    height / 2 + 125
  );

  link.position(width / 2 - 300, height / 2 + 150);

  pop();
}

function mouseMoved() {
  balloons.push(new Balloon(mouseX, mouseY));
}

function keyPressed() {
  if (key === "r" || key === "R") {
    resetBalloons(NUM_START);
  }
}

function resetBalloons(n) {
  balloons = [];

  for (let i = 0; i < n; i++) {
    balloons.push(
      new Balloon(random(width), random(height))
    );
  }
}

class Balloon {
  constructor(x, y) {
    this.pos = createVector(x, y);

    this.r = random(22, 52);
    this.mass = map(this.r, 22, 52, 0.8, 1.8);

    this.vel = p5.Vector.random2D().mult(
      random(1.0, 2.6)
    );

    this.vel.y -= random(0.6, 1.4);

    this.wind = random(-0.02, 0.02);

    this.base = color(
      random(60, 255),
      random(60, 255),
      random(60, 255)
    );

    this.highlight = color(255, 255, 255, 90);

    this.phase = random(TWO_PI);
    this.wobbleSpeed = random(0.015, 0.035);
    this.wobbleAmt = random(0.1, 0.22);

    this.stringLen = random(55, 105);

    this.knot = random(6, 10);
  }

  update() {
    const buoyancy = -0.03 * this.mass;
    const gravity = 0.012 * this.mass;

    this.vel.y += buoyancy + gravity;

    this.vel.x +=
      this.wind +
      (noise(frameCount * 0.01 + this.phase) - 0.5) *
        0.03;

    this.vel.limit(3.5);

    this.pos.add(this.vel);

    this.phase += this.wobbleSpeed;
  }

  bounceEdges() {
    const pad = this.r * 0.7;

    if (this.pos.x < pad) {
      this.pos.x = pad;
      this.vel.x *= -1;
    } else if (this.pos.x > width - pad) {
      this.pos.x = width - pad;
      this.vel.x *= -1;
    }

    if (this.pos.y < pad) {
      this.pos.y = pad;
      this.vel.y *= -1;
    } else if (this.pos.y > height - pad) {
      this.pos.y = height - pad;
      this.vel.y *= -1;
    }
  }

  drawBalloon() {
    push();

    translate(this.pos.x, this.pos.y);

    const wob = sin(this.phase) * this.wobbleAmt;
    const rot = sin(this.phase * 0.9) * 0.18;

    rotate(rot);

    scale(
      1 + wob * 0.25,
      1 - wob * 0.15
    );

    noStroke();
    fill(this.base);

    const w = this.r * 1.05;
    const h = this.r * 1.25;

    ellipse(0, 0, w * 2, h * 2);

    fill(this.highlight);

    ellipse(
      -this.r * 0.25,
      -this.r * 0.25,
      w * 0.6,
      h * 0.7
    );

    fill(0, 0, 0, 35);

    triangle(
      -this.knot * 0.5,
      h * 1.05,
      this.knot * 0.5,
      h * 1.05,
      0,
      h * 1.25
    );

    pop();
  }

  drawString() {
    const wobX =
      sin(this.phase * 1.2) *
      this.r *
      0.25;

    const wobY =
      cos(this.phase * 1.1) * 3;

    const startX = this.pos.x + wobX;
    const startY =
      this.pos.y +
      this.r +
      wobY;

    const endX =
      this.pos.x -
      wobX * 0.8;

    const endY =
      startY +
      this.stringLen;

    stroke(40, 110);
    strokeWeight(2);
    noFill();

    const c1x =
      lerp(startX, endX, 0.35) +
      wobX * 1.2;

    const c1y =
      lerp(startY, endY, 0.35) + 10;

    const c2x =
      lerp(startX, endX, 0.75) -
      wobX * 1.1;

    const c2y =
      lerp(startY, endY, 0.75) - 10;

    bezier(
      startX,
      startY,
      c1x,
      c1y,
      c2x,
      c2y,
      endX,
      endY
    );

    noStroke();
    fill(40, 110);

    circle(endX, endY, 4);
  }
}