// Untimed formation lap. The field follows in grid order; the player's last
// 100 metres are guided into the original slot before the five-light start.
import { stepCar, placeCar, speedOf } from "./physics.js";
import { updateTire } from "./tires.js";
import { autopilotInput } from "./autopilot.js";

export function stepFormation(session, dt, input) {
  const S = session,
    tr = S.track,
    p = S.player,
    car = p.car;
  S.updateWeather(dt);
  S.formationTime += dt;
  const goal = p.slot.s + tr.length;
  const remaining = goal - car.progress;
  let control = input;
  const docking = remaining < 95;
  if (docking) {
    const guide = autopilotInput(car, tr, S.opts.prof, S.spec, {
      assist: S.assist,
      lineOffset: () => p.slot.d,
    });
    const want = Math.min(18, Math.sqrt(2 * 4 * Math.max(0, remaining - 1)));
    control = {
      steer: guide.steer,
      gas: speedOf(car) < want - 0.3,
      brake: speedOf(car) > want + 0.2,
      nitro: false,
    };
  }
  // Keep the qualified order during warm-up: the driver follows the car ahead.
  const playerIndex = S.entries.indexOf(p);
  const preceding = playerIndex > 0 ? S.entries[playerIndex - 1] : null;
  if (preceding?.bot && !docking) {
    const gap = preceding.bot.progress - car.progress;
    const safeSpeed = Math.sqrt(preceding.bot.v ** 2 + 8 * Math.max(0, gap - 12));
    if (gap < 9 || speedOf(car) > safeSpeed) {
      control = { ...control, gas: false, brake: true };
    }
  }
  car.boostOn = false;
  const events = stepCar(car, control, dt, tr, {
    assist: S.assist,
    wetness: S.wetness,
    noReverse: docking,
    limiter: 28,
  });
  updateTire(car, dt, S.wetness);
  S.lastPhysics = events;
  for (const e of events) S.emit({ ...e, entry: p });
  if (car.stuckT > 4 || car.wrongWayT > 4) {
    placeCar(car, tr, car.progress, 0);
    car.u = car.v = car.r = 0;
    car.stuckT = car.wrongWayT = 0;
  }
  // Independent convoy following: no overtaking or pit strategy on this lap.
  let ahead = Infinity;
  for (const e of S.entries) {
    if (e.isPlayer) {
      ahead = car.progress;
      continue;
    }
    if (!e.bot) continue;
    const b = e.bot;
    b.savePrev();
    const end = e.slot.s + tr.length;
    const gap = ahead - b.progress;
    const vProfile = S.opts.prof?.v[tr.index(b.s)] ?? 25;
    const want = Math.max(
      0,
      Math.min(24, vProfile * 0.65, (end - b.progress) * 1.2, (gap - 11) * 1.3),
    );
    b.v += Math.max(-6 * dt, Math.min(3 * dt, want - b.v));
    b.progress = Math.min(end, b.progress + b.v * dt);
    b.s = tr.wrapS(b.progress);
    b.d +=
      ((tr.racingLine?.offset[tr.index(b.s)] ?? 0) - b.d) * Math.min(1, dt * 2);
    b.spin += (b.v * dt) / S.spec.dims.wheelR;
    b.pose(0);
    ahead = b.progress;
  }
  S.formationRemaining = Math.max(0, remaining);
  if ((remaining < 4 && speedOf(car) < 2) || remaining < -6) finishFormation(S);
}

export function finishFormation(S) {
  const tr = S.track;
  // Formation laps never enter lap timing, penalties, race time or results.
  for (const e of S.entries) {
    if (e.isPlayer) {
      placeCar(e.car, tr, e.slot.s, e.slot.d);
      e.car.u = e.car.v = e.car.r = 0;
      e.car.throttle = e.car.brake = 0;
      e.car.stuckT = e.car.wrongWayT = 0;
    } else if (e.bot) e.bot.place(e.slot.s, e.slot.d);
    e.timing.reset();
    e.lastBin = -1;
    e.passTimes = [];
  }
  S.time = 0;
  S.phaseT = -2;
  S.lights = 0;
  S.state = "grid";
  S.emit({ type: "formation-end" });
}
