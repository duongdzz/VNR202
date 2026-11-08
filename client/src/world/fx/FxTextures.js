import * as THREE from 'three';

let glowTexture = null;

/**
 * Texture quầng sáng tròn mờ dần (radial gradient) dùng chung cho hạt pháo hoa, ngọn nến, hào quang hoa
 * và các "vệt sáng giả" (fake light decal) của cột đèn / đèn rọi — rẻ hơn nhiều so với PointLight thời gian thực.
 */
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/**
 * Tạo mặt phẳng nằm ngang phát sáng (decal ánh sáng giả) đặt trên sàn/mặt bàn/mặt cỏ.
 */
export function createGlowDecal(radius, colorHex, opacity = 0.4) {
  const mat = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color: colorHex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * Tạo Sprite phát sáng cộng màu (additive) luôn quay mặt về camera.
 */
export function createGlowSprite(colorHex, scale = 1, opacity = 0.6) {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: colorHex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(scale);
  return sprite;
}
