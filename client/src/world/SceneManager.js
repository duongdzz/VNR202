import * as THREE from 'three';
import { PALETTE, PLAYER_CONFIG } from '../constants.js?v=19';

/**
 * SceneManager: Quản lý Three.js Scene, Renderer, Ánh sáng phong cách "How to Fish",
 * Chuyển đổi Thời gian Ngày / Hoàng Hôn / Đêm, và Góc nhìn Camera tự do mượt mà.
 */
export class SceneManager {
  constructor(container) {
    this.container = container;
    this.currentZone = 'outdoor';
    this.timeOfDay = 'day'; // 'day' | 'sunset' | 'night'

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.BG_FOG);
    this.scene.fog = new THREE.FogExp2(PALETTE.BG_FOG, 0.009);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    // Gắn AudioListener vào Camera để hỗ trợ Âm thanh Không gian 3D (PositionalAudio) tại Rạp chiếu phim
    this.audioListener = new THREE.AudioListener();
    this.camera.add(this.audioListener);

    this.outdoorOffset = new THREE.Vector3(0, 11.2, 16.5);
    this.indoorOffset = new THREE.Vector3(0, 11.5, 13.5);

    this.currentLookAt = new THREE.Vector3(
      PLAYER_CONFIG.SPAWN_POS.x,
      1.8,
      PLAYER_CONFIG.SPAWN_POS.z - 5
    );
    this.camera.position
      .set(PLAYER_CONFIG.SPAWN_POS.x, 0, PLAYER_CONFIG.SPAWN_POS.z)
      .add(this.outdoorOffset);
    this.camera.lookAt(this.currentLookAt);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    SceneManager.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  /**
   * Cấu hình texture sắc nét: mipmap trilinear + anisotropic filtering, không nhòe khi nhìn nghiêng / lại gần.
   */
  static sharpenTexture(tex) {
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = SceneManager.maxAnisotropy || 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  static createFlatMaterial(hexColor, extraParams = {}) {
    return new THREE.MeshStandardMaterial({
      color: hexColor,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.1,
      ...extraParams
    });
  }

  /**
   * Tạo Mesh Ngôi sao 5 cánh 3D chuẩn tỉ lệ (ExtrudeGeometry mỏng) màu vàng tươi (#FFE600)
   */
  static createStarMesh(
    outerRadius = 0.35,
    innerRadius = null,
    depth = 0.04,
    material = null
  ) {
    const shape = new THREE.Shape();
    const spikes = 5;
    const actualInner = innerRadius !== null ? innerRadius : outerRadius * 0.382;

    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : actualInner;
      const angle = (i * Math.PI) / spikes + Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false
    });
    geo.center();

    const mat =
      material ||
      SceneManager.createFlatMaterial(PALETTE.BRIGHT_STAR_YELLOW, {
        roughness: 0.4,
        metalness: 0.15,
        emissive: PALETTE.BRIGHT_STAR_YELLOW,
        emissiveIntensity: 0.18
      });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  setupLights() {
    this.ambientLight = new THREE.AmbientLight(PALETTE.AMBIENT_LIGHT, 0.74);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff9eb, 0x7d6b57, 0.32);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(PALETTE.DIR_LIGHT, 1.38);
    this.dirLight.position.set(28, 38, 32);
    this.dirLight.castShadow = true;

    const d = 46;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 120;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.bias = -0.0005;

