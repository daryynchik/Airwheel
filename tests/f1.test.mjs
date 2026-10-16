import assert from "node:assert/strict";
import { Track } from "../src/game/track.js";
import MONACO from "../src/game/tracks/monaco.js";
import { CARS } from "../src/game/cars.js";
import { computeRacingLine, speedProfile } from "../src/game/profile.js";
import { createCar, stepCar, STEP } from "../src/game/physics.js";
import {
  createTire,
  updateTire,
  tempGrip,
  fitTires,
} from "../src/game/tires.js";
import { RaceSession } from "../src/game/session.js";
import { createBots } from "../src/game/bots.js";
import { autopilotInput } from "../src/game/autopilot.js";
import { buildCarScene } from "../src/render/carGen.js";

const tr = new Track(MONACO),
  spec = CARS.f1;
tr.racingLine = computeRacingLine(tr);
const prof = speedProfile(tr, tr.racingLine, spec);
assert.ok(Math.abs(tr.length - 3337) < 1);
assert.equal(tr.corners.length, 19);
assert.ok(MONACO.tunnel.from < MONACO.tunnel.to);
assert.ok(tr.pit.boxStep > 5);
console.log("✓ Monaco: 3337 m, 19 corners, tunnel and usable pit boxes");

assert.ok(tempGrip("medium", 30) < tempGrip("medium", 100) * 0.8);
assert.ok(tempGrip("medium", 145) < tempGrip("medium", 100));
const coldCar = createCar(spec, tr);
coldCar.tire = createTire();
for (let i = 0; i < 120 * 30; i++) {
  coldCar.u = 30;
  coldCar.brake = 0.6;
  coldCar.wheels.forEach((w) =>
    Object.assign(w, { mu: 1.5, load: 3000, fx: 2500, fy: 2000, slip: 0.08 }),
  );
  updateTire(coldCar, STEP);
}
assert.ok(coldCar.tire.temp > 85);
assert.ok(coldCar.tire.brakes.every((t) => t > 400));
fitTires(coldCar, "soft");
assert.equal(coldCar.tire.temp, 70);
assert.deepEqual(coldCar.tire.core, [70, 70, 70, 70]);
console.log(
  "✓ Blankets, cold grip, brake heat, carcass warm-up and fresh pit tyres",
);

const events = [],
  bots = createBots(11, spec, tr, { seed: 7 });
const S = new RaceSession({
  track: tr,
  spec,
  prof,
  laps: 1,
  onEvent: (e) => events.push(e),
});
const order = [...bots];
order.splice(5, 0, "player");
S.start(order);
assert.equal(S.state, "formation");
S.judge(S.player, [{ type: "wall", speed: 35 }], STEP);
assert.equal(S.player.penalty, 0);
let formationSteps = 0;
while (S.state === "formation" && formationSteps++ < 120 * 230) {
  S.step(STEP, autopilotInput(S.playerCar, tr, prof, spec, { pace: 0.8 }));
  assert.equal(S.time, 0);
  assert.equal(S.player.timing.lapTimes.length, 0);
}
assert.equal(S.state, "grid");
assert.ok(S.playerCar.tire.temp > 80, "formation must actually warm tyres");
assert.ok(Math.abs(S.playerCar.progress - S.player.slot.s) < 0.1);
assert.ok(S.entries.every((e) => e.timing.lapTimes.length === 0));
while (S.state === "grid") S.step(STEP, { steer: 0, gas: false, brake: true });
assert.equal(events.filter((e) => e.type === "light").length, 5);
assert.equal(S.player.penalty, 0);
let raceSteps = 0;
while (S.state !== "done" && raceSteps++ < 120 * 230)
  S.step(STEP, autopilotInput(S.playerCar, tr, prof, spec, { pace: 0.8 }));
assert.equal(S.state, "done");
assert.equal(S.player.timing.lapTimes.length, 1);
assert.ok(S.time < 230 && S.time > 60);
console.log(
  "✓ Full F1 weekend: untimed formation → original grid → 5 lights → one timed race lap",
);

const noFormation = new RaceSession({
  track: tr,
  spec,
  prof,
  formation: false,
});
noFormation.start(["player"]);
assert.equal(noFormation.state, "grid");
const noAids = createCar(spec, tr);
noAids.u = 40;
for (let i = 0; i < 30; i++)
  stepCar(noAids, { gas: false, brake: true, steer: 0.1 }, STEP, tr, {
    assist: 0,
  });
assert.equal(noAids.aids, false);
assert.equal(noAids.abs, false);
assert.equal(noAids.tc, false);
console.log(
  "✓ Formation opt-out for network sessions; F1 assists off disables ABS/TC",
);

const model = buildCarScene(spec);
let meshes = 0;
model.traverse((o) => {
  if (!o.isMesh) return;
  meshes++;
  assert.ok(
    Array.from(o.geometry.attributes.position.array).every(Number.isFinite),
  );
});
assert.ok(meshes > 10);
console.log("✓ New F1 geometry contains no non-finite vertices");
