// Recognisable landmarks around the geographic circuit: a yacht basin, warm
// stone apartment fronts, balconies, Casino Square and harbour grandstands.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as TX from "./textures.js";
export const MARINA = [
  [118, -175],
  [350, -155],
  [470, -40],
  [445, 155],
  [220, 213],
  [155, 135],
];

export function buildMonaco(track, env, grid, heightAt, seaAt, r, density) {
  const group = new THREE.Group();
  group.name = "monaco-landmarks";
  const buckets = new Map();
  const add = (geo, color, x = 0, y = 0, z = 0, rot = 0) => {
    geo.rotateY(rot);
    geo.translate(x, y, z);
    const key = String(color);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(geo.toNonIndexed());
    geo.dispose();
  };
  const box = (w, h, d, color, x, y, z, rot = 0) =>
    add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rot);
  const waterShape = new THREE.Shape(
    MARINA.map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  const waterGeo = new THREE.ShapeGeometry(waterShape);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(
    waterGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0x176579,
      roughness: 0.21,
      metalness: 0.45,
      clearcoat: 1,
    }),
  );
  water.position.y = -0.75;
  group.add(water);
  // Quays and floating pontoons in the Port Hercule basin.
  box(140, 0.5, 5, 0xcbc5b4, 248, -0.5, 140);
  for (let pier = 0; pier < 4; pier++) {
    const z = -95 + pier * 62;
    box(165, 0.45, 3, 0xa99c80, 282, -0.45, z);
    for (let k = 0; k < 5; k++) {
      const x = 220 + k * 28,
        zz = z + 16 + (k % 2) * 2;
      const hull = new THREE.CapsuleGeometry(3.8, 17 + r() * 8, 4, 10);
      hull.rotateX(Math.PI / 2);
      add(hull, 0xe9e8df, x, 0.7, zz);
      box(5.7, 2.4, 12, 0xfafafa, x, 2.3, zz);
      box(5.1, 0.9, 8, 0x243d4e, x, 3.6, zz + 1);
      box(5.3, 0.24, 10, 0xfdfdfd, x, 4.2, zz + 1);
      box(0.12, 4, 0.12, 0xb7bec5, x, 5.5, zz - 2);
      box(3, 0.12, 4, 0xcbb797, x, 1.5, zz + 10);
    }
  }
  // Near-track residential facades use a few merged materials, including windows
  // and individual balcony slabs. Clearance prevents intersections with the road.
  const palette = [0xe2cbae, 0xdfb9a0, 0xf0dfc2, 0xc6c0af, 0xf1d7b4];
  for (let s = 200; s < track.length; s += 48) {
    const i = track.index(s);
    // Keep the tunnel mouth and close parallel road sections open.
    if (track.tunnel && s > track.tunnel.s0 - 30 && s < track.tunnel.s1 + 30)
      continue;
    for (const side of [-1, 1]) {
      const pt = track.pointAt(s, side * (track.hw[i] + 19));
      if (!grid.clear(pt.x, pt.z, 10) || seaAt(pt.x, pt.z) > 0.01) continue;
      const h = 12 + Math.floor(r() * 6) * 3,
        w = 17 + r() * 10,
        dep = 12,
        heading = track.headingAt(s);
      const base = heightAt(pt.x, pt.z),
        color = palette[Math.floor(r() * palette.length)];
      box(w, h, dep, color, pt.x, base + h / 2, pt.z, heading);
      box(w + 1, 0.5, dep + 1, 0xf5ead7, pt.x, base + h, pt.z, heading);
      for (let floor = 0; floor < Math.floor(h / 3); floor++)
        for (let j = 0; j < 4; j++) {
          const xx = ((j - 1.5) * w) / 4,
            zz = -side * (dep / 2 + 0.12);
          const x = pt.x + xx * Math.cos(heading) + zz * Math.sin(heading),
            z = pt.z - xx * Math.sin(heading) + zz * Math.cos(heading);
          box(1.4, 1.8, 0.15, 0x30454b, x, base + 1.7 + floor * 3, z, heading);
          if (floor > 0) {
            box(
              2.3,
              0.14,
              1.05,
              0xeae2cc,
              x,
              base + 0.7 + floor * 3,
              z,
              heading,
            );
            box(
              2.3,
              0.8,
              0.07,
              0x4c5557,
              x,
              base + 1.15 + floor * 3,
              z - side * 0.48,
              heading,
            );
          }
        }
    }
  }
  // Casino-inspired cream facade with arched wings and a copper dome.
  const c = track.corners.find((c) => c.name === "Casino");
  if (c) {
    const s = c.sApex,
      pt = track.pointAt(s, 42),
      h = track.headingAt(s),
      base = heightAt(pt.x, pt.z);
    box(44, 13, 22, 0xe9d2ab, pt.x, base + 6.5, pt.z, h);
    box(48, 1.2, 25, 0xf7ead2, pt.x, base + 13.2, pt.z, h);
    for (const side of [-1, 1]) {
      const x = pt.x + side * 19 * Math.cos(h),
        z = pt.z - side * 19 * Math.sin(h);
      box(8, 18, 12, 0xe7cba5, x, base + 9, z, h);
      add(
        new THREE.SphereGeometry(4.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        0x51877d,
        x,
        base + 18,
        z,
      );
    }
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 2),
      new THREE.MeshStandardMaterial({
        map: TX.board("MONTE-CARLO", {
          bg: "#e9d2ab",
          fg: "#463b2c",
          w: 512,
          h: 96,
        }),
      }),
    );
    sign.position.set(pt.x, base + 11, pt.z);
    sign.rotation.y = h;
    group.add(sign);
  }
  // Swimming-pool blue, visible on the harbour side of the circuit.
  box(28, 0.2, 42, 0xe4dfc9, 124, 1.5, 47);
  box(23, 0.22, 36, 0x31a2b9, 124, 1.6, 47);
  for (const [key, geos] of buckets) {
    const geo = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: Number(key),
        roughness: 0.65,
        metalness: 0.08,
      }),
    );
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { group };
}
