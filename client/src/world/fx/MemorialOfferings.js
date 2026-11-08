import * as THREE from 'three';
import { SceneManager } from '../SceneManager.js?v=19';
import { PALETTE } from '../../constants.js?v=19';
import { createGlowSprite, createGlowDecal } from './FxTextures.js?v=19';

const MAX_CANDLES = 18;
const MAX_BOUQUETS = 6;
const EMBERS_PER_CANDLE = 3;
const AURA_LIFE = 2.6;
const LEDGE_TOP_Y = -0.82; // Mặt bệ đá đặt hoa (tọa độ cục bộ của container nến)

/**
 * MemorialOfferings: Dựng & hoạt họa Nến + Hoa dâng trên Bàn đá Tưởng niệm (Gian 6 - Tầng 2).
 * - Nến: thân sáp có đế đồng, bấc, ngọn lửa 2 lớp chập chờn + quầng sáng sprite + đốm lửa bay lên (particle).
 * - Hoa: bó hoa cúc trắng / hoa sen hồng đặt nằm trang trọng trên bệ đá; có hào quang sáng khi có người vừa dâng.
 * - Hiệu năng: chỉ dùng 1 PointLight duy nhất (của bàn đá, nhấp nháy theo số nến) + decal ánh sáng giả trên mặt đá.
 * - Đồng bộ: nhận danh sách `candles` từ WebSocket (`memorial:updated`); mỗi `id` mới (sau lần đồng bộ đầu) tạo hào quang cho cả phòng.
 */
export class MemorialOfferings {
  constructor(container, altarLight = null) {
    this.container = container;
    this.altarLight = altarLight;
    this.baseLightIntensity = altarLight ? altarLight.intensity : 1.2;

    this.knownIds = new Set();
    this.initialized = false;
    this.flames = [];
    this.auras = [];
    this.bouquetHalos = [];
    this.embers = null;
    this.candleCount = 0;

    this.waxMat = SceneManager.createFlatMaterial(0xfff5d6);
    this.brassMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, { roughness: 0.3, metalness: 0.5 });
    this.lotusBaseMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
    this.outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff8a1f,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffec9a,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.wickMat = SceneManager.createFlatMaterial(0x2a1c10);

