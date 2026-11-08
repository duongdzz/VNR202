import * as THREE from 'three';
import { SceneManager } from './SceneManager.js?v=19';
import { PALETTE } from '../constants.js?v=19';

/**
 * VehicleMesh: Mô hình 3 phương tiện vui nhộn (low-poly flat shading, chibi) mở khóa theo tiến độ khám phá:
 *  - 'bike'  : Xe đạp thồ Điện Biên gắn 2 bao tải hai bên
 *  - 'jeep'  : Xe Jeep quân sự UAZ mini không mui, dáng vuông vức
 *  - 'plane' : Máy bay mini 2 chỗ buồng lái hở, bay lơ lửng (hover), cánh quạt quay liên tục
 * Quy ước: mũi xe hướng +Z cục bộ (trùng hướng nhân vật khi rotation.y = 0).
 * Mỗi phương tiện trả về { group, riderY, riderZ, hoverY, update(dt, isMoving, time) }.
 */

const mat = (hex, extra = {}) => SceneManager.createFlatMaterial(hex, extra);

function addShadowFlags(root) {
  root.traverse((c) => {
    if (c.isMesh) c.castShadow = true;
  });
}

/** Bánh xe có nan hoa (xoay quanh trục X) */
function createSpokedWheel(radius, tube, spokes, tireMat, spokeMat) {
  const wheel = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 20), tireMat);
  tire.rotation.y = Math.PI / 2;
  wheel.add(tire);
  for (let i = 0; i < spokes; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.018, radius * 2 - 0.02, 0.018), spokeMat);
    spoke.rotation.x = (i / spokes) * Math.PI;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 8), spokeMat);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  return wheel;
}

function tube(a, b, radius, material) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), material);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return m;
}

// ---------------------------------------------------------------------------
// 1. XE ĐẠP THỒ ĐIỆN BIÊN
// ---------------------------------------------------------------------------
function buildBike() {
  const group = new THREE.Group();
  const frameMat = mat(PALETTE.ARMY_GREEN);
  const tireMat = mat(0x1d1d1d);
  const chromeMat = mat(PALETTE.TOWER_SILVER, { metalness: 0.5, roughness: 0.35 });
  const sackMat = mat(0xcfae72);
  const sackDark = mat(0xb08d52);
  const strapMat = mat(0x4a3320);
  const seatMat = mat(0x2b1b12);

  const frontWheel = createSpokedWheel(0.34, 0.035, 4, tireMat, chromeMat);
  frontWheel.position.set(0, 0.36, 0.62);
  const rearWheel = createSpokedWheel(0.34, 0.035, 4, tireMat, chromeMat);
  rearWheel.position.set(0, 0.36, -0.62);
  group.add(frontWheel, rearWheel);

  // Khung xe
  const bb = [0, 0.38, 0.0];
  const seatTube = [0, 0.78, -0.16];
  const headTube = [0, 0.78, 0.42];
  group.add(
    tube([0, 0.36, -0.62], bb, 0.022, frameMat),
    tube(bb, [0, 0.36, 0.62], 0.022, frameMat),
    tube(bb, seatTube, 0.024, frameMat),
    tube(seatTube, headTube, 0.024, frameMat),
    tube([0, 0.36, -0.62], seatTube, 0.02, frameMat),
    tube(headTube, [0, 0.36, 0.62], 0.022, frameMat),
    tube(headTube, [0, 0.98, 0.42], 0.022, chromeMat)
  );

  // Ghi đông, yên, bàn đạp
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 6), chromeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.99, 0.42);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.3), seatMat);
  seat.position.set(0, 0.84, -0.2);
  const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), chromeMat);
  crank.rotation.z = Math.PI / 2;
  crank.position.set(0, 0.38, 0);
  const pedalGroup = new THREE.Group();
  pedalGroup.position.set(0, 0.38, 0);
  [-1, 1].forEach((s) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), chromeMat);
    arm.position.set(0.1 * s, s * 0.15, 0);
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.07), chromeMat);
    pedal.position.set(0.14 * s, s * 0.3, 0);
    pedalGroup.add(arm, pedal);
  });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), chromeMat);
  bell.position.set(0.18, 1.04, 0.42);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.06, 8), mat(0xffe08a, { emissive: 0xffd470, emissiveIntensity: 0.6 }));
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, 0.9, 0.5);
  group.add(bar, seat, crank, pedalGroup, bell, lamp);

  // Giá hàng sau + 2 bao tải hàng bên hông
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.5), chromeMat);
  rack.position.set(0, 0.74, -0.62);
  group.add(rack);
  [-1, 1].forEach((s) => {
    const sack = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 4, 10), s < 0 ? sackMat : sackDark);
    sack.rotation.x = Math.PI / 2;
    sack.scale.set(1, 1, 0.82);
    sack.position.set(0.3 * s, 0.7, -0.6);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 5, 12), strapMat);
    tie.position.set(0.3 * s, 0.7, -0.5);
    const tie2 = tie.clone();
    tie2.position.z = -0.7;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), sackDark);
    knot.position.set(0.3 * s, 0.7, -0.84);
    group.add(sack, tie, tie2, knot);
  });
  // Bao thứ 3 chồng lên giá hàng (tiếp tế Điện Biên)
  const topSack = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.3, 4, 10), sackMat);
  topSack.rotation.x = Math.PI / 2;
  topSack.position.set(0, 0.95, -0.62);
  group.add(topSack);

  addShadowFlags(group);

  return {
    group,
    riderY: 0.5,
    riderZ: -0.12,
    hoverY: 0,
    update(dt, isMoving) {
      const spin = (isMoving ? 11 : 0) * dt;
      frontWheel.rotation.x += spin;
      rearWheel.rotation.x += spin;
      pedalGroup.rotation.x += spin * 0.9;
    }
  };
}

