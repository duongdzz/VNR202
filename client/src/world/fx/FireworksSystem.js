import * as THREE from 'three';
import { getGlowTexture, createGlowSprite } from './FxTextures.js?v=19';

/**
 * Tông màu pháo hoa lễ hội: Vàng kim, Đỏ tươi, Xanh ngọc, Tím pastel.
 */
const FIREWORK_PALETTE = [
  [0xffd23f, 0xfff1a8],
  [0xff2d3b, 0xff9aa2],
  [0x19e6b0, 0xb6ffe9],
  [0xc8a2ff, 0xeadcff]
];

const GRAVITY = 3.1; // Gia tốc rơi chậm để tia sáng buông xuống mềm mại
const DRAG = 1.15; // Lực cản không khí
const RISE_TIME = 0.7;
const BURST_LIFE = 2.6;

/**
 * FireworksSystem: Hệ thống particle pháo hoa dùng THREE.Points (1 draw call / quả pháo):
 * - Pha 1: Tên lửa vút lên kèm vệt đuôi sáng.
 * - Pha 2: Nổ tia (dạng cầu / vòng / 2 lớp màu) với 170+ hạt, trọng lực rơi chậm, mờ dần mượt mà, lấp lánh.
 * - Tiếng nổ vang định hướng không gian (PositionalAudio) nếu trình duyệt đã cho phép phát âm thanh.
 */
export class FireworksSystem {
  constructor(parentGroup, audioListener = null) {
    this.parent = parentGroup;
    this.audioListener = audioListener;
    this.bursts = [];
    this.boomBuffer = null;
  }

  get isActive() {
    return this.bursts.length > 0;
  }

  launch(count = 5) {
    for (let b = 0; b < count; b++) {
      const pair = FIREWORK_PALETTE[(b + Math.floor(Math.random() * 4)) % FIREWORK_PALETTE.length];
      const shapes = ['sphere', 'ring', 'double'];
      this.bursts.push({
        phase: 'wait',
        delay: b * 0.28 + Math.random() * 0.15,
        age: 0,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        colors: pair,
        target: new THREE.Vector3(
          (Math.random() - 0.5) * 38,
          13.5 + Math.random() * 8,
          10 + Math.random() * 18
        ),
        start: null,
        rocket: null,
        burst: null,
        flash: null,
        sound: null
      });
    }
  }

  update(dt, canPlaySound = true) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const fw = this.bursts[i];

      if (fw.phase === 'wait') {
        fw.delay -= dt;
        if (fw.delay <= 0) this.beginRocket(fw);
        continue;
      }

      fw.age += dt;