    this.waxGeo = new THREE.CylinderGeometry(0.052, 0.062, 0.2, 8);
    this.collarGeo = new THREE.CylinderGeometry(0.082, 0.09, 0.03, 8);
    this.lotusGeo = new THREE.ConeGeometry(0.14, 0.08, 8);
    this.wickGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.04, 4);
    this.outerFlameGeo = new THREE.ConeGeometry(0.036, 0.13, 6);
    this.innerFlameGeo = new THREE.ConeGeometry(0.02, 0.08, 6);

    // Quầng sáng ấm giả (decal) lan trên mặt đá, cường độ theo số nến
    this.tableGlow = createGlowDecal(1.9, 0xffa94d, 0.0);
    this.tableGlow.scale.set(1, 0.42, 1);
    this.tableGlow.position.set(0, 0.006, 0.1);
    this.container.add(this.tableGlow);

    // Bệ đá thấp phía trước bàn để đặt hoa dâng trang trọng
    const ledgeMat = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.12, 0.74), ledgeMat);
    ledge.position.set(0, LEDGE_TOP_Y - 0.06, 1.02);
    ledge.castShadow = true;
    ledge.receiveShadow = true;
    const ledgeTrim = new THREE.Mesh(new THREE.BoxGeometry(3.74, 0.025, 0.78), this.brassMat);
    ledgeTrim.position.set(0, LEDGE_TOP_Y + 0.002, 1.02);
    this.container.add(ledge, ledgeTrim);

    this.offeringRoot = new THREE.Group();
    this.container.add(this.offeringRoot);
  }

  /**
   * Đồng bộ toàn bộ Nến & Hoa theo danh sách từ máy chủ.
   */
  sync(candlesList = []) {
    const items = candlesList.slice(-MAX_CANDLES);
    this.candleCount = items.length;

    // Dọn vật thể cũ (geometry/material dùng chung nên chỉ gỡ khỏi cây cảnh)
    this.disposeGroupChildren(this.offeringRoot);
    this.flames = [];
    this.bouquetHalos = [];
    this.embers = null;

    const newSlots = [];
    items.forEach((item, index) => {
      const id = item.id ?? `idx-${index}`;
      if (this.initialized && !this.knownIds.has(id)) {
        newSlots.push(index);
      }
    });
    candlesList.forEach((item, index) => this.knownIds.add(item.id ?? `idx-${index}`));
    this.initialized = true;

    // 1. Nến
    const candlePositions = [];
    items.forEach((item, index) => {
      const col = index % 6;
      const row = Math.floor(index / 6);
      const cx = (col - 2.5) * 0.52;
      const cz = (row - 0.5) * 0.32;
      candlePositions.push({ x: cx, z: cz });
      this.offeringRoot.add(this.createCandle(cx, cz, index));
    });

    // 2. Đốm lửa bay lên (1 Points dùng chung cho tất cả nến)
    if (items.length > 0) {
      this.createEmbers(candlePositions);
    }

    // 3. Hoa dâng: tối đa 6 bó mới nhất, nằm trang trọng ở mép trước bệ đá
    const bouquetItems = items.slice(-MAX_BOUQUETS);
    const bouquetOffset = items.length - bouquetItems.length;
    bouquetItems.forEach((item, i) => {
      const slotIndex = bouquetOffset + i;
      const bx = (i - (bouquetItems.length - 1) / 2) * 0.58;
      const bouquet = this.createBouquet(slotIndex % 2 === 0 ? 'chrysanthemum' : 'lotus');
      bouquet.position.set(bx, LEDGE_TOP_Y, 0.8);
      bouquet.rotation.y = (i % 2 ? -1 : 1) * 0.12;
      this.offeringRoot.add(bouquet);

      // Hào quang nền nhẹ dưới mỗi bó hoa
      const halo = createGlowSprite(0xfff1cf, 0.78, 0.2);
      halo.position.set(bx, LEDGE_TOP_Y + 0.14, 1.02);
      this.offeringRoot.add(halo);
      this.bouquetHalos.push({ sprite: halo, phase: Math.random() * 6 });

      if (newSlots.includes(slotIndex)) {
        this.spawnAura(bx, LEDGE_TOP_Y + 0.16, 1.0, 0xfff0c2);
      }
    });

    // 4. Hào quang cho Nến mới thắp
    newSlots.forEach((slotIndex) => {
      const p = candlePositions[slotIndex];
      if (p) this.spawnAura(p.x, 0.32, p.z, 0xffc266);
    });

    this.tableGlow.material.opacity = Math.min(0.48, 0.06 + items.length * 0.024);
  }

  createCandle(x, z, index) {
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);

    const lotus = new THREE.Mesh(this.lotusGeo, this.lotusBaseMat);
    lotus.position.y = 0.04;
    const collar = new THREE.Mesh(this.collarGeo, this.brassMat);
    collar.position.y = 0.095;
    const wax = new THREE.Mesh(this.waxGeo, this.waxMat);
    wax.position.y = 0.2;
    const wick = new THREE.Mesh(this.wickGeo, this.wickMat);
    wick.position.y = 0.32;

    const flameGroup = new THREE.Group();
    flameGroup.position.y = 0.4;
    const outer = new THREE.Mesh(this.outerFlameGeo, this.outerFlameMat);
    const inner = new THREE.Mesh(this.innerFlameGeo, this.innerFlameMat);
    inner.position.y = -0.012;
    flameGroup.add(outer, inner);

    const glow = createGlowSprite(0xffa64a, 0.42, 0.55);
    glow.position.y = 0.4;

    holder.add(lotus, collar, wax, wick, flameGroup, glow);

    this.flames.push({
      flameGroup,
      glow,
      phase: index * 1.37 + Math.random() * 3,
      speed: 7 + Math.random() * 5
    });
    return holder;
  }

  createEmbers(candlePositions) {
    const count = candlePositions.length * EMBERS_PER_CANDLE;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.offeringRoot.add(points);

    const seeds = [];
    candlePositions.forEach((p) => {
      for (let k = 0; k < EMBERS_PER_CANDLE; k++) {
        seeds.push({
          x: p.x,
          z: p.z,
          phase: Math.random(),
          speed: 0.35 + Math.random() * 0.35,
          drift: (Math.random() - 0.5) * 0.12
        });
      }
    });
    this.embers = { points, geo, positions, colors, seeds };
  }

  /**
   * Bó hoa nằm: thân trục +Y (đầu hoa hướng +Y) rồi được xoay nằm xuống về phía khách tham quan.
   */
  createBouquet(kind) {
    const outer = new THREE.Group();
    const bouquet = new THREE.Group();

    const wrapMat = SceneManager.createFlatMaterial(kind === 'lotus' ? 0xfff0e0 : 0xf5ead2);
    const stemMat = SceneManager.createFlatMaterial(0x3f7a3a);
    const wrapper = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.3, 6), wrapMat);
    wrapper.rotation.z = Math.PI;
    wrapper.position.y = 0.15;
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 5, 8), this.brassMat);
    ribbon.rotation.x = Math.PI / 2;
    ribbon.position.y = 0.2;
    bouquet.add(wrapper, ribbon);

    // Cuống hoa xòe quạt
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.2, 4), stemMat);
      stem.position.set(Math.cos(a) * 0.045, 0.37, Math.sin(a) * 0.045);
      stem.rotation.z = Math.cos(a) * 0.35;
      stem.rotation.x = -Math.sin(a) * 0.35;
      bouquet.add(stem);
    }

    if (kind === 'chrysanthemum') {
      const petalMat = SceneManager.createFlatMaterial(0xfdfdf5);
      const coreMat = SceneManager.createFlatMaterial(0xf2c230);
      const headGeo = new THREE.DodecahedronGeometry(0.075, 0);
      const coreGeo = new THREE.IcosahedronGeometry(0.032, 0);
      const spots = [[0, 0.5, 0]];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        spots.push([Math.cos(a) * 0.12, 0.44 + (i % 2) * 0.03, Math.sin(a) * 0.12]);
      }
      spots.forEach(([hx, hy, hz]) => {
        const head = new THREE.Mesh(headGeo, petalMat);
        head.scale.set(1, 0.5, 1);
        head.position.set(hx, hy, hz);
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(hx, hy + 0.02, hz);
        bouquet.add(head, core);
      });
    } else {
      const petalMat = SceneManager.createFlatMaterial(0xff93b4);
      const innerMat = SceneManager.createFlatMaterial(0xffc9d8);
      const leafMat = SceneManager.createFlatMaterial(0x4e8a45);
      const petalGeo = new THREE.ConeGeometry(0.045, 0.16, 5);
      [[0, 0.48, 0, 1], [-0.13, 0.42, 0.04, 0.8], [0.13, 0.42, -0.04, 0.8]].forEach(([lx, ly, lz, s]) => {
        const lotus = new THREE.Group();
        lotus.position.set(lx, ly, lz);
        lotus.scale.setScalar(s);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const petal = new THREE.Mesh(petalGeo, i % 2 ? petalMat : innerMat);
          petal.position.set(Math.cos(a) * 0.06, 0.05, Math.sin(a) * 0.06);
          petal.rotation.z = -Math.cos(a) * 0.7;
          petal.rotation.x = Math.sin(a) * 0.7;
          lotus.add(petal);
        }
        const center = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), this.brassMat);
        center.position.y = 0.04;
        lotus.add(center);
        bouquet.add(lotus);
      });
      const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 7), leafMat);
      leaf.position.set(0, 0.3, 0);
      leaf.rotation.z = 0.2;
      bouquet.add(leaf);
    }

    // Đặt nằm: đầu hoa hướng ra phía khách (+Z), hơi chếch lên
    bouquet.rotation.x = Math.PI / 2 - 0.22;
    bouquet.position.y = 0.09;
    outer.add(bouquet);
    outer.traverse((c) => {
      if (c.isMesh) c.castShadow = true;
    });
    return outer;
  }

  spawnAura(x, y, z, colorHex) {
    const sprite = createGlowSprite(colorHex, 0.5, 0.95);
    sprite.position.set(x, y, z);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.3, 28), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.02, z);
    this.offeringRoot.add(sprite, ring);
    this.auras.push({ sprite, ring, age: 0 });
  }

  update(dt, elapsedTime) {
    // Ngọn lửa chập chờn
    for (const f of this.flames) {
      const t = elapsedTime * f.speed + f.phase;
      const flick = 1 + Math.sin(t) * 0.12 + Math.sin(t * 2.7) * 0.08 + Math.sin(t * 6.1) * 0.04;
      f.flameGroup.scale.set(0.92 + (flick - 1) * 0.5, flick, 0.92 + (flick - 1) * 0.5);
      f.flameGroup.rotation.z = Math.sin(t * 0.8) * 0.12;
      f.flameGroup.rotation.x = Math.cos(t * 0.65) * 0.1;
      f.glow.material.opacity = 0.45 + (flick - 1) * 1.4;
      f.glow.scale.setScalar(0.4 * (0.95 + (flick - 1) * 1.5));
    }

    // Đốm lửa bay lên
    if (this.embers) {
      const { positions, colors, seeds, geo } = this.embers;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        s.phase += dt * s.speed;
        if (s.phase >= 1) s.phase -= 1;
        const t = s.phase;
        positions[i * 3] = s.x + Math.sin(t * 9 + i) * 0.02 + s.drift * t;
        positions[i * 3 + 1] = 0.44 + t * 0.55;
        positions[i * 3 + 2] = s.z + Math.cos(t * 7 + i) * 0.02;
        const fade = Math.sin(t * Math.PI);
        colors[i * 3] = 1.0 * fade;
        colors[i * 3 + 1] = 0.62 * fade;
        colors[i * 3 + 2] = 0.22 * fade;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }

    // Hào quang nhẹ của bó hoa
    for (const h of this.bouquetHalos) {
      h.sprite.material.opacity = 0.16 + Math.sin(elapsedTime * 1.8 + h.phase) * 0.05;
    }

    // Hào quang khi có người vừa dâng
    for (let i = this.auras.length - 1; i >= 0; i--) {
      const a = this.auras[i];
      a.age += dt;
      const p = a.age / AURA_LIFE;
      if (p >= 1) {
        this.offeringRoot.remove(a.sprite, a.ring);
        a.sprite.material.dispose();
        a.ring.material.dispose();
        a.ring.geometry.dispose();
        this.auras.splice(i, 1);
        continue;
      }
      const ease = 1 - Math.pow(1 - p, 2);
      a.sprite.scale.setScalar(0.5 + ease * 1.5);
      a.sprite.material.opacity = 0.95 * (1 - p) * (1 - p);
      a.ring.scale.setScalar(1 + ease * 4);
      a.ring.material.opacity = 0.8 * (1 - p);
    }

    // PointLight duy nhất của bàn đá: nhấp nháy theo số nến
    if (this.altarLight) {
      const base = this.baseLightIntensity * (0.55 + Math.min(this.candleCount, MAX_CANDLES) * 0.045);
      const flick =
        1 + Math.sin(elapsedTime * 8.3) * 0.05 + Math.sin(elapsedTime * 21.7) * 0.03;
      const burst = this.auras.length > 0 ? 0.35 : 0;
      this.altarLight.intensity = base * flick + burst;
    }
  }

  disposeGroupChildren(group) {
    for (const aura of this.auras) {
      aura.sprite.material.dispose();
      aura.ring.material.dispose();
      aura.ring.geometry.dispose();
    }
    this.auras = [];
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse?.((c) => {
        if (c.isSprite) c.material.dispose();
        if (c.isPoints) {
          c.geometry.dispose();
          c.material.dispose();
        }
      });
    }
  }
}
