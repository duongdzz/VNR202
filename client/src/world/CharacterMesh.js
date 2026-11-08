import * as THREE from 'three';
import { PALETTE } from '../constants.js?v=19';
import { SceneManager } from './SceneManager.js?v=19';
import { createVehicle } from './VehicleMesh.js?v=19';

/**
 * CharacterMesh: Tạo nhân vật Chibi Low-poly Flat-Shaded:
 * - Thân viên thuốc (CapsuleGeometry), 2 mắt chấm đen
 * - Trang phục đầu:
 *   + 'pith': Mũ cối xanh lính đính sao vàng 5 cánh
 *   + 'conical': Nón lá sơn Cờ đỏ sao vàng Việt Nam (thân nón đỏ tươi, vành nón rơm, ngôi sao 5 cánh vàng trên mặt nón)
 * - Emote:
 *   + [1] 'salute': Giơ tay chào điều lệnh
 *   + [2] 'flag_wave': Cầm Cờ đỏ sao vàng Việt Nam vẫy qua lại tự hào
 *   + [3] 'heart_flag': Thả hạt Cờ đỏ sao vàng & Trái tim bay lên
 * - Tư thế ngồi ghế (Sit Interaction) đặt đúng trên mặt ghế, không bị lún vào ghế.
 */
export class CharacterMesh {
  constructor({
    id,
    name = 'Khách tham quan',
    colorIndex = 0,
    hatType = 'pith',
    isLocal = false,
    customBodyColor = null
  }) {
    this.id = id;
    this.name = name;
    this.isLocal = isLocal;
    this.colorIndex = colorIndex;
    this.customBodyColor = customBodyColor;

    this.root = new THREE.Group();
    this.visualGroup = new THREE.Group();
    this.root.add(this.visualGroup);

    this.particlesGroup = new THREE.Group();
    this.root.add(this.particlesGroup);
    this.floatingParticles = [];

    this.walkPhase = Math.random() * Math.PI * 2;
    this.currentSpeedRatio = 0;
    this.isSitting = false;
    this.vehicle = null;
    this.vehicleType = null;
    this.vehicleTime = 0;
    this.activeEmote = null;
    this.speechBubbleTimer = 0;

    this.buildBodyMesh(colorIndex);
    this.buildEyes();
    this.buildHat(hatType);
    this.buildHeroBackpackAndBadge(hatType.includes('backpack'));
    this.buildSaluteArmAndHandheldFlag(colorIndex);
    this.buildShadowDisc();
    this.buildNameplate(name, isLocal);
    this.buildEmoteBadge();
    this.buildSpeechBubble();
  }

  buildBodyMesh(colorIndex) {
    const bodyColor =
      this.customBodyColor !== null
        ? this.customBodyColor
        : PALETTE.AVATAR_COLORS[Math.abs(colorIndex) % PALETTE.AVATAR_COLORS.length];
    const bodyMat = SceneManager.createFlatMaterial(bodyColor);

    const capsuleGeo = new THREE.CapsuleGeometry(0.42, 0.52, 4, 10);
    this.bodyMesh = new THREE.Mesh(capsuleGeo, bodyMat);
    this.bodyMesh.position.y = 0.68;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;

    this.visualGroup.add(this.bodyMesh);
  }