      if (fw.phase === 'rise') {
        this.updateRocket(fw);
        if (fw.age >= RISE_TIME) {
          this.explode(fw, canPlaySound);
        }
      } else if (fw.phase === 'burst') {
        if (!this.updateBurst(fw, dt)) {
          this.disposeBurst(fw);
          this.bursts.splice(i, 1);
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // Pha 1: Tên lửa vút lên
  // ---------------------------------------------------------------------
  beginRocket(fw) {
    fw.phase = 'rise';
    fw.age = 0;
    fw.start = new THREE.Vector3(fw.target.x + (Math.random() - 0.5) * 3, 0.8, fw.target.z + (Math.random() - 0.5) * 3);

    const trailCount = 14;
    const positions = new Float32Array(trailCount * 3);
    const colors = new Float32Array(trailCount * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.75,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.parent.add(points);
    fw.rocket = { points, geo, mat, trailCount, trail: [] };
  }

  updateRocket(fw) {
    const r = fw.rocket;
    const t = Math.min(1, fw.age / RISE_TIME);
    const eased = 1 - Math.pow(1 - t, 2.2);
    const head = new THREE.Vector3().lerpVectors(fw.start, fw.target, eased);
    head.x += Math.sin(fw.age * 24) * 0.12;
    r.trail.unshift(head.clone());
    if (r.trail.length > r.trailCount) r.trail.pop();

    const pos = r.geo.attributes.position.array;
    const col = r.geo.attributes.color.array;
    const c = new THREE.Color(fw.colors[1]);
    for (let k = 0; k < r.trailCount; k++) {
      const p = r.trail[Math.min(k, r.trail.length - 1)];
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      const fade = Math.pow(1 - k / r.trailCount, 1.8);
      col[k * 3] = c.r * fade;
      col[k * 3 + 1] = c.g * fade;
      col[k * 3 + 2] = c.b * fade;
    }
    r.geo.attributes.position.needsUpdate = true;
    r.geo.attributes.color.needsUpdate = true;
  }

  // ---------------------------------------------------------------------
  // Pha 2: Nổ tia
  // ---------------------------------------------------------------------
  explode(fw, canPlaySound) {
    if (fw.rocket) {
      this.parent.remove(fw.rocket.points);
      fw.rocket.geo.dispose();
      fw.rocket.mat.dispose();
      fw.rocket = null;
    }

    fw.phase = 'burst';
    fw.age = 0;

    const count = fw.shape === 'double' ? 230 : 180;
    const positions = new Float32Array(count * 3);
    const baseColors = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const twinkle = new Float32Array(count);

    const c1 = new THREE.Color(fw.colors[0]);
    const c2 = new THREE.Color(fw.colors[1]);
    const white = new THREE.Color(0xffffff);

    // Mặt phẳng ngẫu nhiên cho dạng vòng
    const ringNormal = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize();
    const ringU = new THREE.Vector3().crossVectors(ringNormal, new THREE.Vector3(0, 1, 0.3)).normalize();
    const ringV = new THREE.Vector3().crossVectors(ringNormal, ringU).normalize();

    for (let i = 0; i < count; i++) {
      let speed;
      const dir = new THREE.Vector3();
      let color;

      if (fw.shape === 'ring') {
        const a = (i / count) * Math.PI * 2;
        dir.copy(ringU).multiplyScalar(Math.cos(a)).addScaledVector(ringV, Math.sin(a));
        speed = 6.2 + Math.random() * 0.8;
        color = i % 9 === 0 ? white : c1;
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        dir.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        if (fw.shape === 'double') {
          const inner = i % 2 === 0;
          speed = inner ? 3.4 + Math.random() * 0.8 : 6.4 + Math.random() * 1.2;
          color = inner ? c2 : c1;
        } else {
          speed = 4.6 + Math.random() * 3.6;
          color = i % 7 === 0 ? white : Math.random() < 0.3 ? c2 : c1;
        }
      }

      velocities[i * 3] = dir.x * speed;
      velocities[i * 3 + 1] = dir.y * speed;
      velocities[i * 3 + 2] = dir.z * speed;
      baseColors[i * 3] = color.r;
      baseColors[i * 3 + 1] = color.g;
      baseColors[i * 3 + 2] = color.b;
      twinkle[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.95,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.position.copy(fw.target);
    this.parent.add(points);

    // Quầng chớp sáng ban đầu khi nổ
    const flash = createGlowSprite(fw.colors[1], 7, 0.9);
    flash.position.copy(fw.target);
    this.parent.add(flash);

    fw.burst = { points, geo, mat, count, positions, colors, baseColors, velocities, twinkle };
    fw.flash = flash;

    if (canPlaySound) this.playBoom(fw);
  }

  /**
   * @returns {boolean} true nếu quả pháo còn sống
   */
  updateBurst(fw, dt) {
    const b = fw.burst;
    const progress = fw.age / BURST_LIFE;
    if (progress >= 1) return false;

    const drag = Math.exp(-DRAG * dt);
    const fade = Math.pow(1 - progress, 1.5);
    const fadeIn = Math.min(1, fw.age / 0.06);

    for (let i = 0; i < b.count; i++) {
      const ix = i * 3;
      b.velocities[ix] *= drag;
      b.velocities[ix + 1] = b.velocities[ix + 1] * drag - GRAVITY * dt;
      b.velocities[ix + 2] *= drag;
      b.positions[ix] += b.velocities[ix] * dt;
      b.positions[ix + 1] += b.velocities[ix + 1] * dt;
      b.positions[ix + 2] += b.velocities[ix + 2] * dt;

      const tw = 0.72 + 0.28 * Math.sin(fw.age * 22 + b.twinkle[i]);
      const k = fade * tw * fadeIn;
      b.colors[ix] = b.baseColors[ix] * k;
      b.colors[ix + 1] = b.baseColors[ix + 1] * k;
      b.colors[ix + 2] = b.baseColors[ix + 2] * k;
    }
    b.geo.attributes.position.needsUpdate = true;
    b.geo.attributes.color.needsUpdate = true;
    b.mat.size = 0.95 * (1 - progress * 0.45);

    if (fw.flash) {
      const fp = Math.min(1, fw.age / 0.35);
      fw.flash.material.opacity = 0.9 * (1 - fp);
      fw.flash.scale.setScalar(7 + fp * 6);
      if (fp >= 1) {
        this.parent.remove(fw.flash);
        fw.flash.material.dispose();
        fw.flash = null;
      }
    }
    return true;
  }

  disposeBurst(fw) {
    if (fw.burst) {
      this.parent.remove(fw.burst.points);
      fw.burst.geo.dispose();
      fw.burst.mat.dispose();
      fw.burst = null;
    }
    if (fw.flash) {
      this.parent.remove(fw.flash);
      fw.flash.material.dispose();
      fw.flash = null;
    }
    if (fw.sound) {
      try {
        if (fw.sound.isPlaying) fw.sound.stop();
        this.parent.remove(fw.sound);
      } catch {
        // bỏ qua
      }
      fw.sound = null;
    }
  }

  // ---------------------------------------------------------------------
  // Tiếng nổ vang định hướng không gian
  // ---------------------------------------------------------------------
  getBoomBuffer() {
    if (this.boomBuffer) return this.boomBuffer;
    const ctx = this.audioListener?.context;
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate;
    const duration = 1.4;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      low += (noise - low) * 0.12; // low-pass nhẹ để tiếng nổ trầm, không chói
      const env = Math.exp(-t * 4.2);
      const thump = Math.sin(2 * Math.PI * (68 - t * 28) * t) * Math.exp(-t * 6.5);
      data[i] = (low * 0.9 * env + thump * 0.8) * 0.5;
    }
    this.boomBuffer = buffer;
    return buffer;
  }

  playBoom(fw) {
    try {
      const listener = this.audioListener;
      if (!listener || listener.context.state !== 'running') return;
      const buffer = this.getBoomBuffer();
      if (!buffer) return;
      const sound = new THREE.PositionalAudio(listener);
      sound.setBuffer(buffer);
      sound.setRefDistance(14);
      sound.setRolloffFactor(1.1);
      sound.setVolume(0.55);
      sound.setPlaybackRate(0.9 + Math.random() * 0.25);
      sound.position.copy(fw.target);
      this.parent.add(sound);
      sound.play();
      fw.sound = sound;
    } catch {
      // Trình duyệt chặn tự phát âm thanh
    }
  }
}