    this.scene.add(this.dirLight);
  }

  /**
   * TÍNH NĂNG 3: Chuyển đổi Thời gian Ngày / Hoàng Hôn / Ban Đêm (Lễ hội)
   */
  setTimeOfDay(mode = 'day') {
    this.timeOfDay = mode;
    this.applyAtmosphereAndLighting();
  }

  setZoneAtmosphere(zone) {
    this.currentZone = zone;
    this.applyAtmosphereAndLighting();
  }

  applyAtmosphereAndLighting() {
    const isIndoor = this.currentZone === 'indoor';
    const mode = this.timeOfDay || 'day';

    if (isIndoor) {
      if (mode === 'night') {
        this.scene.background.setHex(0x231d18);
        this.scene.fog.color.setHex(0x231d18);
        this.scene.fog.density = 0.011;
        this.ambientLight.color.setHex(0xffe9c4);
        this.ambientLight.intensity = 0.78;
        this.dirLight.color.setHex(0xffd28a);
        this.dirLight.intensity = 0.95;
      } else if (mode === 'sunset') {
        this.scene.background.setHex(0xdfd0bc);
        this.scene.fog.color.setHex(0xdfd0bc);
        this.scene.fog.density = 0.012;
        this.ambientLight.color.setHex(0xffe5c2);
        this.ambientLight.intensity = 0.76;
        this.dirLight.color.setHex(0xffb570);
        this.dirLight.intensity = 1.22;
      } else {
        this.scene.background.setHex(PALETTE.BG_INDOOR);
        this.scene.fog.color.setHex(PALETTE.BG_INDOOR);
        this.scene.fog.density = 0.012;
        this.ambientLight.color.setHex(PALETTE.AMBIENT_LIGHT);
        this.ambientLight.intensity = 0.76;
        this.dirLight.color.setHex(PALETTE.DIR_LIGHT);
        this.dirLight.intensity = 1.38;
      }
    } else {
      if (mode === 'night') {
        this.scene.background.setHex(0x0f192b);
        this.scene.fog.color.setHex(0x0f192b);
        this.scene.fog.density = 0.0082;
        this.ambientLight.color.setHex(0x88a8d8);
        this.ambientLight.intensity = 0.52;
        this.dirLight.color.setHex(0xffdf9e);
        this.dirLight.intensity = 0.86;
      } else if (mode === 'sunset') {
        this.scene.background.setHex(0xdc9374);
        this.scene.fog.color.setHex(0xdc9374);
        this.scene.fog.density = 0.009;
        this.ambientLight.color.setHex(0xffdfc2);
        this.ambientLight.intensity = 0.68;
        this.dirLight.color.setHex(0xff9e54);
        this.dirLight.intensity = 1.35;
      } else {
        this.scene.background.setHex(PALETTE.BG_FOG);
        this.scene.fog.color.setHex(PALETTE.BG_FOG);
        this.scene.fog.density = 0.009;
        this.ambientLight.color.setHex(PALETTE.AMBIENT_LIGHT);
        this.ambientLight.intensity = 0.74;
        this.dirLight.color.setHex(PALETTE.DIR_LIGHT);
        this.dirLight.intensity = 1.38;
      }
    }
  }

  updateCamera(targetPosition, dt, { isSitting = false, saluteMode = false, tourCamera = null } = {}) {
    if (!targetPosition) return;

    if (tourCamera && tourCamera.camPos && tourCamera.lookAt) {
      const targetFov = 58;
      if (Math.abs(this.camera.fov - targetFov) > 0.1) {
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
        this.camera.updateProjectionMatrix();
      }
      const smoothTour = 1.0 - Math.exp(-3.6 * dt);
      this.camera.position.lerp(tourCamera.camPos, smoothTour);
      this.currentLookAt.lerp(tourCamera.lookAt, smoothTour);
      this.camera.lookAt(this.currentLookAt);
      return;
    }

    const normalFov = 50;
    if (Math.abs(this.camera.fov - normalFov) > 0.1) {
      this.camera.fov += (normalFov - this.camera.fov) * Math.min(1, dt * 5);
      this.camera.updateProjectionMatrix();
    }

    const isOutdoor = this.currentZone === 'outdoor';
    const baseOffset = isOutdoor ? this.outdoorOffset : this.indoorOffset;

    const sitSideShift = isSitting ? 2.6 : saluteMode ? -2.0 : 0;
    const sitHeightShift = isSitting ? -2.0 : saluteMode ? -1.4 : 0;
    const sitZoomShift = isSitting ? -2.2 : 0;

    const desiredLookAt = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y + (isOutdoor ? 2.2 : 1.0) + (saluteMode ? 2.2 : 0),
      targetPosition.z - (isOutdoor ? 5.2 : 1.5)
    );

    const desiredCamPos = new THREE.Vector3(
      targetPosition.x + baseOffset.x + sitSideShift,
      targetPosition.y + baseOffset.y + sitHeightShift,
      targetPosition.z + baseOffset.z + sitZoomShift
    );

    const smoothFactor = 1.0 - Math.exp(-5.8 * dt);
    this.camera.position.lerp(desiredCamPos, smoothFactor);
    this.currentLookAt.lerp(desiredLookAt, smoothFactor);
    this.camera.lookAt(this.currentLookAt);
  }

  snapCameraTo(targetPosition) {
    const isOutdoor = this.currentZone === 'outdoor';
    const offset = isOutdoor ? this.outdoorOffset : this.indoorOffset;
    this.currentLookAt.set(
      targetPosition.x,
      targetPosition.y + (isOutdoor ? 2.2 : 1.0),
      targetPosition.z - (isOutdoor ? 5.2 : 1.5)
    );
    this.camera.position.set(
      targetPosition.x + offset.x,
      targetPosition.y + offset.y,
      targetPosition.z + offset.z
    );
    this.camera.lookAt(this.currentLookAt);
  }

  projectToScreen(worldPos) {
    const vector = worldPos.clone().project(this.camera);
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    return {
      x: vector.x * halfWidth + halfWidth,
      y: -(vector.y * halfHeight) + halfHeight,
      visible: vector.z < 1
    };
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
