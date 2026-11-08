import * as THREE from 'three';
import {
  PALETTE,
  EXHIBITS_DATA,
  BENCHES_DATA,
  SPECIAL_INTERACTIONS,
  HIDDEN_STARS_DATA
} from '../constants.js?v=19';
import { SceneManager } from './SceneManager.js?v=19';
import { MemorialOfferings } from './fx/MemorialOfferings.js?v=19';

/**
 * ExhibitsManager: Quản lý toàn bộ Mô hình Hiện vật 3D (Sân trước, Tầng 1, Tầng 2),
 * Hệ thống Băng ghế ngồi nghỉ, Bàn đá Lư hương Tưởng niệm (Gian 6) và Trạm Đố Vui Lịch Sử.
 */
export class ExhibitsManager {
  constructor({ outdoorGroup, indoorFloor1Group, indoorFloor2Group, colliders }) {
    this.outdoorGroup = outdoorGroup;
    this.indoorFloor1Group = indoorFloor1Group;
    this.indoorFloor2Group = indoorFloor2Group;
    this.colliders = colliders;

    this.animatedMeshes = [];
    this.interactionRings = [];
    this.raycastTargets = [];
    this.hiddenStarNodes = new Map();
    this.candlesContainer = new THREE.Group();
    this.memorialOfferings = null;
    this.quizBoardCanvas = null;
    this.quizBoardTexture = null;

    this.buildBenches();
    this.buildAllExhibits();
    this.buildDecorativePlantsAndPillars();
    this.buildMemorialSpaceArchitecture();
    this.buildMemorialAltar();
    this.buildQuizStation();
    this.buildHiddenStars();
    this.buildSpecialInteractionPads();
  }

  getTargetGroup(zoneType, floor = 1) {
    if (zoneType === 'outdoor') return this.outdoorGroup;
    return floor === 2 ? this.indoorFloor2Group : this.indoorFloor1Group;
  }

  /**
   * 1. Xây dựng hệ thống Băng ghế đá / ghế gỗ mộc ngoài quảng trường và trong nhà (Tầng 1 & Tầng 2)
   * Có thêm collider nhỏ cho từng ghế để nhân vật không đi xuyên qua ghế.
   */
  buildBenches() {
    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const stoneMat = SceneManager.createFlatMaterial(PALETTE.WALL_CONCRETE);

    const velvetMat = SceneManager.createFlatMaterial(0x8c1b22, { roughness: 0.9 });
    const seatDarkMat = SceneManager.createFlatMaterial(0x23191b);
    const seatGoldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, {
      roughness: 0.3,
      metalness: 0.5
    });

