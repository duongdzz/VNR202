import * as THREE from 'three';
import { PALETTE, EXHIBITS_DATA, SPECIAL_INTERACTIONS, DOCUMENTARY_CHAPTERS, CINEMA_ROOM } from '../constants.js?v=19';
import { SceneManager } from './SceneManager.js?v=19';
import { CharacterMesh } from './CharacterMesh.js?v=19';
import { ExhibitsManager } from './ExhibitsManager.js?v=19';
import { FireworksSystem } from './fx/FireworksSystem.js?v=19';
import { DecorBuilder } from './DecorBuilder.js?v=19';

/**
 * MuseumMap: Xây dựng kiến trúc Triển lãm Lịch sử Đảng Cộng sản Việt Nam (Bản mở rộng thoáng đãng):
 * - Kích thước Sảnh Trong Nhà mở rộng (64m × 38m, X: -32..+32, Z: -38..0) và Quảng Trường Ngoài Sân (84m × 46m)
 *   đảm bảo khoảng cách giữa các bục hiện vật từ 11.5 – 17.0 units và lối đi rộng > 5 units.
 * - Bổ sung Khu vực Rạp Chiếu Phim Tư Liệu (Mini Documentary Theater) tại Sảnh chính Tầng 1
 *   với Màn hình LED lớn chuyển cảnh slide lịch sử Đảng, 2 hàng ghế khán phòng và PositionalAudio 3D.
 */
export class MuseumMap {
  constructor(scene, audioListener = null) {
    this.scene = scene;
    this.audioListener = audioListener;

    this.outdoorGroup = new THREE.Group();
    this.indoorGroup = new THREE.Group();
    this.indoorFloor1Group = new THREE.Group();
    this.indoorFloor2Group = new THREE.Group();

    this.indoorGroup.add(this.indoorFloor1Group);
    this.indoorGroup.add(this.indoorFloor2Group);

    this.scene.add(this.outdoorGroup);
    this.scene.add(this.indoorGroup);

    this.colliders = {
      outdoor: { walls: [], pillars: [] },
      indoorF1: { walls: [], pillars: [] },
      indoorF2: { walls: [], pillars: [] }
    };

    this.portalRings = [];
    this.flagWaveMesh = null;
    this.fountains = [];
    this.skyClouds = [];
    this.elevatorDoors = [];
    this.flagpoleNPC = null;
    this.floatingLanterns = [];
    this.fireworks = [];
    this.autoFireworkTimer = 0;
    this.isNightMode = false;
    this.fireworksSystem = new FireworksSystem(this.outdoorGroup, this.audioListener);

    // Hệ thống Vệt Mũi Tên Dẫn Đường GPS 3D dưới sàn (Tính năng 4)
    this.wayfindingGroup = new THREE.Group();
    this.scene.add(this.wayfindingGroup);
    this.wayfindingArrows = [];
    this.wayfindingTarget = null;
    this.wayfindingEnabled = true;
    this.buildWayfindingArrows();

    // Màn hình lớn Rạp chiếu phim tư liệu Tầng 1 & PositionalAudio
    this.theaterCanvas = null;
    this.theaterTexture = null;
    this.theaterScreenMesh = null;
    this.lastTheaterDrawTime = -1;
    this.positionalAudio = null;
    this.isPositionalAudioMuted = false;

    this.currentZone = 'outdoor';
    this.currentFloor = 1;

    this.buildOutdoorPlaza();
    this.buildOutdoorFountains();
    this.buildSkyClouds();
    this.buildHanoiFlagpole();
    this.buildFlagpoleNPC();
    this.buildMuseumExteriorBuilding();

    this.buildIndoorFirstFloor();
    this.buildDocumentaryTheater();
    this.buildIndoorSecondFloorMezzanine();
    this.buildWallPaintingsAndWeapons();

    this.exhibitsManager = new ExhibitsManager({
      outdoorGroup: this.outdoorGroup,
      indoorFloor1Group: this.indoorFloor1Group,
      indoorFloor2Group: this.indoorFloor2Group,
      colliders: this.colliders
    });

    if (this.theaterScreenMesh) {
      this.exhibitsManager.raycastTargets.push(this.theaterScreenMesh);
    }

    if (this.flagpoleGroup) {
      const flagpoleEx = EXHIBITS_DATA.find((e) => e.id === 'outdoor-flagpole');
      if (flagpoleEx) {
        this.flagpoleGroup.traverse((child) => {
          if (child.isMesh) {
            child.userData.exhibitData = flagpoleEx;
            this.exhibitsManager.raycastTargets.push(child);
          }
        });
      }
    }

    if (this.flagpoleNPC?.root) {
      this.flagpoleNPC.root.traverse((child) => {
        if (child.isMesh) {
          child.userData.isFlagpoleNPC = true;
          this.exhibitsManager.raycastTargets.push(child);
        }
      });
    }

    // Decor & Props lấp đầy không gian trống (Cột đèn, Cột chắn nhung đỏ, Thảm dẫn hướng, Cây xanh, Tủ kính, Spotlight)
    this.decorBuilder = new DecorBuilder({
      outdoorGroup: this.outdoorGroup,
      indoorFloor1Group: this.indoorFloor1Group,
      indoorFloor2Group: this.indoorFloor2Group,
      colliders: this.colliders
    });
    this.decorBuilder.buildAll();

    this.setZoneMode('outdoor', 1);
  }

  /**
   * Chuyển đổi hiển thị Khu vực (Ngoài sân vs Trong nhà) và Tầng (Tầng 1 vs Tầng 2):
   * - Khi ở Tầng 1 (`floor === 1`), ẩn `indoorFloor2Group` để Sảnh Tầng 1 không bị sàn Tầng 2 che khuất tầm nhìn!
   * - Đồng thời bật/tắt âm thanh không gian 3D (PositionalAudio) của màn hình tư liệu Tầng 1.
   */
  setZoneMode(zone, floor = 1) {
    this.currentZone = zone;
    this.currentFloor = floor;
    this.outdoorGroup.visible = zone === 'outdoor';
    this.indoorGroup.visible = zone === 'indoor';
    this.indoorFloor1Group.visible = true;
    this.indoorFloor2Group.visible = zone === 'indoor' && floor === 2;
    this.updatePositionalAudioState();
  }

  setFloorMode(floor) {
    this.currentFloor = floor;
    if (this.currentZone === 'indoor') {
      this.indoorFloor2Group.visible = floor === 2;
    }
    this.updatePositionalAudioState();
  }

