import * as THREE from 'three';
import { SceneManager } from './SceneManager.js?v=19';
import { PALETTE, EXHIBITS_DATA } from '../constants.js?v=19';
import { createGlowDecal, createGlowSprite } from './fx/FxTextures.js?v=19';

/**
 * DecorBuilder: Decor & Props lấp đầy không gian trống (Polish) — module tách riêng, kế thừa phong cách Low-poly Flat Shading:
 * - Ngoài sân: Cột đèn đường cổ điển + vệt sáng giả (fake light decal) hắt xuống mặt cỏ / đá (tăng sáng khi ban đêm).
 * - Trong nhà: Cột chắn đồng + dây nhung đỏ quanh bục hiện vật, thảm kem xám dẫn hướng, chậu cây, bình chữa cháy,
 *   thùng rác gỗ, biển chỉ hướng, tủ kính nằm ngang, ray đèn rọi spotlight + vệt sáng tròn dưới các bục.
 * - Hiệu năng: KHÔNG dùng PointLight; chỉ dùng decal cộng màu (additive) & hình học dùng chung.
 */
export class DecorBuilder {
  constructor({ outdoorGroup, indoorFloor1Group, indoorFloor2Group = null, colliders }) {
    this.outdoorGroup = outdoorGroup;
    this.f1 = indoorFloor1Group;
    this.f2 = indoorFloor2Group;
    this.colliders = colliders;

    this.lamps = [];
    this.nightBlend = 0;
    this.nightTarget = 0;

    this.mats = {
      brass: SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, { roughness: 0.3, metalness: 0.55 }),
      iron: SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK, { roughness: 0.45, metalness: 0.4 }),
      stone: SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER),
      velvet: SceneManager.createFlatMaterial(0xa3141c, { roughness: 0.95 }),
      wood: SceneManager.createFlatMaterial(PALETTE.WOOD_OAK),
      darkWood: SceneManager.createFlatMaterial(0x5a3a22),
      moss: SceneManager.createFlatMaterial(0x5f7a3a),
      mossDark: SceneManager.createFlatMaterial(0x4a6530),
      terracotta: SceneManager.createFlatMaterial(0x9a4a32),
      red: SceneManager.createFlatMaterial(0xc81e1e),
      black: SceneManager.createFlatMaterial(0x1a1a1a),
      white: SceneManager.createFlatMaterial(0xf4f1e6)
    };
  }

  buildAll() {
    this.buildOutdoorLampPosts();
    this.buildInteriorStanchions();
    this.buildFloorRunners();
    this.buildInteriorPlants();
    this.buildSafetyProps();
    this.buildSignage();
    this.buildDisplayTables();
    this.buildSpotlightRails();
    this.buildFloor2Decor();
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  addPillar(key, x, z, radius) {
    this.colliders[key].pillars.push({ x, z, radius });
  }

  addWallBox(key, minX, maxX, minZ, maxZ) {
    this.colliders[key].walls.push({ minX, maxX, minZ, maxZ });
  }

  setNight(isNight) {
    this.nightTarget = isNight ? 1 : 0;
  }

  update(dt) {
    if (Math.abs(this.nightBlend - this.nightTarget) < 0.002) return;
    this.nightBlend = THREE.MathUtils.lerp(this.nightBlend, this.nightTarget, Math.min(1, dt * 2.2));
    const n = this.nightBlend;
    for (const lamp of this.lamps) {
      lamp.pool.material.opacity = 0.1 + 0.5 * n;
      lamp.halo.material.opacity = 0.22 + 0.7 * n;
      lamp.bulb.color.setRGB(1.0, 0.86 - 0.08 * n, 0.55 + 0.05 * (1 - n));
    }
  }

  // ---------------------------------------------------------------------
  // 1. NGOẠI CẢNH: Cột đèn đường cổ điển Low-poly + vệt sáng giả
  // ---------------------------------------------------------------------
  buildOutdoorLampPosts() {
    const { iron, brass, stone } = this.mats;
    const plinthGeo = new THREE.CylinderGeometry(0.3, 0.36, 0.5, 8);
    const plinthCapGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.1, 8);
    const poleGeo = new THREE.CylinderGeometry(0.055, 0.085, 3.3, 8);
    const collarGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.07, 8);
    const baseCapGeo = new THREE.ConeGeometry(0.3, 0.2, 6);
    const bodyGeo = new THREE.CylinderGeometry(0.26, 0.2, 0.5, 6);
    const barGeo = new THREE.BoxGeometry(0.035, 0.52, 0.035);
    const roofGeo = new THREE.ConeGeometry(0.4, 0.28, 6);
    const finialGeo = new THREE.SphereGeometry(0.055, 6, 4);
    const armGeo = new THREE.TorusGeometry(0.2, 0.025, 5, 8, Math.PI);

    // Chỉ giữ đúng 2 cột đèn đường đặt hai bên lối vào cửa chính Tòa nhà Bảo tàng (z ≈ 4.5)
    const positions = [
      [-4.6, 4.5],
      [4.6, 4.5]
    ];

    positions.forEach(([x, z]) => {
      const lamp = new THREE.Group();
      lamp.position.set(x, 0, z);

      const plinth = new THREE.Mesh(plinthGeo, stone);
      plinth.position.y = 0.25;
      const plinthCap = new THREE.Mesh(plinthCapGeo, brass);
      plinthCap.position.y = 0.55;
      const pole = new THREE.Mesh(poleGeo, iron);
      pole.position.y = 2.25;
      const collarLow = new THREE.Mesh(collarGeo, brass);
      collarLow.position.y = 0.95;
      const collarHigh = new THREE.Mesh(collarGeo, brass);
      collarHigh.position.y = 3.7;
      const arm = new THREE.Mesh(armGeo, iron);
      arm.position.set(0, 3.62, 0);
      arm.rotation.z = Math.PI;
      arm.visible = false; // giữ cột thẳng cổ điển (chi tiết vòng cung bỏ để tiết kiệm poly)

      // Chao đèn: đế chóp, thân kính phát sáng 6 cạnh, khung thép, mái chóp & chỏm vàng
      const lanternBase = new THREE.Mesh(baseCapGeo, iron);
      lanternBase.rotation.x = Math.PI;
      lanternBase.position.y = 3.82;
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffdc90 });
      const body = new THREE.Mesh(bodyGeo, bulbMat);
      body.position.y = 4.17;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const bar = new THREE.Mesh(barGeo, iron);
        bar.position.set(Math.cos(a) * 0.235, 4.17, Math.sin(a) * 0.235);
        lamp.add(bar);
      }
      const roof = new THREE.Mesh(roofGeo, iron);
      roof.position.y = 4.56;
      const finial = new THREE.Mesh(finialGeo, brass);
      finial.position.y = 4.74;

      lamp.add(plinth, plinthCap, pole, collarLow, collarHigh, lanternBase, body, roof, finial);
      lamp.traverse((c) => {
        if (c.isMesh && c !== body) c.castShadow = true;
      });

      // Vệt sáng giả hắt tròn xuống mặt cỏ / mặt đá + quầng sáng quanh chao đèn
      const pool = createGlowDecal(3.6, 0xffc766, 0.1);
      pool.position.set(0, 0.085, 0);
      const halo = createGlowSprite(0xffd27d, 1.7, 0.22);
      halo.position.y = 4.2;
      lamp.add(pool, halo);

      this.outdoorGroup.add(lamp);
      this.addPillar('outdoor', x, z, 0.3);
      this.lamps.push({ pool, halo, bulb: bulbMat });
    });
  }

  // ---------------------------------------------------------------------
  // 2. TRONG NHÀ: Cột chắn đồng + dây nhung đỏ quanh các bục hiện vật Tầng 1
  // ---------------------------------------------------------------------
  createStanchionPost(x, z) {
    const post = new THREE.Group();
    post.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.05, 10), this.mats.brass);
    base.position.y = 0.025;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.88, 8), this.mats.brass);
    pole.position.y = 0.46;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 5, 8), this.mats.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), this.mats.brass);
    knob.position.y = 0.92;
    post.add(base, pole, ring, knob);
    post.traverse((c) => {
      if (c.isMesh) c.castShadow = true;
    });
    return post;
  }

  createVelvetRope(ax, az, bx, bz) {
    const a = new THREE.Vector3(ax, 0.84, az);
    const b = new THREE.Vector3(bx, 0.84, bz);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= 0.14;
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.022, 5), this.mats.velvet);
    return mesh;
  }

  buildInteriorStanchions() {
    const AISLE_Z = -18; // Trục hành lang chính: mặt trước bục luôn hướng về phía này
    const H = 1.8;
    const exhibits = EXHIBITS_DATA.filter((e) => e.zoneType === 'indoor' && e.floor === 1);

    exhibits.forEach((ex) => {
      const { x, z } = ex.position;
      const fz = AISLE_Z - z >= 0 ? 1 : -1; // hướng mặt trước (mở lối cho khách tới gần tương tác)
      const backZ = z - fz * H;

      const posts = [
        [x - H, backZ], [x + H, backZ], // 2 trụ góc sau
        [x - H, z], [x + H, z] // 2 trụ giữa hai bên
      ];
      posts.forEach(([px, pz]) => {
        this.f1.add(this.createStanchionPost(px, pz));
        this.addPillar('indoorF1', px, pz, 0.14);
      });

      // Dây nhung đỏ: dây sau + 2 dây bên (mặt trước để trống cho khách tiến vào)
      const ropes = [
        [x - H, backZ, x + H, backZ],
        [x - H, backZ, x - H, z],
        [x + H, backZ, x + H, z]
      ];
      ropes.forEach(([ax, az, bx, bz]) => {
        this.f1.add(this.createVelvetRope(ax, az, bx, bz));
        this.addWallBox(
          'indoorF1',
          Math.min(ax, bx) - 0.07,
          Math.max(ax, bx) + 0.07,
          Math.min(az, bz) - 0.07,
          Math.max(az, bz) + 0.07
        );
      });
    });
  }

  // ---------------------------------------------------------------------
  // 3. Thảm kem xám dẫn hướng dọc hành lang chính (phá vỡ sàn đơn điệu)
  // ---------------------------------------------------------------------
  buildFloorRunners() {
    const creamMat = SceneManager.createFlatMaterial(0xdcd5c2);
    const grayBorderMat = SceneManager.createFlatMaterial(0x8f8b80);

    const addRunner = (x, z, w, d) => {
      const border = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.014, d + 0.16), grayBorderMat);
      border.position.set(x, 0.022, z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, d), creamMat);
      body.position.set(x, 0.03, z);
      body.receiveShadow = true;
      this.f1.add(border, body);
    };

    // Hai dải kem xám chạy song song hai bên thảm đỏ trục Bắc–Nam, tạm ngắt ở giao lộ trục Đông–Tây (Z ≈ -18)
    [-3.3, 3.3].forEach((rx) => {
      addRunner(rx, -9.1, 1.0, 13.4); // Z từ -2.4 đến -15.8
      addRunner(rx, -25.8, 1.0, 10.6); // Z từ -31.1 đến -20.5
    });
  }

  // ---------------------------------------------------------------------
  // 4. Chậu cây cảnh low-poly tán lá xanh rêu
  // ---------------------------------------------------------------------
  createMossPlant(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.28, 0.46, 8), this.mats.terracotta);
    pot.position.y = 0.23;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.06, 8), this.mats.brass);
    rim.position.y = 0.47;
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 8), this.mats.darkWood);
    soil.position.y = 0.5;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 5), this.mats.wood);
    stem.position.y = 0.8;
    const blobs = [
      [0, 1.22, 0, 0.5, this.mats.moss],
      [0.28, 1.5, 0.1, 0.34, this.mats.mossDark],
      [-0.26, 1.42, -0.12, 0.36, this.mats.moss],
      [0.04, 1.72, -0.06, 0.28, this.mats.mossDark]
    ];
    g.add(pot, rim, soil, stem);
    blobs.forEach(([bx, by, bz, r, mat]) => {
      const blob = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat);
      blob.position.set(bx, by, bz);
      blob.castShadow = true;
      g.add(blob);
    });
    pot.castShadow = true;
    return g;
  }

  buildInteriorPlants() {
    const spots = [
      // Giữa sảnh & cạnh thang máy / trạm đố vui
      [-11.4, -3.2], [11.4, -3.2],
      [-13.2, -36.5], [-7.5, -36.5], [7.5, -36.5],
      // Hai bên ghế nghỉ tường Tây / Đông
      [-29.5, -21.8], [-29.5, -14.2], [29.5, -22.4], [29.5, -10.8],
      // Góc Phòng chiếu phim
      [33.0, -7.4], [33.0, -28.6], [50.8, -8.2], [50.8, -27.8]
    ];
    spots.forEach(([x, z]) => {
      this.f1.add(this.createMossPlant(x, z));
      this.addPillar('indoorF1', x, z, 0.45);
    });
  }

  // ---------------------------------------------------------------------
  // 5. Bình chữa cháy & Thùng rác gỗ
  // ---------------------------------------------------------------------
  createExtinguisher(x, z, rotY) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.42, 10), this.mats.red);
    body.position.y = 0.27;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.08, 10), this.mats.black);
    band.position.y = 0.3;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.07, 8), this.mats.iron);
    neck.position.y = 0.5;
    const valve = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.04), this.mats.black);
    valve.position.set(0.02, 0.56, 0);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 5, 8, Math.PI * 1.2), this.mats.black);
    hose.position.set(0.09, 0.42, 0);
    hose.rotation.y = Math.PI / 2;
    // Biển báo nền đỏ trắng gắn tường
    const signBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.02), this.mats.red);
    signBack.position.set(0, 1.3, -0.18);
    const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.022), this.mats.white);
    crossA.position.set(0, 1.3, -0.17);
    const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.022), this.mats.white);
    crossB.position.set(0, 1.3, -0.17);
    g.add(body, band, neck, valve, hose, signBack, crossA, crossB);
    g.traverse((c) => {
      if (c.isMesh) c.castShadow = true;
    });
    return g;
  }

  createWoodBin(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.56, 8), this.mats.wood);
    bin.position.y = 0.28;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 8), this.mats.black);
    inner.position.y = 0.56;
    [0.16, 0.44].forEach((by) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.04, 8), this.mats.brass);
      band.position.y = by;
      g.add(band);
    });
    g.add(bin, inner);
    g.traverse((c) => {
      if (c.isMesh) c.castShadow = true;
    });
    return g;
  }

  buildSafetyProps() {
    const extinguishers = [
      [-31.0, -4.8, Math.PI / 2],
      [31.0, -4.2, -Math.PI / 2],
      [-16.0, -37.0, 0],
      [16.0, -37.0, 0],
      [32.4, -9.5, Math.PI / 2]
    ];
    extinguishers.forEach(([x, z, rotY]) => this.f1.add(this.createExtinguisher(x, z, rotY)));

    const bins = [
      [-10.4, -3.6], [9.8, -3.8], [30.0, -12.4], [32.4, -12.6], [32.4, -23.6]
    ];
    bins.forEach(([x, z]) => {
      this.f1.add(this.createWoodBin(x, z));
      this.addPillar('indoorF1', x, z, 0.3);
    });
  }

  // ---------------------------------------------------------------------
  // 6. Biển chỉ hướng (Signage) gắn tường
  // ---------------------------------------------------------------------
  createSignTexture(lines, arrow) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e2a24';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#ffd470';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, 502, 150);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lines[0], 256, 70);
    ctx.fillStyle = '#ffd470';
    ctx.font = '26px "Segoe UI", Arial, sans-serif';
    ctx.fillText(lines[1] || '', 256, 118);
    ctx.fillStyle = '#7fe08c';
    ctx.font = 'bold 54px "Segoe UI", Arial, sans-serif';
    if (arrow === 'right') ctx.fillText('▶', 466, 98);
    if (arrow === 'left') ctx.fillText('◀', 46, 98);
    if (arrow === 'up') ctx.fillText('▲', 46, 98);
    const tex = new THREE.CanvasTexture(canvas);
    SceneManager.sharpenTexture(tex);
    return tex;
  }

  addWallSign(x, y, z, rotY, lines, arrow, width = 2.5) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    const backing = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, width * 0.31 + 0.1, 0.06), this.mats.iron);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(width, width * 0.3125),
      new THREE.MeshBasicMaterial({ map: this.createSignTexture(lines, arrow) })
    );
    face.position.z = 0.035;
    g.add(backing, face);
    this.f1.add(g);
  }

  buildSignage() {
    // Biển lên Tầng 2 cạnh Thang máy (tường Bắc, hướng ra sảnh)
    this.addWallSign(-17.0, 2.7, -37.2, 0, ['THANG MÁY', 'Lên Tầng 2 (1954 – Nay)'], 'right');
    this.addWallSign(-10.5, 4.15, -37.2, 0, ['TẦNG 2', 'Gian 4 · 5 · 6 Tưởng niệm'], 'up', 2.0);
    // Chỉ lối vào các Gian (gắn vách ngăn)
    this.addWallSign(-13.62, 2.7, -6.5, Math.PI / 2, ['GIAN 1 · 1920–1945', 'Thành lập Đảng · Tây'], 'left');
    this.addWallSign(13.62, 2.7, -6.5, -Math.PI / 2, ['GIAN 3 · 1945–1954', 'Kháng chiến · Đông'], 'right');
    // Chỉ trạm Đố vui & Rạp phim
    this.addWallSign(17.0, 2.7, -37.2, 0, ['TRẠM ĐỐ VUI', 'Nhà Sử Học Trẻ'], 'left');
    this.addWallSign(30.9, 2.7, -4.4, -Math.PI / 2, ['RẠP CHIẾU PHIM', 'Phim tư liệu · 30 chỗ'], 'right', 2.2);
  }

  // ---------------------------------------------------------------------
  // 7. Tủ kính nằm ngang (bàn trưng bày thấp) chứa sách, huy hiệu, văn kiện
  // ---------------------------------------------------------------------
  buildDisplayTables() {
    const spots = [
      { x: -7.8, z: -25.5, items: 'book' },
      { x: 7.8, z: -25.5, items: 'badge' },
      { x: 8.0, z: -8.5, items: 'doc' }
    ];
    spots.forEach(({ x, z, items }) => {
      const g = this.createDisplayTable(items);
      g.position.set(x, 0, z);
      this.f1.add(g);
      this.addPillar('indoorF1', x - 0.6, z, 0.55);
      this.addPillar('indoorF1', x + 0.6, z, 0.55);
    });
  }

  createDisplayTable(items) {
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbfe3f0,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.1,
      depthWrite: false
    });
    {
      const g = new THREE.Group();

      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 0.95), this.mats.darkWood);
      cabinet.position.y = 0.35;
      const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.06, 1.03), this.mats.brass);
      baseTrim.position.y = 0.04;
      const topRim = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.05, 1.03), this.mats.brass);
      topRim.position.y = 0.72;
      const liner = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.03, 0.75), this.mats.velvet);
      liner.position.y = 0.745;
      const glass = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.26, 0.93), glassMat);
      glass.position.y = 0.88;
      glass.renderOrder = 3;
      g.add(cabinet, baseTrim, topRim, liner, glass);

      // Vật phẩm trưng bày bên trong
      if (items === 'book') {
        [-0.55, 0.1].forEach((bx, i) => {
          const book = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.32), i ? this.mats.red : this.mats.white);
          book.position.set(bx, 0.8, 0.0);
          book.rotation.y = i ? 0.2 : -0.15;
          g.add(book);
        });
        const open = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.38), this.mats.white);
        open.position.set(0.7, 0.775, 0.05);
        open.rotation.y = 0.1;
        g.add(open);
      } else if (items === 'badge') {
        for (let i = 0; i < 5; i++) {
          const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10), this.mats.brass);
          badge.position.set(-0.8 + i * 0.4, 0.775, (i % 2 ? 0.12 : -0.12));
          g.add(badge);
          const star = SceneManager.createStarMesh(0.06, 0.025, 0.012, this.mats.red);
          star.rotation.x = -Math.PI / 2;
          star.position.set(badge.position.x, 0.79, badge.position.z);
          g.add(star);
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8), this.mats.white);
          scroll.rotation.z = Math.PI / 2;
          scroll.rotation.y = 0.2 * (i - 1);
          scroll.position.set(-0.55 + i * 0.5, 0.8, 0.05 * (i - 1));
          const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), this.mats.velvet);
          ribbon.rotation.z = Math.PI / 2;
          ribbon.position.copy(scroll.position);
          g.add(scroll, ribbon);
        }
      }

      g.traverse((c) => {
        if (c.isMesh && c.material !== glassMat) c.castShadow = true;
      });
      return g;
    }
  }

  // ---------------------------------------------------------------------
  // 7b. TẦNG 2: chậu cây, bình cứu hỏa, thùng rác, tủ kính, thảm dẫn hướng
  // ---------------------------------------------------------------------
  buildFloor2Decor() {
    if (!this.f2) return;
    const root = new THREE.Group();
    root.position.y = 5.5; // mặt sàn Tầng 2
    this.f2.add(root);

    // Chậu cây rêu đặt thoáng ở hai tường biên Tầng 2 (cách xa thảm đỏ và không bị gần nhau)
    [
      [-29.2, -14.0],
      [29.2, -14.0]
    ].forEach(([x, z]) => {
      root.add(this.createMossPlant(x, z));
      this.addPillar('indoorF2', x, z, 0.45);
    });

    // Bình cứu hỏa đỏ ở góc tường
    [
      [-30.9, -6.8, Math.PI / 2],
      [30.9, -6.8, -Math.PI / 2],
      [-30.9, -35.5, Math.PI / 2],
      [30.9, -35.5, -Math.PI / 2]
    ].forEach(([x, z, rotY]) => root.add(this.createExtinguisher(x, z, rotY)));

    // Thùng rác gỗ cạnh ghế nghỉ (ghế ở x=±29.8, z=-18.5)
    [[-29.4, -21.4], [29.4, -21.4]].forEach(([x, z]) => {
      root.add(this.createWoodBin(x, z));
      this.addPillar('indoorF2', x, z, 0.3);
    });

    // Tủ kính nằm ngang trưng bày văn kiện (tránh khoảng trống giữa sảnh tầng 2)
    [
      { x: -9.0, z: -28.0, items: 'doc' },
      { x: 9.0, z: -28.0, items: 'badge' },
      { x: -22.5, z: -18.5, items: 'book' },
      { x: 22.5, z: -18.5, items: 'doc' }
    ].forEach(({ x, z, items }) => {
      const t = this.createDisplayTable(items);
      t.position.set(x, 0, z);
      root.add(t);
      this.addPillar('indoorF2', x - 0.6, z, 0.55);
      this.addPillar('indoorF2', x + 0.6, z, 0.55);
    });
  }


  // ---------------------------------------------------------------------
  // 8. Ray đèn rọi (spotlight) + vệt sáng tròn mờ xuống đúng các bục trưng bày chính
  // ---------------------------------------------------------------------
  buildSpotlightRails() {
    const railY = 4.2;
    const exhibits = EXHIBITS_DATA.filter((e) => e.zoneType === 'indoor' && e.floor === 1);
    const railZs = Array.from(new Set(exhibits.map((e) => e.position.z)));

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff1c7,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Ray kim loại đen bắt qua giữa hai tường (đỡ bằng tường), kèm hai tấm đế gắn tường
    railZs.forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(62.4, 0.1, 0.14), this.mats.iron);
      rail.position.set(0, railY + 0.05, rz);
      this.f1.add(rail);
    });

    exhibits.forEach((ex) => {
      const { x, z } = ex.position;
      const fixtureX = x + (x < 0 ? 1.6 : -1.6); // đặt lệch hướng vào giữa sảnh để chiếu chéo xuống bục
      const fixture = new THREE.Group();
      fixture.position.set(fixtureX, railY, z);

      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), this.mats.iron);
      clamp.position.y = 0.0;
      fixture.add(clamp);

      const target = new THREE.Vector3(x, 1.15, z);
      const dir = target.clone().sub(fixture.position);
      const len = dir.length();
      dir.normalize();

      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.34, 8), this.mats.iron);
      can.geometry.translate(0, -0.17, 0);
      can.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      can.position.y = -0.04;
      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.13, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff6d8 })
      );
      lens.position.copy(dir.clone().multiplyScalar(0.34)).add(new THREE.Vector3(0, -0.04, 0));
      lens.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      fixture.add(can, lens);

      // Chùm sáng mờ (nón rỗng) từ đèn xuống bục
      const coneGeo = new THREE.ConeGeometry(len * 0.26, len, 14, 1, true);
      coneGeo.translate(0, -len / 2, 0);
      const cone = new THREE.Mesh(coneGeo, beamMat);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      cone.position.copy(lens.position);
      cone.renderOrder = 2;
      fixture.add(cone);

      this.f1.add(fixture);

      // Vệt sáng tròn mờ trên sàn đúng vị trí bục
      const pool = createGlowDecal(2.7, 0xfff0c2, 0.24);
      pool.position.set(x, 0.05, z);
      this.f1.add(pool);
    });
  }
}