  buildEyes() {
    const eyeMat = SceneManager.createFlatMaterial(PALETTE.EYE_BLACK, {
      roughness: 0.5
    });
    const eyeGeo = new THREE.IcosahedronGeometry(0.055, 0);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 0.85, 0.39);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.14, 0.85, 0.39);

    this.visualGroup.add(leftEye, rightEye);
  }

  /**
   * Phụ kiện mũ nhận diện:
   * - 'conical': Nón lá Cờ đỏ sao vàng Việt Nam (thân nón đỏ tươi, vành nón rơm vàng, ngôi sao vàng 5 cánh nổi trên mặt nón)
   * - 'pith': Mũ cối xanh lính có ngôi sao vàng 5 cánh phía trước
   */
  buildHat(hatType) {
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.24, 0);

    const isConical = String(hatType).startsWith('conical');
    if (isConical) {
      const strawMat = SceneManager.createFlatMaterial(PALETTE.CONICAL_STRAW);
      const flagRedMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
      const brightYellowMat = SceneManager.createFlatMaterial(PALETTE.BRIGHT_STAR_YELLOW, {
        roughness: 0.35,
        metalness: 0.1,
        emissive: PALETTE.BRIGHT_STAR_YELLOW,
        emissiveIntensity: 0.22
      });

      // Vành nón lá rơm ở chân nón
      const rimMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.66, 0.036, 6, 16),
        strawMat
      );
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = -0.07;

      // Thân nón lá sơn màu Đỏ Cờ Tổ Quốc (bán kính đáy R = 0.66, chiều cao H = 0.44, tâm tại y = 0.14)
      const R = 0.66;
      const H = 0.44;
      const coneCenterY = 0.14;
      const apexY = coneCenterY + H / 2; // 0.36
      const slopeAngle = Math.atan2(R, H); // Góc nghiêng mái nón so với trục đứng Y (~56.3 độ)

      const coneGeo = new THREE.ConeGeometry(R, H, 16);
      const coneMesh = new THREE.Mesh(coneGeo, flagRedMat);
      coneMesh.position.y = coneCenterY;
      coneMesh.castShadow = true;

      // Tính tọa độ điểm giữa sườn nón để gắn ngôi sao 5 cánh phẳng áp sát bề mặt nón lá
      const dFromApex = 0.21;
      const surfaceRadius = (dFromApex / H) * R; // 0.315
      const surfaceY = apexY - dFromApex;        // 0.15
      const normalOffset = 0.012;
      const starY = surfaceY + Math.sin(slopeAngle) * normalOffset;
      const starZ = surfaceRadius + Math.cos(slopeAngle) * normalOffset;

      // Ngôi sao 5 cánh vàng tươi (#FFE600) chuẩn tỉ lệ gắn áp sát sườn trước & sườn sau nón lá
      [0, Math.PI].forEach((yaw) => {
        const sidePivot = new THREE.Group();
        sidePivot.rotation.y = yaw;

        const starMesh = SceneManager.createStarMesh(
          0.19,
          0.19 * 0.382,
          0.016,
          brightYellowMat
        );
        starMesh.position.set(0, starY, starZ);
        // Nghiêng đúng góc mái nón (-slopeAngle) để mặt ngôi sao ép phẳng hoàn toàn lên mặt nón lá
        starMesh.rotation.x = -slopeAngle;

        sidePivot.add(starMesh);
        hatGroup.add(sidePivot);
      });

      hatGroup.add(rimMesh, coneMesh);
    } else {
      const greenMat = SceneManager.createFlatMaterial(PALETTE.ARMY_GREEN);
      const brimGeo = new THREE.CylinderGeometry(0.54, 0.58, 0.08, 10);
      const brimMesh = new THREE.Mesh(brimGeo, greenMat);

      const domeGeo = new THREE.CylinderGeometry(0.32, 0.44, 0.24, 10);
      const domeMesh = new THREE.Mesh(domeGeo, greenMat);
      domeMesh.position.y = 0.14;

      // Huy hiệu ngôi sao 5 cánh nhỏ phía trước mũ cối
      const badgeStar = SceneManager.createStarMesh(0.085, 0.036, 0.025);
      badgeStar.position.set(0, 0.15, 0.41);

      brimMesh.castShadow = true;
      domeMesh.castShadow = true;
      hatGroup.add(brimMesh, domeMesh, badgeStar);
    }

    hatGroup.rotation.x = -0.06;
    this.visualGroup.add(hatGroup);
  }

  /**
   * Phụ kiện phần thưởng Scavenger Hunt: Balo Chiến Sĩ Trường Sơn (kèm chăn cuộn + bi đông) & Khăn Quàng Đỏ / Huy Hiệu Sao Vàng trước ngực
   */
  buildHeroBackpackAndBadge(initiallyVisible = false) {
    this.heroGearGroup = new THREE.Group();
    this.heroGearGroup.visible = Boolean(initiallyVisible);

    const armyMat = SceneManager.createFlatMaterial(PALETTE.ARMY_GREEN);
    const darkMat = SceneManager.createFlatMaterial(PALETTE.TANK_DARK);
    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const redMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.BRIGHT_STAR_YELLOW);

    // 1. Balo bộ đội đeo sau lưng (z = -0.38)
    const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.28), armyMat);
    packBody.position.set(0, 0.64, -0.38);
    packBody.castShadow = true;

    const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), darkMat);
    packFlap.position.set(0, 0.84, -0.38);

    // Chăn màn cuộn tròn buộc trên đỉnh balo
    const blanketRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.52, 8),
      darkMat
    );
    blanketRoll.rotation.z = Math.PI / 2;
    blanketRoll.position.set(0, 0.98, -0.36);

    // Bi đông nước đeo bên hông balo
    const canteen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8),
      armyMat
    );
    canteen.position.set(0.28, 0.52, -0.34);

    // 2. Khăn quàng đỏ quàng dưới cổ / vai (y = 0.66, thấp hơn hẳn mắt ở y = 0.85) & Huy hiệu Sao Vàng cài trước ngực
    const scarfRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.405, 0.042, 6, 16),
      redMat
    );
    scarfRing.rotation.x = Math.PI / 2 + 0.16;
    scarfRing.position.set(0, 0.66, 0.01);

    // Nút thắt & 2 dải khăn quàng đỏ rủ xuống trước ngực (y = 0.52, z = 0.43)
    const scarfKnot = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.22, 4),
      redMat
    );
    scarfKnot.rotation.x = Math.PI;
    scarfKnot.rotation.y = Math.PI / 4;
    scarfKnot.position.set(0, 0.52, 0.42);

    const chestBadge = SceneManager.createStarMesh(0.105, 0.042, 0.03, goldMat);
    chestBadge.position.set(-0.17, 0.58, 0.41);

    this.heroGearGroup.add(
      packBody,
      packFlap,
      blanketRoll,
      canteen,
      scarfRing,
      scarfKnot,
      chestBadge
    );
    this.visualGroup.add(this.heroGearGroup);
  }

  setHeroGearVisible(visible) {
    if (this.heroGearGroup) {
      this.heroGearGroup.visible = Boolean(visible);
    }
  }

  /**
   * Cánh tay phải Chibi & Lá Cờ Việt Nam cầm tay 3D (Dùng cho Emote [1] Chào & Emote [2] Cầm cờ vẫy)
   */
  buildSaluteArmAndHandheldFlag(colorIndex) {
    const bodyColor =
      this.customBodyColor !== null
        ? this.customBodyColor
        : PALETTE.AVATAR_COLORS[Math.abs(colorIndex) % PALETTE.AVATAR_COLORS.length];
    const armMat = SceneManager.createFlatMaterial(bodyColor);

    const armGeo = new THREE.CapsuleGeometry(0.1, 0.28, 3, 6);
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(-0.46, 0.72, 0.15);
    this.rightArm.visible = false;
    this.visualGroup.add(this.rightArm);

    // Lá Cờ Đỏ Sao Vàng cầm tay (Dùng cho phím [2])
    this.handheldFlagPivot = new THREE.Group();
    this.handheldFlagPivot.position.set(-0.48, 0.85, 0.25);
    this.handheldFlagPivot.visible = false;

    const poleMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);
    const flagRedMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.35, 6),
      poleMat
    );
    pole.position.y = 0.55;

    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.5, 0.03),
      flagRedMat
    );
    cloth.position.set(-0.39, 0.96, 0);
    cloth.castShadow = true;

    // Ngôi sao 5 cánh chuẩn ở giữa lá cờ cầm tay
    const star = SceneManager.createStarMesh(0.15, 0.062, 0.05);
    star.position.set(-0.39, 0.96, 0);

    this.handheldFlagPivot.add(pole, cloth, star);
    this.visualGroup.add(this.handheldFlagPivot);
  }

  buildShadowDisc() {
    const discGeo = new THREE.CircleGeometry(0.42, 12);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x3b352c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });
    this.shadowDisc = new THREE.Mesh(discGeo, discMat);
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.y = 0.015;
    this.root.add(this.shadowDisc);
  }

  buildNameplate(nameText, isLocal) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = isLocal ? 'rgba(166, 58, 43, 0.92)' : 'rgba(42, 38, 33, 0.78)';
    const pillW = 220;
    const pillH = 42;
    const pillX = (canvas.width - pillW) / 2;
    const pillY = 11;

    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 14);
    ctx.fill();

    ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#fff9eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameText, canvas.width / 2, pillY + pillH / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.position.set(0, 1.98, 0);
    this.nameSprite.scale.set(1.85, 0.46, 1);
    this.nameSprite.renderOrder = 100;
    this.root.add(this.nameSprite);
  }

  buildEmoteBadge() {
    this.emoteCanvas = document.createElement('canvas');
    this.emoteCanvas.width = 256;
    this.emoteCanvas.height = 64;

    this.emoteTexture = new THREE.CanvasTexture(this.emoteCanvas);
    const mat = new THREE.SpriteMaterial({
      map: this.emoteTexture,
      transparent: true,
      depthTest: false
    });

    this.emoteSprite = new THREE.Sprite(mat);
    this.emoteSprite.position.set(0, 2.52, 0);
    this.emoteSprite.scale.set(1.95, 0.48, 1);
    this.emoteSprite.renderOrder = 200;
    this.emoteSprite.visible = false;
    this.root.add(this.emoteSprite);
  }

  /**
   * Bong bóng chat 3D (Speech Bubble Billboard) lơ lửng cao rõ trên đầu nhân vật khi gửi tin nhắn
   */
  buildSpeechBubble() {
    this.speechCanvas = document.createElement('canvas');
    this.speechCanvas.width = 680;
    this.speechCanvas.height = 240;

    this.speechTexture = new THREE.CanvasTexture(this.speechCanvas);
    this.speechTexture.minFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: this.speechTexture,
      transparent: true,
      depthTest: false
    });

    this.speechSprite = new THREE.Sprite(mat);
    this.speechSprite.position.set(0, 3.18, 0);
    this.speechSprite.scale.set(3.75, 1.32, 1);
    this.speechSprite.renderOrder = 999;
    this.speechSprite.visible = false;
    this.root.add(this.speechSprite);
  }

  /**
   * Hiển thị bong bóng chat trên đầu nhân vật trong 5.0 giây với cỡ chữ lớn, sắc nét
   */
  showSpeechBubble(message, duration = 5.0) {
    const cleanText = String(message || '').trim().slice(0, 120);
    if (!cleanText || !this.speechCanvas) return;

    const ctx = this.speechCanvas.getContext('2d');
    const w = this.speechCanvas.width;
    const h = this.speechCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Khung bong bóng kem ấm viền đỏ son kèm mũi nhọn trỏ xuống đầu nhân vật
    const boxX = 18;
    const boxY = 14;
    const boxW = w - 36;
    const boxH = h - 52;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = 'rgba(255, 252, 242, 0.98)';
    ctx.strokeStyle = '#c82323';
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 26);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Mũi tên nhỏ dưới đáy bong bóng
    ctx.fillStyle = 'rgba(255, 252, 242, 0.98)';
    ctx.strokeStyle = '#c82323';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 18, boxY + boxH - 2);
    ctx.lineTo(w / 2, boxY + boxH + 24);
    ctx.lineTo(w / 2 + 18, boxY + boxH - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Xóa đường viền ngang nối giữa thân bong bóng và mũi tên
    ctx.fillStyle = 'rgba(255, 252, 242, 0.99)';
    ctx.fillRect(w / 2 - 16, boxY + boxH - 5, 32, 8);

    // Ngắt dòng tự động tối đa 2 dòng với cỡ chữ lớn (bold 36px)
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#1e1915';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = cleanText.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(test).width > boxW - 44 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    const displayLines = lines.slice(0, 2);
    if (lines.length > 2) {
      displayLines[1] = displayLines[1].slice(0, -2) + '…';
    }

    if (displayLines.length === 1) {
      ctx.fillText(displayLines[0], w / 2, boxY + boxH / 2);
    } else {
      ctx.fillText(displayLines[0], w / 2, boxY + boxH / 2 - 24);
      ctx.fillText(displayLines[1], w / 2, boxY + boxH / 2 + 24);
    }

    this.speechTexture.needsUpdate = true;
    this.speechSprite.material.opacity = 1.0;
    this.speechSprite.visible = true;
    this.speechBubbleTimer = duration;
  }

  drawEmoteBadgeText(text, bgColor = '#c82323') {
    const ctx = this.emoteCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(18, 8, 220, 46, 20);
    ctx.fill();

    ctx.strokeStyle = '#f2b705';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#fff9eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    this.emoteTexture.needsUpdate = true;
  }

  /**
   * Kích hoạt Emote xã hội:
   * - 'salute' (Phím [1]): Giơ tay chào điều lệnh
   * - 'flag_wave' / 'clap' (Phím [2]): Cầm lá Cờ đỏ sao vàng Việt Nam vẫy tự hào
   * - 'heart_flag' (Phím [3]): Thả hạt Cờ đỏ sao vàng & Trái tim bay lên
   */
  triggerEmote(emoteType, duration = 3.2) {
    if (emoteType === 'heart_flag') {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this.spawnFloatingIcon(i % 2 === 0 ? 'flag' : 'heart'), i * 180);
      }
      return;
    }

    if (emoteType === 'salute') {
      this.drawEmoteBadgeText('★ Chào đồng chí!', '#a63a2b');
      this.activeEmote = { type: 'salute', timer: duration, elapsed: 0 };
      this.emoteSprite.visible = true;
      this.rightArm.visible = true;
      this.handheldFlagPivot.visible = false;
    } else if (emoteType === 'flag_wave' || emoteType === 'clap') {
      this.drawEmoteBadgeText('★ Việt Nam Muôn Năm!', '#c82323');
      this.activeEmote = { type: 'flag_wave', timer: 3.5, elapsed: 0 };
      this.emoteSprite.visible = true;
      this.rightArm.visible = true;
      this.handheldFlagPivot.visible = true;
    }
  }

  spawnFloatingIcon(kind = 'flag') {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    if (kind === 'flag') {
      ctx.fillStyle = '#c82323';
      ctx.beginPath();
      ctx.roundRect(10, 22, 76, 52, 6);
      ctx.fill();
      ctx.strokeStyle = '#fff9eb';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f2b705';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 17 : 7;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const sx = 48 + Math.cos(a) * r;
        const sy = 48 + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.font = 'bold 58px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❤️', 48, 50);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 1.0,
      depthTest: false
    });

    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      (Math.random() - 0.5) * 0.45,
      2.15,
      (Math.random() - 0.5) * 0.25
    );
    sprite.scale.set(0.65, 0.65, 1);
    this.particlesGroup.add(sprite);

    this.floatingParticles.push({
      sprite,
      age: 0,
      life: 1.85,
      vx: (Math.random() - 0.5) * 0.35,
      vy: 0.95 + Math.random() * 0.25
    });
  }

  setNameplateVisible(visible) {
    if (this.nameSprite) {
      this.nameSprite.visible = visible;
    }
  }

  /**
   * Lên / xuống phương tiện: type = 'bike' | 'jeep' | 'plane' | null.
   * Phương tiện là con của root nên di chuyển / xoay cùng nhân vật (và hiển thị đồng bộ cho người chơi khác).
   */
  setVehicle(type) {
    const nextType = type || null;
    if (nextType === this.vehicleType) return;

    if (this.vehicle) {
      this.root.remove(this.vehicle.group);
      this.vehicle.group.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
      });
      this.vehicle = null;
    }
    this.vehicleType = nextType;
    this.vehicleTime = 0;

    if (nextType) {
      this.vehicle = createVehicle(nextType);
      this.root.add(this.vehicle.group);
      this.visualGroup.position.z = this.vehicle.riderZ;
    } else {
      this.visualGroup.position.set(0, 0, 0);
      this.visualGroup.rotation.set(0, 0, 0);
      this.visualGroup.scale.set(1, 1, 1);
      this.shadowDisc.scale.setScalar(1.0);
    }
  }

  updateVehiclePose(dt, isMoving) {
    const v = this.vehicle;
    this.vehicleTime += dt;
    const t = this.vehicleTime;

    v.update(dt, isMoving, t);

    // Máy bay: lơ lửng cố định + nhấp nhô nhẹ (hover); xe mặt đất đặt sát đất
    let lift = 0;
    if (v.hoverY > 0) {
      lift = v.hoverY + Math.sin(t * 2.6) * 0.1;
      v.group.position.y = lift;
      v.group.rotation.z = Math.sin(t * 1.7) * 0.045 + (isMoving ? Math.sin(t * 3.1) * 0.03 : 0);
      v.group.rotation.x = isMoving ? 0.07 : Math.sin(t * 2.1) * 0.02;
    }

    this.visualGroup.position.y = THREE.MathUtils.lerp(
      this.visualGroup.position.y,
      v.riderY + lift,
      Math.min(1, dt * 12)
    );
    this.visualGroup.position.z = v.riderZ;
    this.visualGroup.rotation.z = v.group.rotation.z * 0.6;
    this.visualGroup.rotation.x = THREE.MathUtils.lerp(
      this.visualGroup.rotation.x,
      isMoving ? 0.1 : 0.02,
      Math.min(1, dt * 8)
    );
    this.visualGroup.scale.lerp(new THREE.Vector3(1, 0.92, 1), Math.min(1, dt * 10));
    this.shadowDisc.scale.setScalar(v.hoverY > 0 ? 1.9 - Math.sin(t * 2.6) * 0.05 : 1.5);
  }

  updateProceduralAnimation(dt, isMoving, isSitting = false) {
    this.isSitting = isSitting;

    // 1. Cập nhật các hạt Cờ đỏ sao vàng / Trái tim bay lên
    for (let i = this.floatingParticles.length - 1; i >= 0; i--) {
      const p = this.floatingParticles[i];
      p.age += dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.x += Math.sin(p.age * 5) * 0.005 + p.vx * dt;
      const ratio = 1 - p.age / p.life;
      p.sprite.material.opacity = Math.max(0, ratio);

      if (p.age >= p.life) {
        this.particlesGroup.remove(p.sprite);
        p.sprite.material.map.dispose();
        p.sprite.material.dispose();
        this.floatingParticles.splice(i, 1);
      }
    }

    // 1b. Cập nhật Bong bóng chat 3D trên đầu (tự động biến mất sau 4-5 giây)
    if (this.speechBubbleTimer > 0) {
      this.speechBubbleTimer -= dt;
      if (this.speechBubbleTimer <= 0) {
        this.speechBubbleTimer = 0;
        this.speechSprite.visible = false;
      } else if (this.speechBubbleTimer < 0.6) {
        this.speechSprite.material.opacity = this.speechBubbleTimer / 0.6;
      }
    }

    // 2. Cập nhật Emote Chào điều lệnh [1] hoặc Cầm cờ Việt Nam vẫy [2]
    if (this.activeEmote) {
      this.activeEmote.elapsed += dt;
      if (this.activeEmote.type === 'salute') {
        this.rightArm.position.set(-0.38, 1.05, 0.28);
        this.rightArm.rotation.set(-0.6, 0, -0.55);
      } else if (this.activeEmote.type === 'flag_wave') {
        // Vẫy lá Cờ đỏ sao vàng qua lại trên cao
        const waveAngle = Math.sin(this.activeEmote.elapsed * 9.5) * 0.42;
        this.rightArm.position.set(-0.44, 0.95, 0.22);
        this.rightArm.rotation.set(-0.4, 0, -0.35 + waveAngle * 0.5);
        this.handheldFlagPivot.rotation.z = waveAngle;
        this.handheldFlagPivot.rotation.x = 0.15;
      }

      if (this.activeEmote.elapsed >= this.activeEmote.timer) {
        this.activeEmote = null;
        this.emoteSprite.visible = false;
        this.rightArm.visible = false;
        this.handheldFlagPivot.visible = false;
      }
    }

    // 2b. Đang lái phương tiện (Xe đạp thồ / Jeep UAZ / Máy bay mini): thân ngồi trên yên, xe tự hoạt họa
    if (this.vehicle) {
      this.updateVehiclePose(dt, isMoving);
      return;
    }

    // 3. Khi Ngồi trên ghế: nâng nhẹ visualGroup lên +0.26 để thân đặt ngay trên mặt ghế (y = 0.42), không bị dính chìm vào ghế
    if (isSitting) {
      this.visualGroup.position.y = THREE.MathUtils.lerp(this.visualGroup.position.y, 0.26, dt * 10);
      this.visualGroup.rotation.z = THREE.MathUtils.lerp(this.visualGroup.rotation.z, 0, dt * 10);
      this.visualGroup.rotation.x = THREE.MathUtils.lerp(this.visualGroup.rotation.x, -0.05, dt * 10);
      this.visualGroup.scale.lerp(new THREE.Vector3(1.06, 0.86, 1.06), dt * 10);
      this.shadowDisc.scale.setScalar(0.95);
      return;
    }

    // 4. Khi đứng / di chuyển bình thường
    const targetRatio = isMoving ? 1.0 : 0.0;
    this.currentSpeedRatio = THREE.MathUtils.lerp(
      this.currentSpeedRatio,
      targetRatio,
      Math.min(1, dt * 12)
    );

    if (this.currentSpeedRatio > 0.01) {
      this.walkPhase += dt * 11.5;

      const bounceY = Math.abs(Math.sin(this.walkPhase)) * 0.16 * this.currentSpeedRatio;
      this.visualGroup.position.y = bounceY;

      const waddleZ = Math.sin(this.walkPhase) * 0.13 * this.currentSpeedRatio;
      const leanX = 0.08 * this.currentSpeedRatio;
      this.visualGroup.rotation.z = waddleZ;
      this.visualGroup.rotation.x = leanX;

      const squash = 1.0 + Math.cos(this.walkPhase * 2) * 0.035 * this.currentSpeedRatio;
      this.visualGroup.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

      const shadowScale = 1.0 - bounceY * 1.1;
      this.shadowDisc.scale.setScalar(Math.max(0.65, shadowScale));
    } else {
      this.visualGroup.position.y = THREE.MathUtils.lerp(this.visualGroup.position.y, 0, dt * 10);
      this.visualGroup.rotation.z = THREE.MathUtils.lerp(this.visualGroup.rotation.z, 0, dt * 10);
      if (!this.activeEmote) {
        this.visualGroup.rotation.x = THREE.MathUtils.lerp(this.visualGroup.rotation.x, 0, dt * 10);
      }
      this.visualGroup.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 10);
      this.shadowDisc.scale.setScalar(1.0);
    }
  }

  dispose() {
    this.root.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
}
