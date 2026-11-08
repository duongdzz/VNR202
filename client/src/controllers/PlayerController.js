import * as THREE from 'three';
import {
  PLAYER_CONFIG,
  EXHIBITS_DATA,
  BENCHES_DATA,
  SPECIAL_INTERACTIONS,
  HIDDEN_STARS_DATA,
  VEHICLE_TYPES
} from '../constants.js?v=19';

/**
 * PlayerController: Quản lý điều khiển nhân vật, va chạm trượt theo Tầng (Ngoài sân / Tầng 1 / Tầng 2),
 * chuyển tầng (Teleport Pad), ngồi ghế (Sit Interaction), Emote [1][2][3], Chào cờ 5s,
 * Thắp nến Gian 6, chế độ chụp ảnh Photo Mode [P] / Bản đồ [M], và Phương tiện di chuyển (Xe đạp, Jeep, Máy bay).
 */
export class PlayerController {
  constructor({
    characterMesh,
    museumMap,
    sceneManager,
    onOpenExhibitModal,
    onCloseExhibitModal,
    onOpenCinemaModal,
    onCloseCinemaModal,
    onOpenQuizModal,
    onCloseQuizModal,
    onClosePackbikeModal,
    onCloseArtilleryModal,
    onOpenVehicleModal,
    onCloseVehicleModal,
    onOpenQuizLeaderboardModal,
    onCloseQuizLeaderboardModal,
    onHonkVehicle,
    onToggleVehicle,
    onStopGuidedTour,
    onCollectHiddenStar,
    onReleaseLantern,
    onOfferMemorial,
    onTriggerEmote,
    onZoneOrFloorChanged,
    onTogglePhotoMode,
    onToggleMinimap,
    onOpenChatInput,
    onInteractNPC
  }) {
    this.character = characterMesh;
    this.museumMap = museumMap;
    this.sceneManager = sceneManager;
    this.onOpenExhibitModal = onOpenExhibitModal;
    this.onCloseExhibitModal = onCloseExhibitModal;
    this.onOpenCinemaModal = onOpenCinemaModal;
    this.onCloseCinemaModal = onCloseCinemaModal;
    this.onOpenQuizModal = onOpenQuizModal;
    this.onCloseQuizModal = onCloseQuizModal;
    this.onClosePackbikeModal = onClosePackbikeModal;
    this.onCloseArtilleryModal = onCloseArtilleryModal;
    this.onOpenVehicleModal = onOpenVehicleModal;
    this.onCloseVehicleModal = onCloseVehicleModal;
    this.onOpenQuizLeaderboardModal = onOpenQuizLeaderboardModal;
    this.onCloseQuizLeaderboardModal = onCloseQuizLeaderboardModal;
    this.onHonkVehicle = onHonkVehicle;
    this.onToggleVehicle = onToggleVehicle;
    this.onStopGuidedTour = onStopGuidedTour;
    this.onCollectHiddenStar = onCollectHiddenStar;
    this.onReleaseLantern = onReleaseLantern;
    this.onOfferMemorial = onOfferMemorial;
    this.onTriggerEmote = onTriggerEmote;
    this.onZoneOrFloorChanged = onZoneOrFloorChanged;
    this.onTogglePhotoMode = onTogglePhotoMode;
    this.onToggleMinimap = onToggleMinimap;
    this.onOpenChatInput = onOpenChatInput;
    this.onInteractNPC = onInteractNPC;

    this.currentVehicle = null;
    this.isVehicleModalOpen = false;
    this.isQuizLeaderboardOpen = false;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    // Vector điều khiển từ Joystick cảm ứng trên Mobile/Touch
    this.joystickVector = { x: 0, z: 0 };

    this.raycaster = new THREE.Raycaster();
    this.pointerNDC = new THREE.Vector2();

    this.currentZone = 'outdoor'; // 'outdoor' | 'indoor'
    this.currentFloor = 1;        // 1 (Y = 0) | 2 (Y = 5.5)

    this.isMoving = false;
    this.isSitting = false;
    this.currentBench = null;
    this.saluteLockTimer = 0;     // Đứng nghiêm 5 giây khi Chào cờ tại Cột cờ Hà Nội
    this.tankClimbTimer = 0;      // Đứng trên tháp pháo Xe tăng T-54B vẫy cờ 5.5 giây
    this.isModalOpen = false;
    this.isGuestbookOpen = false;
    this.isCinemaOpen = false;
    this.isQuizOpen = false;
    this.isPackbikeOpen = false;
    this.isArtilleryOpen = false;
    this.isTourActive = false;

    // Điểm tương tác gần nhất hiện tại
    // { kind: 'portal' | 'special' | 'bench' | 'exhibit', data, promptText, highlightId }
    this.activeInteraction = null;

    this.bindKeyboardEvents();
    this.bindTouchRaycast();
  }

  bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      // Không bắt phím tắt khi người chơi đang gõ chữ trong ô Tên hoặc Khung Chat
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.code === 'Escape') {
          e.target.blur();
        }
        return;
      }

      // Phím [Enter]: Mở nhanh ô nhập Chat trực tuyến
      if (e.code === 'Enter' && !this.isModalOpen && !this.isCinemaOpen) {
        e.preventDefault();
        this.onOpenChatInput?.();
        return;
      }

      // Phím [P]: Bật/tắt chế độ Photo Mode (ẩn toàn bộ UI & nhãn tên)
      if (e.code === 'KeyP' && !e.repeat) {
        this.onTogglePhotoMode?.();
        return;
      }

      // Phím [M]: Bật/tắt Bản đồ thu nhỏ (Minimap)
      if (e.code === 'KeyM' && !e.repeat) {
        this.onToggleMinimap?.();
        return;
      }

      // Phím [F]: Rung chuông / Bấm còi phương tiện (Xe đạp thồ, Jeep UAZ, Máy bay mini)
      if (e.code === 'KeyF' && !e.repeat && this.currentVehicle && !this.isModalOpen && !this.isCinemaOpen) {
        e.preventDefault();
        this.onHonkVehicle?.(this.currentVehicle);
        return;
      }

      // Phím tắt Emote Xã hội: [1] Chào điều lệnh, [2] Cầm cờ Việt Nam vẫy, [3] Thả Cờ đỏ sao vàng / Trái tim
      if (!this.isModalOpen && !this.isCinemaOpen && !e.repeat) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          this.triggerLocalEmote('salute');
          return;
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2') {
          this.triggerLocalEmote('flag_wave', 3.4);
          return;
        }
        if (e.code === 'Digit3' || e.code === 'Numpad3') {
          this.triggerLocalEmote('heart_flag');
          return;
        }
        // Phím [4]: Bật/tắt Phương tiện di chuyển (Xe đạp thồ, Jeep, Máy bay)
        if (e.code === 'Digit4' || e.code === 'Numpad4') {
          this.onToggleVehicle?.();
          return;
        }
      }

      // Nếu đang ngồi ghế và bấm WASD hoặc Space -> Đứng dậy
      if (
        this.isSitting &&
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
        this.standUpFromBench();
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'KeyE':
          if (!e.repeat) {
            this.handleInteractKey();
          }
          break;
        case 'Escape':
          this.closeAllModals();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
      }
    });
  }

  /**
   * Nhận vector điều khiển từ Virtual Joystick trên màn hình cảm ứng (vx, vz thuộc [-1, 1])
   */
  setJoystickVector(vx, vz) {
    this.joystickVector.x = vx;
    this.joystickVector.z = vz;
    if (this.isSitting && Math.hypot(vx, vz) > 0.25) {
      this.standUpFromBench();
    }
  }

  /**
   * Hỗ trợ Raycaster khi người dùng chạm (tap/click) trực tiếp vào mô hình hiện vật trên Mobile/PC
   * để mở ngay Modal xem tư liệu mà không bắt buộc phải bấm phím [E]
   */
  bindTouchRaycast() {
    const domElement = this.sceneManager?.renderer?.domElement;
    if (!domElement) return;

    let downX = 0;
    let downY = 0;
    let downTime = 0;

    domElement.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
    });

    domElement.addEventListener('pointerup', (e) => {
      if (this.isModalOpen || this.isCinemaOpen) return;
      const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
      const elapsed = performance.now() - downTime;
      if (moveDist > 14 || elapsed > 600) return;

      const rect = domElement.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointerNDC, this.sceneManager.camera);
      const targets = this.museumMap?.exhibitsManager?.raycastTargets || [];
      const intersects = this.raycaster.intersectObjects(targets, true);

      for (const hit of intersects) {
        if (hit.object?.userData?.isFlagpoleNPC && this.currentZone === 'outdoor') {
          this.museumMap.triggerNPCDialogue(this.character.root.position);
          this.onInteractNPC?.(SPECIAL_INTERACTIONS.FLAGPOLE_NPC.dialogue);
          return;
        }

        if (
          hit.object?.userData?.isTheaterScreen &&
          this.currentZone === 'indoor' &&
          this.currentFloor === 1
        ) {
          this.isCinemaOpen = true;
          this.onOpenCinemaModal?.();
          return;
        }

        const ex = hit.object?.userData?.exhibitData;
        if (
          ex &&
          ex.zoneType === this.currentZone &&
          (ex.zoneType === 'outdoor' || ex.floor === this.currentFloor)
        ) {
          this.isModalOpen = true;
          this.onOpenExhibitModal?.(ex);
          return;
        }
      }
    });
  }

  triggerLocalEmote(emoteType, customDuration = 2.8) {
    this.character.triggerEmote(emoteType, customDuration);
    this.onTriggerEmote?.(emoteType);
  }

  closeAllModals() {
    if (this.isModalOpen) {
      this.isModalOpen = false;
      this.onCloseExhibitModal?.();
    }
    if (this.isCinemaOpen) {
      this.isCinemaOpen = false;
      this.onCloseCinemaModal?.();
    }
    if (this.isQuizOpen) {
      this.isQuizOpen = false;
      this.onCloseQuizModal?.();
    }
    if (this.isPackbikeOpen) {
      this.isPackbikeOpen = false;
      this.onClosePackbikeModal?.();
    }
    if (this.isArtilleryOpen) {
      this.isArtilleryOpen = false;
      this.onCloseArtilleryModal?.();
    }
    if (this.isVehicleModalOpen) {
      this.isVehicleModalOpen = false;
      this.onCloseVehicleModal?.();
    }
    if (this.isQuizLeaderboardOpen) {
      this.isQuizLeaderboardOpen = false;
      this.onCloseQuizLeaderboardModal?.();
    }
    if (this.isTourActive) {
      this.isTourActive = false;
      this.onStopGuidedTour?.();
    }
  }

  /**
   * Xử lý khi người chơi nhấn phím [E] tại các điểm tương tác
   */
  handleInteractKey() {
    if (
      this.isModalOpen ||
      this.isCinemaOpen ||
      this.isQuizOpen ||
      this.isVehicleModalOpen ||
      this.isQuizLeaderboardOpen
    ) {
      this.closeAllModals();
      return;
    }

    if (this.isSitting) {
      // Nếu đang ngồi trên ghế Khán phòng Rạp chiếu phim -> bấm [E] sẽ mở Rạp Chiếu Phim Tư Liệu!
      if (this.currentBench?.isTheaterBench) {
        this.isCinemaOpen = true;
        this.onOpenCinemaModal?.();
        return;
      }
      this.standUpFromBench();
      return;
    }

    if (!this.activeInteraction) return;
    const { kind, data } = this.activeInteraction;

    if (kind === 'portal') {
      if (data === 'enter_museum') this.switchZone('indoor', 1);
      else if (data === 'exit_museum') this.switchZone('outdoor', 1);
      return;
    }

    if (kind === 'bench') {
      this.sitOnBench(data);
      return;
    }

    if (kind === 'special') {
      if (data.id === 'special-stairs-up') {
        this.teleportToFloor(2, data.targetPos);
      } else if (data.id === 'special-stairs-down') {
        this.teleportToFloor(1, data.targetPos);
      } else if (data.id === 'special-theater-screen') {
        this.isCinemaOpen = true;
        this.onOpenCinemaModal?.();
      } else if (data.id === 'special-flag-salute') {
        this.startFlagSaluteCeremony(data);
      } else if (data.id === 'special-flagpole-npc') {
        this.museumMap.triggerNPCDialogue(this.character.root.position);
        this.onInteractNPC?.(data.dialogue);
      } else if (data.id === 'special-memorial-altar') {
        this.onOfferMemorial?.();
        this.triggerLocalEmote('salute', 3.0);
      } else if (data.id === 'special-quiz-station') {
        this.isQuizOpen = true;
        this.onOpenQuizModal?.();
      } else if (data.id === 'special-fountain-lantern') {
        this.museumMap.spawnFountainLantern(-12.5, 17.5);
        this.triggerLocalEmote('heart_flag');
        this.onReleaseLantern?.();
      } else if (data.id === 'special-vehicle-kiosk') {
        this.isVehicleModalOpen = true;
        this.onOpenVehicleModal?.();
      } else if (data.id === 'special-quiz-leaderboard') {
        this.isQuizLeaderboardOpen = true;
        this.onOpenQuizLeaderboardModal?.();
      }
      return;
    }

    if (kind === 'exhibit') {
      this.isModalOpen = true;
      this.onOpenExhibitModal?.(data);
    }
  }

  /**
   * Ngồi xuống ghế: khóa tạm thời WASD, đặt nhân vật ngồi ngay ngắn trên mặt ghế (không lún vào tựa lưng)
   */
  sitOnBench(bench) {
    this.isSitting = true;
    this.currentBench = bench;
    this.isMoving = false;
    const forwardOffset = 0.16;
    this.character.root.position.set(
      bench.x + Math.sin(bench.rotY) * forwardOffset,
      bench.y,
      bench.z + Math.cos(bench.rotY) * forwardOffset
    );
    this.character.root.rotation.y = bench.rotY;
  }

  standUpFromBench() {
    if (!this.isSitting) return;
    this.isSitting = false;
    this.currentBench = null;
    // Bước nhẹ ra phía trước ghế 0.72 đơn vị khi đứng dậy để tránh vướng collider ghế
    const angle = this.character.root.rotation.y;
    this.character.root.position.x += Math.sin(angle) * 0.72;
    this.character.root.position.z += Math.cos(angle) * 0.72;
  }

  /**
   * Nghi thức Chào cờ 5 giây tại điểm đứng đằng trước Cột cờ Hà Nội
   */
  startFlagSaluteCeremony(saluteSpot) {
    this.isSitting = false;
    this.isMoving = false;
    this.saluteLockTimer = 5.0;

    const pos = this.character.root.position;
    pos.set(saluteSpot.position.x, saluteSpot.position.y, saluteSpot.position.z);
    const dx = saluteSpot.lookTarget.x - pos.x;
    const dz = saluteSpot.lookTarget.z - pos.z;
    this.character.root.rotation.y = Math.atan2(dx, dz);

    // Thực hiện động tác chào 5 giây & thả cờ đỏ sao vàng
    this.triggerLocalEmote('salute', 5.0);
    setTimeout(() => this.triggerLocalEmote('heart_flag'), 600);
  }

  /**
   * TÍNH NĂNG 3: Trèo lên nóc Tháp pháo Xe tăng T-54B số hiệu 843 vẫy cờ chiến thắng
   */
  climbOnTank843() {
    this.closeAllModals();
    this.isSitting = false;
    this.isMoving = false;
    this.tankClimbTimer = 5.5;

    const pos = this.character.root.position;
    pos.set(-21.0, 2.15, 27.5);
    this.character.root.rotation.y = 0.25;

    this.triggerLocalEmote('flag_wave', 5.5);
    setTimeout(() => this.triggerLocalEmote('heart_flag'), 500);
  }

  /**
   * Di chuyển giữa Tầng 1 (Y = 0) và Tầng 2 (Y = 5.5) qua Cầu thang / Teleport Pad
   */
  teleportToFloor(targetFloor, targetPos) {
    this.isSitting = false;
    this.currentFloor = targetFloor;
    const pos = this.character.root.position;
    pos.set(targetPos.x, targetPos.y, targetPos.z);
    this.character.root.rotation.y = targetPos.rotY ?? 0;

    this.museumMap.setFloorMode(targetFloor);
    this.sceneManager.snapCameraTo(pos);
    this.onZoneOrFloorChanged?.(this.currentZone, this.currentFloor);
  }

  /**
   * Chuyển cảnh giữa Quảng trường Ngoài sân ('outdoor') và Bên trong Triển lãm ('indoor')
   */
  switchZone(targetZone, targetFloor = 1) {
    if (this.currentZone === targetZone) return;
    this.isSitting = false;
    this.currentZone = targetZone;
    this.currentFloor = targetFloor;

    const pos = this.character.root.position;
    if (targetZone === 'indoor') {
      pos.set(0, 0, -4.5);
      this.character.root.rotation.y = Math.PI;
    } else {
      pos.set(0, 0, 7.2);
      this.character.root.rotation.y = 0;
    }

    this.museumMap.setZoneMode(targetZone, targetFloor);
    this.sceneManager.setZoneAtmosphere(targetZone);
    this.sceneManager.snapCameraTo(pos);
    this.onZoneOrFloorChanged?.(this.currentZone, this.currentFloor);
  }

  /**
   * TÍNH NĂNG 1: Dịch chuyển nhân vật & đồng bộ Khu vực / Tầng cho từng Trạm của Tour Hướng Dẫn Viên Ảo
   */
  teleportToTourStation(station) {
    if (!station) return;
    this.isSitting = false;
    this.isMoving = false;
    const zoneChanged = this.currentZone !== station.zoneType;
    const floorChanged = this.currentFloor !== station.floor;

    this.currentZone = station.zoneType;
    this.currentFloor = station.floor;

    const pos = this.character.root.position;
    pos.set(station.playerPos.x, station.playerPos.y, station.playerPos.z);
    this.character.root.rotation.y = station.playerPos.rotY ?? 0;

    this.museumMap.setZoneMode(station.zoneType, station.floor);
    this.sceneManager.setZoneAtmosphere(station.zoneType);
    if (zoneChanged || floorChanged) {
      this.onZoneOrFloorChanged?.(this.currentZone, this.currentFloor);
    }
  }

  static lerpAngleShortest(currentAngle, targetAngle, t) {
    let diff = ((targetAngle - currentAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return currentAngle + diff * t;
  }

  /**
   * Lấy bộ Collider tương ứng với vị trí hiện tại (Ngoài sân, Tầng 1, hoặc Tầng 2)
   */
  getActiveColliderGroup() {
    if (this.currentZone === 'outdoor') return this.museumMap.colliders.outdoor;
    return this.currentFloor === 2
      ? this.museumMap.colliders.indoorF2
      : this.museumMap.colliders.indoorF1;
  }

  resolveCollisions(nextX, nextZ) {
    const r = PLAYER_CONFIG.RADIUS;
    let resolvedX = nextX;
    let resolvedZ = nextZ;

    const activeColliders = this.getActiveColliderGroup();
    if (!activeColliders) return { x: resolvedX, z: resolvedZ };

    for (const box of activeColliders.walls) {
      const closestX = Math.max(box.minX, Math.min(resolvedX, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(resolvedZ, box.maxZ));

      const dx = resolvedX - closestX;
      const dz = resolvedZ - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < r * r) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = r - dist;
          resolvedX += (dx / dist) * overlap;
          resolvedZ += (dz / dist) * overlap;
        }
      }
    }

    for (const pillar of activeColliders.pillars) {
      const dx = resolvedX - pillar.x;
      const dz = resolvedZ - pillar.z;
      const minDist = r + pillar.radius;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = minDist - dist;
        resolvedX += (dx / dist) * overlap;
        resolvedZ += (dz / dist) * overlap;
      }
    }

    return { x: resolvedX, z: resolvedZ };
  }

  /**
   * Kiểm tra tất cả các điểm tương tác xung quanh nhân vật theo thứ tự ưu tiên:
   * 1. Cổng ra/vào Tòa nhà Triển lãm
   * 2. Điểm tương tác đặc biệt (Cầu thang Tầng 1<->2, Chào cờ, Thắp nến Gian 6, Sổ lưu niệm)
   * 3. Ghế ngồi nghỉ (Benches)
   * 4. Hiện vật lịch sử (Exhibits)
   */
  checkProximityAndInteractions() {
    const pos = this.character.root.position;
    this.activeInteraction = null;

    // 0. Kiểm tra thu thập 8 Huy Hiệu Sao Vàng Ẩn (Scavenger Hunt) khi đi ngang qua
    for (const star of HIDDEN_STARS_DATA) {
      if (star.zoneType !== this.currentZone || star.floor !== this.currentFloor) continue;
      const distStar = Math.hypot(pos.x - star.position.x, pos.z - star.position.z);
      if (distStar <= 1.75) {
        this.onCollectHiddenStar?.(star);
      }
    }

    // 1. Kiểm tra bước qua Cổng Chính Ra/Vào Bảo tàng (Chỉ ở Tầng 1)
    if (this.currentZone === 'outdoor') {
      const distToEntrance = Math.hypot(pos.x - 0, pos.z - 4.6);
      if (Math.abs(pos.x) < 2.8 && pos.z <= 3.7) {
        this.switchZone('indoor', 1);
        return;
      }
      if (distToEntrance <= 3.2) {
        this.activeInteraction = {
          kind: 'portal',
          data: 'enter_museum',
          promptText: 'Vào Trong Nhà Triển Lãm (Tầng 1)',
          highlightId: null
        };
        return;
      }
    } else if (this.currentFloor === 1) {
      const distToExit = Math.hypot(pos.x - 0, pos.z - (-2.2));
      if (Math.abs(pos.x) < 2.8 && pos.z >= -1.5) {
        this.switchZone('outdoor', 1);
        return;
      }
      if (distToExit <= 2.8) {
        this.activeInteraction = {
          kind: 'portal',
          data: 'exit_museum',
          promptText: 'Ra Ngoài Sân Quảng Trường',
          highlightId: null
        };
        return;
      }
    }

    // 2. Kiểm tra các điểm tương tác đặc biệt (Thang lên/xuống tầng 2, Chào cờ, Bàn Tưởng niệm, Sổ lưu niệm)
    for (const spec of Object.values(SPECIAL_INTERACTIONS)) {
      if (spec.zoneType !== this.currentZone || spec.floor !== this.currentFloor) continue;
      const d = Math.hypot(pos.x - spec.position.x, pos.z - spec.position.z);
      if (d <= spec.radius) {
        this.activeInteraction = {
          kind: 'special',
          data: spec,
          promptText: spec.promptText,
          highlightId: spec.id
        };
        return;
      }
    }

    // 3. Kiểm tra các Băng ghế đá / ghế gỗ mộc & Ghế Rạp Chiếu Phim Tư Liệu (chọn ghế gần nhất)
    let nearestBench = null;
    let nearestBenchDist = Infinity;
    for (const bench of BENCHES_DATA) {
      if (bench.zoneType !== this.currentZone || bench.floor !== this.currentFloor) continue;
      const d = Math.hypot(pos.x - bench.x, pos.z - bench.z);
      const reach = bench.isTheaterBench ? 1.55 : 1.75;
      if (d <= reach && d < nearestBenchDist) {
        nearestBench = bench;
        nearestBenchDist = d;
      }
    }
    if (nearestBench) {
      const bench = nearestBench;
      let promptLabel = `Ngồi nghỉ: ${bench.label}`;
      if (bench.isTheaterBench) {
        promptLabel = this.isSitting
          ? 'Xem phim tư liệu [E] • Đứng dậy [WASD]'
          : `Ngồi xem phim tư liệu (${bench.label})`;
      } else if (this.isSitting) {
        promptLabel = 'Đứng dậy (WASD / E)';
      }

      this.activeInteraction = {
        kind: 'bench',
        data: bench,
        promptText: promptLabel,
        highlightId: bench.isTheaterBench ? 'special-theater-screen' : null
      };
      return;
    }

    // 4. Kiểm tra các Hiện vật lịch sử thuộc tầng hiện tại
    let closestExhibit = null;
    let minDistance = Infinity;

    for (const exhibit of EXHIBITS_DATA) {
      if (exhibit.zoneType !== this.currentZone || exhibit.floor !== this.currentFloor) continue;
      const radius = exhibit.interactRadius || PLAYER_CONFIG.INTERACT_RADIUS;
      const distance = Math.hypot(pos.x - exhibit.position.x, pos.z - exhibit.position.z);

      if (distance <= radius && distance < minDistance) {
        minDistance = distance;
        closestExhibit = exhibit;
      }
    }

    if (closestExhibit) {
      this.activeInteraction = {
        kind: 'exhibit',
        data: closestExhibit,
        promptText: `Xem: ${closestExhibit.title}`,
        highlightId: closestExhibit.id
      };
    }
  }

  setVehicle(type) {
    this.currentVehicle = type || null;
    this.character.setVehicle(this.currentVehicle);
  }

  update(dt) {
    if (!this.character) return;

    // Đếm ngược thời gian đứng nghiêm Chào cờ 5 giây
    if (this.saluteLockTimer > 0) {
      this.saluteLockTimer = Math.max(0, this.saluteLockTimer - dt);
    }

    // Đếm ngược thời gian đứng trên tháp pháo Xe tăng T-54B vẫy cờ 5.5 giây
    if (this.tankClimbTimer > 0) {
      this.tankClimbTimer = Math.max(0, this.tankClimbTimer - dt);
      if (this.tankClimbTimer <= 0) {
        // Nhảy xuống mặt đất an toàn phía trước mũi xe tăng T-54B
        this.character.root.position.set(-17.6, 0, 28.2);
      }
    }

    let inputX = 0;
    let inputZ = 0;

    const canMove =
      !this.isModalOpen &&
      !this.isCinemaOpen &&
      !this.isQuizOpen &&
      !this.isPackbikeOpen &&
      !this.isArtilleryOpen &&
      !this.isVehicleModalOpen &&
      !this.isQuizLeaderboardOpen &&
      !this.isTourActive &&
      !this.isSitting &&
      this.saluteLockTimer <= 0 &&
      this.tankClimbTimer <= 0;

    if (canMove) {
      if (this.keys.right) inputX += 1;
      if (this.keys.left) inputX -= 1;
      if (this.keys.backward) inputZ += 1;
      if (this.keys.forward) inputZ -= 1;

      if (Math.hypot(this.joystickVector.x, this.joystickVector.z) > 0.05) {
        inputX += this.joystickVector.x;
        inputZ += this.joystickVector.z;
      }
    }

    const length = Math.hypot(inputX, inputZ);
    this.isMoving = length > 0.01;

    if (this.isMoving) {
      const normX = inputX / length;
      const normZ = inputZ / length;

      const currentPos = this.character.root.position;
      const speedMul = this.currentVehicle ? (VEHICLE_TYPES[this.currentVehicle]?.speedMul || 1.0) : 1.0;
      const candidateX = currentPos.x + normX * PLAYER_CONFIG.MOVE_SPEED * speedMul * dt;
      const candidateZ = currentPos.z + normZ * PLAYER_CONFIG.MOVE_SPEED * speedMul * dt;

      const resolved = this.resolveCollisions(candidateX, candidateZ);
      currentPos.x = resolved.x;
      currentPos.z = resolved.z;
      currentPos.y = this.currentFloor === 2 ? PLAYER_CONFIG.SECOND_FLOOR_Y : 0;

      const targetAngle = Math.atan2(normX, normZ);
      this.character.root.rotation.y = PlayerController.lerpAngleShortest(
        this.character.root.rotation.y,
        targetAngle,
        Math.min(1, dt * 14)
      );
    }

    this.character.updateProceduralAnimation(dt, this.isMoving, this.isSitting);
    this.checkProximityAndInteractions();
  }
}
