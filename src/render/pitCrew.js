// Articulated human crew, batched by body part. A complete crew costs ~14 draws,
// regardless of how many garages are visible. Animation uses simulation time.
import * as THREE from "three";
const up = new THREE.Vector3(0, 1, 0);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const CREW_COUNT = 14;

export function buildPitCrew(track, lane) {
  const group = new THREE.Group();
  group.name = "articulated-pit-crew";
  const count = lane.boxCount * CREW_COUNT;
  const suit = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x141820,
    roughness: 0.7,
  });
  const helmet = new THREE.MeshPhysicalMaterial({
    color: 0xf1f3f5,
    roughness: 0.25,
    clearcoat: 1,
  });
  const visor = new THREE.MeshStandardMaterial({
    color: 0x111d27,
    roughness: 0.12,
    metalness: 0.7,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x777f89,
    roughness: 0.35,
    metalness: 0.8,
  });
  const batch = (geo, mat, n = count) => {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.castShadow = true;
    group.add(m);
    return m;
  };
  const capsule = (r, len) => {
    const g = new THREE.CapsuleGeometry(r, len, 4, 8);
    g.translate(0, -len / 2 - r, 0);
    return g;
  };
  const torso = batch(new THREE.CapsuleGeometry(0.19, 0.34, 4, 10), suit);
  const pelvis = batch(new THREE.CapsuleGeometry(0.17, 0.09, 4, 8), suit);
  const heads = batch(new THREE.SphereGeometry(0.155, 12, 10), helmet);
  const visors = batch(
    new THREE.SphereGeometry(
      0.159,
      12,
      6,
      0,
      Math.PI,
      Math.PI * 0.33,
      Math.PI * 0.32,
    ),
    visor,
  );
  const upper = batch(capsule(0.075, 0.19), suit, count * 2);
  const lower = batch(capsule(0.065, 0.18), suit, count * 2);
  const thighs = batch(capsule(0.095, 0.23), suit, count * 2);
  const shins = batch(capsule(0.075, 0.25), suit, count * 2);
  const gloves = batch(new THREE.SphereGeometry(0.075, 8, 6), dark, count * 2);
  const boots = batch(new THREE.BoxGeometry(0.13, 0.11, 0.26), dark, count * 2);
  const chest = batch(new THREE.BoxGeometry(0.32, 0.055, 0.06), helmet);
  const guns = batch(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8), metal);
  const tyreGeo = new THREE.TorusGeometry(0.255, 0.105, 8, 20);
  tyreGeo.rotateY(Math.PI / 2);
  const tyres = batch(
    tyreGeo,
    new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.92 }),
    lane.boxCount * 8,
  );
  const jacks = batch(
    new THREE.BoxGeometry(0.65, 0.06, 0.5),
    metal,
    lane.boxCount * 2,
  );
  const handles = batch(
    new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8),
    metal,
    lane.boxCount * 2,
  );
  const part = (parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const rigs = [];
  for (let i = 0; i < count; i++) {
    const root = new THREE.Object3D(),
      hip = part(root, 0, 0.88, 0),
      body = part(hip, 0, 0.3, 0);
    const head = part(body, 0, 0.42, 0),
      stripe = part(body, 0, 0.06, 0.18);
    const arms = [-1, 1].map((s) => {
      const a = part(body, s * 0.23, 0.2, 0),
        e = part(a, 0, -0.34, 0),
        h = part(e, 0, -0.31, 0);
      return { a, e, h };
    });
    const legs = [-1, 1].map((s) => {
      const a = part(hip, s * 0.11, 0, 0),
        k = part(a, 0, -0.42, 0),
        f = part(k, 0, -0.43, 0.06);
      return { a, k, f };
    });
    rigs.push({ root, hip, body, head, stripe, arms, legs, mix: 0 });
  }
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    scale = new THREE.Vector3(1, 1, 1);
  const write = (mesh, index, obj) => mesh.setMatrixAt(index, obj.matrixWorld);
  const hidden = (mesh, index) => {
    m.makeScale(0, 0, 0);
    mesh.setMatrixAt(index, m);
  };
  let clock = 0;
  const stations = (c, spec) => {
    if (c >= 12)
      return {
        x: 0,
        z: c === 12 ? 2.95 : -2.95,
        face: c === 12 ? Math.PI : 0,
        role: 3,
      };
    const wheel = Math.floor(c / 3),
      role = c % 3,
      side = wheel % 2 === 0 ? 1 : -1;
    const z =
      wheel < 2
        ? (spec?.wheelbase ?? 3.6) * (1 - (spec?.weightFront ?? 0.45)) +
          (spec?.dims.cgZ ?? -0.3)
        : -(spec?.wheelbase ?? 3.6) * (spec?.weightFront ?? 0.45) +
          (spec?.dims.cgZ ?? -0.3);
    return {
      x: side * (role === 0 ? 1.38 : 1.8),
      z: z + (role === 1 ? -0.68 : role === 2 ? 0.68 : 0),
      face: (-side * Math.PI) / 2,
      role,
    };
  };
  return {
    group,
    setColors(colors = []) {
      for (let i = 0; i < count; i++) {
        const color = new THREE.Color(
          colors[Math.floor(i / CREW_COUNT)] || "#d92e38",
        );
        for (const mesh of [torso, pelvis]) mesh.setColorAt(i, color);
        for (const mesh of [upper, lower, thighs, shins]) {
          mesh.setColorAt(i * 2, color);
          mesh.setColorAt(i * 2 + 1, color);
        }
      }
      for (const mesh of [torso, pelvis, upper, lower, thighs, shins])
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    update(dt, service = []) {
      clock += dt;
      const busy = new Map(
        service.filter((s) => s.active).map((s) => [s.box, s]),
      );
      for (let b = 0; b < lane.boxCount; b++) {
        const sv = busy.get(b),
          prog = sv?.progress ?? -1,
          working = !!sv && prog >= 0 && prog < 0.94;
        const bs = lane.boxS(b),
          centre = track.pointAt(bs, lane.side * lane.workD(bs));
        const heading = sv?.car?.psi ?? track.headingAt(bs);
        // Service is centred on the actual stopped car, including a slightly missed mark.
        const cx = sv?.car?.x ?? centre.x,
          cz = sv?.car?.z ?? centre.z,
          cy = sv?.car?.y ?? centre.y;
        for (let c = 0; c < CREW_COUNT; c++) {
          const i = b * CREW_COUNT + c,
            r = rigs[i],
            st = stations(c, sv?.car?.spec);
          r.mix += (Number(!!sv) - r.mix) * Math.min(1, dt * 7);
          const home = track.pointAt(
            bs + ((c % 7) - 3) * 0.65,
            lane.side * (lane.workD(bs) + 6.4 + Math.floor(c / 7)),
          );
          const x = cx + st.x * Math.cos(heading) + st.z * Math.sin(heading),
            z = cz - st.x * Math.sin(heading) + st.z * Math.cos(heading);
          r.root.position.set(
            home.x + (x - home.x) * r.mix,
            home.y + (cy - home.y) * r.mix,
            home.z + (z - home.z) * r.mix,
          );
          r.root.rotation.y = heading + st.face;
          const kneel = (c < 12 ? 1 : 0.45) * r.mix;
          const work = working ? Math.sin(clock * 28 + c) * 0.035 : 0;
          r.hip.position.y = 0.88 - kneel * 0.27;
          r.body.rotation.x = kneel * 0.4;
          const walking =
            r.mix > 0.03 && r.mix < 0.93 ? Math.sin(clock * 12 + c) * 0.5 : 0;
          for (let j = 0; j < 2; j++) {
            r.legs[j].a.rotation.x =
              -kneel * (j === 0 ? 1.25 : 0.8) + walking * (j === 0 ? 1 : -1);
            r.legs[j].k.rotation.x = kneel * (j === 0 ? 2.0 : 1.4);
            r.arms[j].a.rotation.x = -kneel * 0.65 - walking * 0.5 + work;
            r.arms[j].a.rotation.z = (j === 0 ? -1 : 1) * (0.12 + kneel * 0.12);
            r.arms[j].e.rotation.x = -kneel * 0.45;
          }
          // Removal crew pulls back the old wheel, fitters bring the replacement in.
          if (c < 12 && working && st.role !== 0) {
            const reach =
              st.role === 1
                ? ease(0.22, 0.44, prog) * (1 - ease(0.72, 0.9, prog))
                : 1 - ease(0.42, 0.65, prog);
            r.arms.forEach((a) => (a.a.rotation.x -= reach * 0.12));
          }
          r.root.updateMatrixWorld(true);
          write(torso, i, r.body);
          write(pelvis, i, r.hip);
          write(heads, i, r.head);
          write(visors, i, r.head);
          write(chest, i, r.stripe);
          for (let j = 0; j < 2; j++) {
            write(upper, i * 2 + j, r.arms[j].a);
            write(lower, i * 2 + j, r.arms[j].e);
            write(gloves, i * 2 + j, r.arms[j].h);
            write(thighs, i * 2 + j, r.legs[j].a);
            write(shins, i * 2 + j, r.legs[j].k);
            write(boots, i * 2 + j, r.legs[j].f);
          }
          if (c < 12 && st.role === 0) write(guns, i, r.arms[1].h);
          else hidden(guns, i);
        }
        for (let wheel = 0; wheel < 4; wheel++) {
          const side = wheel % 2 === 0 ? 1 : -1,
            st = stations(wheel * 3, sv?.car?.spec);
          for (let kind = 0; kind < 2; kind++) {
            const index = b * 8 + wheel * 2 + kind;
            if (!sv || prog < 0.15 || prog > 0.88) {
              hidden(tyres, index);
              continue;
            }
            const travel =
              kind === 0 ? ease(0.22, 0.45, prog) : 1 - ease(0.43, 0.69, prog);
            const lx = side * (0.82 + travel * 1.45),
              lz = st.z + (kind === 0 ? -0.6 : 0.6) * travel;
            p.set(
              cx + lx * Math.cos(heading) + lz * Math.sin(heading),
              cy + 0.36 + travel * 0.14,
              cz - lx * Math.sin(heading) + lz * Math.cos(heading),
            );
            q.setFromAxisAngle(up, heading);
            m.compose(p, q, scale);
            tyres.setMatrixAt(index, m);
          }
        }
        for (let j = 0; j < 2; j++) {
          const i = b * 2 + j;
          if (!sv) {
            hidden(jacks, i);
            hidden(handles, i);
            continue;
          }
          const z = j === 0 ? 2.8 : -2.8;
          p.set(
            cx + Math.sin(heading) * z,
            cy + 0.08,
            cz + Math.cos(heading) * z,
          );
          q.setFromAxisAngle(up, heading);
          m.compose(p, q, scale);
          jacks.setMatrixAt(i, m);
          p.y += 0.45;
          q.setFromEuler(new THREE.Euler(0.55, heading, 0));
          m.compose(p, q, scale);
          handles.setMatrixAt(i, m);
        }
      }
      for (const mesh of group.children) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