// ---------------------------------------------------------------------------
// 2. XE JEEP UAZ MINI (KHÔNG MUI)
// ---------------------------------------------------------------------------
function buildJeep() {
  const group = new THREE.Group();
  const bodyMat = mat(0x56693a); // xanh rêu
  const darkMat = mat(0x2d3a22);
  const blackMat = mat(0x1a1a1a);
  const chromeMat = mat(PALETTE.TOWER_SILVER, { metalness: 0.5, roughness: 0.35 });
  const seatMat = mat(0x3a2a1c);
  const redMat = mat(PALETTE.PARTY_RED);
  const goldMat = mat(PALETTE.STAR_GOLD);

  // Thân xe vuông vức
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.34, 1.9), bodyMat);
  chassis.position.set(0, 0.42, 0);
  const tub = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.0), bodyMat);
  tub.position.set(0, 0.7, -0.22);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.26, 0.62), bodyMat);
  hood.position.set(0, 0.66, 0.66);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.2, 0.05), darkMat);
  grille.position.set(0, 0.64, 0.99);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.1, 0.1), chromeMat);
  bumperF.position.set(0, 0.34, 1.0);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.1, 0.1), chromeMat);
  bumperR.position.set(0, 0.34, -1.0);
  group.add(chassis, tub, hood, grille, bumperF, bumperR);

  // Ghế (buồng lái hở): ghế trước + ghế sau
  const seatF = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.34), seatMat);
  seatF.position.set(0, 0.88, 0.0);
  const backF = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.34, 0.08), seatMat);
  backF.position.set(0, 1.04, -0.2);
  const seatR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.3), seatMat);
  seatR.position.set(0, 0.88, -0.62);
  const backR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.08), seatMat);
  backR.position.set(0, 1.02, -0.82);
  group.add(seatF, backF, seatR, backR);

  // Khung kính chắn gió (không kính) + vô lăng
  const wsPostL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), blackMat);
  wsPostL.position.set(-0.52, 1.0, 0.36);
  wsPostL.rotation.x = -0.3;
  const wsPostR = wsPostL.clone();
  wsPostR.position.x = 0.52;
  const wsTop = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.05, 0.05), blackMat);
  wsTop.position.set(0, 1.2, 0.28);
  group.add(wsPostL, wsPostR, wsTop);

  const wheelSteer = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 6, 14), blackMat);
  wheelSteer.rotation.x = -0.9;
  wheelSteer.position.set(0, 0.98, 0.3);
  const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), blackMat);
  steerCol.rotation.x = -0.9;
  steerCol.position.set(0, 0.88, 0.36);
  group.add(wheelSteer, steerCol);

  // Đèn pha, cờ nhỏ, sao vàng
  [-0.38, 0.38].forEach((x) => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0xfff0b0, { emissive: 0xffe08a, emissiveIntensity: 0.7 }));
    light.position.set(x, 0.7, 1.0);
    group.add(light);
  });
  const star = SceneManager.createStarMesh(0.13, 0.055, 0.03, goldMat);
  star.position.set(0.601, 0.72, -0.2);
  star.rotation.y = Math.PI / 2;
  const starL = star.clone();
  starL.position.x = -0.601;
  starL.rotation.y = -Math.PI / 2;
  group.add(star, starL);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.7, 5), chromeMat);
  flagPole.position.set(0.56, 1.2, -0.95);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.02), redMat);
  flag.position.set(0.4, 1.4, -0.95);
  group.add(flagPole, flag);

  // Lốp dự phòng phía sau
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14), blackMat);
  spare.rotation.x = Math.PI / 2;
  spare.position.set(0, 0.7, -1.06);
  group.add(spare);

  // 4 bánh xe (xoay quanh trục X)
  const wheels = [];
  [
    [-0.64, 0.3, 0.62],
    [0.64, 0.3, 0.62],
    [-0.64, 0.3, -0.62],
    [0.64, 0.3, -0.62]
  ].forEach(([x, y, z]) => {
    const w = new THREE.Group();
    w.position.set(x, y, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14), blackMat);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 8), chromeMat);
    hub.rotation.z = Math.PI / 2;
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.05, 0.3), blackMat);
    w.add(tire, hub, lug);
    group.add(w);
    wheels.push(w);
  });

  addShadowFlags(group);

  return {
    group,
    riderY: 0.4,
    riderZ: 0.02,
    hoverY: 0,
    update(dt, isMoving, time) {
      const spin = (isMoving ? 14 : 0) * dt;
      wheels.forEach((w) => (w.rotation.x += spin));
      // rung nhẹ khi nổ máy
      group.position.y = isMoving ? Math.sin(time * 38) * 0.006 : Math.sin(time * 14) * 0.003;
    }
  };
}