    BENCHES_DATA.forEach((b) => {
      const benchGroup = new THREE.Group();
      benchGroup.position.set(b.x, b.y, b.z);
      benchGroup.rotation.y = b.rotY;

      if (b.isTheaterBench) {
        // Ghế rạp chiếu phim nhung đỏ: đệm ngồi, tựa lưng cao, 2 tay vịn, chân đế & biển số vàng
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 0.6), velvetMat);
        cushion.position.y = 0.42;
        cushion.castShadow = true;
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.68, 0.13), velvetMat);
        back.position.set(0, 0.78, -0.3);
        back.rotation.x = -0.12;
        back.castShadow = true;
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.4), seatDarkMat);
        base.position.set(0, 0.17, -0.04);
        [-0.36, 0.36].forEach((ax) => {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.52), seatDarkMat);
          arm.position.set(ax, 0.58, -0.02);
          benchGroup.add(arm);
        });
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), seatGoldMat);
        plate.position.set(0, 1.08, -0.37);
        benchGroup.add(cushion, back, base, plate);

        const theaterTarget = this.getTargetGroup(b.zoneType, b.floor);
        theaterTarget.add(benchGroup);
        this.colliders.indoorF1.pillars.push({ x: b.x, z: b.z, radius: 0.3 });
        return;
      }

      // Mặt ghế
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.68), woodMat);
      seat.position.y = 0.42;
      seat.castShadow = true;
      seat.receiveShadow = true;

      // Tựa lưng (nằm ở z = -0.28 cục bộ, mặt trước ghế hướng về +Z cục bộ)
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.48, 0.12), woodMat);
      backrest.position.set(0, 0.72, -0.28);
      backrest.rotation.x = -0.1;
      backrest.castShadow = true;

      // 2 chân đá
      [-0.82, 0.82].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.6), stoneMat);
        leg.position.set(lx, 0.2, 0);
        leg.castShadow = true;
        benchGroup.add(leg);
      });

      benchGroup.add(seat, backrest);

      const targetGroup = this.getTargetGroup(b.zoneType, b.floor);
      targetGroup.add(benchGroup);

      // Collider nhẹ cho ghế để khi đi bộ không xuyên qua ghế
      const colliderKey =
        b.zoneType === 'outdoor'
          ? 'outdoor'
          : b.floor === 2
          ? 'indoorF2'
          : 'indoorF1';
      this.colliders[colliderKey].pillars.push({ x: b.x, z: b.z, radius: 0.55 });
    });
  }

  /**
   * Tăng độ nét mô hình hiện vật: nâng số phân đoạn của các khối cong (trụ, nón, cầu, vòng, nang)
   * và gộp toàn bộ cạnh của các khối hộp thành 1 LineSegments (1 draw call) làm viền nổi bật.
   */
  refineGeometry(root) {
    if (!this.edgeLineMat) {
      this.edgeLineMat = new THREE.LineBasicMaterial({
        color: 0x14110d,
        transparent: true,
        opacity: 0.5
      });
    }
    root.updateMatrixWorld(true);
    const rootInv = root.matrixWorld.clone().invert();
    const meshes = [];
    root.traverse((c) => {
      if (c.isMesh && c.geometry && c.geometry.parameters) meshes.push(c);
    });

    const edgePositions = [];
    const rel = new THREE.Matrix4();
    const v = new THREE.Vector3();

    meshes.forEach((m) => {
      const g = m.geometry;
      const p = g.parameters;
      let ng = null;
      switch (g.type) {
        case 'CylinderGeometry':
          ng = new THREE.CylinderGeometry(
            p.radiusTop, p.radiusBottom, p.height,
            Math.max(p.radialSegments, 20), p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength
          );
          break;
        case 'ConeGeometry':
          ng = new THREE.ConeGeometry(
            p.radius, p.height, Math.max(p.radialSegments, 20), p.heightSegments,
            p.openEnded, p.thetaStart, p.thetaLength
          );
          break;
        case 'SphereGeometry':
          ng = new THREE.SphereGeometry(
            p.radius, Math.max(p.widthSegments, 18), Math.max(p.heightSegments, 12),
            p.phiStart, p.phiLength, p.thetaStart, p.thetaLength
          );
          break;
        case 'TorusGeometry':
          ng = new THREE.TorusGeometry(
            p.radius, p.tube, Math.max(p.radialSegments, 8), Math.max(p.tubularSegments, 24), p.arc
          );
          break;
        case 'CapsuleGeometry':
          ng = new THREE.CapsuleGeometry(
            p.radius, p.length, Math.max(p.capSegments || 4, 6), Math.max(p.radialSegments || 8, 16)
          );
          break;
        case 'BoxGeometry': {
          if (Math.max(p.width, p.height, p.depth) < 0.18) break;
          rel.multiplyMatrices(rootInv, m.matrixWorld);
          const eg = new THREE.EdgesGeometry(g, 25);
          const pos = eg.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(rel);
            edgePositions.push(v.x, v.y, v.z);
          }
          eg.dispose();
          break;
        }
        default:
          break;
      }
      if (ng) {
        g.dispose();
        m.geometry = ng;
      }
    });

    if (edgePositions.length) {
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
      const lines = new THREE.LineSegments(lg, this.edgeLineMat);
      root.add(lines);
    }
  }

  /**
   * 2. Xây dựng toàn bộ 16 hiện vật theo 6 Gian chuyên đề (Tầng 1 & Tầng 2) + Sân ngoài trời
   */
  buildAllExhibits() {
    EXHIBITS_DATA.forEach((exhibit) => {
      const { x, y = 0, z } = exhibit.position;
      const isIndoor = exhibit.zoneType === 'indoor';
      const targetGroup = this.getTargetGroup(exhibit.zoneType, exhibit.floor);

      if (isIndoor) {
        const pedestalGroup = new THREE.Group();
        pedestalGroup.position.set(x, y, z);

        // Nếu là Tượng đài Tưởng niệm Chủ tịch Hồ Chí Minh (Gian 6), xây bệ đá hoa cương nhiều tầng trang trọng
        if (exhibit.artifactType === 'memorial_statue') {
          const graniteDark = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK, {
            roughness: 0.45,
            metalness: 0.25
          });
          const graniteLight = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER);
          const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);

          const tier1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 2.5), graniteDark);
          tier1.position.y = 0.12;
          const tier2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.24, 2.0), graniteLight);
          tier2.position.y = 0.36;
          const tier3 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.26, 1.5), graniteDark);
          tier3.position.y = 0.61;
          const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.06, 1.58), goldMat);
          goldTrim.position.y = 0.75;

          const pillarBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.35, 0.95, 1.05),
            SceneManager.createFlatMaterial(PALETTE.RED_VERMILION)
          );
          pillarBody.position.y = 1.22;

          const artifactMesh = this.createIndoorHistoryArtifact(
            exhibit.artifactType,
            exhibit.artifactColor
          );
          this.refineGeometry(artifactMesh);
          artifactMesh.position.y = 1.75;

          pedestalGroup.add(tier1, tier2, tier3, goldTrim, pillarBody, artifactMesh);
        } else {
          const baseMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.95, 1.08, 0.25, 8),
            SceneManager.createFlatMaterial(PALETTE.WOOD_OAK)
          );
          baseMesh.position.y = 0.125;
          baseMesh.castShadow = true;

          const pillarMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.75, 0.82, 1.05, 8),
            SceneManager.createFlatMaterial(PALETTE.WALL_CONCRETE)
          );
          pillarMesh.position.y = 0.65;
          pillarMesh.castShadow = true;

          const artifactMesh = this.createIndoorHistoryArtifact(
            exhibit.artifactType,
            exhibit.artifactColor
          );
          this.refineGeometry(artifactMesh);
          artifactMesh.position.y = 1.48;
          this.animatedMeshes.push(artifactMesh);

          pedestalGroup.add(baseMesh, pillarMesh, artifactMesh);
        }

        // Gắn metadata để hỗ trợ Raycaster chạm (Tap) trực tiếp vào hiện vật trên Mobile/PC
        pedestalGroup.traverse((child) => {
          if (child.isMesh) {
            child.userData.exhibitData = exhibit;
            this.raycastTargets.push(child);
          }
        });

        targetGroup.add(pedestalGroup);

        const floorKey = exhibit.floor === 2 ? 'indoorF2' : 'indoorF1';
        this.colliders[floorKey].pillars.push({ x, z, radius: 1.15 });
      } else if (exhibit.id !== 'outdoor-flagpole') {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const padMesh = new THREE.Mesh(
          new THREE.BoxGeometry(5.8, 0.2, 4.6),
          SceneManager.createFlatMaterial(PALETTE.PLAZA_PATH)
        );
        padMesh.position.y = 0.1;
        padMesh.receiveShadow = true;
        group.add(padMesh);

        const modelMesh = this.createOutdoorMonumentOrVehicle(exhibit.artifactType);
        this.refineGeometry(modelMesh);
        modelMesh.position.y = 0.2;
        // Xoay nhẹ hướng về phía người chơi ở trục trung tâm sân
        modelMesh.rotation.y = x > 0 ? -0.25 : 0.25;
        group.add(modelMesh);

        group.traverse((child) => {
          if (child.isMesh) {
            child.userData.exhibitData = exhibit;
            this.raycastTargets.push(child);
          }
        });

        this.outdoorGroup.add(group);
        this.colliders.outdoor.pillars.push({ x, z, radius: 2.3 });
      }

      // Vòng tròn ánh sáng tương tác [E] dưới chân mỗi hiện vật:
      // - Trong nhà: 1.25 - 1.48 units
      // - Ngoài sân: 3.12 - 3.42 units bao quanh bên ngoài bệ đá 5.8x4.6m và chân Cột cờ để người chơi bước vào bấm [E] dễ dàng
      const ringRadiusInner = isIndoor ? 1.25 : 3.12;
      const ringRadiusOuter = isIndoor ? 1.48 : 3.42;

      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(ringRadiusInner, ringRadiusOuter, 32),
        new THREE.MeshBasicMaterial({
          color: PALETTE.YELLOW_OCHRE,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65
        })
      );
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(x, y + 0.068, z);

      const glowMesh = new THREE.Mesh(
        new THREE.CircleGeometry(ringRadiusInner, 32),
        new THREE.MeshBasicMaterial({
          color: PALETTE.YELLOW_OCHRE,
          transparent: true,
          opacity: 0.14
        })
      );
      glowMesh.rotation.x = -Math.PI / 2;
      glowMesh.position.set(x, y + 0.062, z);

      targetGroup.add(ringMesh, glowMesh);
      this.interactionRings.push({
        id: exhibit.id,
        ringMesh,
        glowMesh
      });
    });
  }

  /**
   * Tạo các mô hình ngoài sân:
   * - Cụm Cờ Đảng (Búa Liềm) & Cờ Tổ quốc (Ngôi sao 5 cánh chuẩn)
   * - Đài Phù Điêu Khối Đại Đoàn Kết Toàn Dân (3 tượng nhân vật tách biệt rõ nét + phù điêu sao vàng)
   * - Xe tăng T-54B (có cờ sao vàng 5 cánh)
   * - Máy bay vận tải lịch sử
   */
  createOutdoorMonumentOrVehicle(type) {
    const group = new THREE.Group();
    const partyRedMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
    const vermilionMat = SceneManager.createFlatMaterial(PALETTE.RED_VERMILION);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);
    const stoneMat = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER);
    const armyMat = SceneManager.createFlatMaterial(PALETTE.ARMY_GREEN);
    const darkTrackMat = SceneManager.createFlatMaterial(PALETTE.TANK_DARK);
    const silverMat = SceneManager.createFlatMaterial(PALETTE.AIRCRAFT_SILVER);
    const blueMat = SceneManager.createFlatMaterial(PALETTE.AIRCRAFT_BLUE);
    const strawMat = SceneManager.createFlatMaterial(PALETTE.CONICAL_STRAW);
    const rubberMat = SceneManager.createFlatMaterial(0x1c1e1c, { roughness: 0.85 });
    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const whiteMat = SceneManager.createFlatMaterial(0xf4f1e6);

    switch (type) {
      case 'party_flags_monument': {
        // Cụm Kỳ đài Cờ Đảng (Búa Liềm) & Cờ Tổ Quốc (Ngôi sao 5 cánh chuẩn)
        const pedestal = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 2.4), vermilionMat);
        pedestal.position.y = 0.4;
        pedestal.castShadow = true;

        [-1.05, 1.05].forEach((px, idx) => {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.4, 8), stoneMat);
          pole.position.set(px, 2.6, 0);
          pole.castShadow = true;

          const flag = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.94, 0.08), partyRedMat);
          flag.position.set(px + 0.72, 4.15, 0);
          flag.castShadow = true;

          if (idx === 0) {
            // Bên trái: Biểu tượng Búa Liềm vàng
            const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.13), goldMat);
            hammer.rotation.z = Math.PI / 4;
            hammer.position.set(px + 0.72, 4.15, 0);
            const sickle = new THREE.Mesh(
              new THREE.TorusGeometry(0.19, 0.048, 6, 12, Math.PI * 1.35),
              goldMat
            );
            sickle.position.set(px + 0.72, 4.15, 0);
            group.add(hammer, sickle);
          } else {
            // Bên phải: Ngôi sao vàng 5 cánh chuẩn trên lá Cờ Tổ Quốc
            const star = SceneManager.createStarMesh(0.28, 0.115, 0.12, goldMat);
            star.position.set(px + 0.72, 4.15, 0);
            group.add(star);
          }

          group.add(pole, flag);
        });

        group.add(pedestal);
        break;
      }

      case 'relief_monument': {
        // ĐÀI PHÙ ĐIÊU KHỐI ĐẠI ĐOÀN KẾT TOÀN DÂN (Đã tách rõ các khối, đường gờ vát đá sắc nét)
        // 1. Bệ đá tam cấp rộng rãi có phào chỉ hoa cương bo viền
        const baseStep1 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 3.0), stoneMat);
        baseStep1.position.y = 0.175;
        const baseTrim1 = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.05, 3.1), darkTrackMat);
        baseTrim1.position.y = 0.33;

        const baseStep2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 2.4), stoneMat);
        baseStep2.position.y = 0.525;
        const baseTrim2 = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.05, 2.5), darkTrackMat);
        baseTrim2.position.y = 0.68;
        group.add(baseStep1, baseTrim1, baseStep2, baseTrim2);

        // 2. Bức phù điêu nền phía sau (z = -0.65) gồm 3 cánh cờ đỏ vươn cao + Ngôi sao 5 cánh trên đỉnh
        const centerBanner = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 0.32), partyRedMat);
        centerBanner.position.set(0, 2.4, -0.65);
        centerBanner.castShadow = true;

        const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.8, 0.28), vermilionMat);
        leftWing.position.set(-1.55, 2.0, -0.72);
        leftWing.rotation.z = 0.1;

        const rightWing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.8, 0.28), vermilionMat);
        rightWing.position.set(1.55, 2.0, -0.72);
        rightWing.rotation.z = -0.1;

        // Ngôi sao vàng 5 cánh lớn tỏa sáng trên đỉnh bức phù điêu
        const topStar = SceneManager.createStarMesh(0.45, 0.18, 0.14, goldMat);
        topStar.position.set(0, 3.65, -0.45);

        group.add(centerBanner, leftWing, rightWing, topStar);

        // 3. Ba bức tượng đại diện Công - Nông - Binh đứng TÁCH BIỆT RÕ RÀNG phía trước (z = +0.42)
        // Tượng 1 (Bên Trái, x = -1.35): Công nhân
        const workerGroup = new THREE.Group();
        workerGroup.position.set(-1.35, 0.7, 0.42);
        const workerPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.3, 0.75), stoneMat);
        const workerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.55, 4, 8), goldMat);
        workerBody.position.y = 0.65;
        const workerHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), goldMat);
        workerHead.position.y = 1.25;
        const workerHelmet = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.12, 8), blueMat);
        workerHelmet.position.y = 1.38;
        workerGroup.add(workerPlinth, workerBody, workerHead, workerHelmet);

        // Tượng 2 (Chính Giữa, x = 0, cao nổi bật): Chiến sĩ Cách mạng giương cao Cờ Tổ Quốc
        const soldierGroup = new THREE.Group();
        soldierGroup.position.set(0, 0.7, 0.52);
        const soldierPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.85), stoneMat);
        soldierPlinth.position.y = 0.1;
        const soldierBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.65, 4, 8), goldMat);
        soldierBody.position.y = 0.88;
        const soldierHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), goldMat);
        soldierHead.position.y = 1.54;
        const pithHelmet = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.14, 8), armyMat);
        pithHelmet.position.y = 1.68;
        soldierGroup.add(soldierPlinth, soldierBody, soldierHead, pithHelmet);

        // Tượng 3 (Bên Phải, x = +1.35): Nông dân / Trí thức đội Nón lá
        const farmerGroup = new THREE.Group();
        farmerGroup.position.set(1.35, 0.7, 0.42);
        const farmerPlinth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.3, 0.75), stoneMat);
        const farmerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.55, 4, 8), goldMat);
        farmerBody.position.y = 0.65;
        const farmerHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), goldMat);
        farmerHead.position.y = 1.25;
        const conicalHat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.22, 9), strawMat);
        conicalHat.position.y = 1.42;
        farmerGroup.add(farmerPlinth, farmerBody, farmerHead, conicalHat);

        group.add(workerGroup, soldierGroup, farmerGroup);
        break;
      }

      case 'tank_t54': {
        // XE TĂNG T-54B BẢO VẬT QUỐC GIA (SỐ HIỆU 843)
        // 1. Hệ thống bánh xích hai bên (Running Gear & Mudguards)
        [-0.98, 0.98].forEach((zTrack) => {
          // Khung dải xích
          const trackBelt = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.44, 0.44), darkTrackMat);
          trackBelt.position.set(0, 0.26, zTrack);
          trackBelt.castShadow = true;
          group.add(trackBelt);

          // 5 bánh chịu lực lớn (Road Wheels) mỗi bên với vành cao su và trục bánh lồi
          const wheelX = [-1.08, -0.54, 0.0, 0.54, 1.08];
          wheelX.forEach((wx) => {
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10), rubberMat);
            tire.rotation.x = Math.PI / 2;
            tire.position.set(wx, 0.24, zTrack);
            tire.castShadow = true;

            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 8), armyMat);
            hub.rotation.x = Math.PI / 2;
            hub.position.set(wx, 0.24, zTrack);

            const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.15, 6), darkTrackMat);
            nut.rotation.x = Math.PI / 2;
            nut.position.set(wx, 0.24, zTrack);

            group.add(tire, hub, nut);
          });

          // Bánh dẫn hướng trước (Idler wheel) & Bánh chủ động sau (Drive sprocket)
          const idler = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 8), darkTrackMat);
          idler.rotation.x = Math.PI / 2;
          idler.position.set(1.54, 0.32, zTrack);

          const sprocket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 8), darkTrackMat);
          sprocket.rotation.x = Math.PI / 2;
          sprocket.position.set(-1.54, 0.33, zTrack);
          group.add(idler, sprocket);

          // Chắn bùn bên hông (Fender / Trackguard) chạy dọc thân xe
          const fender = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.04, 0.48), armyMat);
          fender.position.set(0, 0.64, zTrack);
          fender.castShadow = true;

          // Vạt chắn bùn cao su phía trước vát cong xuống
          const frontFlap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.46), rubberMat);
          frontFlap.position.set(1.92, 0.52, zTrack);
          frontFlap.rotation.z = -0.42;

          group.add(fender, frontFlap);
        });

        // Hộp dụng cụ / bình phụ trợ trên chắn bùn bên phải
        const toolBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.24), armyMat);
        toolBox.position.set(0.15, 0.74, 0.98);
        toolBox.castShadow = true;
        group.add(toolBox);

        // 2. Thân xe tăng (Hull) với giáp vát nghiêng (Glacis plate)
        const hullMain = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.54, 1.58), armyMat);
        hullMain.position.y = 0.58;
        hullMain.castShadow = true;

        // Giáp trước vát nghiêng 60 độ đặc trưng T-54
        const upperGlacis = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 1.56), armyMat);
        upperGlacis.position.set(1.64, 0.56, 0);
        upperGlacis.rotation.z = -0.58;
        upperGlacis.castShadow = true;

        // Khe quan sát của lái xe (Driver visor)
        const driverVisor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.28), darkTrackMat);
        driverVisor.position.set(1.36, 0.88, -0.28);

        // Nắp lưới tản nhiệt động cơ khoang sau (Engine Deck Louvers)
        const engineDeck = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 1.2), darkTrackMat);
        engineDeck.position.set(-0.95, 0.86, 0);

        // Khúc gỗ chống lầy đặc trưng phía sau đuôi xe (Unditching Log)
        const unditchingLog = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.48, 6), woodMat);
        unditchingLog.rotation.z = Math.PI / 2;
        unditchingLog.position.set(-1.72, 0.44, 0);
        unditchingLog.castShadow = true;

        // 2 Thùng nhiên liệu phụ hình trụ phía đuôi xe (External Fuel Drums)
        [-0.48, 0.48].forEach((zd) => {
          const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.62, 8), armyMat);
          drum.rotation.x = Math.PI / 2;
          drum.position.set(-1.84, 0.76, zd);
          drum.castShadow = true;

          const drumBand1 = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.015, 4, 8), darkTrackMat);
          drumBand1.rotation.y = Math.PI / 2;
          drumBand1.position.set(-1.84, 0.76, zd - 0.2);

          const drumBand2 = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.015, 4, 8), darkTrackMat);
          drumBand2.rotation.y = Math.PI / 2;
          drumBand2.position.set(-1.84, 0.76, zd + 0.2);

          group.add(drum, drumBand1, drumBand2);
        });

        group.add(hullMain, upperGlacis, driverVisor, engineDeck, unditchingLog);

        // 3. Tháp pháo hình bán cầu dẹt đặc trưng (Cast Dome Turret)
        const turretRing = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.9, 0.12, 12), armyMat);
        turretRing.position.set(0.1, 0.88, 0);

        const turretDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.86, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
          armyMat
        );
        turretDome.scale.set(1.08, 0.72, 0.96);
        turretDome.position.set(0.1, 0.92, 0);
        turretDome.castShadow = true;

        // Cửa vòm chỉ huy (Commander Cupola) và Cửa nạp đạn (Loader Hatch)
        const cmdCupola = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 8), armyMat);
        cmdCupola.position.set(-0.1, 1.48, -0.32);

        const loaderHatch = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 8), armyMat);
        loaderHatch.position.set(-0.1, 1.46, 0.32);

        // Tấm bạt bọc gốc pháo (Gun Mantlet)
        const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.44), armyMat);
        mantlet.position.set(0.92, 1.18, 0);
        mantlet.castShadow = true;

        // Nòng pháo chính 100mm D-10T có loa giảm khói (Bore Evacuator)
        const barrelMain = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.088, 2.65, 8), darkTrackMat);
        barrelMain.rotation.z = -Math.PI / 2 + 0.06;
        barrelMain.position.set(2.2, 1.26, 0);
        barrelMain.castShadow = true;

        const boreEvacuator = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.096, 0.38, 8), darkTrackMat);
        boreEvacuator.rotation.z = -Math.PI / 2 + 0.06;
        boreEvacuator.position.set(3.02, 1.31, 0);
        boreEvacuator.castShadow = true;

        const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.1, 8), darkTrackMat);
        muzzleRing.rotation.z = -Math.PI / 2 + 0.06;
        muzzleRing.position.set(3.54, 1.34, 0);

        // Đèn pha hồng ngoại "Luna" gắn bên cạnh nòng pháo
        const searchlight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 8), darkTrackMat);
        searchlight.rotation.z = Math.PI / 2;
        searchlight.position.set(1.05, 1.34, 0.34);

        const lensMat = new THREE.MeshBasicMaterial({ color: 0xc8e6ff });
        const searchlightLens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 8), lensMat);
        searchlightLens.rotation.y = Math.PI / 2;
        searchlightLens.position.set(1.14, 1.34, 0.34);

        // Biển số hiệu "843" nền đỏ sao vàng hai bên tháp pháo
        [-0.88, 0.88].forEach((zSign) => {
          const signPlate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.03), partyRedMat);
          signPlate.position.set(0.08, 1.28, zSign);
          const signStar = SceneManager.createStarMesh(0.07, 0.028, 0.04, goldMat);
          signStar.position.set(0.08, 1.28, zSign + (zSign > 0 ? 0.02 : -0.02));
          group.add(signPlate, signStar);
        });

        // Cột ăng-ten & Lá cờ đỏ sao vàng Tổ Quốc tung bay trên tháp pháo
        const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 5), stoneMat);
        flagPole.position.set(-0.35, 1.95, -0.28);
        const miniFlag = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.04), partyRedMat);
        miniFlag.position.set(-0.68, 2.25, -0.28);
        const miniStar = SceneManager.createStarMesh(0.12, 0.048, 0.06, goldMat);
        miniStar.position.set(-0.68, 2.25, -0.28);

        group.add(
          turretRing,
          turretDome,
          cmdCupola,
          loaderHatch,
          mantlet,
          barrelMain,
          boreEvacuator,
          muzzleRing,
          searchlight,
          searchlightLens,
          flagPole,
          miniFlag,
          miniStar
        );
        break;
      }

      case 'howitzer_105': {
        // PHÁO LỰU 105MM "VOI GẦM" CHIẾN DỊCH ĐIỆN BIÊN PHỦ (1954)
        [-0.95, 0.95].forEach((zWheel) => {
          const tire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.62, 0.62, 0.28, 12),
            darkTrackMat
          );
          tire.rotation.x = Math.PI / 2;
          tire.position.set(0.25, 0.62, zWheel);
          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.32, 0.32, 8),
            armyMat
          );
          hub.rotation.x = Math.PI / 2;
          hub.position.set(0.25, 0.62, zWheel);
          group.add(tire, hub);
        });

        // Trục pháo & Bệ khóa nòng
        const axle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 1.85), armyMat);
        axle.position.set(0.25, 0.62, 0);
        const breech = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.45, 0.56), armyMat);
        breech.position.set(0.15, 1.02, 0);
        breech.rotation.z = 0.24;

        // Lá chắn thép vát nghiêng có ngôi sao vàng
        const shield = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.32, 1.72), armyMat);
        shield.position.set(0.55, 1.15, 0);
        shield.rotation.z = 0.26;
        const shieldStar = SceneManager.createStarMesh(0.18, 0.072, 0.08, goldMat);
        shieldStar.position.set(0.64, 1.32, 0);
        shieldStar.rotation.y = Math.PI / 2;

        // Nòng pháo 105mm vươn cao + ống lùi giảm giật
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.14, 2.85, 8),
          darkTrackMat
        );
        barrel.rotation.z = -Math.PI / 2 + 0.28;
        barrel.position.set(1.45, 1.42, 0);

        const recoilTube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.09, 1.65, 8),
          armyMat
        );
        recoilTube.rotation.z = -Math.PI / 2 + 0.28;
        recoilTube.position.set(1.05, 1.56, 0);

        // 2 Càng pháo mở chữ V phía sau
        [-0.55, 0.55].forEach((zTrail) => {
          const trail = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 0.22), armyMat);
          trail.position.set(-0.85, 0.36, zTrail * 0.75);
          trail.rotation.z = 0.14;
          trail.rotation.y = zTrail > 0 ? -0.22 : 0.22;
          group.add(trail);
        });

        group.add(axle, breech, shield, shieldStar, barrel, recoilTube);
        break;
      }

      case 'sam2_missile': {
        // BỆ PHÓNG TÊN LỬA PHÒNG KHÔNG SAM-2 "RỒNG LỬA THĂNG LONG" (12/1972)
        const baseRing = new THREE.Mesh(
          new THREE.CylinderGeometry(1.55, 1.75, 0.36, 10),
          darkTrackMat
        );
        baseRing.position.y = 0.18;

        const turretMount = new THREE.Mesh(
          new THREE.CylinderGeometry(0.75, 0.98, 0.65, 8),
          armyMat
        );
        turretMount.position.y = 0.65;

        // Cụm thanh dẫn hướng & Quả đạn tên lửa SAM-2 nghiêng 42 độ hướng lên bầu trời
        const launcherPivot = new THREE.Group();
        launcherPivot.position.set(0, 1.05, 0);
        launcherPivot.rotation.z = 0.68;

        const railBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 0.52), armyMat);
        railBeam.position.set(0.2, 0, 0);

        // Thân tên lửa SAM-2 trắng-bạc 2 tầng
        const missileBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.26, 3.85, 10),
          silverMat
        );
        missileBody.rotation.z = -Math.PI / 2;
        missileBody.position.set(0.45, 0.38, 0);

        const noseCone = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.92, 10),
          partyRedMat
        );
        noseCone.rotation.z = -Math.PI / 2;
        noseCone.position.set(2.82, 0.38, 0);

        // Cánh đuôi ổn định tên lửa
        const finH = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 1.25), armyMat);
        finH.position.set(-1.1, 0.38, 0);
        const finV = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.25, 0.06), armyMat);
        finV.position.set(-1.1, 0.38, 0);

        const starBadge = SceneManager.createStarMesh(0.14, 0.056, 0.08, goldMat);
        starBadge.position.set(0.85, 0.38, 0.24);

        launcherPivot.add(railBeam, missileBody, noseCone, finH, finV, starBadge);
        group.add(baseRing, turretMount, launcherPivot);
        break;
      }

      default: {
        // Máy bay vận tải lịch sử có huy hiệu cờ đỏ sao vàng 5 cánh trên đuôi
        const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 4.8, 10), silverMat);
        fuselage.rotation.z = Math.PI / 2;
        fuselage.position.y = 1.05;
        fuselage.castShadow = true;

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 10), silverMat);
        nose.rotation.z = -Math.PI / 2;
        nose.position.set(2.9, 1.05, 0);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 1.14), blueMat);
        stripe.position.set(0, 1.05, 0);

        const mainWing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 6.2), silverMat);
        mainWing.position.set(0.3, 1.42, 0);
        mainWing.castShadow = true;

        const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.45, 0.14), silverMat);
        tailFin.position.set(-2.0, 1.85, 0);
        tailFin.rotation.z = 0.22;

        const flagBadge = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.16), partyRedMat);
        flagBadge.position.set(-2.0, 2.1, 0);
        const tailStar = SceneManager.createStarMesh(0.09, 0.038, 0.18, goldMat);
        tailStar.position.set(-2.0, 2.1, 0);

        group.add(fuselage, nose, stripe, mainWing, tailFin, flagBadge, tailStar);
        break;
      }
    }

    return group;
  }

  /**
   * Tạo các mô hình hiện vật lịch sử Đảng trong nhà (Gian 1 -> Gian 6)
   * Tất cả ngôi sao đều dùng `SceneManager.createStarMesh` 5 cánh chuẩn.
   */
  createIndoorHistoryArtifact(type, colorHex) {
    const holder = new THREE.Group();
    const primaryMat = SceneManager.createFlatMaterial(colorHex);
    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);
    const redMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
    const paperMat = SceneManager.createFlatMaterial(PALETTE.FLOOR_MEZZANINE);

    switch (type) {
      case 'suitcase_books': {
        const suitcase = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.54), woodMat);
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.34), redMat);
        book.position.set(0.08, 0.17, 0);
        book.rotation.y = 0.35;
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.28), paperMat);
        paper.position.set(-0.12, 0.14, 0.08);
        holder.add(suitcase, book, paper);
        break;
      }
      case 'round_table': {
        const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 10), woodMat);
        tableTop.position.y = 0.18;
        const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 0.36, 8), woodMat);
        const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 7), goldMat);
        lamp.position.y = 0.38;
        holder.add(tableTop, tableLeg, lamp);
        break;
      }
      case 'bamboo_hut': {
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.55, 4), primaryMat);
        roof.position.y = 0.42;
        roof.rotation.y = Math.PI / 4;
        [-0.35, 0.35].forEach((px) => {
          [-0.35, 0.35].forEach((pz) => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 5), woodMat);
            post.position.set(px, 0.08, pz);
            holder.add(post);
          });
        });
        holder.add(roof);
        break;
      }
      case 'badinh_mic': {
        const podium = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.42), redMat);
        const frontStar = SceneManager.createStarMesh(0.14, 0.058, 0.04, goldMat);
        frontStar.position.set(0, 0.02, 0.22);
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 6), goldMat);
        stand.position.y = 0.38;
        const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 8), goldMat);
        mic.rotation.x = Math.PI / 2;
        mic.position.y = 0.65;
        holder.add(podium, frontStar, stand, mic);
        break;
      }
      case 'pack_bicycle': {
        // Xe đạp thồ Điện Biên: khung thép, 2 bánh căm, đòn dắt gỗ, giá hàng chất bao gạo + hòm đạn + cờ đỏ
        const bike = new THREE.Group();
        const tireMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK);
        const chromeMat = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER, {
          roughness: 0.35,
          metalness: 0.6
        });
        const frameMat = SceneManager.createFlatMaterial(PALETTE.ARMY_GREEN);
        const sackMat = SceneManager.createFlatMaterial(0xcfae72);
        const sackDarkMat = SceneManager.createFlatMaterial(0xb08d52);
        const strapMat = SceneManager.createFlatMaterial(0x4a3320);

        const tube = (p1, p2, radius, mat) => {
          const a = new THREE.Vector3(...p1);
          const b = new THREE.Vector3(...p2);
          const dir = b.clone().sub(a);
          const len = dir.length();
          const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat);
          mesh.position.copy(a).add(b).multiplyScalar(0.5);
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
          mesh.castShadow = true;
          return mesh;
        };

        // 2 bánh xe có lốp, vành, 8 căm & moay-ơ
        [-0.55, 0.55].forEach((wx) => {
          const tire = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 20), tireMat);
          tire.position.set(wx, 0, 0);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.011, 5, 20), chromeMat);
          rim.position.set(wx, 0, 0);
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 8), chromeMat);
          hub.rotation.x = Math.PI / 2;
          hub.position.set(wx, 0, 0);
          bike.add(tire, rim, hub);
          for (let k = 0; k < 4; k++) {
            const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.005, 0.005), chromeMat);
            spoke.position.set(wx, 0, 0);
            spoke.rotation.z = (k * Math.PI) / 4;
            bike.add(spoke);
          }
        });

        // Khung xe thép: ống ngang, ống đứng, ống xiên, càng sau & phuộc trước
        const RH = [-0.55, 0, 0];
        const FH = [0.55, 0, 0];
        const BB = [-0.04, -0.06, 0];
        const ST = [-0.2, 0.4, 0];
        const HT = [0.4, 0.43, 0];
        const HB = [0.44, 0.3, 0];
        [
          [RH, BB],
          [RH, ST],
          [BB, ST],
          [BB, HB],
          [ST, HT],
          [HB, HT]
        ].forEach(([p1, p2]) => bike.add(tube(p1, p2, 0.018, frameMat)));
        bike.add(tube(HB, FH, 0.014, chromeMat));

        // Líp đùi & bàn đạp
        const crank = tube([-0.04, -0.06, -0.05], [-0.04, -0.06, 0.05], 0.012, chromeMat);
        const pedalA = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.04), tireMat);
        pedalA.position.set(0.02, -0.11, 0.07);
        const pedalB = pedalA.clone();
        pedalB.position.set(-0.1, -0.01, -0.07);
        bike.add(crank, pedalA, pedalB);

        // Yên xe, cổ lái, ghi-đông & tay cầm
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.09), tireMat);
        saddle.position.set(-0.21, 0.455, 0);
        bike.add(saddle, tube([-0.2, 0.4, 0], [-0.21, 0.44, 0], 0.012, chromeMat));
        bike.add(tube([0.4, 0.43, 0], [0.37, 0.56, 0], 0.014, chromeMat));
        bike.add(tube([0.37, 0.56, -0.22], [0.37, 0.56, 0.22], 0.012, chromeMat));
        [-0.23, 0.23].forEach((gz) => {
          const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 6), tireMat);
          grip.rotation.x = Math.PI / 2;
          grip.position.set(0.37, 0.56, gz);
          bike.add(grip);
        });

        // Đòn dắt xe bằng tre/gỗ (đặc trưng xe đạp thồ) chạy chéo ra sau
        bike.add(tube([0.37, 0.56, 0.1], [-0.92, 0.66, 0.34], 0.017, woodMat));

        // Giá hàng sau + 2 bao gạo hai bên + bao gạo xếp trên + hòm đạn
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.025, 0.3), chromeMat);
        rack.position.set(-0.52, 0.37, 0);
        bike.add(rack);
        [-0.5, -0.56].forEach((bx, i) => {
          bike.add(tube([bx, 0.34, 0.12], [bx - 0.12 * (i ? 1 : 0.4), 0.02, 0.05], 0.008, chromeMat));
        });
        [-0.15, 0.15].forEach((sz) => {
          const sack = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.38, 3, 8), sackMat);
          sack.rotation.z = Math.PI / 2;
          sack.position.set(-0.52, 0.52, sz);
          sack.castShadow = true;
          bike.add(sack);
        });
        const topSack = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 3, 8), sackDarkMat);
        topSack.rotation.z = Math.PI / 2;
        topSack.position.set(-0.5, 0.72, 0);
        topSack.castShadow = true;
        bike.add(topSack);
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.24), woodMat);
        crate.position.set(-0.28, 0.58, 0);
        const crateStar = SceneManager.createStarMesh(0.05, 0.02, 0.02, goldMat);
        crateStar.position.set(-0.28, 0.58, 0.125);
        bike.add(crate, crateStar);
        // Dây chằng hàng
        [-0.62, -0.42].forEach((sx) => {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.5, 0.46), strapMat);
          strap.position.set(sx, 0.55, 0);
          bike.add(strap);
        });

        // Cờ đỏ sao vàng cắm sau giá hàng
        bike.add(tube([-0.9, 0.4, -0.12], [-0.9, 1.0, -0.12], 0.009, goldMat));
        const bikeFlag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.012), redMat);
        bikeFlag.position.set(-0.76, 0.9, -0.12);
        const bikeFlagStar = SceneManager.createStarMesh(0.06, 0.024, 0.016, goldMat);
        bikeFlagStar.position.set(-0.76, 0.9, -0.112);
        bike.add(bikeFlag, bikeFlagStar);

        const bikeScale = 0.86;
        bike.scale.setScalar(bikeScale);
        bike.position.y = -0.3 + 0.3 * bikeScale;
        holder.add(bike);
        break;
      }
      case 'hill_a1_diorama': {
        const hill = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.42, 8), woodMat);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), goldMat);
        pole.position.y = 0.42;
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.04), redMat);
        flag.position.set(0.23, 0.62, 0);
        const flagStar = SceneManager.createStarMesh(0.09, 0.038, 0.06, goldMat);
        flagStar.position.set(0.23, 0.62, 0);
        holder.add(hill, pole, flag, flagStar);
        break;
      }
      case 'truongson_milestone': {
        const stone = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.78, 0.32), paperMat);
        stone.position.y = 0.18;
        const topRoof = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.25, 4), redMat);
        topRoof.position.y = 0.68;
        topRoof.rotation.y = Math.PI / 4;
        holder.add(stone, topRoof);
        break;
      }
      case 'radio_victory': {
        const radio = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.32), woodMat);
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 10), goldMat);
        dial.rotation.x = Math.PI / 2;
        dial.position.set(0.15, 0, 0);
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 5), goldMat);
        antenna.position.set(-0.25, 0.45, 0);
        antenna.rotation.z = -0.25;
        holder.add(radio, dial, antenna);
        break;
      }
      case 'doimoi_documents': {
        const docBase = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.52), paperMat);
        const redBook = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.12), redMat);
        redBook.position.y = 0.32;
        const star = SceneManager.createStarMesh(0.14, 0.058, 0.05, goldMat);
        star.position.set(0, 0.34, 0.07);
        holder.add(docBase, redBook, star);
        break;
      }
      case 'integration_globe': {
        const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.44, 1), primaryMat);
        globe.position.y = 0.25;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.04, 6, 16), goldMat);
        ring.position.y = 0.25;
        ring.rotation.x = Math.PI / 3;
        holder.add(globe, ring);
        break;
      }
      case 'printing_press': {
        // Bàn đá in truyền đơn bí mật & Cờ Mặt trận Việt Minh (1941-1945)
        const tableBase = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 0.58), woodMat);
        const lithoStone = new THREE.Mesh(
          new THREE.BoxGeometry(0.52, 0.09, 0.38),
          SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER)
        );
        lithoStone.position.set(-0.08, 0.11, 0);

        const roller = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.34, 8),
          SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK)
        );
        roller.rotation.x = Math.PI / 2;
        roller.position.set(-0.04, 0.21, 0);

        const flyers = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.32), paperMat);
        flyers.position.set(0.25, 0.11, 0.05);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 6), goldMat);
        pole.position.set(0.25, 0.38, -0.14);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.04), redMat);
        flag.position.set(0.04, 0.56, -0.14);
        const star = SceneManager.createStarMesh(0.085, 0.035, 0.06, goldMat);
        star.position.set(0.04, 0.56, -0.14);

        holder.add(tableBase, lithoStone, roller, flyers, pole, flag, star);
        break;
      }
      case 'bronze_drum_goldweek': {
        // Trống đồng khởi nghĩa & Hũ gạo cứu đói Tuần Lễ Vàng (1945)
        const drumTop = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.22, 12), goldMat);
        drumTop.position.set(-0.16, 0.28, 0);
        const drumBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.24, 12), goldMat);
        drumBase.position.set(-0.16, 0.06, 0);
        const drumStar = SceneManager.createStarMesh(0.14, 0.055, 0.04, redMat);
        drumStar.rotation.x = -Math.PI / 2;
        drumStar.position.set(-0.16, 0.4, 0);

        // Hũ sành cứu đói buộc vải đỏ
        const jarBody = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 9, 7),
          SceneManager.createFlatMaterial(PALETTE.FLAGSTONE_RED)
        );
        jarBody.position.set(0.28, 0.16, 0.06);
        const jarLid = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.1, 8), redMat);
        jarLid.position.set(0.28, 0.38, 0.06);

        holder.add(drumTop, drumBase, drumStar, jarBody, jarLid);
        break;
      }
      case 'truck_zil157': {
        // Xe vận tải quân sự ZIL-157 Đoàn 559 Trường Sơn
        const armyMat = SceneManager.createFlatMaterial(PALETTE.ARMY_GREEN);
        const darkMat = SceneManager.createFlatMaterial(PALETTE.TANK_DARK);
        const canvasCoverMat = SceneManager.createFlatMaterial(0x61734d);

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.12, 0.44), darkMat);
        chassis.position.y = 0.08;

        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.42), armyMat);
        cab.position.set(0.28, 0.26, 0);

        const cargoCover = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.38, 0.44), canvasCoverMat);
        cargoCover.position.set(-0.18, 0.3, 0);

        [-0.32, 0.0, 0.32].forEach((wx) => {
          [-0.22, 0.22].forEach((wz) => {
            const wheel = new THREE.Mesh(
              new THREE.CylinderGeometry(0.11, 0.11, 0.07, 8),
              darkMat
            );
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(wx, 0.02, wz);
            holder.add(wheel);
          });
        });

        const star = SceneManager.createStarMesh(0.075, 0.03, 0.04, goldMat);
        star.position.set(0.28, 0.26, 0.22);

        holder.add(chassis, cab, cargoCover, star);
        break;
      }
      case 'truongsa_satellite': {
        // Cột mốc chủ quyền Trường Sa & Vệ tinh viễn thông VINASAT
        const obelisk = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.68, 0.26),
          SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER)
        );
        obelisk.position.set(-0.18, 0.22, 0);
        const obeliskTop = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 4), redMat);
        obeliskTop.position.set(-0.18, 0.66, 0);
        obeliskTop.rotation.y = Math.PI / 4;
        const obeliskStar = SceneManager.createStarMesh(0.085, 0.035, 0.04, goldMat);
        obeliskStar.position.set(-0.18, 0.35, 0.14);

        // Vệ tinh VINASAT bay trên quỹ đạo bên phải
        const satCore = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), goldMat);
        satCore.position.set(0.22, 0.52, 0);
        const solarWings = new THREE.Mesh(
          new THREE.BoxGeometry(0.76, 0.14, 0.03),
          SceneManager.createFlatMaterial(PALETTE.AIRCRAFT_BLUE)
        );
        solarWings.position.set(0.22, 0.52, 0);
        solarWings.rotation.z = 0.25;

        holder.add(obelisk, obeliskTop, obeliskStar, satCore, solarWings);
        break;
      }
      case 'memorial_statue':
      default: {
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.58), redMat);
        const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.45, 8), goldMat);
        shoulders.position.y = 0.42;
        const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), goldMat);
        head.position.y = 0.82;
        holder.add(plinth, shoulders, head);
        break;
      }
    }

    holder.traverse((c) => {
      if (c.isMesh) c.castShadow = true;
    });
    return holder;
  }

  /**
   * TÍNH NĂNG 3: Tạo Mô hình 3D chuẩn tỉ lệ đặt trên bàn xoay nhung đỏ để người xem Xoay Ngắm 360° trong Modal
   */
  createInspectable3DModel(artifactType, colorHex = PALETTE.STAR_GOLD) {
    const root = new THREE.Group();

    // Bàn xoay nhung đỏ viền vàng đồng sang trọng
    const turntableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.28, 0.14, 24),
      SceneManager.createFlatMaterial(PALETTE.WOOD_OAK)
    );
    turntableBase.position.y = -0.68;

    const velvetTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.06, 1.08, 0.06, 24),
      SceneManager.createFlatMaterial(PALETTE.RED_VERMILION)
    );
    velvetTop.position.y = -0.58;

    const goldRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.035, 8, 28),
      SceneManager.createFlatMaterial(PALETTE.STAR_GOLD)
    );
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = -0.58;

    root.add(turntableBase, velvetTop, goldRing);

    const outdoorTypes = new Set([
      'party_flags_monument',
      'relief_monument',
      'tank_t54',
      'aircraft_an26',
      'howitzer_105',
      'sam2_missile'
    ]);

    let modelGroup;
    if (artifactType === 'hanoi_flagpole') {
      modelGroup = new THREE.Group();
      const brickMat = SceneManager.createFlatMaterial(PALETTE.FLAGSTONE_RED);
      const stoneMat = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER);
      const redMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
      const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);

      const t1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 1.4), brickMat);
      t1.position.y = 0.14;
      const t2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.28, 1.05), stoneMat);
      t2.position.y = 0.42;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.1, 8), stoneMat);
      shaft.position.y = 1.1;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.75, 8), goldMat);
      mast.position.y = 1.95;
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.04), redMat);
      flag.position.set(0.31, 2.15, 0);
      const star = SceneManager.createStarMesh(0.12, 0.048, 0.06, goldMat);
      star.position.set(0.31, 2.15, 0);
      modelGroup.add(t1, t2, shaft, mast, flag, star);
      modelGroup.scale.setScalar(0.68);
      modelGroup.position.y = -0.55;
    } else if (outdoorTypes.has(artifactType)) {
      modelGroup = this.createOutdoorMonumentOrVehicle(artifactType);
      modelGroup.scale.setScalar(0.42);
      modelGroup.position.y = -0.55;
    } else {
      modelGroup = this.createIndoorHistoryArtifact(artifactType, colorHex);
      modelGroup.scale.setScalar(1.35);
      modelGroup.position.y = -0.38;
    }

    root.add(modelGroup);
    return root;
  }

  /**
   * Bổ sung các chậu cây cảnh & trụ đèn trang trí ở các góc thoáng (hoàn toàn ngoài thảm đỏ & cách xa lối đi)
   */
  buildDecorativePlantsAndPillars() {
    const potMat = SceneManager.createFlatMaterial(PALETTE.RED_VERMILION);
    const rimMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);
    const trunkMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const leafMat = SceneManager.createFlatMaterial(PALETTE.GRASS_GREEN);

    const createOrnamentalPlant = (x, y, z, targetGroup) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(x, y, z);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.48, 8), potMat);
      pot.position.y = 0.24;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 8), rimMat);
      rim.position.y = 0.48;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.65, 6), trunkMat);
      stem.position.y = 0.72;
      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), leafMat);
      crown1.position.set(0, 1.22, 0);
      const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), leafMat);
      crown2.position.set(0.24, 1.48, 0.12);

      plantGroup.add(pot, rim, stem, crown1, crown2);
      plantGroup.traverse((c) => {
        if (c.isMesh) c.castShadow = true;
      });
      targetGroup.add(plantGroup);
    };

    // Các góc sảnh Tầng 1 (hoàn toàn trên nền đá, cách xa thảm đỏ & hiện vật > 6.5 units)
    [
      [-29.2, 0, -3.2],
      [29.2, 0, -3.2],
      [-29.2, 0, -34.2],
      [29.2, 0, -34.2],
      [-15.6, 0, -3.2],
      [15.6, 0, -3.2]
    ].forEach(([px, py, pz]) => createOrnamentalPlant(px, py, pz, this.indoorFloor1Group));

    // Các góc sảnh Tầng 2 (hoàn toàn trên nền gỗ/đá, cách xa thảm đỏ & hiện vật > 6.5 units)
    [
      [-29.2, 5.5, -5.2],
      [29.2, 5.5, -5.2],
      [-29.2, 5.5, -34.2],
      [29.2, 5.5, -34.2]
    ].forEach(([px, py, pz]) => createOrnamentalPlant(px, py, pz, this.indoorFloor2Group));
  }

  /**
   * 2b. Nâng cấp chi tiết Kiến trúc Không gian Tưởng niệm (Gian 6 - Tầng 2):
   * - Tường ốp phù điêu trang trọng với các cột đá hoa cương & phù điêu hoa sen vàng
   * - Các Khung tranh chân dung các đồng chí Tổng Bí thư có viền nẹp gỗ & nẹp đồng kim loại nổi khối rõ ràng
   * - Hai hàng chậu cây cảnh low-poly & bình hoa sen đá đối xứng hai bên lễ đài
   */
  buildMemorialSpaceArchitecture() {
    const floorY = 5.5;
    const memorialDecorGroup = new THREE.Group();
    memorialDecorGroup.position.set(0, floorY, 0);

    const graniteMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK, {
      roughness: 0.45,
      metalness: 0.2
    });
    const stoneMat = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER);
    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const brassMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, {
      roughness: 0.35,
      metalness: 0.45
    });
    const redMat = SceneManager.createFlatMaterial(PALETTE.RED_VERMILION);
    const lotusPinkMat = SceneManager.createFlatMaterial(0xd96b75);
    const foliageMat = SceneManager.createFlatMaterial(PALETTE.GRASS_GREEN);

    // 1. Bậc thềm đá hoa cương nhiều tầng chạy dọc chân tường tưởng niệm Bắc (Z = -35.5, rộng 18.6m khớp hoàn toàn với Phông Đỏ)
    const daisStep1 = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.22, 3.2), graniteMat);
    daisStep1.position.set(0, 0.11, -35.2);
    const daisStep2 = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.22, 2.4), stoneMat);
    daisStep2.position.set(0, 0.33, -35.6);
    const daisGoldEdge = new THREE.Mesh(new THREE.BoxGeometry(17.7, 0.06, 2.46), brassMat);
    daisGoldEdge.position.set(0, 0.45, -35.6);
    memorialDecorGroup.add(daisStep1, daisStep2, daisGoldEdge);

    // 2. Các trụ phù điêu ốp tường trang trọng đối xứng hai bên phông trung tâm (X = ±9.1 và ±3.5, nằm phía trước phông đỏ ở Z = -36.92)
    [-9.1, -3.5, 3.5, 9.1].forEach((px) => {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.52, 3.72, 0.28), graniteMat);
      pilaster.position.set(px, 2.28, -36.92);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.38), brassMat);
      cap.position.set(px, 4.12, -36.92);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 0.38), brassMat);
      base.position.set(px, 0.56, -36.92);
      memorialDecorGroup.add(pilaster, cap, base);
    });

    // 3. Khung tranh chân dung các Tổng Bí thư có viền nẹp gỗ & góc nẹp kim loại đồng nổi khối rõ ràng (khoảng cách thoáng > 4.5 units, không chồng lấn)
    const portraitXPositions = [-6.3, 6.3];
    portraitXPositions.forEach((px, idx) => {
      const frameGroup = new THREE.Group();
      frameGroup.position.set(px, 2.28, -36.82);

      // Tấm nền gỗ sẫm dày nổi khối
      const outerWood = new THREE.Mesh(new THREE.BoxGeometry(1.52, 1.96, 0.14), woodMat);

      // 4 thanh nẹp viền gỗ/kim loại 3D nổi hẳn ra phía trước mặt tranh
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.12, 0.22), woodMat);
      topBar.position.set(0, 0.94, 0.04);
      const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.12, 0.22), woodMat);
      bottomBar.position.set(0, -0.94, 0.04);
      const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.96, 0.22), woodMat);
      leftBar.position.set(-0.73, 0, 0.04);
      const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.96, 0.22), woodMat);
      rightBar.position.set(0.73, 0, 0.04);

      // Viền chỉ kim loại đồng vàng (Brass Inner Trim)
      const innerBrass = new THREE.Mesh(new THREE.BoxGeometry(1.26, 1.68, 0.17), brassMat);

      // Nền chân dung trang trọng
      const portraitBg = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 1.52, 0.19),
        idx % 2 === 0 ? redMat : SceneManager.createFlatMaterial(0x8b261d)
      );

      // Phù điêu bán thân (Bust silhouette) mạ vàng nổi trên nền tranh
      const bustShoulders = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.36, 0.38, 8),
        brassMat
      );
      bustShoulders.position.set(0, -0.28, 0.1);
      bustShoulders.scale.z = 0.35;

      const bustHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), brassMat);
      bustHead.position.set(0, 0.12, 0.1);
      bustHead.scale.z = 0.45;

      // Bảng tên đồng phía dưới khung chân dung
      const namePlaque = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.24), brassMat);
      namePlaque.position.set(0, -0.72, 0.05);

      frameGroup.add(
        outerWood,
        topBar,
        bottomBar,
        leftBar,
        rightBar,
        innerBrass,
        portraitBg,
        bustShoulders,
        bustHead,
        namePlaque
      );
      memorialDecorGroup.add(frameGroup);
    });

    // 4. Hai cặp Chậu cây cảnh bonsai low-poly & Bình hoa sen đá đặt đối xứng rộng rãi hai bên Gian Tưởng niệm (hoàn toàn ngoài thảm đỏ)
    [
      { x: -5.2, z: -33.5, kind: 'lotus' },
      { x: 5.2, z: -33.5, kind: 'lotus' },
      { x: -5.4, z: -21.4, kind: 'bonsai' },
      { x: 5.4, z: -21.4, kind: 'bonsai' }
    ].forEach(({ x, z, kind }) => {
      const planter = new THREE.Group();
      planter.position.set(x, 0, z);

      // Đế đôn đá bát giác
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.54, 0.48, 8),
        graniteMat
      );
      stand.position.y = 0.24;

      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.36, 0.38, 8),
        stoneMat
      );
      pot.position.y = 0.64;

      const goldRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.035, 6, 8),
        brassMat
      );
      goldRim.rotation.x = Math.PI / 2;
      goldRim.position.y = 0.82;

      planter.add(stand, pot, goldRim);

      if (kind === 'lotus') {
        // Đài sen đá & các cánh sen hồng/vàng trang nghiêm
        const lotusCore = new THREE.Mesh(
          new THREE.ConeGeometry(0.28, 0.45, 7),
          lotusPinkMat
        );
        lotusCore.position.y = 1.08;
        for (let p = 0; p < 6; p++) {
          const angle = (p * Math.PI) / 3;
          const petal = new THREE.Mesh(
            new THREE.ConeGeometry(0.16, 0.36, 5),
            p % 2 === 0 ? lotusPinkMat : brassMat
          );
          petal.position.set(Math.cos(angle) * 0.22, 0.96, Math.sin(angle) * 0.22);
          petal.rotation.z = -Math.cos(angle) * 0.45;
          petal.rotation.x = Math.sin(angle) * 0.45;
          planter.add(petal);
        }
        planter.add(lotusCore);
      } else {
        // Cây tùng/bonsai low-poly nhiều tán
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.13, 0.55, 6),
          woodMat
        );
        trunk.position.y = 1.05;
        const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), foliageMat);
        crown1.position.set(0, 1.42, 0);
        const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), foliageMat);
        crown2.position.set(0.22, 1.25, 0.12);
        planter.add(trunk, crown1, crown2);
      }

      planter.traverse((c) => {
        if (c.isMesh) c.castShadow = true;
      });
      memorialDecorGroup.add(planter);
      this.colliders.indoorF2.pillars.push({ x, z, radius: 0.6 });
    });

    this.indoorFloor2Group.add(memorialDecorGroup);
  }

  /**
   * 3. Gian Tưởng niệm (Gian 6 - Tầng 2): Bàn đá & Lư hương đặt tại Z = -18.2 (tách xa Tượng Bác Hồ ở Z = -26.8)
   */
  buildMemorialAltar() {
    const { x, y, z } = SPECIAL_INTERACTIONS.MEMORIAL_ALTAR.position;
    const altarGroup = new THREE.Group();
    altarGroup.position.set(x, y, z);

    const stoneMat = SceneManager.createFlatMaterial(PALETTE.TOWER_SILVER);
    const redMat = SceneManager.createFlatMaterial(PALETTE.RED_VERMILION);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD);

    const tableBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.85, 1.45), stoneMat);
    tableBase.position.y = 0.425;
    tableBase.castShadow = true;
    tableBase.receiveShadow = true;

    const runner = new THREE.Mesh(new THREE.BoxGeometry(3.86, 0.14, 1.5), redMat);
    runner.position.y = 0.86;

    const censer = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.42, 8), goldMat);
    censer.position.set(0, 1.12, -0.2);
    censer.castShadow = true;

    const warmLight = new THREE.PointLight(PALETTE.CANDLE_GLOW, 1.2, 7.5);
    warmLight.position.set(0, 1.8, 0);

    this.candlesContainer.position.set(0, 0.94, 0.15);
    altarGroup.add(tableBase, runner, censer, warmLight, this.candlesContainer);

    this.memorialOfferings = new MemorialOfferings(this.candlesContainer, warmLight);

    this.indoorFloor2Group.add(altarGroup);
    this.colliders.indoorF2.pillars.push({ x, z, radius: 1.4 });
  }

  updateMemorialCandles(candlesList = []) {
    if (this.memorialOfferings) {
      this.memorialOfferings.sync(candlesList);
    }
  }

  /**
   * 4. Bàn Sổ Lưu Niệm Ảo (Guestbook) & Bảng Tin 3D Cỡ Lớn Sắc Nét đặt tại Sảnh Đón Tiếp Tầng 1
   */
  buildGuestbookStation() {
    const { x, y, z } = SPECIAL_INTERACTIONS.GUESTBOOK_DESK.position;
    const station = new THREE.Group();
    station.position.set(x, y, z);

    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const redMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, {
      roughness: 0.3,
      metalness: 0.4
    });

    // Bàn gỗ đặt Sổ Lưu Niệm Đỏ Sao Vàng
    const deskBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.15), woodMat);
    deskBase.position.y = 0.08;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.86, 1.02), redMat);
    desk.position.y = 0.48;
    desk.castShadow = true;
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.1, 1.18), woodMat);
    deskTop.position.y = 0.94;

    const book = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.56), redMat);
    book.position.set(0, 1.02, 0.12);
    book.rotation.y = 0.12;
    const bookStar = SceneManager.createStarMesh(0.14, 0.055, 0.03, goldMat);
    bookStar.rotation.x = -Math.PI / 2;
    bookStar.position.set(0, 1.08, 0.12);

    // Bảng Tin Lưu Niệm 3D cỡ lớn (5.2m × 3.1m) có viền vàng đồng & hiển thị rõ nét cả 2 mặt Trước/Sau
    const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.8, 0.22), woodMat);
    pillarLeft.position.set(-2.45, 1.9, -0.75);
    const pillarRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.8, 0.22), woodMat);
    pillarRight.position.set(2.45, 1.9, -0.75);

    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(5.25, 3.15, 0.18), woodMat);
    boardFrame.position.set(0, 2.48, -0.75);
    boardFrame.castShadow = true;

    const goldBorder = new THREE.Mesh(new THREE.BoxGeometry(5.06, 2.96, 0.2), goldMat);
    goldBorder.position.set(0, 2.48, -0.75);

    // Canvas độ phân giải cao (1280 x 760) + LinearFilter chống mờ chữ ở mọi góc nhìn
    this.guestbookCanvas = document.createElement('canvas');
    this.guestbookCanvas.width = 1280;
    this.guestbookCanvas.height = 760;
    this.guestbookTexture = new THREE.CanvasTexture(this.guestbookCanvas);
    SceneManager.sharpenTexture(this.guestbookTexture);
    this.guestbookTexture.magFilter = THREE.LinearFilter;
    this.guestbookTexture.anisotropy = 8;

    const faceMat = new THREE.MeshBasicMaterial({ map: this.guestbookTexture });
    const boardFaceFront = new THREE.Mesh(new THREE.PlaneGeometry(4.88, 2.78), faceMat);
    boardFaceFront.position.set(0, 2.48, -0.63);

    const boardFaceBack = new THREE.Mesh(new THREE.PlaneGeometry(4.88, 2.78), faceMat);
    boardFaceBack.rotation.y = Math.PI;
    boardFaceBack.position.set(0, 2.48, -0.87);

    station.add(
      deskBase,
      desk,
      deskTop,
      book,
      bookStar,
      pillarLeft,
      pillarRight,
      boardFrame,
      goldBorder,
      boardFaceFront,
      boardFaceBack
    );

    station.traverse((child) => {
      if (child.isMesh) {
        child.userData.isGuestbookStation = true;
        this.raycastTargets.push(child);
      }
    });

    this.indoorFloor1Group.add(station);
    this.colliders.indoorF1.pillars.push({ x, z, radius: 1.05 });

    this.updateGuestbookBoard([
      { author: 'Minh Anh', text: 'Tự hào truyền thống vẻ vang của Đảng!' },
      { author: 'Quốc Huy', text: 'Đời đời nhớ ơn Chủ tịch Hồ Chí Minh vĩ đại.' },
      { author: 'Thanh Tùng', text: 'Triển lãm 3D rất trang trọng & ý nghĩa!' }
    ]);
  }

  updateGuestbookBoard(entries = []) {
    if (!this.guestbookCanvas) return;
    const ctx = this.guestbookCanvas.getContext('2d');
    const w = this.guestbookCanvas.width;
    const h = this.guestbookCanvas.height;

    // Nền bảng gỗ nỉ ấm áp tương phản cao
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#4a3222');
    bgGrad.addColorStop(1, '#2e1e14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Viền vàng kép quanh bảng
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Thanh tiêu đề đỏ cờ nổi bật
    ctx.fillStyle = '#b81d18';
    ctx.fillRect(14, 14, w - 28, 92);
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(14, 106);
    ctx.lineTo(w - 14, 106);
    ctx.stroke();

    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 34px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ BẢNG LƯU NIỆM & CẢM TƯỞNG KHÁCH THAM QUAN ★', w / 2, 58);

    ctx.fillStyle = '#fff5d6';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillText('Nhấn phím [E] hoặc Chạm vào bảng để ghim cảm nghĩ của bạn lên Bảng Tin 3D', w / 2, 92);

    const noteColors = ['#fff9db', '#fff0db', '#e9f7ec', '#fdecec', '#fff4c7', '#eef5ff'];
    entries.slice(0, 6).forEach((entry, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const nx = 34 + col * 408;
      const ny = 128 + row * 304;
      const nw = 384;
      const nh = 282;

      // Đổ bóng thẻ giấy lưu niệm
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.roundRect(nx + 6, ny + 8, nw, nh, 12);
      ctx.fill();

      // Thân giấy lưu niệm
      ctx.fillStyle = noteColors[idx % noteColors.length];
      ctx.strokeStyle = '#d4a753';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(nx, ny, nw, nh, 12);
      ctx.fill();
      ctx.stroke();

      // Đinh ghim đỏ sao vàng ở giữa mép trên
      ctx.fillStyle = '#c82323';
      ctx.beginPath();
      ctx.arc(nx + nw / 2, ny + 22, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', nx + nw / 2, ny + 28);

      // Nội dung cảm tưởng chữ to, đậm, cực kỳ sắc nét (26px)
      ctx.fillStyle = '#18120e';
      ctx.font = 'bold 26px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      const words = String(entry.text || '').split(' ');
      let line = '';
      let lineY = ny + 76;
      for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > nw - 40) {
          ctx.fillText(line.trim(), nx + 20, lineY);
          line = word + ' ';
          lineY += 36;
        } else {
          line = testLine;
        }
      }
      if (line) {
        ctx.fillText(line.trim(), nx + 20, lineY);
      }

      // Tên người viết ở góc dưới bên phải (22px đỏ sẫm)
      ctx.fillStyle = '#a61b1b';
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`— ${entry.author || 'Khách tham quan'}`, nx + nw - 20, ny + nh - 22);
    });

    this.guestbookTexture.needsUpdate = true;
  }

  /**
   * 4b. Trạm Đố Vui Lịch Sử & Bảng Vàng "Nhà Sử Học Trẻ" 3D (Đặt đối xứng với Thang máy tại X = +10.5, Z = -33.8)
   */
  buildQuizStation() {
    if (!SPECIAL_INTERACTIONS.QUIZ_STATION) return;
    const { x, y, z } = SPECIAL_INTERACTIONS.QUIZ_STATION.position;
    const station = new THREE.Group();
    station.position.set(x, y, z);

    const woodMat = SceneManager.createFlatMaterial(PALETTE.WOOD_OAK);
    const redMat = SceneManager.createFlatMaterial(PALETTE.PARTY_RED);
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, {
      roughness: 0.35,
      metalness: 0.4
    });

    // Bục thi đố vui bọc nhung đỏ & chuông vàng bấm trả lời
    const podiumBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1.1), woodMat);
    podiumBase.position.y = 0.1;

    const podiumBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.82, 0.85), redMat);
    podiumBody.position.y = 0.56;
    podiumBody.castShadow = true;

    const podiumTop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 0.96), woodMat);
    podiumTop.position.y = 1.02;

    const bellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 10), woodMat);
    bellBase.position.set(0, 1.1, 0.12);
    const goldenBell = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), goldMat);
    goldenBell.position.set(0, 1.18, 0.12);

    const frontStar = SceneManager.createStarMesh(0.22, 0.085, 0.05, goldMat);
    frontStar.position.set(0, 0.62, 0.45);

    // Bảng Vàng Danh Dự "Nhà Sử Học Trẻ" 3D phía sau bục thi
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.25, 0.16), woodMat);
    boardFrame.position.set(0, 2.15, -1.25);
    boardFrame.castShadow = true;

    const goldBorder = new THREE.Mesh(new THREE.BoxGeometry(3.44, 2.08, 0.18), goldMat);
    goldBorder.position.set(0, 2.15, -1.24);

    this.quizBoardCanvas = document.createElement('canvas');
    this.quizBoardCanvas.width = 1024;
    this.quizBoardCanvas.height = 608;
    this.quizBoardTexture = SceneManager.sharpenTexture(new THREE.CanvasTexture(this.quizBoardCanvas));

    const boardFace = new THREE.Mesh(
      new THREE.PlaneGeometry(3.32, 1.96),
      new THREE.MeshBasicMaterial({ map: this.quizBoardTexture })
    );
    boardFace.position.set(0, 2.15, -1.14);

    station.add(
      podiumBase,
      podiumBody,
      podiumTop,
      bellBase,
      goldenBell,
      frontStar,
      boardFrame,
      goldBorder,
      boardFace
    );
    this.indoorFloor1Group.add(station);
    this.colliders.indoorF1.pillars.push({ x, z, radius: 0.95 });

    // 4b2. Màn hình / Bảng Vinh Danh Bảng Xếp Hạng 3D (Standee Kiosk) đặt thoáng bên cạnh trạm đố vui (X = +6.8, Z = -31.6, hoàn toàn không bị dính tường)
    this.buildLeaderboardStandee();

    this.updateQuizLeaderboard([
      { name: 'Đồng chí Minh Dương', score: 500, timeSec: 38, rank: 'Chiến Sĩ Lịch Sử Xuất Sắc' },
      { name: 'Đồng chí Hồng Nhung', score: 500, timeSec: 46, rank: 'Chiến Sĩ Lịch Sử Xuất Sắc' },
      { name: 'Đồng chí Quốc Bảo', score: 400, timeSec: 52, rank: 'Chiến Sĩ Lịch Sử Ưu Tú' }
    ]);
  }

  buildLeaderboardStandee() {
    const lx = 6.8;
    const lz = -31.6;
    const standee = new THREE.Group();
    standee.position.set(lx, 0, lz);
    standee.rotation.y = -0.12;

    const darkMat = SceneManager.createFlatMaterial(PALETTE.BUILDING_DARK, { roughness: 0.4, metalness: 0.3 });
    const goldMat = SceneManager.createFlatMaterial(PALETTE.STAR_GOLD, { roughness: 0.3, metalness: 0.5 });
    const screenBorderMat = SceneManager.createFlatMaterial(0x1a1c22);

    // Bệ chân đứng kim loại viền vàng
    const basePillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.1), darkMat);
    basePillar.position.y = 0.08;
    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.04, 1.18), goldMat);
    baseTrim.position.y = 0.18;

    // 2 chân cột đỡ màn hình nghiêng 8 độ
    [-0.7, 0.7].forEach((px) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.25, 8), darkMat);
      leg.position.set(px, 0.8, -0.05);
      leg.rotation.x = -0.12;
      standee.add(leg);
    });

    // Thân vỏ màn hình LED 3D cỡ lớn
    const screenBacking = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 0.14), screenBorderMat);
    screenBacking.position.set(0, 2.05, -0.15);
    screenBacking.rotation.x = -0.12;
    screenBacking.castShadow = true;

    const screenBevel = new THREE.Mesh(new THREE.BoxGeometry(2.66, 2.16, 0.06), goldMat);
    screenBevel.position.set(0, 2.05, -0.16);
    screenBevel.rotation.x = -0.12;

    this.leaderboardCanvas = document.createElement('canvas');
    this.leaderboardCanvas.width = 1024;
    this.leaderboardCanvas.height = 840;
    this.leaderboardTexture = SceneManager.sharpenTexture(new THREE.CanvasTexture(this.leaderboardCanvas));

    const screenDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(2.45, 1.95),
      new THREE.MeshBasicMaterial({ map: this.leaderboardTexture })
    );
    screenDisplay.position.set(0, 2.05, -0.07);
    screenDisplay.rotation.x = -0.12;

    // Ngôi sao vàng trên đỉnh bảng vinh danh
    const topStar = SceneManager.createStarMesh(0.2, 0.08, 0.04, goldMat);
    topStar.position.set(0, 3.22, -0.28);
    topStar.rotation.x = -0.12;

    standee.add(basePillar, baseTrim, screenBacking, screenBevel, screenDisplay, topStar);
    this.indoorFloor1Group.add(standee);
    this.colliders.indoorF1.pillars.push({ x: lx, z: lz, radius: 0.9 });
  }

  updateQuizLeaderboard(leaderboard = []) {
    this.latestLeaderboardData = leaderboard;

    // 1. Cập nhật Bảng Vàng phía sau bục thi
    if (this.quizBoardCanvas) {
      const ctx = this.quizBoardCanvas.getContext('2d');
      const w = this.quizBoardCanvas.width;
      const h = this.quizBoardCanvas.height;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#781712');
      grad.addColorStop(1, '#3d0c09');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 36px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 BẢNG VÀNG: NHÀ SỬ HỌC TRẺ 🏆', w / 2, 54);

      ctx.fillStyle = '#fff5d6';
      ctx.font = '22px "Segoe UI", sans-serif';
      ctx.fillText('Nhấn [E] tại bục chuông để tham gia Đố Vui Lịch Sử Đảng (5 câu)', w / 2, 94);

      leaderboard.slice(0, 5).forEach((item, idx) => {
        const rowY = 120 + idx * 88;
        ctx.fillStyle = idx === 0 ? 'rgba(255, 230, 0, 0.24)' : 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.roundRect(32, rowY, w - 64, 72, 12);
        ctx.fill();

        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 28px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ` #${idx + 1}`;
        ctx.fillText(`${medal} ${item.name}`, 52, rowY + 45);

        ctx.fillStyle = '#fff9eb';
        ctx.font = '24px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        const timeText = item.timeSec ? ` (${item.timeSec}s)` : '';
        ctx.fillText(`${item.score} điểm${timeText} • ${item.rank || 'Chiến sĩ Lịch sử'}`, w - 52, rowY + 45);
      });

      this.quizBoardTexture.needsUpdate = true;
    }

    // 2. Cập nhật Màn hình LED Bảng Xếp Hạng Standee bên cạnh
    if (this.leaderboardCanvas) {
      const ctx = this.leaderboardCanvas.getContext('2d');
      const w = this.leaderboardCanvas.width;
      const h = this.leaderboardCanvas.height;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#192534');
      grad.addColorStop(1, '#0e141d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 40px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎖️ TOP 10 CHIẾN SĨ LỊCH SỬ XUẤT SẮC 🎖️', w / 2, 65);

      ctx.fillStyle = '#9dd7fb';
      ctx.font = '22px "Segoe UI", sans-serif';
      ctx.fillText('Xếp hạng theo Điểm số & Thời gian hoàn thành • Nhấn [E] xem chi tiết', w / 2, 105);

      leaderboard.slice(0, 8).forEach((item, idx) => {
        const rowY = 135 + idx * 76;
        ctx.fillStyle =
          idx === 0
            ? 'rgba(255, 215, 0, 0.22)'
            : idx === 1
            ? 'rgba(215, 225, 235, 0.16)'
            : idx === 2
            ? 'rgba(205, 140, 75, 0.18)'
            : 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(28, rowY, w - 56, 64, 10);
        ctx.fill();

        ctx.fillStyle = idx < 3 ? '#ffe600' : '#ffffff';
        ctx.font = 'bold 26px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        const medal = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `   #${idx + 1}`;
        ctx.fillText(`${medal}  ${item.name}`, 44, rowY + 41);

        ctx.fillStyle = '#8ff5a3';
        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        const timeStr = item.timeSec ? `${item.timeSec}s` : '--';
        ctx.fillText(`${item.score} điểm — ${timeStr}`, w - 44, rowY + 41);
      });

      this.leaderboardTexture.needsUpdate = true;
    }
  }

  /**
   * 4c. Xây dựng 8 Huy Hiệu Sao Vàng Ẩn (Scavenger Hunt) lơ lửng phát sáng khắp bản đồ:
   * - Kiểm tra trực tiếp từ `localStorage` để nếu người chơi đã nhặt ngôi sao nào (hoặc đã nhặt đủ 8/8 ngôi sao),
   *   khi thoát ra quay lại sẽ TUYỆT ĐỐI KHÔNG spawn lại ngôi sao đó trên bản đồ nữa!
   */
  buildHiddenStars() {
    let savedCollectedSet = new Set();
    let allCompleted = false;
    try {
      const rawStars = JSON.parse(localStorage.getItem('party_museum_stars') || '[]');
      if (Array.isArray(rawStars)) {
        savedCollectedSet = new Set(rawStars);
      }
      if (
        localStorage.getItem('party_museum_all_stars_collected') === 'true' ||
        savedCollectedSet.size >= HIDDEN_STARS_DATA.length
      ) {
        allCompleted = true;
      }
    } catch {
      // ignore localStorage read errors
    }

    const goldMat = SceneManager.createFlatMaterial(PALETTE.BRIGHT_STAR_YELLOW, {
      roughness: 0.25,
      metalness: 0.35,
      emissive: PALETTE.BRIGHT_STAR_YELLOW,
      emissiveIntensity: 0.38
    });

    HIDDEN_STARS_DATA.forEach((starInfo, idx) => {
      const isAlreadyCollected = allCompleted || savedCollectedSet.has(starInfo.id);
      const { x, y, z } = starInfo.position;
      const targetGroup = this.getTargetGroup(starInfo.zoneType, starInfo.floor);

      const holder = new THREE.Group();
      holder.position.set(x, y, z);

      // Đế vòng sáng nhỏ dưới sàn
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.72, 20),
        new THREE.MeshBasicMaterial({
          color: PALETTE.BRIGHT_STAR_YELLOW,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;

      // Ngôi sao 5 cánh 3D phát sáng lơ lửng ở độ cao y = 1.25
      const starMesh = SceneManager.createStarMesh(0.38, 0.145, 0.09, goldMat.clone());
      starMesh.position.y = 1.25;

      holder.add(ring, starMesh);
      holder.visible = !isAlreadyCollected;

      // Chỉ gắn vào Scene nếu ngôi sao này CHƯA được thu thập
      if (!isAlreadyCollected) {
        targetGroup.add(holder);
      }

      this.hiddenStarNodes.set(starInfo.id, {
        info: starInfo,
        holder,
        starMesh,
        ring,
        collected: isAlreadyCollected,
        phase: idx * 0.85
      });
    });
  }

  markStarCollected(starId, isCollected = true) {
    const node = this.hiddenStarNodes.get(starId);
    if (!node) return;
    node.collected = isCollected;
    node.holder.visible = !isCollected;
    if (isCollected && node.holder.parent) {
      node.holder.parent.remove(node.holder);
    }
  }

  /**
   * 5. Tạo các vòng tròn đánh dấu cho Điểm Chào Cờ (Đằng trước cột cờ), Cầu Thang Lên/Xuống Tầng 2, Bàn Tưởng Niệm
   */
  buildSpecialInteractionPads() {
    Object.values(SPECIAL_INTERACTIONS).forEach((spec) => {
      const { x, y, z } = spec.position;
      const targetGroup = this.getTargetGroup(spec.zoneType, spec.floor);

      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 1.28, 24),
        new THREE.MeshBasicMaterial({
          color: PALETTE.PARTY_RED,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        })
      );
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(x, y + 0.068, z);

      const glowMesh = new THREE.Mesh(
        new THREE.CircleGeometry(1.05, 24),
        new THREE.MeshBasicMaterial({
          color: PALETTE.STAR_GOLD,
          transparent: true,
          opacity: 0.24
        })
      );
      glowMesh.rotation.x = -Math.PI / 2;
      glowMesh.position.set(x, y + 0.062, z);

      targetGroup.add(ringMesh, glowMesh);
      this.interactionRings.push({
        id: spec.id,
        ringMesh,
        glowMesh
      });
    });
  }

  update(dt, elapsedTime, activeTargetId) {
    this.animatedMeshes.forEach((mesh) => {
      mesh.rotation.y += dt * 0.55;
    });

    if (this.memorialOfferings) {
      this.memorialOfferings.update(dt, elapsedTime);
    }

    // Cập nhật chuyển động xoay & nhấp nhô của các Huy hiệu Sao Vàng Ẩn CHƯA nhặt
    for (const node of this.hiddenStarNodes.values()) {
      if (node.collected) continue;
      node.starMesh.rotation.y += dt * 1.85;
      node.starMesh.position.y =
        1.22 + Math.sin(elapsedTime * 3.2 + node.phase) * 0.16;
      const s = 1.0 + Math.sin(elapsedTime * 4.0 + node.phase) * 0.08;
      node.starMesh.scale.setScalar(s);
    }

    this.interactionRings.forEach(({ id, ringMesh, glowMesh }) => {
      const isHighlighted = id === activeTargetId;
      const pulse = 1.0 + Math.sin(elapsedTime * 4.5) * 0.06;
      ringMesh.scale.setScalar(isHighlighted ? pulse * 1.08 : 1.0);
      ringMesh.material.opacity = isHighlighted ? 0.96 : 0.52;
      glowMesh.material.opacity = isHighlighted ? 0.3 : 0.12;
    });
  }
}