  addColliderWall(colliderKey, x, y, z, width, height, depth, color, parentGroup, visible = true) {
    if (visible) {
      const geo = new THREE.BoxGeometry(width, height, depth);
      const mat = SceneManager.createFlatMaterial(color);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y + height / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parentGroup.add(mesh);
    }

    this.colliders[colliderKey].walls.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    });
  }

  // =========================================================================
  // 1. SÂN QUẢNG TRƯỜNG RỘNG THOÁNG & KỲ ĐÀI CỘT CỜ HÀ NỘI
  // =========================================================================

  buildOutdoorPlaza() {
    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(86, 1.4, 48),
      SceneManager.createFlatMaterial(PALETTE.WOOD_OAK)
    );
    baseMesh.position.set(0, -0.78, 22);
    baseMesh.receiveShadow = true;
    this.outdoorGroup.add(baseMesh);

    const plazaMesh = new THREE.Mesh(
      new THREE.BoxGeometry(84, 0.16, 46),
      SceneManager.createFlatMaterial(PALETTE.PLAZA_STONE)
    );
    plazaMesh.position.set(0, -0.08, 22);
    plazaMesh.receiveShadow = true;
    this.outdoorGroup.add(plazaMesh);

    const boulevardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.04, 40),
      SceneManager.createFlatMaterial(PALETTE.PLAZA_PATH)
    );
    boulevardMesh.position.set(0, 0.02, 22);
    boulevardMesh.receiveShadow = true;
    this.outdoorGroup.add(boulevardMesh);

    // Thảm đỏ tại vị trí Đứng Nghiêm Chào Cờ ĐẰNG TRƯỚC Cột cờ Hà Nội (0, 30.8) - đặt cao hơn mặt đường (y=0.04) để không bị Z-fighting
    const saluteCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.02, 2.2),
      SceneManager.createFlatMaterial(PALETTE.RED_VERMILION)
    );
    saluteCarpet.position.set(0, 0.05, 30.8);
    this.outdoorGroup.add(saluteCarpet);

    [
      { x: -13.5, z: 9.0, w: 16.5, d: 5.5 },
      { x: 13.5, z: 9.0, w: 16.5, d: 5.5 },
      { x: -26, z: 20, w: 22, d: 22 },
      { x: 26, z: 20, w: 22, d: 22 }
    ].forEach(({ x, z, w, d }) => {
      const lawnMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.06, d),
        SceneManager.createFlatMaterial(PALETTE.GRASS_GREEN)
      );
      lawnMesh.position.set(x, 0.03, z);
      lawnMesh.receiveShadow = true;
      this.outdoorGroup.add(lawnMesh);
    });

    const treePositions = [
      [-11.2, 32.5], [11.2, 32.5], [-11.2, 9.5], [11.2, 9.5],
      [-20, 38], [20, 38],
      [-37, 32], [-37, 20], [-37, 10],
      [37, 32], [37, 20], [37, 10],
      [-32, 42], [-14, 42], [14, 42], [32, 42]
    ];
    treePositions.forEach(([tx, tz]) => this.addLowPolyTree(tx, tz));

    // Vành đai thảm cỏ & hàng rào trụ đá bao quanh khuôn viên để góc nhìn luôn gọn đẹp trong khuôn viên
    const outerParkSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(128, 0.2, 82),
      SceneManager.createFlatMaterial(0x6b8f56)
    );
    outerParkSkirt.position.set(0, -0.22, 22);
    outerParkSkirt.receiveShadow = true;
    this.outdoorGroup.add(outerParkSkirt);

    const fencePillarMat = SceneManager.createFlatMaterial(PALETTE.FLAGSTONE_RED);
    const fenceCapMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);
    for (let fx = -40; fx <= 40; fx += 8) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.35, 0.65), fencePillarMat);
      post.position.set(fx, 0.68, 44.5);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.32, 4), fenceCapMat);
      cap.position.set(fx, 1.48, 44.5);
      cap.rotation.y = Math.PI / 4;
      this.outdoorGroup.add(post, cap);
    }

    this.addColliderWall('outdoor', 0, 0, 44.5, 84, 0.75, 0.5, PALETTE.WOOD_OAK, this.outdoorGroup, true);
    this.addColliderWall('outdoor', -41.6, 0, 22, 0.5, 0.75, 46, PALETTE.WOOD_OAK, this.outdoorGroup, true);
    this.addColliderWall('outdoor', 41.6, 0, 22, 0.5, 0.75, 46, PALETTE.WOOD_OAK, this.outdoorGroup, true);

    this.buildVehicleDepotKiosk();
  }

  /**
   * Bãi gửi xe & Kiosk đổi phương tiện (Xe đạp thồ / Jeep UAZ / Máy bay mini) ngoài sân trước (X = +8.5, Z = 7.0)
   */
  buildVehicleDepotKiosk() {
    const kx = 8.5;
    const kz = 7.0;
    const kioskGroup = new THREE.Group();
    kioskGroup.position.set(kx, 0, kz);

    const stoneMat = SceneManager.createFlatMaterial(PALETTE.PLAZA_PATH);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, { roughness: 0.3, metalness: 0.5 });
    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const roofMat = SceneManager.createFlatMaterial(PALETTE.FLAGSTONE_RED);
    const whiteMat = SceneManager.createFlatMaterial(0xf4f1e6);
    const darkMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK);

    // 1. Nền bãi gửi xe
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 4.4), stoneMat);
    plinth.position.y = 0.06;
    plinth.receiveShadow = true;
    const plinthTrim = new THREE.Mesh(new THREE.BoxGeometry(5.32, 0.04, 4.52), goldMat);
    plinthTrim.position.y = 0.13;
    kioskGroup.add(plinth, plinthTrim);

    // Vạch kẻ sơn phân làn đỗ xe
    [-1.2, 1.2].forEach((lx) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 3.2), whiteMat);
      line.position.set(lx, 0.14, 0);
      kioskGroup.add(line);
    });

    // 2. 4 Cột gỗ đỡ mái che
    const postGeo = new THREE.BoxGeometry(0.2, 2.7, 0.2);
    [
      [-2.2, -1.8], [2.2, -1.8],
      [-2.2, 1.8], [2.2, 1.8]
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(px, 1.35, pz);
      post.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), goldMat);
      cap.position.set(px, 2.75, pz);
      kioskGroup.add(post, cap);
    });

    // 3. Mái ngói đỏ vát cạnh
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.28, 4.8), roofMat);
    roof.position.set(0, 2.92, 0);
    roof.castShadow = true;
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.35, 4), goldMat);
    ridge.position.set(0, 3.22, 0);
    ridge.rotation.y = Math.PI / 4;
    kioskGroup.add(roof, ridge);

    // 4. Biển hiệu treo phía trước hướng ra đường chính (mặt Tây)
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 640;
    signCanvas.height = 140;
    const sctx = signCanvas.getContext('2d');
    const sgrad = sctx.createLinearGradient(0, 0, 0, 140);
    sgrad.addColorStop(0, '#781712');
    sgrad.addColorStop(1, '#3b0a0e');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 640, 140);
    sctx.strokeStyle = '#ffe600';
    sctx.lineWidth = 6;
    sctx.strokeRect(6, 6, 628, 128);
    sctx.fillStyle = '#ffe600';
    sctx.font = 'bold 36px "Segoe UI", sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText('★ BÃI GỬI XE — ĐỔI PHƯƠNG TIỆN ★', 320, 56);
    sctx.fillStyle = '#fff4d0';
    sctx.font = '20px "Segoe UI", sans-serif';
    sctx.fillText('Xe đạp thồ (7) • Jeep UAZ (14) • Máy bay (20) • [E] Đổi Xe', 320, 102);

    const signTex = SceneManager.sharpenTexture(new THREE.CanvasTexture(signCanvas));
    const signBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.8),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signBoard.position.set(-2.28, 2.2, 0);
    signBoard.rotation.y = -Math.PI / 2;
    const signBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.86, 3.7), woodMat);
    signBack.position.set(-2.25, 2.2, 0);
    kioskGroup.add(signBoard, signBack);

    // Giá để xe
    const rackBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 1.8), darkMat);
    rackBar.position.set(1.6, 0.35, 0);
    kioskGroup.add(rackBar);

    this.outdoorGroup.add(kioskGroup);
    this.colliders.outdoor.pillars.push({ x: kx, z: kz, radius: 1.8 });
  }

  /**
   * 2 Đài phun nước bát giác bằng đá Low-poly ở sân trước (X = -12.5 và X = +12.5, Z = 17.5)
   */
  buildOutdoorFountains() {
    const stoneOuterMat = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER);
    const stoneRimMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_FACADE);
    const graniteMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK);
    const waterMat = SceneManager.createFlatMaterial(PALETTE.WATER_POOL, {
      roughness: 0.25,
      metalness: 0.2
    });
    const foamMat = SceneManager.createFlatMaterial(0xeaf8ff, {
      roughness: 0.2,
      emissive: 0x8fd6f2,
      emissiveIntensity: 0.25
    });
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);

    [-12.5, 12.5].forEach((fx) => {
      const fz = 17.5;
      const fountainGroup = new THREE.Group();
      fountainGroup.position.set(fx, 0, fz);

      const outerBasin = new THREE.Mesh(
        new THREE.CylinderGeometry(3.25, 3.5, 0.52, 8),
        stoneOuterMat
      );
      outerBasin.position.y = 0.26;
      outerBasin.castShadow = true;
      outerBasin.receiveShadow = true;

      const rimCap = new THREE.Mesh(
        new THREE.TorusGeometry(3.15, 0.22, 6, 8),
        stoneRimMat
      );
      rimCap.rotation.x = Math.PI / 2;
      rimCap.rotation.z = Math.PI / 8;
      rimCap.position.y = 0.52;

      const waterSurface = new THREE.Mesh(
        new THREE.CylinderGeometry(2.95, 2.95, 0.12, 8),
        waterMat
      );
      waterSurface.position.y = 0.42;

      const centerBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.92, 0.65, 8),
        graniteMat
      );
      centerBase.position.y = 0.65;

      const lowerBowl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.45, 0.52, 0.36, 8),
        stoneOuterMat
      );
      lowerBowl.position.y = 1.12;
      lowerBowl.castShadow = true;

      const upperColumn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.48, 0.85, 8),
        graniteMat
      );
      upperColumn.position.y = 1.62;

      const upperBowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.3, 0.28, 8),
        stoneOuterMat
      );
      upperBowl.position.y = 2.12;
      upperBowl.castShadow = true;

      const nozzle = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.38, 8),
        goldMat
      );
      nozzle.position.y = 2.42;

      const jetPlume = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 1.15, 8),
        foamMat
      );
      jetPlume.position.y = 2.95;

      const splashRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.55, 0.08, 5, 12),
        foamMat
      );
      splashRing.rotation.x = Math.PI / 2;
      splashRing.position.y = 0.49;

      const droplets = [];
      const dropGeo = new THREE.OctahedronGeometry(0.11, 0);
      const dropCount = 18;
      for (let i = 0; i < dropCount; i++) {
        const dropMesh = new THREE.Mesh(dropGeo, foamMat);
        fountainGroup.add(dropMesh);
        droplets.push({
          mesh: dropMesh,
          angle: (i / dropCount) * Math.PI * 2,
          phase: i / dropCount,
          speed: 0.78 + (i % 3) * 0.14,
          maxRadius: 1.85 + (i % 2) * 0.45,
          peakHeight: 1.25 + (i % 3) * 0.22
        });
      }

      fountainGroup.add(
        outerBasin,
        rimCap,
        waterSurface,
        centerBase,
        lowerBowl,
        upperColumn,
        upperBowl,
        nozzle,
        jetPlume,
        splashRing
      );

      this.outdoorGroup.add(fountainGroup);
      this.fountains.push({
        jetPlume,
        splashRing,
        droplets
      });

      this.colliders.outdoor.pillars.push({ x: fx, z: fz, radius: 3.45 });
    });
  }

  /**
   * Hệ thống Mây trắng Low-poly trôi chầm chậm trên bầu trời theo phong cách "How to Fish"
   */
  buildSkyClouds() {
    const cloudMat = SceneManager.createFlatMaterial(0xffffff, {
      roughness: 0.9,
      metalness: 0.0
    });

    const cloudConfigs = [
      { x: -48, y: 19.5, z: -18, scale: 1.25, speed: 1.15 },
      { x: -22, y: 21.0, z: 6, scale: 1.0, speed: 0.95 },
      { x: 8, y: 18.8, z: -12, scale: 1.35, speed: 1.25 },
      { x: 34, y: 20.5, z: 14, scale: 1.1, speed: 0.88 },
      { x: -36, y: 22.2, z: 26, scale: 1.2, speed: 1.05 },
      { x: 18, y: 21.5, z: 32, scale: 0.95, speed: 1.18 },
      { x: 52, y: 19.2, z: -4, scale: 1.3, speed: 1.0 },
      { x: -8, y: 23.0, z: -26, scale: 1.15, speed: 0.9 }
    ];

    cloudConfigs.forEach((cfg, idx) => {
      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(cfg.x, cfg.y, cfg.z);
      cloudGroup.scale.setScalar(cfg.scale);

      const mainPuff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.75, 0), cloudMat);
      const leftPuff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.28, 0), cloudMat);
      leftPuff.position.set(-1.55, -0.22, 0.18);

      const rightPuff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.38, 0), cloudMat);
      rightPuff.position.set(1.5, -0.18, -0.15);

      const bottomFlat = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.75, 1.85), cloudMat);
      bottomFlat.position.set(0, -0.55, 0);

      cloudGroup.add(mainPuff, leftPuff, rightPuff, bottomFlat);
      this.outdoorGroup.add(cloudGroup);

      this.skyClouds.push({
        group: cloudGroup,
        baseY: cfg.y,
        speed: cfg.speed,
        seed: idx * 1.3
      });
    });
  }

  /**
   * Đặt NPC Chiến sĩ Tiêu binh đứng trang nghiêm bên cánh phải bệ Cột cờ Hà Nội (cách Cột cờ 6.7 units)
   */
  buildFlagpoleNPC() {
    const npcSpec = SPECIAL_INTERACTIONS.FLAGPOLE_NPC;
    if (!npcSpec) return;

    this.flagpoleNPC = new CharacterMesh({
      id: 'npc-flagpole-guard',
      name: '★ Chiến Sĩ Tiêu Binh',
      hatType: 'pith',
      isLocal: false,
      customBodyColor: PALETTE.ARMY_GREEN
    });

    this.flagpoleNPC.root.position.set(
      npcSpec.position.x,
      npcSpec.position.y,
      npcSpec.position.z
    );
    this.flagpoleNPC.root.rotation.y = -0.35;

    this.outdoorGroup.add(this.flagpoleNPC.root);
    this.colliders.outdoor.pillars.push({
      x: npcSpec.position.x,
      z: npcSpec.position.z,
      radius: 0.65
    });
  }

  triggerNPCDialogue(playerPos = null) {
    if (!this.flagpoleNPC) return;
    if (playerPos) {
      const dx = playerPos.x - this.flagpoleNPC.root.position.x;
      const dz = playerPos.z - this.flagpoleNPC.root.position.z;
      this.flagpoleNPC.root.rotation.y = Math.atan2(dx, dz);
    }
    this.flagpoleNPC.triggerEmote('salute', 4.5);
    this.flagpoleNPC.showSpeechBubble(
      SPECIAL_INTERACTIONS.FLAGPOLE_NPC.dialogue,
      4.8
    );
  }

  addLowPolyTree(x, z) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 1.15, 6),
      SceneManager.createFlatMaterial(PALETTE.WOOD_OAK)
    );
    trunk.position.y = 0.58;
    trunk.castShadow = true;

    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.05, 0),
      SceneManager.createFlatMaterial(PALETTE.GRASS_GREEN)
    );
    foliage.position.y = 1.75;
    foliage.castShadow = true;

    tree.add(trunk, foliage);
    this.outdoorGroup.add(tree);
    this.colliders.outdoor.pillars.push({ x, z, radius: 0.55 });
  }

  /**
   * Kỳ đài Cột cờ Hà Nội tại chính giữa Quảng trường (0, 24.0)
   * Đã xử lý triệt để Z-fighting ở chân đế bằng bệ đá nền (plinth) tách biệt khỏi mặt đường và bậc tam cấp đặt ngoài khối đế.
   */
  buildHanoiFlagpole() {
    const towerX = 0;
    const towerZ = 24.0;
    const flagpoleGroup = new THREE.Group();
    flagpoleGroup.position.set(towerX, 0, towerZ);
    this.flagpoleGroup = flagpoleGroup;

    const brickMat = SceneManager.createFlatMaterial(PALETTE.FLAGSTONE_RED);
    const stoneMat = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER);
    const darkStoneMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK);
    const partyRedMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);

    // Đế đá hoa cương nền móng rộng dưới chân Cột cờ
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 5.2), darkStoneMat);
    basePlinth.position.y = 0.11;
    basePlinth.receiveShadow = true;
    const basePlinthTrim = new THREE.Mesh(new THREE.BoxGeometry(4.75, 0.08, 4.75), goldMat);
    basePlinthTrim.position.y = 0.22;
    flagpoleGroup.add(basePlinth, basePlinthTrim);

    // 4 Đèn rọi chân kỳ đài (Façade uplights) tại 4 góc bệ đá hắt sáng lên thân Cột cờ
    const cornerOffsets = [
      [-2.1, -2.1],
      [2.1, -2.1],
      [-2.1, 2.1],
      [2.1, 2.1]
    ];
    cornerOffsets.forEach(([ox, oz]) => {
      const lampFixture = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.26), darkStoneMat);
      lampFixture.position.set(ox, 0.24, oz);
      const lampLens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 8), new THREE.MeshBasicMaterial({ color: 0xffe89e }));
      lampLens.rotation.x = -Math.PI / 2;
      lampLens.position.set(ox, 0.315, oz);
      flagpoleGroup.add(lampFixture, lampLens);
    });

    // 3 tầng bệ gạch đỏ & đá xám có đường gờ phào chỉ hoa cương (Cornice bevels) bo viền nổi sắc nét
    const tiers = [
      { w: 4.2, h: 0.76, y: 0.62, mat: brickMat },
      { w: 3.3, h: 0.85, y: 1.425, mat: stoneMat },
      { w: 2.4, h: 0.95, y: 2.325, mat: brickMat }
    ];
    tiers.forEach(({ w, h, y, mat }) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      box.position.y = y;
      box.castShadow = true;
      box.receiveShadow = true;

      // Gờ phào đá vát cạnh bo quanh đỉnh mỗi tầng
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.08, w + 0.16), darkStoneMat);
      cornice.position.y = y + h / 2 - 0.04;
      cornice.castShadow = true;

      flagpoleGroup.add(box, cornice);
    });

    // Lan can đá hoa cương bảo vệ trên đỉnh Tầng 3
    const parapetHeight = 0.28;
    const parapetY = 2.8 + parapetHeight / 2;
    [-1.24, 1.24].forEach((pz) => {
      const railZ = new THREE.Mesh(new THREE.BoxGeometry(2.52, parapetHeight, 0.08), stoneMat);
      railZ.position.set(0, parapetY, pz);
      flagpoleGroup.add(railZ);
    });
    [-1.24, 1.24].forEach((px) => {
      const railX = new THREE.Mesh(new THREE.BoxGeometry(0.08, parapetHeight, 2.4), stoneMat);
      railX.position.set(px, parapetY, 0);
      flagpoleGroup.add(railX);
    });

    // Bậc tam cấp đá dẫn lên mặt trước tầng 1
    const stepConfigs = [
      { h: 0.72, z: 2.23, d: 0.26 },
      { h: 0.48, z: 2.49, d: 0.26 },
      { h: 0.24, z: 2.75, d: 0.26 }
    ];
    stepConfigs.forEach(({ h, z, d }) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.64, h, d), stoneMat);
      step.position.set(0, 0.24 + h / 2, z);
      step.castShadow = true;
      step.receiveShadow = true;
      flagpoleGroup.add(step);
    });

    // Tháp bát giác (Octagonal Tower Shaft) có chỉ tường & các lỗ châu mai / ô cửa tò vò
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 1.05, 5.6, 8),
      stoneMat
    );
    shaft.position.y = 5.6;
    shaft.castShadow = true;
    flagpoleGroup.add(shaft);

    // Đai phào chỉ đá ngang thân tháp bát giác (Frieze belt)
    const shaftBelt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.88, 0.12, 8),
      darkStoneMat
    );
    shaftBelt.position.y = 5.4;
    flagpoleGroup.add(shaftBelt);

    // 4 Ô cửa tò vò / lỗ thông gió hình vòm trên thân tháp
    const windowMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK);
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((rot) => {
      const winSlot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.16), windowMat);
      winSlot.position.set(Math.sin(rot) * 0.82, 6.2, Math.cos(rot) * 0.82);
      winSlot.rotation.y = rot;
      flagpoleGroup.add(winSlot);
    });

    // Đài quan sát / Vọng gác bát giác trên đỉnh (Observation Pavilion)
    const pavilionBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.82, 0.18, 8),
      darkStoneMat
    );
    pavilionBase.position.y = 8.45;

    const pavilion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.82, 0.78, 0.78, 8),
      goldMat
    );
    pavilion.position.y = 8.92;

    const pavilionRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.08, 0.45, 8),
      brickMat
    );
    pavilionRoof.position.y = 9.48;
    flagpoleGroup.add(pavilionBase, pavilion, pavilionRoof);

    // Cột cán cờ thép
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8),
      stoneMat
    );
    mast.position.y = 10.95;

    this.flagWaveMesh = new THREE.Group();
    this.flagWaveMesh.position.set(0, 11.85, 0);

    const flagCloth = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.45, 0.08),
      partyRedMat
    );
    flagCloth.position.set(1.15, 0, 0);
    flagCloth.castShadow = true;

    const star = SceneManager.createStarMesh(0.42, 0.17, 0.14, goldMat);
    star.position.set(1.15, 0, 0);

    this.flagWaveMesh.add(flagCloth, star);
    flagpoleGroup.add(mast, this.flagWaveMesh);

    this.outdoorGroup.add(flagpoleGroup);
    this.colliders.outdoor.pillars.push({ x: towerX, z: towerZ, radius: 2.45 });
  }

  buildMuseumExteriorBuilding() {
    const buildingGroup = new THREE.Group();
    buildingGroup.position.set(0, 0, 1.5);

    const roofMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_ROOF);
    const finMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_FACADE);
    const darkGlassMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK);
    const canopyMat = SceneManager.createFlatMaterial(PALETTE.RED_VERMILION);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);

    const mainCore = new THREE.Mesh(new THREE.BoxGeometry(42, 6.8, 5.5), darkGlassMat);
    mainCore.position.set(0, 3.4, -1.2);
    mainCore.castShadow = true;
    buildingGroup.add(mainCore);

    [-28, 28].forEach((wingX) => {
      const wingCore = new THREE.Mesh(new THREE.BoxGeometry(18, 4.8, 4.8), darkGlassMat);
      wingCore.position.set(wingX, 2.4, -0.8);
      wingCore.castShadow = true;
      buildingGroup.add(wingCore);

      const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.48, 6.8), roofMat);
      wingRoof.position.set(wingX, 5.0, -0.4);
      wingRoof.castShadow = true;
      buildingGroup.add(wingRoof);
    });

    const lowerRoof = new THREE.Mesh(new THREE.BoxGeometry(46, 0.5, 7.6), roofMat);
    lowerRoof.position.set(0, 6.8, -0.5);
    const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(49, 0.45, 8.2), roofMat);
    upperRoof.position.set(0, 7.45, -0.5);
    buildingGroup.add(lowerRoof, upperRoof);

    for (let x = -20.5; x <= 20.5; x += 1.55) {
      if (Math.abs(x) < 3.8) continue;
      const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 7.0, 1.2), finMat);
      finMesh.position.set(x, 3.4, 1.65);
      finMesh.rotation.z = x < 0 ? -0.16 : 0.16;
      finMesh.rotation.x = 0.08;
      finMesh.castShadow = true;
      buildingGroup.add(finMesh);
    }

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.5, 3.2), canopyMat);
    canopy.position.set(0, 3.6, 2.4);

    const emblemStar = SceneManager.createStarMesh(0.75, 0.3, 0.2, goldMat);
    emblemStar.position.set(0, 5.25, 1.85);
    buildingGroup.add(canopy, emblemStar);

    const portalRing = this.createPortalMarker(0, 0, 4.6, PALETTE.RED_VERMILION);
    this.outdoorGroup.add(portalRing);
    this.portalRings.push(portalRing);

    this.outdoorGroup.add(buildingGroup);

    this.addColliderWall('outdoor', -22.5, 0, 2.5, 38, 6, 3.0, PALETTE.BUILDING_FACADE, this.outdoorGroup, false);
    this.addColliderWall('outdoor', 22.5, 0, 2.5, 38, 6, 3.0, PALETTE.BUILDING_FACADE, this.outdoorGroup, false);
  }

  createPortalMarker(x, y, z, colorHex) {
    const group = new THREE.Group();
    group.position.set(x, y + 0.04, z);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.68, 28),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      })
    );
    ring.rotation.x = -Math.PI / 2;

    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 28),
      new THREE.MeshBasicMaterial({
        color: PALETTE.STAR_GOLD,
        transparent: true,
        opacity: 0.25
      })
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = -0.01;

    group.add(ring, inner);
    return group;
  }

  /**
   * Tạo dải Thảm Đỏ Khánh Tiết có viền Vàng Kim dẫn thẳng tới từng bục Hiện Vật trong sảnh
   */
  addCeremonialCarpet(parentGroup, x, floorY, z, width, depth, layerOffset = 0) {
    const goldBorder = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.28, 0.016, depth + 0.28),
      SceneManager.createFlatMaterial(PALETTE.STAR_GOLD)
    );
    goldBorder.position.set(x, floorY + 0.01 + layerOffset, z);
    goldBorder.receiveShadow = true;

    const redRunner = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.022, depth),
      SceneManager.createFlatMaterial(PALETTE.RED_VERMILION)
    );
    redRunner.position.set(x, floorY + 0.016 + layerOffset, z);
    redRunner.receiveShadow = true;

    parentGroup.add(goldBorder, redRunner);
  }

  // =========================================================================
  // 2. KHÔNG GIAN TẦNG 1 MỞ RỘNG (64m × 38m, X: -32..+32, Z: -38..0)
  // =========================================================================

  buildIndoorFirstFloor() {
    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(65.2, 1.4, 39.2),
      SceneManager.createFlatMaterial(PALETTE.WOOD_OAK)
    );
    baseMesh.position.set(0, -0.78, -19);
    this.indoorFloor1Group.add(baseMesh);

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(64, 0.16, 38),
      SceneManager.createFlatMaterial(PALETTE.FLOOR_MAIN)
    );
    floorMesh.position.set(0, -0.08, -19);
    floorMesh.receiveShadow = true;
    this.indoorFloor1Group.add(floorMesh);

    // Hệ thống Thảm Đỏ Viền Vàng dẫn lối liền mạch tới TẤT CẢ 6 Hiện vật & các Trạm tương tác Tầng 1:
    // 1. Trục Bắc - Nam chính (từ Cửa chính Z = -1.5 đến Rạp Chiếu Phim Z = -34.5)
    this.addCeremonialCarpet(this.indoorFloor1Group, 0, 0, -18.0, 3.4, 33.0, 0.004);
    // 2. Trục Đông - Tây chính (nối liền từ Gian 1 Cánh Tây X = -23.0 sang Gian 3 Cánh Đông X = +23.0)
    this.addCeremonialCarpet(this.indoorFloor1Group, 0, 0, -18.0, 48.8, 3.0, 0.002);
    // 3. Thảm dẫn vào 2 hiện vật Gian 1 (Cánh Tây X = -23.0: từ Z = -9.5 đến Z = -26.5)
    this.addCeremonialCarpet(this.indoorFloor1Group, -23.0, 0, -18.0, 2.8, 19.2, 0.0);
    // 4. Thảm dẫn vào 2 hiện vật Gian 3 (Cánh Đông X = +23.0: từ Z = -9.5 đến Z = -26.5)
    this.addCeremonialCarpet(this.indoorFloor1Group, 23.0, 0, -18.0, 2.8, 19.2, 0.0);
    // 5. Hai nhánh thảm dẫn thẳng tới 2 đảo hiện vật Gian 2 ở Sảnh Giữa (X = -7.8 và X = +7.8, Z = -15.5)
    this.addCeremonialCarpet(this.indoorFloor1Group, -7.8, 0, -16.5, 2.6, 4.6, 0.0);
    this.addCeremonialCarpet(this.indoorFloor1Group, 7.8, 0, -16.5, 2.6, 4.6, 0.0);
    // 6. Nhánh thảm nối Thang máy Tầng 1 (X = -10.5) và Trạm Đố Vui Lịch Sử (X = +10.5) tại Z = -33.8
    this.addCeremonialCarpet(this.indoorFloor1Group, 0, 0, -33.8, 23.2, 2.4, 0.0);

    // Tường bao Tầng 1 (64m × 38m)
    this.addColliderWall('indoorF1', 0, 0, -37.6, 64, 4.6, 0.6, PALETTE.WALL_CONCRETE, this.indoorFloor1Group, true);
    this.addColliderWall('indoorF1', -31.6, 0, -19, 0.6, 4.4, 38, PALETTE.WALL_CONCRETE, this.indoorFloor1Group, true);
    // Tường Đông chừa cửa rộng 4m (Z từ -20 đến -16) dẫn sang Phòng Chiếu Phim cánh Đông
    this.addColliderWall('indoorF1', 31.6, 0, -29.0, 0.6, 4.4, 18, PALETTE.WALL_CONCRETE, this.indoorFloor1Group, true);
    this.addColliderWall('indoorF1', 31.6, 0, -8.0, 0.6, 4.4, 16, PALETTE.WALL_CONCRETE, this.indoorFloor1Group, true);

    // Gờ tường phía Nam Tầng 1 (chừa cửa ra vào rộng rãi ở X = 0)
    this.addColliderWall('indoorF1', -18, 0, -0.4, 27, 0.6, 0.5, PALETTE.WOOD_OAK, this.indoorFloor1Group, true);
    this.addColliderWall('indoorF1', 18, 0, -0.4, 27, 0.6, 0.5, PALETTE.WOOD_OAK, this.indoorFloor1Group, true);

    // Vách ngăn lửng phân chia Gian 1 (Trái X < -14), Gian 2 (Giữa -14..+14), Gian 3 (Phải X > +14)
    // Chừa hành lang rộng 11m ở giữa (Z từ -12.5 đến -23.5) để nhân vật đi lại thoải mái
    this.addColliderWall('indoorF1', -14.0, 0, -6.5, 0.55, 3.3, 9.0, PALETTE.WALL_CONCRETE, this.indoorFloor1Group, true);
    this.addColliderWall('indoorF1', -14.0, 0, -30.5, 0.55, 3.3, 9.0, PALETTE.WALL_CONCRETE, this.indoorFloor1Group, true);
    this.addColliderWall('indoorF1', 14.0, 0, -6.5, 0.55, 3.3, 9.0, PALETTE.WALL_CONCRETE, this.indoorFloor1Group, true);
    this.addColliderWall('indoorF1', 14.0, 0, -30.5, 0.55, 3.3, 9.0, PALETTE.WALL_CONCRETE, this.indoorFloor1Group, true);

    // Buồng Thang máy hiện đại dẫn lên Tầng 2 đặt ở hốc Bắc-Tây (X = -10.5, Z = -35.2)
    this.buildModernElevator(this.indoorFloor1Group, 0, false);

    const exitPortal = this.createPortalMarker(0, 0, -2.2, PALETTE.YELLOW_OCHRE);
    this.indoorFloor1Group.add(exitPortal);
    this.portalRings.push(exitPortal);
  }

  // =========================================================================
  // 2B. RẠP CHIẾU PHIM TƯ LIỆU LỊCH SỬ ĐẢNG TẠI SẢNH CHÍNH TẦNG 1 (MINI THEATER)
  // =========================================================================

  buildDocumentaryTheater() {
    const R = CINEMA_ROOM;
    const F = this.indoorFloor1Group;
    const roomCx = (R.minX + R.maxX) / 2 - 0.2; // Tâm phòng chiếu (X)
    const roomW = 20.6;
    const roomD = R.maxZ - R.minZ; // 24
    const roomCz = R.centerZ;

    const darkMetalMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK, {
      roughness: 0.35,
      metalness: 0.45
    });
    const brassMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, {
      roughness: 0.3,
      metalness: 0.4
    });
    const velvetMat = SceneManager.createFlatMaterial(0x8c1b22, { roughness: 0.95 });
    const velvetDarkMat = SceneManager.createFlatMaterial(0x62141a, { roughness: 0.95 });
    const panelAMat = SceneManager.createFlatMaterial(0x4a1c22);
    const panelBMat = SceneManager.createFlatMaterial(0x2c2832);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });

    // 1. Nền sàn phòng chiếu: thảm đen đỏ sẫm + lối đi giữa thảm đỏ viền vàng
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(roomW + 1.2, 1.4, roomD + 1.2),
      SceneManager.createFlatMaterial(PALETTE.WOOD_OAK)
    );
    base.position.set(roomCx, -0.78, roomCz);
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(roomW + 0.6, 0.16, roomD + 0.6),
      SceneManager.createFlatMaterial(0x2b1114)
    );
    floor.position.set(roomCx, -0.08, roomCz);
    floor.receiveShadow = true;
    F.add(base, floor);

    // Thảm nối từ hành lang chính (X = 24.4) qua cửa vào lối đi giữa phòng chiếu
    this.addCeremonialCarpet(F, 28.2, 0, roomCz, 7.6, 3.0, 0.002);
    this.addCeremonialCarpet(F, roomCx, 0, roomCz, roomW, 2.6, 0.004);

    // Đèn dẫn lối nhỏ dọc hai mép lối đi giữa (đặc trưng rạp chiếu phim)
    for (let x = 33.4; x <= 50.6; x += 1.15) {
      [-1.45, 1.45].forEach((dz) => {
        const stepLight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.1), glowMat);
        stepLight.position.set(x, 0.03, roomCz + dz);
        F.add(stepLight);
      });
    }

    // 2. Tường phòng chiếu: Bắc, Nam, Đông (Tây là hành lang với cửa vào rộng 4m)
    this.addColliderWall('indoorF1', roomCx + 0.4, 0, R.minZ, roomW + 1.6, 4.6, 0.6, PALETTE.BUILDING_DARK, F, true);
    this.addColliderWall('indoorF1', roomCx + 0.4, 0, R.maxZ, roomW + 1.6, 4.6, 0.6, PALETTE.BUILDING_DARK, F, true);
    this.addColliderWall('indoorF1', R.maxX, 0, roomCz, 0.6, 6.0, roomD + 0.6, PALETTE.BUILDING_DARK, F, true);

    // Tấm tiêu âm nhung đỏ / xám xen kẽ + đèn tường vàng ấm trên tường Bắc & Nam
    let panelIdx = 0;
    for (let x = 34.2; x <= 50.4; x += 2.4) {
      const alt = panelIdx++ % 2 === 0;
      [R.minZ + 0.38, R.maxZ - 0.38].forEach((pz, side) => {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 2.5, 0.14),
          alt ? panelAMat : panelBMat
        );
        panel.position.set(x, 1.7, pz);
        const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.1), glowMat);
        sconce.position.set(x + 1.2, 3.35, pz);
        const sconceCap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.14), brassMat);
        sconceCap.position.set(x + 1.2, 3.56, pz);
        F.add(panel, sconce, sconceCap);
      });
    }
    // Phào chỉ vàng chạy dọc chân tường
    [R.minZ + 0.33, R.maxZ - 0.33].forEach((pz) => {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.08, 0.06), brassMat);
      trim.position.set(roomCx, 0.45, pz);
      F.add(trim);
    });

    // 3. Khung cửa vào phòng chiếu: dầm cửa + bảng hiệu "RẠP CHIẾU PHIM TƯ LIỆU" quay ra sảnh
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 4.3), darkMetalMat);
    lintel.position.set(R.minX, 3.9, roomCz);
    const lintelTrim = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.06, 4.34), brassMat);
    lintelTrim.position.set(R.minX, 3.38, roomCz);
    F.add(lintel, lintelTrim);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 640;
    signCanvas.height = 120;
    const sctx = signCanvas.getContext('2d');
    const sgrad = sctx.createLinearGradient(0, 0, 0, 120);
    sgrad.addColorStop(0, '#6e1117');
    sgrad.addColorStop(1, '#3b080c');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 640, 120);
    sctx.strokeStyle = '#ffd470';
    sctx.lineWidth = 6;
    sctx.strokeRect(6, 6, 628, 108);
    sctx.fillStyle = '#ffe600';
    sctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText('★ RẠP CHIẾU PHIM TƯ LIỆU ★', 320, 56);
    sctx.fillStyle = '#ffd8a8';
    sctx.font = '24px "Segoe UI", Arial, sans-serif';
    sctx.fillText('30 chỗ ngồi • Mời đồng chí vào xem', 320, 94);
    const signTex = new THREE.CanvasTexture(signCanvas);
    SceneManager.sharpenTexture(signTex);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 0.75),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(R.minX - 0.37, 3.9, roomCz);
    signMesh.rotation.y = -Math.PI / 2;
    F.add(signMesh);

    // 4. Cụm Màn hình LED lớn (nội dung giữ nguyên) đặt sát tường Đông, quay mặt về phía khán giả (Tây)
    const theaterGroup = new THREE.Group();
    theaterGroup.position.set(R.screenX, 0, roomCz);
    theaterGroup.rotation.y = -Math.PI / 2;

    const stagePlatform = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.3, 2.6), darkMetalMat);
    stagePlatform.position.set(0, 0.15, 1.3);
    stagePlatform.receiveShadow = true;
    const stageTrim = new THREE.Mesh(new THREE.BoxGeometry(13.46, 0.06, 2.66), brassMat);
    stageTrim.position.set(0, 0.31, 1.3);
    theaterGroup.add(stagePlatform, stageTrim);

    // Đèn chân sân khấu
    for (let fx = -5.8; fx <= 5.81; fx += 1.16) {
      const footLight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.08), glowMat);
      footLight.position.set(fx, 0.3, 2.56);
      theaterGroup.add(footLight);
    }

    const bezelFrame = new THREE.Mesh(new THREE.BoxGeometry(9.6, 5.0, 0.22), darkMetalMat);
    bezelFrame.position.set(0, 2.95, -0.2);
    bezelFrame.castShadow = true;
    const goldBorder = new THREE.Mesh(new THREE.BoxGeometry(9.28, 4.68, 0.24), brassMat);
    goldBorder.position.set(0, 2.95, -0.19);

    // Bề mặt màn hình LED sử dụng CanvasTexture độ phân giải cao (960x480) sắc nét — nội dung giữ nguyên
    this.theaterCanvas = document.createElement('canvas');
    this.theaterCanvas.width = 960;
    this.theaterCanvas.height = 480;
    this.theaterTexture = new THREE.CanvasTexture(this.theaterCanvas);
    this.theaterTexture.minFilter = THREE.LinearFilter;

    const screenMat = new THREE.MeshBasicMaterial({ map: this.theaterTexture });
    this.theaterScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 4.5), screenMat);
    this.theaterScreenMesh.position.set(0, 2.95, -0.06);
    this.theaterScreenMesh.userData.isTheaterScreen = true;

    // Rèm nhung đỏ hai bên màn hình + diềm rèm phía trên viền vàng
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 5; i++) {
        const fold = new THREE.Mesh(
          new THREE.BoxGeometry(0.27, 5.7, 0.36),
          i % 2 === 0 ? velvetMat : velvetDarkMat
        );
        fold.position.set(side * (5.2 + i * 0.27), 2.95, -0.02 + (i % 2) * 0.1);
        theaterGroup.add(fold);
      }
    });
    const valance = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.9, 0.5), velvetMat);
    valance.position.set(0, 5.55, 0.05);
    const valanceFringe = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.07, 0.54), brassMat);
    valanceFringe.position.set(0, 5.08, 0.05);
    theaterGroup.add(valance, valanceFringe);

    // 2 Loa cột 3D đặt hai bên màn hình lớn
    [-7.9, 7.9].forEach((sx) => {
      const speakerCol = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.8, 0.45), darkMetalMat);
      speakerCol.position.set(sx, 1.7, 0.0);
      const speakerGrill = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 0.06), brassMat);
      speakerGrill.position.set(sx, 1.7, 0.24);
      theaterGroup.add(speakerCol, speakerGrill);
    });

    theaterGroup.add(bezelFrame, goldBorder, this.theaterScreenMesh);
    F.add(theaterGroup);

    // 5. Phù hiệu Sao Vàng dưới sàn Sảnh chính (thay chỗ màn hình cũ ở tường Bắc)
    const emblemRing = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 1.95, 40),
      new THREE.MeshBasicMaterial({ color: PALETTE.STAR_GOLD, side: THREE.DoubleSide })
    );
    emblemRing.rotation.x = -Math.PI / 2;
    emblemRing.position.set(0, 0.05, -30.5);
    const emblemStar = SceneManager.createStarMesh(1.25, 0.5, 0.03, brassMat);
    emblemStar.rotation.x = -Math.PI / 2;
    emblemStar.position.set(0, 0.06, -30.5);
    F.add(emblemRing, emblemStar);

    // Vẽ khung hình đầu tiên lên màn hình 3D
    this.updateTheaterScreenCanvas(0);

    // Khởi tạo PositionalAudio gắn tại màn hình 3D
    this.setupTheaterPositionalAudio();
  }

  /**
   * Vẽ slide chuyển cảnh phim tư liệu Lịch sử Đảng trên màn hình 3D (960x480):
   * Bố cục 2 cột tách biệt hoàn toàn: Cột Trái = Khung Ảnh Tư Liệu Lớn (436x348), Cột Phải = Tiêu đề & Thuyết minh (tuyệt đối không đè chữ lên ảnh).
   */
  updateTheaterScreenCanvas(elapsedTime) {
    if (!this.theaterCanvas) return;
    // Chỉ vẽ lại ~8 lần/giây để siêu nhẹ, không gây lag GPU
    if (Math.abs(elapsedTime - this.lastTheaterDrawTime) < 0.12) return;
    this.lastTheaterDrawTime = elapsedTime;

    const ctx = this.theaterCanvas.getContext('2d');
    const w = this.theaterCanvas.width; // 960
    const h = this.theaterCanvas.height; // 480

    const slideDuration = 6.0;
    const totalSlides = DOCUMENTARY_CHAPTERS.length;
    const slideIndex = Math.floor(elapsedTime / slideDuration) % totalSlides;
    const slideProgress = (elapsedTime % slideDuration) / slideDuration;
    const chapter = DOCUMENTARY_CHAPTERS[slideIndex];

    // Nền phim tư liệu trầm ấm
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#231815');
    grad.addColorStop(0.5, '#3d1e18');
    grad.addColorStop(1, '#1c1512');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dải lỗ cuốn phim nhựa cổ điển ở 2 mép trên & dưới
    ctx.fillStyle = 'rgba(255, 248, 225, 0.14)';
    const offset = Math.floor((elapsedTime * 28) % 44);
    for (let x = -offset; x < w; x += 44) {
      ctx.fillRect(x, 10, 24, 14);
      ctx.fillRect(x, h - 24, 24, 14);
    }

    // 1. CỘT TRÁI (x = 34..470, y = 40..388): Khung ảnh tư liệu lớn (436x348), giữ chuẩn tỉ lệ ảnh
    const frameX = 34;
    const frameY = 40;
    const frameW = 436;
    const frameH = 348;

    ctx.fillStyle = '#140f0c';
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(frameX, frameY, frameW, frameH);

    let customImageDrawn = false;
    if (chapter.bgMedia) {
      if (!this.screenMediaCache) this.screenMediaCache = new Map();
      let mediaItem = this.screenMediaCache.get(chapter.bgMedia);
      if (!mediaItem) {
        const img = new Image();
        img.src = chapter.bgMedia;
        mediaItem = { img, loaded: false };
        img.onload = () => {
          mediaItem.loaded = true;
          this.lastTheaterDrawTime = -1;
        };
        this.screenMediaCache.set(chapter.bgMedia, mediaItem);
      }
      if (mediaItem.loaded) {
        ctx.save();
        const pad = 6;
        const innerW = frameW - pad * 2;
        const innerH = frameH - pad * 2;
        const imgW = mediaItem.img.naturalWidth || innerW;
        const imgH = mediaItem.img.naturalHeight || innerH;
        const scale = Math.min(innerW / imgW, innerH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const drawX = frameX + pad + (innerW - drawW) / 2;
        const drawY = frameY + pad + (innerH - drawH) / 2;
        ctx.drawImage(mediaItem.img, drawX, drawY, drawW, drawH);
        ctx.restore();
        customImageDrawn = true;
      }
    }

    // Nếu chưa có ảnh tùy chỉnh thì vẽ Quốc kỳ Cờ đỏ sao vàng lớn trong khung cột trái
    if (!customImageDrawn) {
      ctx.save();
      ctx.translate(frameX + frameW / 2, frameY + frameH / 2);
      ctx.fillStyle = '#c82323';
      ctx.beginPath();
      ctx.roundRect(-150, -96, 300, 192, 12);
      ctx.fill();
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 58 : 22;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const sx = Math.cos(a) * r;
        const sy = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. CỘT PHẢI (x = 496..928): Nhãn mốc thời gian + Tiêu đề + Khung thuyết minh riêng biệt
    const rightX = 496;
    const rightW = 432;
    const rightCenterX = rightX + rightW / 2;

    // Nhãn mốc thời gian
    ctx.fillStyle = '#c82323';
    ctx.beginPath();
    ctx.roundRect(rightCenterX - 170, 42, 340, 38, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`★ TƯ LIỆU: ${chapter.yearBadge} ★`, rightCenterX, 67);

    // Tiêu đề chính của Slide (Tự động xuống dòng gọn trong cột phải)
    ctx.fillStyle = '#fff9eb';
    ctx.font = 'bold 25px "Segoe UI", sans-serif';
    const titleWords = String(chapter.headline || '').split(' ');
    let tLine = '';
    let tY = 114;
    for (const wWord of titleWords) {
      const testT = tLine + wWord + ' ';
      if (ctx.measureText(testT).width > rightW - 12) {
        ctx.fillText(tLine.trim(), rightCenterX, tY);
        tLine = wWord + ' ';
        tY += 30;
      } else {
        tLine = testT;
      }
    }
    if (tLine) {
      ctx.fillText(tLine.trim(), rightCenterX, tY);
      tY += 26;
    }

    // Hộp thuyết minh tách biệt bên cột phải
    const boxTop = Math.max(168, tY + 6);
    const boxHeight = 388 - boxTop;
    ctx.fillStyle = 'rgba(18, 13, 11, 0.82)';
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(rightX, boxTop, rightW, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f5ecd7';
    ctx.font = '19px "Segoe UI", sans-serif';
    const subText = chapter.narration[0] || '';
    const words = subText.split(' ');
    let line = '';
    let y = boxTop + 36;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > rightW - 36) {
        ctx.fillText(line.trim(), rightCenterX, y);
        line = word + ' ';
        y += 28;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line.trim(), rightCenterX, y);

    // 3. Thanh tiến trình slide & Gợi ý bấm [E] ở chân màn hình (y = 408..444)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(60, h - 68, w - 120, 6);
    ctx.fillStyle = '#ffe600';
    ctx.fillRect(60, h - 68, (w - 120) * slideProgress, 6);

    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillText('🎬 Nhấn phím [E] hoặc Chạm vào màn hình để mở Rạp Chiếu Phim Tư Liệu', w / 2, h - 38);

    this.theaterTexture.needsUpdate = true;
  }

  /**
   * Thiết lập PositionalAudio 3D gắn tại Màn hình Chiếu phim tư liệu Tầng 1:
   * Khi nhân vật đi lại gần màn hình ở Tầng 1 sẽ nghe tiếng nhạc nền tư liệu ấm áp lớn dần;
   * khi đi ra ngoài sân hoặc lên Tầng 2 sẽ tự động tắt.
   */
  setupTheaterPositionalAudio() {
    if (!this.audioListener || !this.theaterScreenMesh) return;

    const initAudioOnGesture = () => {
      if (this.positionalAudio) return;
      try {
        const ctx = this.audioListener.context;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const sampleRate = ctx.sampleRate;
        const duration = 8.0;
        const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        // Tạo giai điệu hợp âm lịch sử trang trọng, êm dịu (C4 - G4 - A4 - F4)
        const notes = [261.63, 329.63, 392.0, 349.23];
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const noteIdx = Math.floor(t / 2.0) % notes.length;
          const freq = notes[noteIdx];
          const localT = t % 2.0;
          const env = Math.sin((Math.min(localT, 2.0) / 2.0) * Math.PI);
          data[i] =
            (Math.sin(2 * Math.PI * freq * t) * 0.6 +
              Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.4) *
            env *
            0.06;
        }

        const sound = new THREE.PositionalAudio(this.audioListener);
        sound.setBuffer(buffer);
        sound.setRefDistance(4.5);
        sound.setMaxDistance(20.0);
        sound.setRolloffFactor(2.0);
        sound.setLoop(true);
        sound.setVolume(0.45);

        this.theaterScreenMesh.add(sound);
        this.positionalAudio = sound;
        this.updatePositionalAudioState();
      } catch {
        // Bỏ qua nếu trình duyệt chặn WebAudio
      }
    };

    window.addEventListener('pointerdown', initAudioOnGesture, { once: true });
    window.addEventListener('keydown', initAudioOnGesture, { once: true });
  }

  setPositionalAudioMuted(muted) {
    this.isPositionalAudioMuted = muted;
    this.updatePositionalAudioState();
  }

  updatePositionalAudioState() {
    if (!this.positionalAudio) return;
    const shouldPlay =
      this.currentZone === 'indoor' &&
      this.currentFloor === 1 &&
      !this.isPositionalAudioMuted;

    if (shouldPlay && !this.positionalAudio.isPlaying) {
      this.positionalAudio.play();
    } else if (!shouldPlay && this.positionalAudio.isPlaying) {
      this.positionalAudio.pause();
    }
  }

  // =========================================================================
  // 3. KIẾN TRÚC TẦNG 2 MỞ RỘNG (MEZZANINE 64m × 38m, Y = 5.5)
  // =========================================================================

  buildIndoorSecondFloorMezzanine() {
    const floorY = 5.5;
    const mezzMat = SceneManager.createFlatMaterial(PALETTE.FLOOR_MEZZANINE);
    const carpetMat = SceneManager.createFlatMaterial(PALETTE.RED_VERMILION);
    const partyRedMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);

    // 1. Sàn Cánh Tây (Gian 4: 1954 - 1975): X từ -31.3 đến -13.0, Z từ -37.3 đến -3.5
    const westSlab = new THREE.Mesh(new THREE.BoxGeometry(18.3, 0.28, 33.8), mezzMat);
    westSlab.position.set(-22.15, floorY - 0.14, -20.4);
    westSlab.receiveShadow = true;
    this.indoorFloor2Group.add(westSlab);

    // 2. Sàn Cánh Đông (Gian 5: 1986 - Nay): X từ +13.0 đến +31.3, Z từ -37.3 đến -3.5
    const eastSlab = new THREE.Mesh(new THREE.BoxGeometry(18.3, 0.28, 33.8), mezzMat);
    eastSlab.position.set(22.15, floorY - 0.14, -20.4);
    eastSlab.receiveShadow = true;
    this.indoorFloor2Group.add(eastSlab);

    // 3. Sàn Trung tâm Bắc mở rộng (Gian 6: Không gian Tưởng niệm): X từ -13.0 đến +13.0, Z từ -37.3 đến -18.0
    // (Sâu 19.3m giúp Tượng Bác Hồ ở Z = -34.0 và Bàn Thắp Nến ở Z = -22.5 cách nhau 11.5 units!)
    const northBridgeSlab = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.28, 19.3), mezzMat);
    northBridgeSlab.position.set(0, floorY - 0.14, -27.65);
    northBridgeSlab.receiveShadow = true;
    this.indoorFloor2Group.add(northBridgeSlab);

    // Hệ thống Thảm Đỏ Viền Vàng Tầng 2 dẫn tới TẤT CẢ các hiện vật Gian 4, Gian 5, Gian 6 & Thang máy:
    // 1. Thảm chính Không gian Tưởng niệm Gian 6 (X = 0, từ Bàn Thắp Nến Z = -20.5 tới Tượng Bác Hồ Z = -35.5)
    this.addCeremonialCarpet(this.indoorFloor2Group, 0, floorY, -28.0, 6.8, 16.5, 0.004);
    // 2. Thảm ngang Cầu Bắc nối liền Cánh Tây (Gian 4, X = -22.5), Thang máy (X = -10.5), Gian 6 (X = 0) và Cánh Đông (Gian 5, X = +22.5)
    this.addCeremonialCarpet(this.indoorFloor2Group, 0, floorY, -25.0, 47.8, 2.8, 0.002);
    // 3. Nhánh thảm đón từ cửa Thang máy Tầng 2 (X = -10.5, Z = -34.0) ra thảm ngang Cầu Bắc
    this.addCeremonialCarpet(this.indoorFloor2Group, -10.5, floorY, -29.5, 2.6, 9.5, 0.0);
    // 4. Thảm dẫn dọc Gian 4 Cánh Tây (X = -22.5) nối trực tiếp đến 2 hiện vật Trường Sơn (Z = -10.5) & Hiệp định Paris (Z = -26.5)
    this.addCeremonialCarpet(this.indoorFloor2Group, -22.5, floorY, -18.5, 2.8, 18.8, 0.0);
    // 5. Thảm dẫn dọc Gian 5 Cánh Đông (X = +22.5) nối trực tiếp đến 2 hiện vật Đại hội VI (Z = -10.5) & Hội nhập Quốc tế (Z = -26.5)
    this.addCeremonialCarpet(this.indoorFloor2Group, 22.5, floorY, -18.5, 2.8, 18.8, 0.0);

    // Phông Đỏ lớn trang trọng & Viền vàng đồng cân đối hoàn hảo với bức tường Bắc (cao 4.4m) và bệ đá 18.2m của Gian Tưởng Niệm
    const backdropGoldBorder = new THREE.Mesh(
      new THREE.BoxGeometry(18.6, 3.82, 0.14),
      goldMat
    );
    backdropGoldBorder.position.set(0, floorY + 2.28, -37.16);

    const backdrop = new THREE.Mesh(
      new THREE.BoxGeometry(18.2, 3.58, 0.18),
      partyRedMat
    );
    backdrop.position.set(0, floorY + 2.28, -37.12);

    // Khung vinh danh trung tâm ngay sau Tượng Chủ tịch Hồ Chí Minh (X: -3.4..+3.4)
    const centerHonorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 3.42, 0.2),
      SceneManager.createFlatMaterial(PALETTE.RED_VERMILION)
    );
    centerHonorFrame.position.set(0, floorY + 2.28, -37.09);

    const starEmblem = SceneManager.createStarMesh(0.62, 0.25, 0.14, goldMat);
    starEmblem.position.set(0, floorY + 3.32, -36.94);

    this.indoorFloor2Group.add(backdropGoldBorder, backdrop, centerHonorFrame, starEmblem);

    // Tường bao Tầng 2 (64m × 38m, nâng chiều cao lên 4.4m để bao trọn và cân đối với Phông Đỏ Gian 6)
    this.addColliderWall('indoorF2', 0, floorY, -37.5, 64, 4.4, 0.5, PALETTE.WALL_CONCRETE, this.indoorFloor2Group, true);
    this.addColliderWall('indoorF2', -31.5, floorY, -20, 0.5, 4.4, 35, PALETTE.WALL_CONCRETE, this.indoorFloor2Group, true);
    this.addColliderWall('indoorF2', 31.5, floorY, -20, 0.5, 4.4, 35, PALETTE.WALL_CONCRETE, this.indoorFloor2Group, true);

    // Lan can Giếng trời (Mezzanine Railing) quanh ô trống trung tâm (X: -13.0..+13.0, Z: -18.0..-3.5)
    this.addColliderWall('indoorF2', -13.0, floorY, -10.75, 0.25, 0.85, 14.5, PALETTE.WOOD_OAK, this.indoorFloor2Group, true);
    this.addColliderWall('indoorF2', 13.0, floorY, -10.75, 0.25, 0.85, 14.5, PALETTE.WOOD_OAK, this.indoorFloor2Group, true);
    this.addColliderWall('indoorF2', 0, floorY, -18.0, 26.0, 0.85, 0.25, PALETTE.WOOD_OAK, this.indoorFloor2Group, true);

    // Lan can mép Nam của 2 cánh Tây & Đông (Z = -3.6)
    this.addColliderWall('indoorF2', -22.15, floorY, -3.6, 18.3, 0.85, 0.25, PALETTE.WOOD_OAK, this.indoorFloor2Group, true);
    this.addColliderWall('indoorF2', 22.15, floorY, -3.6, 18.3, 0.85, 0.25, PALETTE.WOOD_OAK, this.indoorFloor2Group, true);

    // Buồng Thang máy hiện đại ở Sảnh Tầng 2 (X = -10.5, Y = 5.5, Z = -35.2)
    this.buildModernElevator(this.indoorFloor2Group, floorY, true);
  }

  /**
   * Mô hình Buồng Thang máy hiện đại (Khung kim loại + Vách kính + Sàn phát sáng + Cửa kính tự động mở)
   * Đặt tại X = -10.5, Z = -35.2 (cách xa Màn hình chiếu phim Tầng 1 và Tượng Bác Hồ Tầng 2 đúng 10.5 units)
   */
  buildModernElevator(parentGroup, floorY = 0, isSecondFloor = false) {
    const cabinGroup = new THREE.Group();
    cabinGroup.position.set(-10.5, floorY, -35.2);

    const frameMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK, {
      roughness: 0.35,
      metalness: 0.45
    });
    const brassMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, {
      roughness: 0.3,
      metalness: 0.4
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x99d9ea,
      flatShading: true,
      transparent: true,
      opacity: 0.36,
      roughness: 0.2,
      metalness: 0.3
    });
    const doorGlassMat = new THREE.MeshStandardMaterial({
      color: 0xbbeeff,
      flatShading: true,
      transparent: true,
      opacity: 0.52,
      roughness: 0.15,
      metalness: 0.35
    });
    const glowPadMat = new THREE.MeshBasicMaterial({
      color: 0xffe600
    });

    const floorBase = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 2.3), frameMat);
    floorBase.position.y = 0.07;
    const glowingFloor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.85), glowPadMat);
    glowingFloor.position.y = 0.08;

    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.24, 2.4), frameMat);
    roofCap.position.y = 3.45;
    const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(3.06, 0.08, 2.46), brassMat);
    roofTrim.position.y = 3.31;

    [
      [-1.38, -1.05],
      [1.38, -1.05],
      [-1.38, 1.05],
      [1.38, 1.05]
    ].forEach(([cx, cz]) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), frameMat);
      pillar.position.set(cx, 1.7, cz);
      pillar.castShadow = true;
      cabinGroup.add(pillar);
    });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.65, 3.2, 0.1), frameMat);
    backWall.position.set(0, 1.7, -1.05);

    const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.1, 2.0), glassMat);
    leftGlass.position.set(-1.38, 1.7, 0);

    const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.1, 2.0), glassMat);
    rightGlass.position.set(1.38, 1.7, 0);

    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.18, 2.85, 0.08), doorGlassMat);
    leftDoor.position.set(-0.6, 1.5, 1.05);

    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.18, 2.85, 0.08), doorGlassMat);
    rightDoor.position.set(0.6, 1.5, 1.05);

    const headerBar = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.36, 0.24), frameMat);
    headerBar.position.set(0, 3.1, 1.06);

    const arrowCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.28, 3),
      glowPadMat
    );
    arrowCone.position.set(0, 3.1, 1.2);
    if (isSecondFloor) {
      arrowCone.rotation.z = Math.PI;
    }

    cabinGroup.add(
      floorBase,
      glowingFloor,
      roofCap,
      roofTrim,
      backWall,
      leftGlass,
      rightGlass,
      leftDoor,
      rightDoor,
      headerBar,
      arrowCone
    );

    parentGroup.add(cabinGroup);
    this.elevatorDoors.push({
      padId: isSecondFloor ? 'special-stairs-down' : 'special-stairs-up',
      leftDoor,
      rightDoor,
      openRatio: 0
    });
  }

  // =========================================================================
  // 4. TRANG TRÍ TRÊN TƯỜNG: TRANH LỊCH SỬ, VŨ KHÍ & QUÂN TRANG KHÁNG CHIẾN
  // =========================================================================

  buildWallPaintingsAndWeapons() {
    // A. Trên tường Bắc Tầng 1 (Z = -37.2): chỉ giữ 2 khung tranh hai đầu (khoảng cách rộng, không chồng lấn trạm Đố vui)
    this.addHistoricalPainting(this.indoorFloor1Group, -23.0, 2.3, -37.2, 0, PALETTE.PARTY_RED);
    this.addHistoricalPainting(this.indoorFloor1Group, 23.0, 2.3, -37.2, 0, PALETTE.YELLOW_OCHRE);

    // B. Trên tường Tây Tầng 1 (Gian 1, X = -31.2, xoay +PI/2)
    this.addHistoricalPainting(this.indoorFloor1Group, -31.2, 2.3, -9.5, Math.PI / 2, PALETTE.RED_VERMILION);
    this.addWeaponDisplayRack(this.indoorFloor1Group, -31.2, 2.2, -26.5, Math.PI / 2);

    // C. Trên tường Đông Tầng 1 (Gian 3, X = +31.2, xoay -PI/2)
    this.addWeaponDisplayRack(this.indoorFloor1Group, 31.2, 2.2, -9.5, -Math.PI / 2);
    this.addHistoricalPainting(this.indoorFloor1Group, 31.2, 2.3, -26.5, -Math.PI / 2, PALETTE.ARMY_GREEN);

    // D. Trên tường Tầng 2 (Y = 5.5)
    const y2 = 5.5;
    this.addHistoricalPainting(this.indoorFloor2Group, -22.5, y2 + 2.1, -37.1, 0, PALETTE.ARMY_GREEN);
    this.addWeaponDisplayRack(this.indoorFloor2Group, -31.1, y2 + 2.0, -10.5, Math.PI / 2);
    this.addEquipmentShelfWall(this.indoorFloor2Group, -31.1, y2 + 2.1, -26.5, Math.PI / 2);

    this.addHistoricalPainting(this.indoorFloor2Group, 22.5, y2 + 2.1, -37.1, 0, PALETTE.AIRCRAFT_BLUE);
    this.addEquipmentShelfWall(this.indoorFloor2Group, 31.1, y2 + 2.1, -10.5, -Math.PI / 2);
    this.addWeaponDisplayRack(this.indoorFloor2Group, 31.1, y2 + 2.0, -26.5, -Math.PI / 2);
  }

  addHistoricalPainting(parentGroup, x, y, z, rotY, colorHex) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.8, 0.12),
      SceneManager.createFlatMaterial(PALETTE.WOOD_OAK)
    );
    const canvas = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 1.4, 0.16),
      SceneManager.createFlatMaterial(colorHex)
    );
    const star = SceneManager.createStarMesh(0.32, 0.13, 0.08);
    star.position.z = 0.1;

    group.add(frame, canvas, star);
    parentGroup.add(group);
  }

  addWeaponDisplayRack(parentGroup, x, y, z, rotY) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const steelMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK);
    const boardMat = SceneManager.createFlatMaterial(PALETTE.FLOOR_MEZZANINE);

    const backing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.5, 0.1), boardMat);
    const border = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.65, 0.06), woodMat);
    group.add(border, backing);

    [-1, 1].forEach((dir) => {
      const rifle = new THREE.Group();
      rifle.position.set(0, -0.05, 0.1);
      rifle.rotation.z = dir * 0.42;

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.08), woodMat);
      stock.position.x = -0.55 * dir;

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.035, 1.45, 6),
        steelMat
      );
      barrel.rotation.z = Math.PI / 2;
      barrel.position.x = 0.25 * dir;

      rifle.add(stock, barrel);
      group.add(rifle);
    });

    const star = SceneManager.createStarMesh(0.2, 0.08, 0.06);
    star.position.set(0, 0.42, 0.1);
    group.add(star);

    parentGroup.add(group);
  }

  addEquipmentShelfWall(parentGroup, x, y, z, rotY) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const armyMat = SceneManager.createFlatMaterial(PALETTE.ARMY_GREEN);
    const redMat = SceneManager.createFlatMaterial(PALETTE.RED_VERMILION);

    const backing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.1), redMat);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.55), woodMat);
    shelf.position.set(0, -0.35, 0.25);

    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.2, 8), armyMat);
    helmet.position.set(-0.85, -0.18, 0.28);

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.34), armyMat);
    backpack.position.set(0, 0.02, 0.26);

    const canteen = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.38, 8), armyMat);
    canteen.position.set(0.85, -0.1, 0.28);

    group.add(backing, shelf, helmet, backpack, canteen);
    parentGroup.add(group);
  }

  /**
   * TÍNH NĂNG 3: Thả Hoa Đăng / Thuyền Giấy Ước Nguyện Hòa Bình trôi nhẹ nhàng trên mặt nước Đài phun nước
   */
  spawnFountainLantern(fountainX = -12.5, fountainZ = 17.5) {
    const lanternGroup = new THREE.Group();

    const lotusMat = SceneManager.createFlatMaterial(0xff7788, {
      roughness: 0.4,
      emissive: 0xd94b5f,
      emissiveIntensity: 0.22
    });
    const goldMat = SceneManager.createFlatMaterial(PALETTE.BRIGHT_STAR_YELLOW, {
      roughness: 0.2,
      emissive: PALETTE.BRIGHT_STAR_YELLOW,
      emissiveIntensity: 0.55
    });
    const leafMat = SceneManager.createFlatMaterial(PALETTE.GRASS_GREEN);

    const leafBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.18, 0.04, 7),
      leafMat
    );
    const petals = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.14, 6),
      lotusMat
    );
    petals.position.y = 0.07;

    const candleCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.08, 0),
      goldMat
    );
    candleCore.position.y = 0.16;

    lanternGroup.add(leafBase, petals, candleCore);
    this.outdoorGroup.add(lanternGroup);

    const startAngle = Math.random() * Math.PI * 2;
    const orbitRadius = 1.45 + Math.random() * 1.05;
    this.floatingLanterns.push({
      mesh: lanternGroup,
      cx: fountainX,
      cz: fountainZ,
      angle: startAngle,
      radius: orbitRadius,
      speed: 0.32 + Math.random() * 0.18,
      bobPhase: Math.random() * Math.PI * 2
    });

    // Giữ tối đa 16 hoa đăng để luôn mượt mà
    if (this.floatingLanterns.length > 16) {
      const oldest = this.floatingLanterns.shift();
      this.outdoorGroup.remove(oldest.mesh);
    }
  }

  /**
   * TÍNH NĂNG 1: Hệ thống Bắn Pháo Hoa 3D Chào Mừng Ngày Toàn Thắng (30/4) trên bầu trời Quảng trường
   * Sử dụng FireworksSystem (THREE.Points, gia tốc trọng lực rơi chậm, fade-out mượt, 4 bộ màu lễ hội & pos-audio).
   */
  launchVictoryFireworks(burstCount = 5) {
    if (this.fireworksSystem) {
      this.fireworksSystem.launch(burstCount);
    }
  }

  updateFireworks(dt) {
    // Chỉ bắn pháo hoa khi người dùng chủ động bấm nút bắn pháo hoa (không tự động bắn)
    if (this.fireworksSystem) {
      this.fireworksSystem.update(dt, this.currentZone === 'outdoor');
    }
  }

  /**
   * TÍNH NĂNG 4: Vệt Mũi Tên Dẫn Đường GPS 3D dưới sàn (Wayfinding Trail)
   * Đã căn chuẩn hướng mũi nhọn nằm trên trục +Z cục bộ để khi xoay `yaw = Math.atan2(dirX, dirZ)`
   * thì mũi tên luôn chỉ thẳng từ vị trí nhân vật hướng tới hiện vật!
   */
  buildWayfindingArrows() {
    const shape = new THREE.Shape();
    // Khi thực hiện geo.rotateX(-Math.PI / 2), tọa độ 2D (x, y) chuyển thành 3D (x, 0, -y).
    // Do đó đặt đỉnh nhọn ở y = -0.40 sẽ biến thành z = +0.40 (hướng +Z), đuôi cánh ở y = +0.20 biến thành z = -0.20!
    shape.moveTo(0, -0.40);      // Đỉnh mũi nhọn hướng về phía trước (+Z trong 3D)
    shape.lineTo(0.36, 0.18);    // Cánh phải
    shape.lineTo(0.18, 0.28);    // Đuôi phải
    shape.lineTo(0, -0.05);      // Hõm giữa đuôi mũi tên
    shape.lineTo(-0.18, 0.28);   // Đuôi trái
    shape.lineTo(-0.36, 0.18);   // Cánh trái
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe600,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.wayfindingGroup.add(mesh);
      this.wayfindingArrows.push({ mesh, mat });
    }
  }

  setWayfindingTarget(targetInfo) {
    this.wayfindingTarget = targetInfo;
  }

  setWayfindingEnabled(enabled) {
    this.wayfindingEnabled = enabled;
    if (!enabled) {
      this.wayfindingArrows.forEach((a) => {
        a.mesh.visible = false;
      });
    }
  }

  updateWayfindingArrows(playerPos, elapsedTime, discoveredIds = null) {
    if (!this.wayfindingEnabled || !playerPos) {
      this.wayfindingArrows.forEach((a) => {
        a.mesh.visible = false;
      });
      return;
    }

    let targetObj = this.wayfindingTarget;

    // Nếu ở chế độ tự động ('auto_nearest' hoặc chưa chọn), tự động tìm Hiện Vật gần nhất ở tầng hiện tại
    // (ưu tiên hiện vật chưa khám phá; nếu đã khám phá hết ở tầng hiện tại thì chỉ tới hiện vật gần nhất)
    if (!targetObj || targetObj.mode === 'auto_nearest') {
      const sameFloorExhibits = EXHIBITS_DATA.filter(
        (ex) =>
          ex.zoneType === this.currentZone &&
          (ex.zoneType === 'outdoor' || ex.floor === this.currentFloor)
      );
      const unvisitedOnFloor =
        discoveredIds && discoveredIds.size > 0
          ? sameFloorExhibits.filter((ex) => !discoveredIds.has(ex.id))
          : sameFloorExhibits;

      const candidatePool =
        unvisitedOnFloor.length > 0 ? unvisitedOnFloor : sameFloorExhibits;

      let bestEx = null;
      let bestDist = Infinity;
      for (const ex of candidatePool) {
        const d = Math.hypot(ex.position.x - playerPos.x, ex.position.z - playerPos.z);
        if (d > 2.4 && d < bestDist) {
          bestDist = d;
          bestEx = ex;
        }
      }

      if (bestEx) {
        targetObj = {
          x: bestEx.position.x,
          z: bestEx.position.z,
          zoneType: bestEx.zoneType,
          floor: bestEx.floor
        };
      }
    }

    if (!targetObj) {
      this.wayfindingArrows.forEach((a) => {
        a.mesh.visible = false;
      });
      return;
    }

    // Xác định điểm đích trung gian hợp lý nếu hiện vật mục tiêu nằm ở Khu vực / Tầng khác
    let destX = targetObj.x;
    let destZ = targetObj.z;
    const targetZone = targetObj.zoneType || 'outdoor';
    const targetFloor = targetObj.floor || 1;

    if (this.currentZone !== targetZone) {
      // Dẫn tới Cổng chính bảo tàng (Z = 4.2 ngoài sân hoặc Z = -2.2 trong nhà)
      destX = 0;
      destZ = this.currentZone === 'outdoor' ? 4.2 : -2.2;
    } else if (this.currentZone === 'indoor' && this.currentFloor !== targetFloor) {
      // Dẫn tới Thang máy hiện đại (X = -10.5, Z = -34.0)
      destX = -10.5;
      destZ = -34.0;
    }

    const dx = destX - playerPos.x;
    const dz = destZ - playerPos.z;
    const totalDist = Math.hypot(dx, dz);

    if (totalDist < 2.2) {
      this.wayfindingArrows.forEach((a) => {
        a.mesh.visible = false;
      });
      return;
    }

    const dirX = dx / totalDist;
    const dirZ = dz / totalDist;
    const yaw = Math.atan2(dirX, dirZ);
    const maxTrailLen = Math.min(totalDist - 1.2, 13.5);
    const count = this.wayfindingArrows.length;

    for (let i = 0; i < count; i++) {
      const item = this.wayfindingArrows[i];
      const frac = (i + 1) / (count + 1);
      const stepDist = 1.0 + frac * maxTrailLen;

      if (stepDist >= totalDist - 0.8) {
        item.mesh.visible = false;
        continue;
      }

      item.mesh.visible = true;
      item.mesh.position.set(
        playerPos.x + dirX * stepDist,
        playerPos.y + 0.088,
        playerPos.z + dirZ * stepDist
      );
      item.mesh.rotation.y = yaw;

      const wave = 0.45 + 0.55 * Math.sin(elapsedTime * 6.5 - i * 0.65);
      item.mat.opacity = 0.32 + wave * 0.65;
      item.mesh.scale.setScalar(0.88 + wave * 0.24);
    }
  }

  update(dt, elapsedTime, activeTargetId, playerPos = null, discoveredIds = null) {
    this.updateFireworks(dt);
    this.updateWayfindingArrows(playerPos, elapsedTime, discoveredIds);

    if (this.flagWaveMesh) {
      this.flagWaveMesh.rotation.y = Math.sin(elapsedTime * 2.6) * 0.12;
    }

    // 1. Cập nhật hiệu ứng phun nước của 2 Đài phun nước ngoài sân trước
    this.fountains.forEach((f) => {
      const jetScaleY = 1.0 + Math.sin(elapsedTime * 7.5) * 0.16;
      f.jetPlume.scale.set(1.0, jetScaleY, 1.0);
      f.splashRing.scale.setScalar(1.0 + Math.sin(elapsedTime * 5.0) * 0.08);

      for (const drop of f.droplets) {
        drop.phase = (drop.phase + dt * drop.speed) % 1.0;
        const t = drop.phase;
        const r = t * drop.maxRadius;
        const y = 2.45 + Math.sin(t * Math.PI) * drop.peakHeight - t * t * 2.0;
        drop.mesh.position.set(
          Math.cos(drop.angle) * r,
          Math.max(0.42, y),
          Math.sin(drop.angle) * r
        );
        drop.mesh.rotation.x += dt * 4.0;
        drop.mesh.rotation.y += dt * 3.0;
        const s = 1.0 - Math.abs(t - 0.5) * 0.6;
        drop.mesh.scale.setScalar(Math.max(0.4, s));
      }
    });

    // 1b. Cập nhật các Hoa đăng / Thuyền giấy trôi lững lờ trên mặt hồ Đài phun nước
    for (const lantern of this.floatingLanterns) {
      lantern.angle += lantern.speed * dt;
      lantern.mesh.position.set(
        lantern.cx + Math.cos(lantern.angle) * lantern.radius,
        0.5 + Math.sin(elapsedTime * 3.5 + lantern.bobPhase) * 0.025,
        lantern.cz + Math.sin(lantern.angle) * lantern.radius
      );
      lantern.mesh.rotation.y = -lantern.angle;
    }

    // 2. Cập nhật Mây trắng Low-poly trôi ngang bầu trời
    for (const cloud of this.skyClouds) {
      cloud.group.position.x += cloud.speed * dt;
      cloud.group.position.y =
        cloud.baseY + Math.sin(elapsedTime * 0.8 + cloud.seed) * 0.25;
      if (cloud.group.position.x > 68) {
        cloud.group.position.x = -68;
      }
    }

    // 3. Cập nhật NPC Chiến sĩ Tiêu binh tại chân Cột cờ Hà Nội
    if (this.flagpoleNPC) {
      this.flagpoleNPC.updateProceduralAnimation(dt, false, false);
    }

    // 4. Cập nhật Slide chuyển cảnh trên Màn hình LED Chiếu phim Tư liệu Tầng 1
    if (this.currentZone === 'indoor' && this.currentFloor === 1) {
      this.updateTheaterScreenCanvas(elapsedTime);
    }

    // 5. Cập nhật cửa kính tự động của Buồng Thang máy
    for (const elev of this.elevatorDoors) {
      const targetOpen = activeTargetId === elev.padId ? 1.0 : 0.0;
      elev.openRatio = THREE.MathUtils.lerp(elev.openRatio, targetOpen, Math.min(1, dt * 8));
      elev.leftDoor.position.x = -0.6 - elev.openRatio * 0.72;
      elev.rightDoor.position.x = 0.6 + elev.openRatio * 0.72;
    }

    this.portalRings.forEach((portal) => {
      const s = 1.0 + Math.sin(elapsedTime * 3.8) * 0.08;
      portal.scale.setScalar(s);
    });

    if (this.decorBuilder) {
      this.decorBuilder.setNight(this.isNightMode);
      this.decorBuilder.update(dt);
    }

    this.exhibitsManager.update(dt, elapsedTime, activeTargetId);
  }
}