// ---------------------------------------------------------------------------
// 3. MÁY BAY MINI 2 CHỖ NGỒI BUỒNG LÁI HỞ
// ---------------------------------------------------------------------------
function buildPlane() {
  const group = new THREE.Group();
  const bodyMat = mat(0xd83a2d);
  const whiteMat = mat(0xf4f1e6);
  const darkMat = mat(0x2b2f36);
  const seatMat = mat(0x3a2a1c);
  const goldMat = mat(PALETTE.STAR_GOLD);
  const chromeMat = mat(PALETTE.TOWER_SILVER, { metalness: 0.5, roughness: 0.35 });
  const blueMat = mat(PALETTE.AIRCRAFT_BLUE);

  // Thân (nang chibi nằm dọc trục Z) + mũi bo + đuôi thon
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.2, 6, 14), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 0.6, 0);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.435, 0.435, 0.16, 16), whiteMat);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.set(0, 0.6, 0.55);
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.9, 12), bodyMat);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.set(0, 0.64, -1.45);
  group.add(fuselage, stripe, tailCone);

  // Buồng lái hở: gờ viền + 2 ghế (ghế trước cho người lái, ghế sau để trống / chở thêm 1 người)
  const cockpitRim = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 1.2), darkMat);
  cockpitRim.position.set(0, 0.99, -0.12);
  const cockpitWell = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 1.06), seatMat);
  cockpitWell.position.set(0, 0.95, -0.12);
  const seatFront = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.34), seatMat);
  seatFront.position.set(0, 0.99, 0.14);
  const seatRear = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.34), seatMat);
  seatRear.position.set(0, 0.99, -0.52);
  const backRest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.07), seatMat);
  backRest.position.set(0, 1.16, -0.7);
  const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.1), bodyMat);
  headRest.position.set(0, 1.4, -0.86);
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.3), darkMat);
  cowl.position.set(0, 1.05, 0.58);
  group.add(cockpitRim, cockpitWell, seatFront, seatRear, backRest, headRest, cowl);

  // Cánh chính (trên thân) + 2 trụ chống
  const wing = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.07, 0.72), whiteMat);
  wing.position.set(0, 1.5, 0.12);
  const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(3.32, 0.075, 0.14), bodyMat);
  wingStripe.position.set(0, 1.5, 0.38);
  group.add(wing, wingStripe);
  [-1, 1].forEach((s) => {
    group.add(
      tube([0.3 * s, 0.9, 0.35], [1.2 * s, 1.48, 0.3], 0.02, chromeMat),
      tube([0.3 * s, 0.9, -0.05], [1.2 * s, 1.48, 0.0], 0.02, chromeMat)
    );
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.74), s < 0 ? blueMat : bodyMat);
    tip.position.set(1.68 * s, 1.5, 0.12);
    group.add(tip);
  });

  // Đuôi đứng + đuôi ngang + sao vàng trên cánh đuôi
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.5), bodyMat);
  fin.position.set(0, 1.0, -1.82);
  fin.rotation.x = 0.15;
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.34), whiteMat);
  stab.position.set(0, 0.7, -1.85);
  const tailStar = SceneManager.createStarMesh(0.16, 0.065, 0.03, goldMat);
  tailStar.position.set(0.045, 1.02, -1.82);
  tailStar.rotation.y = Math.PI / 2;
  const tailStarL = tailStar.clone();
  tailStarL.position.x = -0.045;
  tailStarL.rotation.y = -Math.PI / 2;
  group.add(fin, stab, tailStar, tailStarL);

  // Sao vàng trên 2 bên thân
  [-1, 1].forEach((s) => {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 14), mat(PALETTE.PARTY_RED));
    disc.rotation.z = Math.PI / 2;
    disc.position.set(0.425 * s, 0.6, -0.55);
    const st = SceneManager.createStarMesh(0.15, 0.06, 0.03, goldMat);
    st.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    st.position.set(0.44 * s, 0.6, -0.55);
    group.add(disc, st);
  });

  // Cánh quạt ở mũi (quay liên tục)
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 10), goldMat);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.set(0, 0.62, 1.34);
  const propeller = new THREE.Group();
  propeller.position.set(0, 0.62, 1.2);
  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.035), darkMat);
  const bladeB = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.035), darkMat);
  const hubP = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8), chromeMat);
  hubP.rotation.x = Math.PI / 2;
  propeller.add(bladeA, bladeB, hubP);
  group.add(spinner, propeller);

  // Bánh/skid hạ cánh nhỏ (trang trí)
  [-1, 1].forEach((s) => {
    group.add(tube([0.26 * s, 0.35, 0.3], [0.4 * s, 0.1, 0.35], 0.022, chromeMat));
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10), darkMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0.4 * s, 0.1, 0.35);
    group.add(wheel);
  });

  addShadowFlags(group);

  return {
    group,
    riderY: 0.5,
    riderZ: 0.14,
    hoverY: 1.75,
    propeller,
    update(dt, isMoving) {
      propeller.rotation.z += (isMoving ? 48 : 30) * dt;
    }
  };
}

export function createVehicle(type) {
  switch (type) {
    case 'bike':
      return buildBike();
    case 'jeep':
      return buildJeep();
    case 'plane':
      return buildPlane();
    default:
      return null;
  }
}
