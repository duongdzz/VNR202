import * as THREE from 'three';
import {
  EXHIBITS_DATA,
  SPECIAL_INTERACTIONS,
  PLAYER_CONFIG,
  DOCUMENTARY_CHAPTERS,
  HIDDEN_STARS_DATA,
  QUIZ_QUESTIONS_DATA,
  GUIDED_TOUR_STATIONS,
  REVOLUTIONARY_SONGS_DATA,
  TIMELINE_MILESTONES_DATA,
  VEHICLE_TYPES
} from './constants.js?v=19';
import { SceneManager } from './world/SceneManager.js?v=19';
import { MuseumMap } from './world/MuseumMap.js?v=19';
import { CharacterMesh } from './world/CharacterMesh.js?v=19';
import { PlayerController } from './controllers/PlayerController.js?v=19';
import { SocketHandler } from './network/SocketHandler.js?v=19';

/**
 * Vẽ bản đồ Minimap 2D hỗ trợ Ngoài sân, Tầng 1 và Tầng 2 (Mezzanine)
 */
function renderMinimap(canvas, localCharacter, remotePlayers, currentZone, currentFloor, collectedStarIds) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const mapX = (worldX) => ((worldX + 43) / 99) * (w - 16) + 8;
  const mapZ = (worldZ) => ((worldZ + 39) / 84) * (h - 16) + 8;

  // 1. Khung Nhà Triển lãm mở rộng (X từ -32 đến +32, Z từ -38 đến 0)
  ctx.fillStyle =
    currentZone === 'indoor' ? 'rgba(223, 215, 198, 0.3)' : 'rgba(223, 215, 198, 0.1)';
  ctx.strokeStyle = currentZone === 'indoor' ? '#d99b26' : 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  const inX = mapX(-32);
  const inY = mapZ(-38);
  const inW = mapX(32) - inX;
  const inH = mapZ(0) - inY;
  ctx.fillRect(inX, inY, inW, inH);
  ctx.strokeRect(inX, inY, inW, inH);

  // Phòng Chiếu Phim Tư Liệu (30 chỗ) cánh Đông Tầng 1
  if (currentZone === 'indoor' && currentFloor === 1) {
    const cinX = mapX(31.6);
    const cinY = mapZ(-30);
    const cinW = mapX(52.8) - cinX;
    const cinH = mapZ(-6) - cinY;
    ctx.fillStyle = 'rgba(140, 27, 34, 0.28)';
    ctx.strokeStyle = '#d99b26';
    ctx.fillRect(cinX, cinY, cinW, cinH);
    ctx.strokeRect(cinX, cinY, cinW, cinH);
    ctx.fillStyle = 'rgba(255, 249, 235, 0.75)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RẠP PHIM', cinX + cinW / 2, cinY + cinH / 2 + 3);
  }

  // Nếu đang ở Tầng 2, vẽ thêm khung Giếng trời (Mezzanine Void) ở giữa Tầng 2
  if (currentZone === 'indoor' && currentFloor === 2) {
    const voidX = mapX(-13);
    const voidY = mapZ(-18);
    const voidW = mapX(13) - voidX;
    const voidH = mapZ(-3.5) - voidY;
    ctx.fillStyle = 'rgba(25, 22, 18, 0.65)';
    ctx.fillRect(voidX, voidY, voidW, voidH);
    ctx.strokeStyle = '#8c6239';
    ctx.strokeRect(voidX, voidY, voidW, voidH);
  }

  ctx.fillStyle = 'rgba(255, 249, 235, 0.5)';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    currentZone === 'indoor' && currentFloor === 2
      ? 'TẦNG 2 (1954 – NAY)'
      : 'NHÀ TRIỂN LÃM (TẦNG 1)',
    w / 2,
    inY + 11
  );

  // 2. Khung Quảng trường Ngoài sân (X từ -42 đến +42, Z từ 2 đến 44)
  ctx.fillStyle =
    currentZone === 'outdoor' ? 'rgba(127, 166, 104, 0.24)' : 'rgba(127, 166, 104, 0.08)';
  ctx.strokeStyle = currentZone === 'outdoor' ? '#7fa668' : 'rgba(255, 255, 255, 0.18)';
  const outX = mapX(-42);
  const outY = mapZ(2);
  const outW = mapX(42) - outX;
  const outH = mapZ(44) - outY;
  ctx.fillRect(outX, outY, outW, outH);
  ctx.strokeRect(outX, outY, outW, outH);

  // Trục đại lộ & Cổng chính
  ctx.fillStyle = 'rgba(229, 224, 213, 0.2)';
  ctx.fillRect(mapX(-4.0), mapZ(3), mapX(4.0) - mapX(-4.0), mapZ(43) - mapZ(3));
  ctx.fillStyle = '#c82323';
  ctx.fillRect(mapX(-4), mapZ(0) - 2, mapX(4) - mapX(-4), 4);

  // 3. Vẽ các chấm Hiện vật thuộc Tầng hiện tại (Màu vàng)
  for (const ex of EXHIBITS_DATA) {
    const isVisibleFloor =
      ex.zoneType === currentZone &&
      (ex.zoneType === 'outdoor' || ex.floor === currentFloor);
    const px = mapX(ex.position.x);
    const pz = mapZ(ex.position.z);

    ctx.beginPath();
    ctx.arc(px, pz, isVisibleFloor ? 3.3 : 2.2, 0, Math.PI * 2);
    ctx.fillStyle = isVisibleFloor ? '#f2b705' : 'rgba(242, 183, 5, 0.25)';
    ctx.fill();
  }

  // 4. Vẽ các Điểm tương tác đặc biệt (Cầu thang Tầng 2, Chào cờ, Thắp nến, Sổ lưu niệm, Đố vui, Hoa đăng)
  for (const spec of Object.values(SPECIAL_INTERACTIONS)) {
    if (spec.zoneType !== currentZone || spec.floor !== currentFloor) continue;
    const sx = mapX(spec.position.x);
    const sz = mapZ(spec.position.z);
    ctx.beginPath();
    ctx.arc(sx, sz, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5964';
    ctx.fill();
  }

  // 4b. Vẽ các Ngôi sao vàng ẩn chưa thu thập ở tầng hiện tại
  if (collectedStarIds) {
    for (const star of HIDDEN_STARS_DATA) {
      if (collectedStarIds.has(star.id)) continue;
      if (star.zoneType !== currentZone || (star.zoneType === 'indoor' && star.floor !== currentFloor)) continue;
      const stx = mapX(star.position.x);
      const stz = mapZ(star.position.z);
      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', stx, stz + 3);
    }
  }

  // 5. Vẽ người chơi khác (Màu xanh dương)
  for (const remote of remotePlayers.values()) {
    const rx = mapX(remote.mesh.root.position.x);
    const rz = mapZ(remote.mesh.root.position.z);
    ctx.beginPath();
    ctx.arc(rx, rz, 3.3, 0, Math.PI * 2);
    ctx.fillStyle = '#4da6ff';
    ctx.fill();
  }

  // 6. Vẽ vị trí của Bạn (Màu đỏ viền trắng + vạch hướng nhìn)
  if (localCharacter) {
    const lx = mapX(localCharacter.root.position.x);
    const lz = mapZ(localCharacter.root.position.z);
    const rotY = localCharacter.root.rotation.y;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, lz);
    ctx.lineTo(lx + Math.sin(rotY) * 8, lz + Math.cos(rotY) * 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(lx, lz, 4.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4d3b';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
}

const exhibitImageCache = new Map();

/**
 * Vẽ tranh minh họa tư liệu lịch sử Đảng cân đối, kích thước lớn (640x340) trong Modal Hiện Vật.
 * Hỗ trợ hiển thị ảnh thật nếu khai báo `imageUrl` trong EXHIBITS_DATA hoặc vẽ đồ họa tư liệu đặc trưng từng hiện vật.
 */
function drawArchivalIllustration(canvas, exhibit, overrideImageUrl = null) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Nền giấy tư liệu cổ điển sang trọng
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.65);
  bgGrad.addColorStop(0, '#f4ecda');
  bgGrad.addColorStop(1, '#dfd2b8');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Khung viền kép trang trọng cân đối toàn khung 640x340
  ctx.strokeStyle = '#a63a2b';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.strokeStyle = '#8c6239';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Nếu hiện vật có cấu hình ảnh riêng (`exhibit.imageUrl`), vẽ ảnh lớn cân đối trong khung 640x340 (HOÀN TOÀN KHÔNG ĐÈ CHỮ LÊN ẢNH)
  const targetUrl = overrideImageUrl || exhibit.imageUrl;
  if (targetUrl) {
    let cached = exhibitImageCache.get(targetUrl);
    if (!cached) {
      const img = new Image();
      img.src = targetUrl;
      cached = { img, loaded: false };
      img.onload = () => {
        cached.loaded = true;
        drawArchivalIllustration(canvas, exhibit, overrideImageUrl);
      };
      exhibitImageCache.set(targetUrl, cached);
    }
    if (cached.loaded) {
      ctx.save();
      const boxX = 16;
      const boxY = 16;
      const boxW = w - 32;
      const boxH = h - 32;

      // Nền tối lịch sự phía sau ảnh để tôn bức ảnh tư liệu gốc
      ctx.fillStyle = '#1b1612';
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Căn chỉnh tỉ lệ ảnh cân đối (vừa khít khung 608x308 mà không bị méo hình và không đè bất kỳ dòng chữ nào lên ảnh)
      const imgW = cached.img.naturalWidth || boxW;
      const imgH = cached.img.naturalHeight || boxH;
      const scale = Math.min(boxW / imgW, boxH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = boxX + (boxW - drawW) / 2;
      const drawY = boxY + (boxH - drawH) / 2;

      ctx.drawImage(cached.img, drawX, drawY, drawW, drawH);
      ctx.restore();
      return;
    } else {
      ctx.fillStyle = '#6e4726';
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Đang tải hình ảnh tư liệu lịch sử...', w / 2, h / 2);
      return;
    }
  }

  // Vòng hào quang đồng tâm lớn phía sau
  ctx.save();
  ctx.translate(w / 2, h / 2 + 8);
  ctx.strokeStyle = 'rgba(166, 58, 43, 0.14)';
  ctx.lineWidth = 2.5;
  for (let r = 60; r <= 150; r += 30) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Vẽ hình minh họa lớn, cân đối theo từng nhóm hiện vật
  const type = exhibit.artifactType || '';
  if (type === 'tank_t54' || type === 'victory_tank_model') {
    // Minh họa Xe tăng Đại thắng tiến vào Dinh Độc Lập kích thước lớn
    ctx.fillStyle = '#4f6342';
    ctx.strokeStyle = '#2a2520';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-155, 18, 310, 56, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#394730';
    for (let wx = -120; wx <= 120; wx += 48) {
      ctx.beginPath();
      ctx.arc(wx, 48, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#5b734c';
    ctx.beginPath();
    ctx.roundRect(-90, -28, 170, 50, 22);
    ctx.fill();
    ctx.stroke();

    // Nòng pháo vươn dài
    ctx.fillStyle = '#394730';
    ctx.fillRect(75, -14, 125, 14);
    ctx.strokeRect(75, -14, 125, 14);

    // Lá cờ Giải phóng / Cờ Tổ quốc tung bay trên tháp pháo
    ctx.fillStyle = '#c82323';
    ctx.fillRect(-35, -92, 96, 58);
    ctx.strokeStyle = '#ffe600';
    ctx.strokeRect(-35, -92, 96, 58);
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 13, -53);
  } else if (type === 'aircraft_an26') {
    // Minh họa Máy bay Không quân Việt Nam kích thước lớn cân đối
    ctx.fillStyle = '#cbd2d9';
    ctx.strokeStyle = '#2a2520';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-170, -22, 340, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3b6e9c';
    ctx.fillRect(-150, -2, 290, 10);

    // Đuôi đứng và Cờ đỏ sao vàng
    ctx.fillStyle = '#cbd2d9';
    ctx.beginPath();
    ctx.moveTo(-155, -22);
    ctx.lineTo(-110, -90);
    ctx.lineTo(-75, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c82323';
    ctx.fillRect(-125, -72, 36, 24);
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', -107, -54);
  } else if (type === 'hanoi_flagpole') {
    // Minh họa Kỳ đài Cột cờ Hà Nội uy nghiêm
    ctx.fillStyle = '#9e3326';
    ctx.strokeStyle = '#2a2520';
    ctx.lineWidth = 3;
    ctx.fillRect(-130, 38, 260, 42);
    ctx.strokeRect(-130, 38, 260, 42);

    ctx.fillStyle = '#d8d6d0';
    ctx.fillRect(-95, -2, 190, 40);
    ctx.strokeRect(-95, -2, 190, 40);

    ctx.fillRect(-26, -92, 52, 90);
    ctx.strokeRect(-26, -92, 52, 90);

    ctx.fillStyle = '#c82323';
    ctx.fillRect(0, -118, 92, 56);
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 46, -80);
  } else {
    // Khung Biểu tượng Cờ Đỏ Sao Vàng / Cờ Đảng cỡ lớn (290x176) cân đối chính giữa khung 640x340
    ctx.fillStyle = '#c82323';
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-145, -88, 290, 176, 16);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(42, 37, 32, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-151, -94, 302, 188, 18);
    ctx.stroke();

    // Ngôi sao 5 cánh vàng tươi lớn (bán kính 64px) chuẩn tỉ lệ
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? 64 : 64 * 0.382;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * rad;
      const y = Math.sin(angle) * rad;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Dải băng tiêu đề tư liệu phía trên
  ctx.fillStyle = '#8c6239';
  ctx.beginPath();
  ctx.roundRect(28, 28, 236, 32, 6);
  ctx.fill();
  ctx.fillStyle = '#fff9eb';
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ TƯ LIỆU LỊCH SỬ ĐẢNG ★', 146, 49);

  // Nhãn thời kỳ ở góc trên phải
  if (exhibit.period) {
    ctx.fillStyle = 'rgba(166, 58, 43, 0.9)';
    ctx.beginPath();
    ctx.roundRect(w - 248, 28, 220, 32, 6);
    ctx.fill();
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(exhibit.period.slice(0, 26), w - 138, 49);
  }

  // Dải băng tên hiện vật nổi bật ở chân khung tranh
  ctx.fillStyle = 'rgba(34, 29, 24, 0.86)';
  ctx.beginPath();
  ctx.roundRect(28, h - 64, w - 56, 38, 8);
  ctx.fill();
  ctx.fillStyle = '#fff9eb';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(exhibit.title, w / 2, h - 40);
}

/**
 * Vẽ trang sách / văn kiện lịch sử lật trang trực tiếp trên khung Canvas 640x340 (Tính năng 3)
 */
function drawInteractiveBookPage(canvas, pageData, pageIdx, totalPages) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Nền bàn gỗ gụ + trang giấy cổ mở đôi
  ctx.fillStyle = '#3a2314';
  ctx.fillRect(0, 0, w, h);

  const pageGrad = ctx.createLinearGradient(34, 22, w - 34, h - 22);
  pageGrad.addColorStop(0, '#f7eed7');
  pageGrad.addColorStop(0.5, '#efe1c1');
  pageGrad.addColorStop(1, '#f5ebd2');
  ctx.fillStyle = pageGrad;
  ctx.beginPath();
  ctx.roundRect(28, 18, w - 56, h - 36, 10);
  ctx.fill();

  ctx.strokeStyle = '#a63a2b';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 26, w - 72, h - 52);

  // Gáy sách trang trí phía trái
  ctx.fillStyle = 'rgba(140, 98, 57, 0.25)';
  ctx.fillRect(38, 28, 22, h - 56);

  // Quốc huy / Sao vàng nhỏ đầu trang
  ctx.fillStyle = '#c82323';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 190, 40, 380, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#ffe600';
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`★ ${pageData.heading} ★`, w / 2, 62);

  ctx.fillStyle = '#7a2519';
  ctx.font = 'italic bold 15px "Segoe UI", sans-serif';
  ctx.fillText(pageData.sub, w / 2, 96);

  // Đường kẻ phân cách cổ điển
  ctx.strokeStyle = '#8c6239';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(90, 110);
  ctx.lineTo(w - 90, 110);
  ctx.stroke();

  // Nội dung văn kiện chữ nét rõ ràng, dễ đọc
  ctx.fillStyle = '#241c15';
  ctx.font = '16.5px "Segoe UI", Georgia, serif';
  const words = pageData.body.split(' ');
  let line = '';
  let ty = 144;
  const maxW = w - 140;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line.trim(), w / 2, ty);
      line = word + ' ';
      ty += 27;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), w / 2, ty);

  // Số trang ở chân sách
  ctx.fillStyle = '#6e4726';
  ctx.font = 'bold 13px "Segoe UI", sans-serif';
  ctx.fillText(`— Trang tư liệu gốc ${pageIdx + 1} / ${totalPages} —`, w / 2, h - 40);
}

/**
 * Phát âm thanh chuông vàng / kèn hiệu lịch sử bằng WebAudio API (không cần file rời)
 */
function playCelebrationAudio(audioListener, type = 'star') {
  try {
    const ctx = audioListener?.context;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const notes =
      type === 'declaration'
        ? [261.63, 329.63, 392.0, 523.25, 392.0, 523.25]
        : type === 'quiz_win'
        ? [392.0, 493.88, 587.33, 783.99]
        : [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'declaration' ? 'sawtooth' : 'triangle';
      const startT = ctx.currentTime + idx * (type === 'declaration' ? 0.22 : 0.09);
      const dur = type === 'declaration' ? 0.28 : 0.22;
      osc.frequency.setValueAtTime(freq, startT);
      gain.gain.setValueAtTime(0.0001, startT);
      gain.gain.linearRampToValueAtTime(0.06, startT + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startT);
      osc.stop(startT + dur + 0.02);
    });
  } catch {
    // Bỏ qua nếu trình duyệt chặn tự phát âm thanh
  }
}

/**
 * Khởi tạo ứng dụng Triển lãm Lịch sử Đảng Cộng sản Việt Nam 3D
 */
async function bootstrap() {
  const container = document.getElementById('canvas-container');
  const uiLayer = document.getElementById('ui-layer');
  const photoModeHint = document.getElementById('photo-mode-hint');
  const roomStatusText = document.getElementById('room-status-text');
  const interactPrompt = document.getElementById('interact-prompt');
  const interactLabel = document.getElementById('interact-label');
  const minimapCanvas = document.getElementById('minimap-canvas');
  const minimapZoneLabel = document.getElementById('minimap-zone-label');
  const toastBanner = document.getElementById('toast-banner');

  const notebookProgressText = document.getElementById('notebook-progress-text');
  const notebookBarFill = document.getElementById('notebook-bar-fill');
  const totalExhibitsCount = EXHIBITS_DATA.length;
  const discoveredIds = new Set(
    JSON.parse(localStorage.getItem('party_museum_discovered') || '[]')
  );

  // TÍNH NĂNG 1: Truy tìm 8 Huy Hiệu Sao Vàng Lịch Sử (Sau khi nhặt đủ 8 rồi, thoát ra quay lại sẽ không bao giờ spawn lại nữa)
  const starsProgressText = document.getElementById('stars-progress-text');
  const starsBarFill = document.getElementById('stars-bar-fill');
  const totalStarsCount = HIDDEN_STARS_DATA.length;
  const validStarIds = new Set(HIDDEN_STARS_DATA.map((s) => s.id));
  const rawSavedStars = JSON.parse(localStorage.getItem('party_museum_stars') || '[]');
  const isAllStarsPermanentlyDone =
    localStorage.getItem('party_museum_all_stars_collected') === 'true' ||
    rawSavedStars.filter((id) => validStarIds.has(id)).length >= totalStarsCount;

  const collectedStarIds = new Set(
    isAllStarsPermanentlyDone
      ? HIDDEN_STARS_DATA.map((s) => s.id)
      : rawSavedStars.filter((id) => validStarIds.has(id))
  );

  if (isAllStarsPermanentlyDone) {
    localStorage.setItem('party_museum_all_stars_collected', 'true');
    localStorage.setItem('party_museum_stars', JSON.stringify(Array.from(collectedStarIds)));
  }

  const updateNotebookUI = () => {
    const count = discoveredIds.size;
    const pct = Math.min(100, Math.round((count / totalExhibitsCount) * 100));
    notebookProgressText.textContent = `Đã khám phá: ${count}/${totalExhibitsCount} hiện vật (${pct}%)`;
    notebookBarFill.style.width = `${pct}%`;
  };
  updateNotebookUI();

  const optPithBackpack = document.getElementById('opt-pith-backpack');
  const optConicalBackpack = document.getElementById('opt-conical-backpack');

  const updateStarsUI = () => {
    if (!starsProgressText || !starsBarFill) return;
    const count = collectedStarIds.size;
    const isAllCollected = count >= totalStarsCount;
    const pct = Math.min(100, Math.round((count / totalStarsCount) * 100));
    starsProgressText.textContent = isAllCollected
      ? `Huy hiệu Sao Vàng: ${count}/${totalStarsCount} (ĐÃ MỞ KHÓA BALO CHIẾN SĨ!)`
      : `Sao Vàng ẩn: ${count}/${totalStarsCount} • Cần đủ 8/8 để mở Balo`;
    starsBarFill.style.width = `${pct}%`;

    // Chỉ mở khóa 2 trang phục Balo Chiến Sĩ khi đã thu thập đủ 8/8 ngôi sao
    if (optPithBackpack) {
      optPithBackpack.disabled = !isAllCollected;
      optPithBackpack.textContent = isAllCollected
        ? '🎖️ Mũ cối + Balo Chiến Sĩ ★ (Đã mở khóa)'
        : `🔒 Mũ cối + Balo Chiến Sĩ (Cần ${count}/${totalStarsCount} ★)`;
    }
    if (optConicalBackpack) {
      optConicalBackpack.disabled = !isAllCollected;
      optConicalBackpack.textContent = isAllCollected
        ? '🎖️ Nón lá + Balo Chiến Sĩ ★ (Đã mở khóa)'
        : `🔒 Nón lá + Balo Chiến Sĩ (Cần ${count}/${totalStarsCount} ★)`;
    }
  };
  updateStarsUI();

  let toastTimer = null;
  const showToast = (msg, durationMs = 3600) => {
    toastBanner.textContent = msg;
    toastBanner.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastBanner.classList.add('hidden'), durationMs);
  };

  // Modal Hiện vật & Thanh nút Tương tác sâu (Tính năng 3)
  const modalBackdrop = document.getElementById('exhibit-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalZone = document.getElementById('modal-zone');
  const modalTitle = document.getElementById('modal-title');
  const modalPeriod = document.getElementById('modal-period');
  const modalSummary = document.getElementById('modal-summary');
  const modalCaption = document.getElementById('modal-caption');
  const modalStamp = document.getElementById('modal-stamp');
  const restorationCanvas = document.getElementById('restoration-canvas');
  const artifact3dCanvas = document.getElementById('artifact-3d-canvas');
  const artifact3dHint = document.getElementById('artifact-3d-hint');
  const modalInteractiveBar = document.getElementById('modal-interactive-bar');

  // Modal Đố Vui Lịch Sử (Tính năng 2)
  const quizBackdrop = document.getElementById('quiz-modal');
  const quizCloseBtn = document.getElementById('quiz-close-btn');
  const quizStepBadge = document.getElementById('quiz-step-badge');
  const quizScoreBadge = document.getElementById('quiz-score-badge');
  const quizQuestionPanel = document.getElementById('quiz-question-panel');
  const quizResultPanel = document.getElementById('quiz-result-panel');
  const quizResultTitle = document.getElementById('quiz-result-title');
  const quizResultSummary = document.getElementById('quiz-result-summary');
  const quizQuestionText = document.getElementById('quiz-question-text');
  const quizOptionsGrid = document.getElementById('quiz-options-grid');
  const quizExplanationBox = document.getElementById('quiz-explanation-box');
  const quizNextBtn = document.getElementById('quiz-next-btn');
  const quizRetryBtn = document.getElementById('quiz-retry-btn');
  const quizResultScore = document.getElementById('quiz-result-score');
  const quizResultTime = document.getElementById('quiz-result-time');
  const quizResultRankBadge = document.getElementById('quiz-result-rank-badge');
  const quizPlayerNameInput = document.getElementById('quiz-player-name-input');
  const quizSubmitLeaderboardBtn = document.getElementById('quiz-submit-leaderboard-btn');
  const quizSubmitStatus = document.getElementById('quiz-submit-status');
  const quizViewLeaderboardBtn = document.getElementById('quiz-view-leaderboard-btn');

  // Modal Bảng Vinh Danh Top 10 (Leaderboard Modal)
  const quizLeaderboardModal = document.getElementById('quiz-leaderboard-modal');
  const quizLeaderboardCloseBtn = document.getElementById('quiz-leaderboard-close-btn');
  const quizLeaderboardTbody = document.getElementById('quiz-leaderboard-tbody');

  // Modal Bãi Gửi Xe (Vehicle Modal)
  const vehicleModal = document.getElementById('vehicle-modal');
  const vehicleCloseBtn = document.getElementById('vehicle-close-btn');
  const vehicleProgressDesc = document.getElementById('vehicle-progress-desc');
  const vehicleCardsGrid = document.getElementById('vehicle-cards-grid');

  // Nút bật/tắt Bản đồ thu nhỏ (Minimap) & Cài đặt / GPS riêng
  const minimapHeaderBar = document.getElementById('minimap-header-bar');
  const minimapToggleBtn = document.getElementById('minimap-toggle-btn');
  const minimapBody = document.getElementById('minimap-body');
  let isMinimapCollapsed = false;
  const toggleMinimap = () => {
    isMinimapCollapsed = !isMinimapCollapsed;
    minimapBody?.classList.toggle('collapsed', isMinimapCollapsed);
    if (minimapToggleBtn) {
      minimapToggleBtn.textContent = isMinimapCollapsed ? '+' : '−';
    }
  };
  minimapHeaderBar?.addEventListener('click', () => toggleMinimap());

  // Modal Rạp Chiếu Phim Tư Liệu 2D (Cinema Documentary View)
  const cinemaBackdrop = document.getElementById('cinema-modal');
  const cinemaCloseBtn = document.getElementById('cinema-close-btn');
  const cinemaChapterTitle = document.getElementById('cinema-chapter-title');
  const cinemaTabInteractive = document.getElementById('cinema-tab-interactive');
  const cinemaTabYoutube = document.getElementById('cinema-tab-youtube');
  const cinemaPlayerCanvas = document.getElementById('cinema-player-canvas');
  const cinemaYoutubeIframe = document.getElementById('cinema-youtube-iframe');
  const cinemaControlsBar = document.getElementById('cinema-controls-bar');
  const cinemaPlayBtn = document.getElementById('cinema-play-btn');
  const cinemaSeekSlider = document.getElementById('cinema-seek-slider');
  const cinemaTimeLabel = document.getElementById('cinema-time-label');
  const cinemaVolumeSlider = document.getElementById('cinema-volume-slider');
  const cinemaChapterList = document.getElementById('cinema-chapter-list');

  // 1. Khởi tạo 3D Scene & Map Triển lãm 2 Tầng ngay lập tức (kèm AudioListener cho PositionalAudio)
  const sceneManager = new SceneManager(container);
  const museumMap = new MuseumMap(sceneManager.scene, sceneManager.audioListener);

  let isPhotoMode = false;

  // Xóa vĩnh viễn các Ngôi sao vàng đã thu thập từ phiên trước để không bao giờ spawn lại
  for (const starId of collectedStarIds) {
    museumMap.exhibitsManager?.markStarCollected?.(starId, true);
  }

  // =========================================================================
  // TÍNH NĂNG 3: BỘ XEM XOAY NGẮM HIỆN VẬT 3D 360° TRONG MODAL (3D TURNTABLE)
  // =========================================================================
  const inspect3DState = {
    isActive: false,
    renderer: null,
    scene: null,
    camera: null,
    turntableGroup: null,
    modelMesh: null,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    rotY: 0.45,
    rotX: 0.16,
    camDistance: 4.8
  };

  const ensureInspect3DInitialized = () => {
    if (inspect3DState.renderer || !artifact3dCanvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: artifact3dCanvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(640, 340, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 640 / 340, 0.1, 50);
    camera.position.set(0, 1.15, inspect3DState.camDistance);
    camera.lookAt(0, 0.1, 0);

    scene.add(new THREE.AmbientLight(0xfff4dc, 1.35));
    const keyLight = new THREE.DirectionalLight(0xfff8e7, 1.65);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffd27d, 0.9);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    const turntableGroup = new THREE.Group();
    // Đế xoay tròn viền đồng vàng sang trọng dưới chân hiện vật
    const baseDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.58, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x4a321f, roughness: 0.6 })
    );
    baseDisc.position.y = -0.92;
    const goldRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.035, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0xffe600 })
    );
    goldRim.rotation.x = Math.PI / 2;
    goldRim.position.y = -0.86;
    turntableGroup.add(baseDisc, goldRim);
    scene.add(turntableGroup);

    artifact3dCanvas.addEventListener('pointerdown', (e) => {
      inspect3DState.isDragging = true;
      inspect3DState.lastPointerX = e.clientX;
      inspect3DState.lastPointerY = e.clientY;
      artifact3dCanvas.setPointerCapture?.(e.pointerId);
    });

    artifact3dCanvas.addEventListener('pointermove', (e) => {
      if (!inspect3DState.isDragging) return;
      const dx = e.clientX - inspect3DState.lastPointerX;
      const dy = e.clientY - inspect3DState.lastPointerY;
      inspect3DState.lastPointerX = e.clientX;
      inspect3DState.lastPointerY = e.clientY;
      inspect3DState.rotY += dx * 0.012;
      inspect3DState.rotX = Math.max(-0.45, Math.min(0.65, inspect3DState.rotX + dy * 0.008));
    });

    const stopDrag = () => {
      inspect3DState.isDragging = false;
    };
    artifact3dCanvas.addEventListener('pointerup', stopDrag);
    artifact3dCanvas.addEventListener('pointercancel', stopDrag);

    artifact3dCanvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        inspect3DState.camDistance = Math.max(
          2.6,
          Math.min(7.8, inspect3DState.camDistance + e.deltaY * 0.004)
        );
      },
      { passive: false }
    );

    inspect3DState.renderer = renderer;
    inspect3DState.scene = scene;
    inspect3DState.camera = camera;
    inspect3DState.turntableGroup = turntableGroup;
  };

  const setExhibitInspect3DMode = (enable, exhibit) => {
    if (!artifact3dCanvas || !restorationCanvas) return;
    inspect3DState.isActive = Boolean(enable);

    if (inspect3DState.isActive && exhibit) {
      ensureInspect3DInitialized();
      if (inspect3DState.modelMesh && inspect3DState.turntableGroup) {
        inspect3DState.turntableGroup.remove(inspect3DState.modelMesh);
      }
      const model = museumMap.exhibitsManager?.createInspectable3DModel?.(
        exhibit.artifactType,
        exhibit.artifactColor
      );
      if (model && inspect3DState.turntableGroup) {
        inspect3DState.modelMesh = model;
        inspect3DState.turntableGroup.add(model);
      }
      inspect3DState.rotY = 0.45;
      inspect3DState.rotX = 0.16;
      inspect3DState.camDistance = 4.6;

      restorationCanvas.classList.add('hidden');
      artifact3dCanvas.classList.remove('hidden');
      artifact3dHint?.classList.remove('hidden');
    } else {
      restorationCanvas.classList.remove('hidden');
      artifact3dCanvas.classList.add('hidden');
      artifact3dHint?.classList.add('hidden');
    }
  };

  const updateInspect3DViewer = (dt) => {
    if (!inspect3DState.isActive || !inspect3DState.renderer) return;
    if (!inspect3DState.isDragging) {
      inspect3DState.rotY += dt * 0.55;
    }
    if (inspect3DState.turntableGroup) {
      inspect3DState.turntableGroup.rotation.y = inspect3DState.rotY;
      inspect3DState.turntableGroup.rotation.x = inspect3DState.rotX;
    }
    if (inspect3DState.camera) {
      inspect3DState.camera.position.set(
        0,
        0.95 + inspect3DState.rotX * 0.8,
        inspect3DState.camDistance
      );
      inspect3DState.camera.lookAt(0, 0.05, 0);
    }
    inspect3DState.renderer.render(inspect3DState.scene, inspect3DState.camera);
  };

  const openExhibitModal = (exhibit) => {
    modalZone.textContent = exhibit.zone;
    modalTitle.textContent = exhibit.title;
    modalPeriod.textContent = `Thời kỳ: ${exhibit.period}`;
    modalSummary.textContent = exhibit.summary;
    modalCaption.textContent = exhibit.imageCaption;
    setExhibitInspect3DMode(false, exhibit);
    drawArchivalIllustration(restorationCanvas, exhibit);

    // TÍNH NĂNG 3 & BỘ ẢNH ASSET: Thanh nút Tương tác sâu, Xoay 360° & Chuyển đổi ảnh tư liệu
    if (modalInteractiveBar) {
      modalInteractiveBar.innerHTML = '';
      modalInteractiveBar.classList.remove('hidden');

      const artifactType = exhibit.artifactType || '';
      const hasMultipleImages = Array.isArray(exhibit.imageUrls) && exhibit.imageUrls.length > 1;

      const switcherGroup = document.createElement('div');
      switcherGroup.className = 'photo-switcher-group';

      // Nút Xoay Ngắm Mô Hình 3D 360° (Tính năng 3)
      const inspect3DBtn = document.createElement('button');
      inspect3DBtn.type = 'button';
      inspect3DBtn.className = 'photo-tab-btn';
      inspect3DBtn.textContent = '🔄 Xoay Ngắm Mô Hình 3D (360°)';

      const tabButtons = [];
      if (hasMultipleImages) {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'photo-switcher-label';
        labelSpan.textContent = '🖼️ Tư liệu:';
        switcherGroup.appendChild(labelSpan);

        exhibit.imageUrls.forEach((item, idx) => {
          const tabBtn = document.createElement('button');
          tabBtn.type = 'button';
          tabBtn.className = `photo-tab-btn ${idx === 0 ? 'active' : ''}`;
          tabBtn.textContent = `📸 ${item.label}`;
          tabBtn.addEventListener('click', () => {
            setExhibitInspect3DMode(false, exhibit);
            inspect3DBtn.classList.remove('active');
            inspect3DBtn.textContent = '🔄 Xoay Ngắm Mô Hình 3D (360°)';
            tabButtons.forEach((b) => b.classList.remove('active'));
            tabBtn.classList.add('active');
            drawArchivalIllustration(restorationCanvas, exhibit, item.url);
          });
          tabButtons.push(tabBtn);
          switcherGroup.appendChild(tabBtn);
        });
      }

      inspect3DBtn.addEventListener('click', () => {
        const nextMode = !inspect3DState.isActive;
        setExhibitInspect3DMode(nextMode, exhibit);
        if (nextMode) {
          tabButtons.forEach((b) => b.classList.remove('active'));
          inspect3DBtn.classList.add('active');
          inspect3DBtn.textContent = '🖼️ Quay Lại Ảnh Tư Liệu 2D';
        } else {
          inspect3DBtn.classList.remove('active');
          inspect3DBtn.textContent = '🔄 Xoay Ngắm Mô Hình 3D (360°)';
          if (tabButtons[0]) tabButtons[0].classList.add('active');
        }
      });
      switcherGroup.appendChild(inspect3DBtn);
      modalInteractiveBar.appendChild(switcherGroup);

      if (artifactType === 'tank_t54') {
        const climbBtn = document.createElement('button');
        climbBtn.type = 'button';
        climbBtn.className = 'interactive-action-btn gold';
        climbBtn.textContent = '🚩 Trèo lên Tháp Pháo Xe Tăng 843 Vẫy Cờ Chiến Thắng';
        climbBtn.addEventListener('click', () => {
          playerController.closeAllModals();
          playerController.climbOnTank843();
          socketHandler.sendEmote('flag_wave');
          museumMap.launchVictoryFireworks(5);
          playCelebrationAudio(sceneManager.audioListener, 'declaration');
          showToast(
            '🚩 Bạn đang đứng trên Tháp pháo Xe tăng 843 vẫy cờ Đại thắng Mùa Xuân 30/4/1975!',
            5200
          );
        });
        modalInteractiveBar.appendChild(climbBtn);
      } else if (artifactType === 'badinh_mic' || artifactType === 'microphone_badinh') {
        // Khung nhúng trực tiếp bản ghi âm lịch sử Bác Hồ đọc Tuyên ngôn Độc lập (02/09/1945)
        const embedBox = document.createElement('div');
        embedBox.className = 'declaration-embed-box';

        const headerRow = document.createElement('div');
        headerRow.className = 'declaration-embed-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'declaration-embed-title';
        titleSpan.textContent = '🎙️ Nghe Bác Hồ Đọc Tuyên Ngôn Độc Lập (02/09/1945):';
        headerRow.appendChild(titleSpan);

        const saluteBtn = document.createElement('button');
        saluteBtn.type = 'button';
        saluteBtn.className = 'photo-tab-btn active';
        saluteBtn.textContent = '🫡 Chào Cờ & Hô Lời Thề Độc Lập';
        saluteBtn.addEventListener('click', () => {
          playCelebrationAudio(sceneManager.audioListener, 'declaration');
          playerController.closeAllModals();
          playerController.triggerLocalEmote('salute', 4.5);
          localCharacter.showSpeechBubble('🇻🇳 Có! Toàn dân Việt Nam xin thề!', 5.0);
          socketHandler.sendChatMessage(
            nameInput.value.trim() || savedName,
            '🇻🇳 Có! Toàn dân Việt Nam xin thề giữ vững nền Độc lập!'
          );
          showToast(
            '🎙️ "Nước Việt Nam có quyền hưởng tự do và độc lập, và sự thật đã thành một nước tự do, độc lập!" (02/09/1945)',
            5500
          );
        });
        headerRow.appendChild(saluteBtn);
        embedBox.appendChild(headerRow);

        const audioIframe = document.createElement('iframe');
        audioIframe.className = 'declaration-embed-iframe';
        audioIframe.src =
          'https://audioaz.com/vi/embed/audiobook/toan-van-bac-ho-doc-tuyen-ngon-doc-lap';
        audioIframe.title = 'Toàn văn Bác Hồ đọc Tuyên ngôn Độc lập';
        audioIframe.allow = 'autoplay; encrypted-media';
        audioIframe.loading = 'lazy';
        embedBox.appendChild(audioIframe);

        // Tạm ngắt nhạc nền 3D để người xem nghe rõ giọng Bác Hồ đọc Tuyên ngôn Độc lập
        museumMap.setPositionalAudioMuted(true);

        modalInteractiveBar.appendChild(embedBox);
      }

      if (artifactType === 'pack_bicycle') {
        const bikeGameBtn = document.createElement('button');
        bikeGameBtn.type = 'button';
        bikeGameBtn.className = 'interactive-action-btn gold';
        bikeGameBtn.textContent = '🚲 Chơi Mini-Game: Chuyến Xe Đạp Thồ Tiếp Tế Điện Biên (1954)';
        bikeGameBtn.addEventListener('click', () => {
          playerController.closeAllModals();
          openPackbikeModal();
        });
        modalInteractiveBar.appendChild(bikeGameBtn);
      }

      if (artifactType === 'howitzer_105' || artifactType === 'hill_a1_diorama') {
        const artilleryBtn = document.createElement('button');
        artilleryBtn.type = 'button';
        artilleryBtn.className = 'interactive-action-btn gold';
        artilleryBtn.textContent = '🎯 Chơi Mini-Game: Hò Kéo Pháo Vượt Dốc Điện Biên (1954)';
        artilleryBtn.addEventListener('click', () => {
          playerController.closeAllModals();
          openArtilleryModal();
        });
        modalInteractiveBar.appendChild(artilleryBtn);
      }

      if (artifactType === 'hanoi_flagpole' || artifactType === 'sam2_missile') {
        const fwBtn = document.createElement('button');
        fwBtn.type = 'button';
        fwBtn.className = 'interactive-action-btn gold';
        fwBtn.textContent = '🎆 Bắn Pháo Hoa Chào Mừng Trên Bầu Trời Quảng Trường';
        fwBtn.addEventListener('click', () => {
          playerController.closeAllModals();
          museumMap.launchVictoryFireworks(6);
          playCelebrationAudio(sceneManager.audioListener, 'declaration');
          localCharacter.showSpeechBubble('🎆 Pháo hoa chào mừng chiến thắng rực sáng bầu trời!', 4.2);
          showToast('🎆 Pháo hoa rực sáng trên bầu trời Quảng trường Lịch sử!', 4200);
        });
        modalInteractiveBar.appendChild(fwBtn);
      }

      if (artifactType === 'radio_victory') {
        const radioBtn = document.createElement('button');
        radioBtn.type = 'button';
        radioBtn.className = 'interactive-action-btn gold';
        radioBtn.textContent = '📻 Bật Đài Radio Ca Khúc Cách Mạng & Bắn Pháo Hoa 30/4';
        radioBtn.addEventListener('click', () => {
          radioState.songIndex = 4; // Bài 5: Như Có Bác Trong Ngày Vui Đại Thắng
          if (radioSongSelect) radioSongSelect.value = '4';
          startRadioPlayback(true);
          museumMap.launchVictoryFireworks(5);
          showToast('📻 Đang phát MP3 "Như Có Bác Trong Ngày Vui Đại Thắng" & bắn pháo hoa mừng thống nhất!');
        });
        modalInteractiveBar.appendChild(radioBtn);
      }
    }

    if (!discoveredIds.has(exhibit.id)) {
      discoveredIds.add(exhibit.id);
      localStorage.setItem(
        'party_museum_discovered',
        JSON.stringify(Array.from(discoveredIds))
      );
      updateNotebookUI();
    }

    modalStamp.style.animation = 'none';
    void modalStamp.offsetWidth;
    modalStamp.style.animation = '';

    modalBackdrop.classList.remove('hidden');
  };

  const closeExhibitModal = () => {
    setExhibitInspect3DMode(false, null);
    modalBackdrop.classList.add('hidden');
    if (modalInteractiveBar) {
      modalInteractiveBar.innerHTML = '';
    }
    if (!radioState?.isPlaying && !cinemaState?.isOpen && !artilleryGame?.isOpen) {
      museumMap.setPositionalAudioMuted(false);
    }
  };

  // =========================================================================
  // TỔNG HỢP ÂM THANH PHƯƠNG TIỆN (VEHICLE SYNTHESIZER - WEB AUDIO API)
  // =========================================================================
  const playVehicleHonk = (type) => {
    try {
      const audioCtx = THREE.AudioContext.getContext();
      if (!audioCtx || audioCtx.state === 'suspended') {
        audioCtx?.resume?.();
      }
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      if (type === 'bike') {
        // Chuông xe đạp thồ Điện Biên: 2 tiếng "kính coong" ngân vang
        const playDing = (t, freq) => {
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, t);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(freq * 1.22, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.24, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.26);
          osc2.stop(t + 0.26);
        };

        playDing(now, 1780);
        playDing(now + 0.12, 2150);
      } else if (type === 'jeep') {
        // Còi xe Jeep UAZ quân sự mini: âm đôi "bíp bíp" (420Hz & 520Hz)
        const playHonkTone = (t, duration) => {
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(420, t);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(525, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
          gain.gain.setValueAtTime(0.2, t + duration - 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);

          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + duration + 0.02);
          osc2.stop(t + duration + 0.02);
        };

        playHonkTone(now, 0.16);
        playHonkTone(now + 0.22, 0.20);
      } else if (type === 'plane') {
        // Còi & động cơ máy bay mini: tiếng tuýt cao vút + rền nhẹ
        const osc = audioCtx.createOscillator();
        const oscLow = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.linearRampToValueAtTime(640, now + 0.35);

        oscLow.type = 'sawtooth';
        oscLow.frequency.setValueAtTime(140, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        oscLow.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        oscLow.start(now);
        osc.stop(now + 0.48);
        oscLow.stop(now + 0.48);
      }
    } catch {
      // Bỏ qua lỗi audio context khi người dùng chưa tương tác trang
    }
  };

  // =========================================================================
  // TÍNH NĂNG 2 & 3: TRẠM ĐỐ VUI LỊCH SỬ ĐẢNG & BẢNG XẾP HẠNG TOP 10 VINH DANH
  // =========================================================================
  const quizState = {
    questions: [],
    currentIndex: 0,
    score: 0,
    answered: false,
    startTime: 0,
    lastElapsedSec: 0
  };

  let cachedLeaderboard = [
    { name: 'Đồng chí Minh Dương', score: 500, timeSec: 38, rank: 'Chiến Sĩ Lịch Sử Xuất Sắc' },
    { name: 'Đồng chí Hồng Nhung', score: 500, timeSec: 46, rank: 'Chiến Sĩ Lịch Sử Xuất Sắc' },
    { name: 'Đồng chí Quốc Bảo', score: 400, timeSec: 52, rank: 'Chiến Sĩ Lịch Sử Ưu Tú' }
  ];

  try {
    // Reset sạch dữ liệu cũ / dính chữ
    localStorage.removeItem('virtual_museum_quiz_lb');
    const savedLb = localStorage.getItem('virtual_museum_quiz_lb_v2');
    if (savedLb) {
      const parsed = JSON.parse(savedLb);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedLeaderboard = parsed;
      }
    } else {
      localStorage.setItem('virtual_museum_quiz_lb_v2', JSON.stringify(cachedLeaderboard));
    }
  } catch {
    // ignore
  }

  const renderLeaderboardTable = () => {
    if (!quizLeaderboardTbody) return;
    quizLeaderboardTbody.innerHTML = '';

    cachedLeaderboard.forEach((item, index) => {
      const tr = document.createElement('tr');
      const rankNum = index + 1;
      let medal = `<span class="leaderboard-rank-medal">${rankNum}</span>`;
      let rankClass = '';
      if (rankNum === 1) {
        medal = '<span class="leaderboard-rank-medal leaderboard-rank-top1">🥇 1</span>';
        rankClass = 'leaderboard-rank-top1';
      } else if (rankNum === 2) {
        medal = '<span class="leaderboard-rank-medal leaderboard-rank-top2">🥈 2</span>';
        rankClass = 'leaderboard-rank-top2';
      } else if (rankNum === 3) {
        medal = '<span class="leaderboard-rank-medal leaderboard-rank-top3">🥉 3</span>';
        rankClass = 'leaderboard-rank-top3';
      }

      tr.innerHTML = `
        <td>${medal}</td>
        <td><strong class="${rankClass}">${item.name || 'Chiến sĩ'}</strong></td>
        <td><span class="packbike-stat gold" style="font-size:0.75rem; padding: 2px 6px;">${item.score}</span></td>
        <td>⏱️ ${item.timeSec || 45}s</td>
        <td><span class="leaderboard-rank-badge">${item.rank || 'Chiến Sĩ Lịch Sử Xuất Sắc'}</span></td>
      `;
      quizLeaderboardTbody.appendChild(tr);
    });
  };

  const openQuizLeaderboardModal = () => {
    renderLeaderboardTable();
    quizLeaderboardModal?.classList.remove('hidden');
  };

  const closeQuizLeaderboardModal = () => {
    quizLeaderboardModal?.classList.add('hidden');
  };

  quizLeaderboardCloseBtn?.addEventListener('click', () => playerController.closeAllModals());
  quizViewLeaderboardBtn?.addEventListener('click', () => {
    openQuizLeaderboardModal();
  });

  const pickRandomQuizQuestions = (count = 5) => {
    const pool = [...QUIZ_QUESTIONS_DATA];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  };

  const renderQuizQuestion = () => {
    const total = quizState.questions.length;
    const idx = quizState.currentIndex;

    if (idx >= total) {
      // Màn hình Tổng kết điểm & Vinh danh Bảng Vàng Top 10
      const elapsedSec = Math.max(1, Math.round((performance.now() - (quizState.startTime || performance.now())) / 1000));
      quizState.lastElapsedSec = elapsedSec;

      const rank =
        quizState.score >= total
          ? 'Chiến Sĩ Lịch Sử Xuất Sắc'
          : quizState.score >= total - 1
          ? 'Chiến Sĩ Lịch Sử Ưu Tú'
          : 'Chiến Sĩ Yêu Sử';

      quizQuestionPanel?.classList.add('hidden');
      quizResultPanel?.classList.remove('hidden');
      if (quizStepBadge) quizStepBadge.textContent = 'HOÀN THÀNH THỬ THÁCH';
      if (quizScoreBadge) quizScoreBadge.textContent = `Tổng điểm: ${quizState.score * 100} / ${total * 100}`;
      if (quizResultScore) quizResultScore.textContent = `Điểm số: ${quizState.score * 100} / 500`;
      if (quizResultTime) quizResultTime.textContent = `⏱️ Thời gian: ${elapsedSec}s`;
      if (quizResultRankBadge) quizResultRankBadge.textContent = rank;

      if (quizResultTitle) {
        quizResultTitle.textContent = `🎉 Đạt ${quizState.score}/${total} câu đúng — "${rank}"!`;
      }
      if (quizResultSummary) {
        quizResultSummary.textContent =
          `🏆 Kết quả: ${quizState.score * 100} điểm (${elapsedSec}s). Đồng chí hãy nhập tên để lưu điểm vào danh sách Top 10 Chiến Sĩ Lịch Sử Xuất Sắc!`;
      }

      const currentName = nameInput?.value.trim() || savedName || 'Chiến sĩ';
      if (quizPlayerNameInput) quizPlayerNameInput.value = currentName;
      if (quizSubmitStatus) quizSubmitStatus.classList.add('hidden');

      playCelebrationAudio(sceneManager.audioListener, 'quiz_win');
      localCharacter?.showSpeechBubble(
        `🎓 Đạt ${quizState.score}/${total} câu Đố Vui (${quizState.score * 100} điểm - ${elapsedSec}s)!`,
        4.8
      );
      return;
    }

    quizQuestionPanel?.classList.remove('hidden');
    quizResultPanel?.classList.add('hidden');
    const qObj = quizState.questions[idx];
    quizState.answered = false;
    if (quizStepBadge) quizStepBadge.textContent = `Câu hỏi ${idx + 1} / ${total}`;
    if (quizScoreBadge) quizScoreBadge.textContent = `Điểm: ${quizState.score * 100} / ${total * 100}`;
    if (quizQuestionText) quizQuestionText.textContent = qObj.question;
    if (quizExplanationBox) quizExplanationBox.classList.add('hidden');
    quizNextBtn?.classList.add('hidden');

    if (quizOptionsGrid) {
      quizOptionsGrid.innerHTML = '';
      qObj.options.forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option-btn';
        btn.textContent = optText;
        btn.addEventListener('click', () => {
          if (quizState.answered) return;
          quizState.answered = true;

          const allBtns = quizOptionsGrid.querySelectorAll('.quiz-option-btn');
          allBtns.forEach((b, bIdx) => {
            b.disabled = true;
            if (bIdx === qObj.correctIndex) {
              b.classList.add('correct');
            } else if (bIdx === optIdx) {
              b.classList.add('wrong');
            }
          });

          if (optIdx === qObj.correctIndex) {
            quizState.score += 1;
            playCelebrationAudio(sceneManager.audioListener, 'star');
          }
          if (quizScoreBadge) {
            quizScoreBadge.textContent = `Điểm: ${quizState.score * 100} / ${total * 100}`;
          }
          if (quizExplanationBox) {
            quizExplanationBox.textContent =
              (optIdx === qObj.correctIndex ? '✅ Chính xác! ' : '💡 Tư liệu lịch sử: ') +
              qObj.explanation;
            quizExplanationBox.classList.remove('hidden');
          }
          if (quizNextBtn) {
            quizNextBtn.textContent =
              idx + 1 >= total ? '🏆 Xem Kết Quả & Ghi Danh Bảng Vàng' : 'Câu tiếp theo ➔';
            quizNextBtn.classList.remove('hidden');
          }
        });
        quizOptionsGrid.appendChild(btn);
      });
    }
  };

  quizSubmitLeaderboardBtn?.addEventListener('click', () => {
    const inputName = quizPlayerNameInput?.value.trim() || nameInput?.value.trim() || savedName || 'Khách tham quan';
    const score = quizState.score * 100;
    const elapsedSec = quizState.lastElapsedSec || 45;
    const rank =
      quizState.score >= 5
        ? 'Chiến Sĩ Lịch Sử Xuất Sắc'
        : quizState.score >= 4
        ? 'Chiến Sĩ Lịch Sử Ưu Tú'
        : 'Chiến Sĩ Yêu Sử';

    socketHandler?.sendQuizScore(inputName, score, elapsedSec, rank);

    // Lưu vào bộ nhớ cục bộ làm dự phòng
    const existing = cachedLeaderboard.find((it) => it.name === inputName);
    if (existing) {
      if (score > existing.score || (score === existing.score && elapsedSec < (existing.timeSec || 999))) {
        existing.score = score;
        existing.timeSec = elapsedSec;
        existing.rank = rank;
      }
    } else {
      cachedLeaderboard.push({ name: inputName, score, timeSec: elapsedSec, rank });
    }
    cachedLeaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.timeSec || 999) - (b.timeSec || 999);
    });
    cachedLeaderboard = cachedLeaderboard.slice(0, 10);
    try {
      localStorage.setItem('virtual_museum_quiz_lb_v2', JSON.stringify(cachedLeaderboard));
    } catch {}

    museumMap.exhibitsManager?.updateQuizLeaderboard?.(cachedLeaderboard);
    renderLeaderboardTable();

    if (quizSubmitStatus) {
      quizSubmitStatus.textContent = `✅ Đã lưu kết quả "${inputName}" (${score} điểm - ${elapsedSec}s) vào Bảng Xếp Hạng!`;
      quizSubmitStatus.classList.remove('hidden');
    }
    localCharacter?.showSpeechBubble(`🏅 Đã lưu danh "${inputName}" vào Bảng Vinh Danh!`, 4.0);
    showToast(`🏅 Đã lưu danh "${inputName}" (${score} điểm - ${elapsedSec}s) lên Bảng Xếp Hạng Top 10!`, 4200);
  });

  const startNewQuizSession = () => {
    quizState.questions = pickRandomQuizQuestions(5);
    quizState.currentIndex = 0;
    quizState.score = 0;
    quizState.answered = false;
    quizState.startTime = performance.now();
    quizState.lastElapsedSec = 0;
    renderQuizQuestion();
  };

  const openQuizModal = () => {
    startNewQuizSession();
    quizBackdrop?.classList.remove('hidden');
  };

  const closeQuizModal = () => {
    quizBackdrop?.classList.add('hidden');
  };

  quizNextBtn?.addEventListener('click', () => {
    quizState.currentIndex += 1;
    renderQuizQuestion();
  });

  quizRetryBtn?.addEventListener('click', () => {
    startNewQuizSession();
  });

  quizCloseBtn?.addEventListener('click', () => playerController.closeAllModals());

  // =========================================================================
  // TÍNH NĂNG 4: BÃI GỬI XE — HỆ THỐNG ĐỔI 3 PHƯƠNG TIỆN (TỔNG 20 HIỆN VẬT)
  // =========================================================================
  let lockedVehicleType = null;
  try {
    lockedVehicleType = localStorage.getItem('virtual_museum_locked_vehicle') || null;
  } catch {}

  const openVehicleModal = () => {
    if (!vehicleModal || !vehicleCardsGrid) return;
    const currentCount = discoveredIds.size;
    const currentVehicle = playerController.currentVehicle;

    if (vehicleProgressDesc) {
      vehicleProgressDesc.innerHTML = `Đã khám phá: <b style="color:#ffd700">${currentCount} / 20 hiện vật</b>. Mở khóa phương tiện khi đạt đủ các mốc khám phá!`;
    }

    vehicleCardsGrid.innerHTML = '';

    // 1. Thẻ Đi bộ (Trả xe)
    const walkCard = document.createElement('div');
    walkCard.className = `vehicle-item-card ${!currentVehicle ? 'current-active' : ''}`;
    walkCard.innerHTML = `
      <div class="vehicle-card-badge ${!currentVehicle ? 'active-tag' : 'unlocked'}">
        ${!currentVehicle ? 'Đang chọn' : 'Khả dụng'}
      </div>
      <div class="vehicle-item-emoji">🚶</div>
      <div class="vehicle-item-title">Đi Bộ (Trả Xe)</div>
      <div class="vehicle-item-specs">Tốc độ tiêu chuẩn x1.0.<br>Tự do đi lại trong và ngoài bảo tàng.</div>
      <button type="button" class="vehicle-select-btn ${!currentVehicle ? 'active-btn' : ''}" ${!currentVehicle ? 'disabled' : ''}>
        ${!currentVehicle ? '✓ Đang đi bộ' : 'Chọn Đi Bộ'}
      </button>
    `;
    walkCard.querySelector('button')?.addEventListener('click', () => {
      playerController.setVehicle(null);
      showToast('🚶 Bạn đã trả phương tiện và chuyển sang Đi bộ.');
      playerController.closeAllModals();
    });
    vehicleCardsGrid.appendChild(walkCard);

    // 2. Thẻ 3 loại phương tiện mở khóa theo mốc
    const vehicleList = [
      {
        id: 'bike',
        name: 'Xe đạp thồ Điện Biên',
        emoji: '🚲',
        unlock: 7,
        speedText: 'x1.3 tốc độ chạy',
        desc: 'Xe thồ chở hàng tiếp tế 1954.<br>Phím [F] rung chuông "kính coong".'
      },
      {
        id: 'jeep',
        name: 'Xe Jeep UAZ quân sự mini',
        emoji: '🚙',
        unlock: 14,
        speedText: 'x1.6 tốc độ chạy',
        desc: 'Xe chỉ huy quân sự việt dã.<br>Phím [F] còi xe "bíp bíp".'
      },
      {
        id: 'plane',
        name: 'Máy bay mini 2 chỗ',
        emoji: '🛩️',
        unlock: 20,
        speedText: 'x2.0 tốc độ chạy',
        desc: 'Bay lượn cách mặt đất 1.75m.<br>Cánh quạt quay tít, phím [F] còi hiệu.'
      }
    ];

    vehicleList.forEach((v) => {
      const isUnlocked = currentCount >= v.unlock;
      const isCurrent = currentVehicle === v.id;
      const card = document.createElement('div');
      card.className = `vehicle-item-card ${isCurrent ? 'current-active' : ''} ${!isUnlocked ? 'locked' : ''}`;

      let badgeHtml = '';
      if (isCurrent) {
        badgeHtml = '<div class="vehicle-card-badge active-tag">Đang lái</div>';
      } else if (isUnlocked) {
        badgeHtml = `<div class="vehicle-card-badge unlocked">Đã mở khóa (${v.unlock}/20)</div>`;
      } else {
        badgeHtml = `<div class="vehicle-card-badge">Cần ${v.unlock}/20 hiện vật</div>`;
      }

      card.innerHTML = `
        ${badgeHtml}
        <div class="vehicle-item-emoji">${v.emoji}</div>
        <div class="vehicle-item-title">${v.name}</div>
        <div class="vehicle-item-specs">
          <strong style="color:#ffd700;">${v.speedText}</strong><br>
          ${v.desc}
        </div>
        <button type="button" class="vehicle-select-btn ${isCurrent ? 'active-btn' : ''}" ${!isUnlocked || isCurrent ? 'disabled' : ''}>
          ${isCurrent ? '✓ Đang điều khiển' : isUnlocked ? `Chọn Lái ${v.emoji}` : `🔒 Cần ${v.unlock} hiện vật`}
        </button>
      `;

      if (isUnlocked && !isCurrent) {
        card.querySelector('button')?.addEventListener('click', () => {
          lockedVehicleType = v.id;
          try {
            localStorage.setItem('virtual_museum_locked_vehicle', v.id);
          } catch {}
          playerController.setVehicle(v.id);
          playVehicleHonk(v.id);
          showToast(`🚗 Bạn đã nhận ${v.name}! Nhấn [F] để bấm còi / rung chuông.`);
          playerController.closeAllModals();
        });
      }
      vehicleCardsGrid.appendChild(card);
    });

    vehicleModal.classList.remove('hidden');
  };

  const closeVehicleModal = () => {
    vehicleModal?.classList.add('hidden');
  };

  vehicleCloseBtn?.addEventListener('click', () => playerController.closeAllModals());

  // =========================================================================
  // TRÌNH PHÁT RẠP CHIẾU PHIM TƯ LIỆU 2D (CINEMA DOCUMENTARY PLAYER)
  // =========================================================================
  const cinemaMediaCache = new Map(); // Lưu cache Image / Video element để phát mượt mà
  const getOrLoadCinemaMedia = (url) => {
    if (!url) return null;
    if (cinemaMediaCache.has(url)) return cinemaMediaCache.get(url);

    const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    if (isVideo) {
      const vid = document.createElement('video');
      vid.src = url;
      vid.crossOrigin = 'anonymous';
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.play().catch(() => {});
      cinemaMediaCache.set(url, { type: 'video', el: vid, loaded: true });
      return cinemaMediaCache.get(url);
    } else {
      // Hỗ trợ ảnh tĩnh (.jpg, .png, .webp) và ảnh động (.gif)
      const img = new Image();
      img.src = url;
      img.crossOrigin = 'anonymous';
      const item = { type: 'image', el: img, loaded: false };
      img.onload = () => { item.loaded = true; };
      img.onerror = () => { item.error = true; };
      cinemaMediaCache.set(url, item);
      return item;
    }
  };

  const cinemaState = {
    isOpen: false,
    isPlaying: true,
    mode: 'interactive', // 'interactive' | 'youtube'
    chapterIndex: 0,
    currentTime: 0,
    volume: 0.6,
    audioCtx: null,
    toneTimer: 0
  };

  const formatTimeMMSS = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const buildYoutubeEmbedSrc = (rawUrl) => {
    const fallback = 'https://www.youtube.com/embed/2hSOHVnGvOo';
    const str = String(rawUrl || fallback).trim();
    const sep = str.includes('?') ? '&' : '?';
    return `${str}${sep}autoplay=1&rel=0`;
  };

  const renderCinemaChapterButtons = () => {
    if (!cinemaChapterList) return;
    cinemaChapterList.innerHTML = '';
    DOCUMENTARY_CHAPTERS.forEach((chap, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cinema-chapter-item ${idx === cinemaState.chapterIndex ? 'active' : ''}`;
      btn.textContent = chap.title;
      btn.addEventListener('click', () => {
        cinemaState.chapterIndex = idx;
        cinemaState.currentTime = 0;
        cinemaState.isPlaying = true;
        if (cinemaPlayBtn) cinemaPlayBtn.textContent = '⏸ Tạm dừng';
        if (cinemaChapterTitle) cinemaChapterTitle.textContent = chap.title;
        if (cinemaState.mode === 'youtube' && cinemaYoutubeIframe) {
          cinemaYoutubeIframe.src = buildYoutubeEmbedSrc(chap.youtubeUrl);
        }
        renderCinemaChapterButtons();
      });
      cinemaChapterList.appendChild(btn);
    });
  };
  renderCinemaChapterButtons();

  const playSoftCinemaNote = () => {
    if (!cinemaState.isOpen || !cinemaState.isPlaying || cinemaState.mode !== 'interactive') return;
    if (cinemaState.volume <= 0.01) return;
    try {
      const ctx = sceneManager.audioListener?.context;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0];
      const idx = Math.floor(cinemaState.currentTime * 1.5) % notes.length;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[idx], ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(cinemaState.volume * 0.045, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.62);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch {
      // Bỏ qua nếu WebAudio chưa sẵn sàng
    }
  };

  const drawCinemaPlayerFrame = () => {
    if (!cinemaPlayerCanvas) return;
    const ctx = cinemaPlayerCanvas.getContext('2d');
    const w = cinemaPlayerCanvas.width;
    const h = cinemaPlayerCanvas.height;

    const chapter = DOCUMENTARY_CHAPTERS[cinemaState.chapterIndex] || DOCUMENTARY_CHAPTERS[0];
    const duration = chapter.durationSec || 28;
    const progress = Math.min(1, cinemaState.currentTime / duration);

    // Nền phim nhựa phục chế
    const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.65);
    grad.addColorStop(0, '#4a211b');
    grad.addColorStop(0.6, '#271411');
    grad.addColorStop(1, '#110b09');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Viền phim nhựa hai bên
    ctx.fillStyle = 'rgba(255, 238, 200, 0.12)';
    const holeOffset = Math.floor((cinemaState.currentTime * 40) % 42);
    for (let x = -holeOffset; x < w; x += 42) {
      ctx.fillRect(x, 12, 24, 14);
      ctx.fillRect(x, h - 26, 24, 14);
    }

    // 1. CỘT TRÁI (x = 26..452, y = 36..402): Khung Ảnh / Video Tư Liệu Cỡ Lớn (426x366) — Tuyệt đối không đè chữ lên hình
    const frameX = 26;
    const frameY = 36;
    const frameW = 426;
    const frameH = 366;

    ctx.fillStyle = '#140f0c';
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 3;
    ctx.strokeRect(frameX, frameY, frameW, frameH);

    const mediaObj = chapter.bgMedia ? getOrLoadCinemaMedia(chapter.bgMedia) : null;
    let customMediaDrawn = false;

    if (mediaObj) {
      const el = mediaObj.el;
      const pad = 6;
      const innerW = frameW - pad * 2;
      const innerH = frameH - pad * 2;

      if (mediaObj.type === 'video') {
        if (cinemaState.isPlaying && el.paused) {
          el.play().catch(() => {});
        } else if (!cinemaState.isPlaying && !el.paused) {
          el.pause();
        }
        if (el.readyState >= 2) {
          ctx.save();
          const vW = el.videoWidth || innerW;
          const vH = el.videoHeight || innerH;
          const scale = Math.min(innerW / vW, innerH / vH);
          const drawW = vW * scale;
          const drawH = vH * scale;
          const drawX = frameX + pad + (innerW - drawW) / 2;
          const drawY = frameY + pad + (innerH - drawH) / 2;
          ctx.drawImage(el, drawX, drawY, drawW, drawH);
          ctx.restore();
          customMediaDrawn = true;
        }
      } else if (mediaObj.type === 'image' && mediaObj.loaded) {
        ctx.save();
        const imgW = el.naturalWidth || innerW;
        const imgH = el.naturalHeight || innerH;
        const scale = Math.min(innerW / imgW, innerH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const drawX = frameX + pad + (innerW - drawW) / 2;
        const drawY = frameY + pad + (innerH - drawH) / 2;
        ctx.drawImage(el, drawX, drawY, drawW, drawH);
        ctx.restore();
        customMediaDrawn = true;
      }
    }

    // Nếu không có ảnh/GIF/video tùy chỉnh hoặc đang tải thì vẽ Lá cờ đỏ sao vàng lớn trong khung cột trái
    if (!customMediaDrawn) {
      ctx.save();
      ctx.translate(frameX + frameW / 2, frameY + frameH / 2);
      const pulse = 1 + Math.sin(cinemaState.currentTime * 2.2) * 0.03;
      ctx.scale(pulse, pulse);

      ctx.strokeStyle = 'rgba(255, 230, 0, 0.16)';
      ctx.lineWidth = 2;
      for (let r = 65; r <= 145; r += 40) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#c82323';
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-130, -82, 260, 164, 12);
      ctx.fill();
      ctx.stroke();

      // Ngôi sao 5 cánh vàng tươi (#FFE600) chuẩn tỉ lệ
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 52 : 52 * 0.382;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const sx = Math.cos(a) * r;
        const sy = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. CỘT PHẢI (x = 474..834): Nhãn mốc lịch sử + Tiêu đề + Hộp Thuyết Minh tách biệt hoàn toàn với ảnh
    const rightX = 474;
    const rightW = 360;
    const rightCenterX = rightX + rightW / 2;

    ctx.fillStyle = '#c82323';
    ctx.beginPath();
    ctx.roundRect(rightCenterX - 165, 38, 330, 34, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`★ MỐC LỊCH SỬ: ${chapter.yearBadge} ★`, rightCenterX, 60);

    // Tiêu đề chương tự động xuống dòng trong cột phải
    ctx.fillStyle = '#fff9eb';
    ctx.font = 'bold 21px "Segoe UI", sans-serif';
    const hWords = String(chapter.headline || '').split(' ');
    let hLine = '';
    let hY = 102;
    for (const hw of hWords) {
      const testH = hLine + hw + ' ';
      if (ctx.measureText(testH).width > rightW - 10) {
        ctx.fillText(hLine.trim(), rightCenterX, hY);
        hLine = hw + ' ';
        hY += 26;
      } else {
        hLine = testH;
      }
    }
    if (hLine) {
      ctx.fillText(hLine.trim(), rightCenterX, hY);
      hY += 22;
    }

    // Hộp hiển thị đoạn thuyết minh tương ứng với thời gian đang phát ở cột phải
    const linesCount = chapter.narration.length;
    const activeLineIdx = Math.min(linesCount - 1, Math.floor(progress * linesCount));
    const currentNarration = chapter.narration[activeLineIdx] || '';

    const boxTop = Math.max(152, hY + 6);
    const boxH = 402 - boxTop;
    ctx.fillStyle = 'rgba(18, 14, 12, 0.86)';
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rightX, boxTop, rightW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff8e6';
    ctx.font = '17.5px "Segoe UI", sans-serif';
    const words = currentNarration.split(' ');
    let line = '';
    let ty = boxTop + 34;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > rightW - 32) {
        ctx.fillText(line.trim(), rightCenterX, ty);
        line = word + ' ';
        ty += 26;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line.trim(), rightCenterX, ty);

    // Chỉ số đoạn thuyết minh ở góc dưới hộp
    ctx.fillStyle = 'rgba(255, 230, 0, 0.75)';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(`Đoạn thuyết minh ${activeLineIdx + 1} / ${linesCount}`, rightCenterX, 390);
  };

  // =========================================================================
  // TÍNH NĂNG 4: ĐÀI RADIO / JUKEBOX CA KHÚC CÁCH MẠNG (PHÁT FILE MP3 TRONG ASSETS)
  // =========================================================================
  const radioSongSelect = document.getElementById('radio-song-select');
  const radioPrevBtn = document.getElementById('radio-prev-btn');
  const radioPlayBtn = document.getElementById('radio-play-btn');
  const radioNextBtn = document.getElementById('radio-next-btn');
  const radioVolumeSlider = document.getElementById('radio-volume-slider');
  const radioEqIcon = document.getElementById('radio-eq-icon');

  const radioAudio = new Audio();
  radioAudio.preload = 'auto';

  const radioState = {
    isPlaying: false,
    wasPausedByCinema: false,
    songIndex: 0,
    currentLoadedIndex: -1,
    volume: 0.55
  };

  const updateRadioUI = () => {
    if (radioPlayBtn) {
      radioPlayBtn.textContent = radioState.isPlaying ? '⏸ Tạm dừng' : '▶ Phát nhạc';
    }
    if (radioEqIcon) {
      radioEqIcon.classList.toggle('playing', radioState.isPlaying);
    }
    if (radioSongSelect) {
      radioSongSelect.value = String(radioState.songIndex);
    }
  };

  const startRadioPlayback = (forceReload = false) => {
    const song =
      REVOLUTIONARY_SONGS_DATA[radioState.songIndex] || REVOLUTIONARY_SONGS_DATA[0];
    if (!song || !song.audioUrl) return;

    if (forceReload || radioState.currentLoadedIndex !== radioState.songIndex) {
      radioAudio.src = encodeURI(song.audioUrl);
      radioState.currentLoadedIndex = radioState.songIndex;
    }

    radioAudio.volume = radioState.volume;
    radioState.isPlaying = true;
    museumMap.setPositionalAudioMuted(true);
    radioAudio.play().catch(() => {
      radioState.isPlaying = false;
      updateRadioUI();
    });
    updateRadioUI();
  };

  const stopRadioPlayback = () => {
    radioState.isPlaying = false;
    radioAudio.pause();
    if (!cinemaState.isOpen) {
      museumMap.setPositionalAudioMuted(false);
    }
    updateRadioUI();
  };

  // Tự động chuyển sang bài MP3 tiếp theo khi phát hết bài
  radioAudio.addEventListener('ended', () => {
    radioState.songIndex = (radioState.songIndex + 1) % REVOLUTIONARY_SONGS_DATA.length;
    startRadioPlayback(true);
    const nextSong = REVOLUTIONARY_SONGS_DATA[radioState.songIndex];
    showToast(`📻 Đài Radio chuyển bài: ${nextSong.title}`);
  });

  radioPlayBtn?.addEventListener('click', () => {
    if (radioState.isPlaying) {
      stopRadioPlayback();
    } else {
      startRadioPlayback(false);
      const curSong = REVOLUTIONARY_SONGS_DATA[radioState.songIndex];
      showToast(`📻 Đang phát MP3: ${curSong.title} — ${curSong.composer}`);
    }
  });

  radioPrevBtn?.addEventListener('click', () => {
    radioState.songIndex =
      (radioState.songIndex - 1 + REVOLUTIONARY_SONGS_DATA.length) %
      REVOLUTIONARY_SONGS_DATA.length;
    startRadioPlayback(true);
    const curSong = REVOLUTIONARY_SONGS_DATA[radioState.songIndex];
    showToast(`📻 Chuyển bài: ${curSong.title}`);
  });

  radioNextBtn?.addEventListener('click', () => {
    radioState.songIndex = (radioState.songIndex + 1) % REVOLUTIONARY_SONGS_DATA.length;
    startRadioPlayback(true);
    const curSong = REVOLUTIONARY_SONGS_DATA[radioState.songIndex];
    showToast(`📻 Chuyển bài: ${curSong.title}`);
  });

  radioSongSelect?.addEventListener('change', () => {
    radioState.songIndex = Number(radioSongSelect.value) || 0;
    startRadioPlayback(true);
    const curSong = REVOLUTIONARY_SONGS_DATA[radioState.songIndex];
    showToast(`📻 Đang phát MP3: ${curSong.title} (${curSong.composer})`);
  });

  radioVolumeSlider?.addEventListener('input', () => {
    radioState.volume = Number(radioVolumeSlider.value);
    radioAudio.volume = radioState.volume;
  });

  const updateRadioJukebox = () => {
    // Phát bằng HTML5 Audio MP3 nên không cần vòng lặp tạo nốt synth
  };

  // =========================================================================
  // TÍNH NĂNG 3: MINI-GAME "CHUYẾN XE ĐẠP THỒ TIẾP TẾ ĐIỆN BIÊN" (NÂNG CẤP ĐỒ HỌA)
  // =========================================================================
  const packbikeBackdrop = document.getElementById('packbike-modal');
  const packbikeCloseBtn = document.getElementById('packbike-close-btn');
  const packbikeCanvas = document.getElementById('packbike-canvas');
  const packbikeDistBadge = document.getElementById('packbike-dist-badge');
  const packbikeCargoBadge = document.getElementById('packbike-cargo-badge');
  const packbikeHpBadge = document.getElementById('packbike-hp-badge');
  const packbikeUpBtn = document.getElementById('packbike-up-btn');
  const packbikeDownBtn = document.getElementById('packbike-down-btn');
  const packbikeBoostBtn = document.getElementById('packbike-boost-btn');
  const packbikeRestartBtn = document.getElementById('packbike-restart-btn');

  const packbikeGame = {
    isOpen: false,
    status: 'playing', // 'playing' | 'won' | 'lost'
    lane: 1,           // 0 (Làn Trên), 1 (Làn Giữa), 2 (Làn Dưới)
    laneY: [148, 224, 300],
    visualY: 224,
    distance: 0,
    targetDistance: 1500,
    cargoKg: 200,
    hp: 3,
    boostTimer: 0,
    invincibleTimer: 0,
    spawnTimer: 0,
    wheelAngle: 0,
    entities: [],  // { type: 'rock' | 'crater' | 'rice' | 'ammo', lane, x, y, rot }
    popups: [],    // { text, x, y, color, life }
    dust: []       // { x, y, vx, vy, r, alpha }
  };

  const resetPackbikeGame = () => {
    packbikeGame.status = 'playing';
    packbikeGame.lane = 1;
    packbikeGame.visualY = packbikeGame.laneY[1];
    packbikeGame.distance = 0;
    packbikeGame.cargoKg = 200;
    packbikeGame.hp = 3;
    packbikeGame.boostTimer = 0;
    packbikeGame.invincibleTimer = 0;
    packbikeGame.spawnTimer = 0.55;
    packbikeGame.entities = [];
    packbikeGame.popups = [];
    packbikeGame.dust = [];
    updatePackbikeHUD();
  };

  const updatePackbikeHUD = () => {
    if (packbikeDistBadge) {
      packbikeDistBadge.textContent = `⛰️ Đèo Pha Đin: ${Math.min(
        packbikeGame.targetDistance,
        Math.floor(packbikeGame.distance)
      )} / ${packbikeGame.targetDistance}m`;
    }
    if (packbikeCargoBadge) {
      packbikeCargoBadge.textContent = `🌾 Hàng tiếp tế: ${packbikeGame.cargoKg} kg`;
    }
    if (packbikeHpBadge) {
      packbikeHpBadge.textContent =
        packbikeGame.hp > 0 ? '❤️'.repeat(packbikeGame.hp) : '💔 Kiệt sức';
    }
  };

  const openPackbikeModal = () => {
    packbikeGame.isOpen = true;
    playerController.isPackbikeOpen = true;
    resetPackbikeGame();
    packbikeBackdrop?.classList.remove('hidden');
  };

  const closePackbikeModal = () => {
    packbikeGame.isOpen = false;
    playerController.isPackbikeOpen = false;
    packbikeBackdrop?.classList.add('hidden');
  };

  const shiftPackbikeLane = (delta) => {
    if (!packbikeGame.isOpen || packbikeGame.status !== 'playing') return;
    packbikeGame.lane = Math.max(0, Math.min(2, packbikeGame.lane + delta));
  };

  const triggerPackbikeBoost = () => {
    if (!packbikeGame.isOpen || packbikeGame.status !== 'playing') return;
    packbikeGame.boostTimer = 1.5;
  };

  packbikeUpBtn?.addEventListener('click', () => shiftPackbikeLane(-1));
  packbikeDownBtn?.addEventListener('click', () => shiftPackbikeLane(1));
  packbikeBoostBtn?.addEventListener('click', () => triggerPackbikeBoost());
  packbikeRestartBtn?.addEventListener('click', () => resetPackbikeGame());
  packbikeCloseBtn?.addEventListener('click', () => playerController.closeAllModals());

  window.addEventListener('keydown', (e) => {
    if (!packbikeGame.isOpen) return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      e.preventDefault();
      shiftPackbikeLane(-1);
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      e.preventDefault();
      shiftPackbikeLane(1);
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (packbikeGame.status !== 'playing') resetPackbikeGame();
      else triggerPackbikeBoost();
    }
  });

  const updateAndDrawPackbikeGame = (dt) => {
    if (!packbikeGame.isOpen || !packbikeCanvas) return;
    const ctx = packbikeCanvas.getContext('2d');
    const w = packbikeCanvas.width;
    const h = packbikeCanvas.height;

    if (packbikeGame.status === 'playing') {
      if (packbikeGame.boostTimer > 0) {
        packbikeGame.boostTimer = Math.max(0, packbikeGame.boostTimer - dt);
      }
      if (packbikeGame.invincibleTimer > 0) {
        packbikeGame.invincibleTimer = Math.max(0, packbikeGame.invincibleTimer - dt);
      }

      const isBoosting = packbikeGame.boostTimer > 0;
      const speedMetersPerSec = isBoosting ? 84 : 52;
      const pixelSpeed = isBoosting ? 345 : 230;
      packbikeGame.distance += speedMetersPerSec * dt;
      packbikeGame.wheelAngle += dt * (isBoosting ? 16 : 9.5);

      const targetY = packbikeGame.laneY[packbikeGame.lane];
      packbikeGame.visualY += (targetY - packbikeGame.visualY) * Math.min(1, dt * 15);

      // Tạo hạt bụi đường đèo khi đẩy xe
      if (Math.random() < (isBoosting ? 0.85 : 0.35)) {
        packbikeGame.dust.push({
          x: 92 + Math.random() * 25,
          y: packbikeGame.visualY + 18 + (Math.random() - 0.5) * 8,
          vx: -90 - Math.random() * 80,
          vy: -12 - Math.random() * 24,
          r: isBoosting ? 4 + Math.random() * 4 : 2.5 + Math.random() * 2.5,
          alpha: 0.65
        });
      }

      // Sinh vật cản & vật phẩm tiếp tế
      packbikeGame.spawnTimer -= dt;
      if (packbikeGame.spawnTimer <= 0) {
        packbikeGame.spawnTimer = 0.62 + Math.random() * 0.45;
        const lane = Math.floor(Math.random() * 3);
        const roll = Math.random();
        let type = 'rock';
        if (roll < 0.36) type = 'rice';
        else if (roll < 0.6) type = 'ammo';
        else if (roll < 0.82) type = 'rock';
        else type = 'crater';

        packbikeGame.entities.push({
          type,
          lane,
          x: w + 48,
          y: packbikeGame.laneY[lane],
          rot: 0
        });
      }

      const playerX = 142;
      for (let i = packbikeGame.entities.length - 1; i >= 0; i--) {
        const ent = packbikeGame.entities[i];
        ent.x -= pixelSpeed * dt;
        if (ent.type === 'rock') ent.rot -= dt * 3.5;

        const dx = Math.abs(ent.x - playerX);
        const dy = Math.abs(ent.y - packbikeGame.visualY);
        if (dx < 40 && dy < 30) {
          if (ent.type === 'rice') {
            packbikeGame.cargoKg += 50;
            packbikeGame.popups.push({
              text: '+50kg Gạo Điện Biên!',
              x: playerX + 10,
              y: packbikeGame.visualY - 48,
              color: '#ffe600',
              life: 1.0
            });
            playCelebrationAudio(sceneManager.audioListener, 'star');
            packbikeGame.entities.splice(i, 1);
            continue;
          } else if (ent.type === 'ammo') {
            packbikeGame.cargoKg += 80;
            packbikeGame.popups.push({
              text: '+80kg Đạn Pháo!',
              x: playerX + 10,
              y: packbikeGame.visualY - 48,
              color: '#76ff03',
              life: 1.0
            });
            playCelebrationAudio(sceneManager.audioListener, 'star');
            packbikeGame.entities.splice(i, 1);
            continue;
          } else if (packbikeGame.invincibleTimer <= 0) {
            packbikeGame.hp -= 1;
            packbikeGame.invincibleTimer = 1.15;
            packbikeGame.popups.push({
              text: '💥 Va chạm chướng ngại!',
              x: playerX,
              y: packbikeGame.visualY - 52,
              color: '#ff5252',
              life: 1.1
            });
            packbikeGame.entities.splice(i, 1);
            if (packbikeGame.hp <= 0) {
              packbikeGame.status = 'lost';
            }
            continue;
          }
        }

        if (ent.x < -70) {
          packbikeGame.entities.splice(i, 1);
        }
      }

      for (let i = packbikeGame.popups.length - 1; i >= 0; i--) {
        const p = packbikeGame.popups[i];
        p.y -= 36 * dt;
        p.life -= dt;
        if (p.life <= 0) packbikeGame.popups.splice(i, 1);
      }

      for (let i = packbikeGame.dust.length - 1; i >= 0; i--) {
        const d = packbikeGame.dust[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.alpha -= dt * 1.1;
        if (d.alpha <= 0) packbikeGame.dust.splice(i, 1);
      }

      if (packbikeGame.distance >= packbikeGame.targetDistance) {
        packbikeGame.distance = packbikeGame.targetDistance;
        packbikeGame.status = 'won';
        playCelebrationAudio(sceneManager.audioListener, 'quiz_win');
        localCharacter.showSpeechBubble(
          `🚲 Đã thồ ${packbikeGame.cargoKg}kg hàng tiếp tế lên Đồi A1 Điện Biên Phủ!`,
          5.0
        );
        showToast(
          `🎖️ CHIẾN THẮNG! Bạn đạt danh hiệu "Dân Công Hỏa Tuyến Điện Biên" với ${packbikeGame.cargoKg}kg lương thực & đạn dược tiếp viện tiền tuyến!`,
          5500
        );
      }

      updatePackbikeHUD();
    }

    // 1. Bầu trời hoàng hôn rực lửa Tây Bắc & Dãy núi Đèo Pha Đin đa tầng (Parallax)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 108);
    skyGrad.addColorStop(0, '#1e2f29');
    skyGrad.addColorStop(0.55, '#3b5245');
    skyGrad.addColorStop(1, '#c98a4b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, 108);

    // Núi xa mờ sương
    ctx.fillStyle = '#2b3e35';
    ctx.beginPath();
    ctx.moveTo(0, 108);
    for (let x = 0; x <= w + 60; x += 60) {
      const py = 38 + Math.sin(x * 0.018 + packbikeGame.distance * 0.0025) * 22;
      ctx.lineTo(x, py);
    }
    ctx.lineTo(w, 108);
    ctx.closePath();
    ctx.fill();

    // Núi gần + Rừng cây Tây Bắc dọc sườn đèo
    ctx.fillStyle = '#1f3027';
    ctx.beginPath();
    ctx.moveTo(0, 108);
    for (let x = 0; x <= w + 45; x += 45) {
      const py = 58 + Math.cos(x * 0.028 + packbikeGame.distance * 0.0055) * 18;
      ctx.lineTo(x, py);
    }
    ctx.lineTo(w, 108);
    ctx.closePath();
    ctx.fill();

    // Hàng cây rừng lướt qua bên vệ đường (y = 98)
    const treeOffset = (packbikeGame.distance * 3.2) % 90;
    for (let tx = -treeOffset; tx < w + 60; tx += 90) {
      ctx.fillStyle = '#3d2817';
      ctx.fillRect(tx + 18, 84, 5, 24);
      ctx.fillStyle = '#27472c';
      ctx.beginPath();
      ctx.moveTo(tx + 20.5, 52);
      ctx.lineTo(tx + 6, 88);
      ctx.lineTo(tx + 35, 88);
      ctx.closePath();
      ctx.fill();
    }

    // Đồi A1 lịch sử và Cờ Quyết Chiến Quyết Thắng ở góc phải trên
    ctx.fillStyle = '#3f2e20';
    ctx.beginPath();
    ctx.arc(w - 58, 108, 48, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w - 58, 60);
    ctx.lineTo(w - 58, 22);
    ctx.stroke();
    ctx.fillStyle = '#c82323';
    ctx.fillRect(w - 58, 22, 42, 24);
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ ĐỒI A1', w - 37, 38);

    // 2. Mặt đường đất Đèo Pha Đin (3 làn đường rõ nét có cỏ ven đèo)
    const roadGrad = ctx.createLinearGradient(0, 108, 0, h);
    roadGrad.addColorStop(0, '#6b4f31');
    roadGrad.addColorStop(0.5, '#594025');
    roadGrad.addColorStop(1, '#47321c');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, 108, w, h - 108);

    // Viền cỏ ven đèo
    ctx.fillStyle = '#3b5e36';
    ctx.fillRect(0, 106, w, 6);
    ctx.fillRect(0, h - 8, w, 8);

    // Vạch phân làn đường đèo chuyển động
    const dashOffset = (packbikeGame.distance * 4.5) % 44;
    ctx.strokeStyle = 'rgba(255, 238, 195, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([24, 20]);
    ctx.lineDashOffset = dashOffset;
    for (let l = 0; l < 2; l++) {
      const divY = (packbikeGame.laneY[l] + packbikeGame.laneY[l + 1]) / 2 + 10;
      ctx.beginPath();
      ctx.moveTo(0, divY);
      ctx.lineTo(w, divY);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // 3. Vẽ các vật phẩm & chướng ngại vật trên đường đèo
    ctx.textAlign = 'center';
    for (const ent of packbikeGame.entities) {
      ctx.save();
      ctx.translate(ent.x, ent.y);

      // Bóng đổ dưới mặt đường
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 22, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (ent.type === 'rice') {
        // BAO TẢI GẠO ĐIỆN BIÊN (Vẽ bao vải bố căng tròn, thắt nút cổ bao, dây thừng đỏ và huy hiệu ngôi sao)
        // 1. Vòng sáng vàng ấm phía sau vật phẩm thưởng
        const glowGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 32);
        glowGrad.addColorStop(0, 'rgba(255, 230, 0, 0.35)');
        glowGrad.addColorStop(1, 'rgba(255, 230, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();

        // 2. Tai miệng bao túm xòe phía trên cổ bao (y = -15 đến -27)
        const sackGrad = ctx.createLinearGradient(-22, -24, 22, 20);
        sackGrad.addColorStop(0, '#f5deb3');
        sackGrad.addColorStop(0.55, '#dca864');
        sackGrad.addColorStop(1, '#a67638');
        ctx.fillStyle = sackGrad;
        ctx.strokeStyle = '#5c3c1b';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(-8, -14);
        ctx.quadraticCurveTo(-18, -26, -9, -27);
        ctx.quadraticCurveTo(-3, -22, 0, -28);
        ctx.quadraticCurveTo(4, -22, 10, -27);
        ctx.quadraticCurveTo(18, -25, 8, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Thân bao tải vải bố phình tròn căng đầy hạt gạo (Bezier Plump Sack)
        ctx.beginPath();
        ctx.moveTo(-9, -14);
        ctx.bezierCurveTo(-27, -10, -28, 17, -15, 20);
        ctx.lineTo(15, 20);
        ctx.bezierCurveTo(28, 17, 27, -10, 9, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. Vân vải bố đan chéo & đường khâu chỉ hai bên sườn bao
        ctx.strokeStyle = 'rgba(110, 72, 32, 0.28)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-14, -4);
        ctx.lineTo(14, -4);
        ctx.moveTo(-16, 11);
        ctx.lineTo(16, 11);
        ctx.moveTo(-10, -10);
        ctx.lineTo(-12, 16);
        ctx.moveTo(10, -10);
        ctx.lineTo(12, 16);
        ctx.stroke();

        // 5. Dây thừng đỏ - vàng buộc thắt cổ bao
        ctx.fillStyle = '#c82323';
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-11, -16, 22, 5, 2.5);
        ctx.fill();
        ctx.stroke();

        // 6. Tem tròn đỏ in chữ "GẠO" chính giữa bụng bao & nhãn "+50kg" nổi bật
        ctx.fillStyle = '#b81d18';
        ctx.beginPath();
        ctx.roundRect(-18, -5, 36, 15, 5);
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 10.5px "Segoe UI", sans-serif';
        ctx.fillText('🌾 GẠO', 0, 6);

        ctx.fillStyle = '#1b140e';
        ctx.fillText('+50kg', 1, 31);
        ctx.fillStyle = '#ffe600';
        ctx.fillText('+50kg', 0, 30);
      } else if (ent.type === 'ammo') {
        // Hòm đạn pháo quân sự màu xanh lính viền vàng có đai sắt gia cố
        ctx.fillStyle = '#36542b';
        ctx.strokeStyle = '#76ff03';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-28, -16, 56, 35, 5);
        ctx.fill();
        ctx.stroke();

        // Nắp thùng & 2 chốt khóa kim loại
        ctx.fillStyle = '#253b1d';
        ctx.fillRect(-26, -12, 52, 7);
        ctx.fillStyle = '#d4a84f';
        ctx.fillRect(-16, -9, 6, 7);
        ctx.fillRect(10, -9, 6, 7);

        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 11.5px "Segoe UI", sans-serif';
        ctx.fillText('📦 ĐẠN +80kg', 0, 10);
      } else if (ent.type === 'rock') {
        // TẢNG ĐÁ NÚI LĂN ĐA DIỆN 3D (Multi-faceted 3D Boulder + đá vụn bắn phía sau)
        // 1. Vệt bụi & đá dăm văng phía sau tảng đá đang lăn
        ctx.fillStyle = 'rgba(185, 175, 155, 0.45)';
        ctx.beginPath();
        ctx.arc(24, 8, 5, 0, Math.PI * 2);
        ctx.arc(31, 2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(ent.rot || 0);

        // 2. Khối đá nền trung gian (8 cạnh gồ ghề tự nhiên)
        ctx.fillStyle = '#6f7572';
        ctx.strokeStyle = '#232624';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-24, -5);
        ctx.lineTo(-15, -21);
        ctx.lineTo(3, -24);
        ctx.lineTo(19, -15);
        ctx.lineTo(25, 1);
        ctx.lineTo(16, 18);
        ctx.lineTo(-3, 22);
        ctx.lineTo(-19, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Mảng đá bắt sáng góc trên - trái (3D Top-Left Highlight Facet)
        ctx.fillStyle = '#9aa19d';
        ctx.beginPath();
        ctx.moveTo(-21, -5);
        ctx.lineTo(-14, -19);
        ctx.lineTo(2, -21);
        ctx.lineTo(8, -6);
        ctx.lineTo(-6, 2);
        ctx.closePath();
        ctx.fill();

        // 4. Mảng đá khuất sáng góc dưới - phải (3D Bottom-Right Shadow Facet)
        ctx.fillStyle = '#484d4a';
        ctx.beginPath();
        ctx.moveTo(8, -6);
        ctx.lineTo(22, 1);
        ctx.lineTo(15, 16);
        ctx.lineTo(-2, 19);
        ctx.lineTo(-6, 2);
        ctx.closePath();
        ctx.fill();

        // 5. Đường gân đá & vết nứt sắc nét trên bề mặt
        ctx.strokeStyle = '#2b2e2c';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-14, -18);
        ctx.lineTo(-5, 2);
        ctx.lineTo(15, 16);
        ctx.moveTo(8, -6);
        ctx.lineTo(-5, 2);
        ctx.lineTo(-18, 12);
        ctx.stroke();
        ctx.restore();

        // Nhãn cảnh báo dưới chân tảng đá
        ctx.fillStyle = 'rgba(24, 16, 12, 0.82)';
        ctx.beginPath();
        ctx.roundRect(-24, 18, 48, 14, 4);
        ctx.fill();
        ctx.fillStyle = '#ff8a80';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.fillText('⚠️ ĐÁ LĂN', 0, 28);
      } else {
        // HỐ BOM XOÁY SÂU BỐC KHÓI & LỬA ÂM Ỉ (Realistic Scorched Bomb Crater)
        // 1. Các khe nứt mặt đường tỏa ra quanh miệng hố bom
        ctx.strokeStyle = '#26170c';
        ctx.lineWidth = 1.8;
        for (let c = 0; c < 6; c++) {
          const ang = (c * Math.PI) / 3 + 0.3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * 24, 6 + Math.sin(ang) * 12);
          ctx.lineTo(Math.cos(ang + 0.12) * 35, 6 + Math.sin(ang + 0.12) * 19);
          ctx.stroke();
        }

        // 2. Vành đất đá cháy sém xới tung gồ ghề quanh miệng hố
        ctx.fillStyle = '#472f1c';
        ctx.strokeStyle = '#24160b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI * 2) / 12;
          const rx = (i % 2 === 0 ? 33 : 29) * Math.cos(a);
          const ry = 6 + (i % 2 === 0 ? 18 : 15) * Math.sin(a);
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Tầng vách đất sạt lở bên trong hố
        ctx.fillStyle = '#2b1b10';
        ctx.beginPath();
        ctx.ellipse(0, 7, 25, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4. Đáy hố bom sâu đen kịt & đốm than lửa đỏ rực âm ỉ
        ctx.fillStyle = '#120a05';
        ctx.beginPath();
        ctx.ellipse(0, 9, 17, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();

        const emberPulse = 0.65 + Math.sin(packbikeGame.distance * 0.15 + ent.x * 0.05) * 0.35;
        const emberGrad = ctx.createRadialGradient(0, 9, 1, 0, 9, 13);
        emberGrad.addColorStop(0, `rgba(255, 215, 64, ${emberPulse})`);
        emberGrad.addColorStop(0.55, `rgba(255, 61, 0, ${emberPulse * 0.85})`);
        emberGrad.addColorStop(1, 'rgba(255, 61, 0, 0)');
        ctx.fillStyle = emberGrad;
        ctx.beginPath();
        ctx.ellipse(0, 9, 13, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 5. Cụm khói xám đen bốc lên từ miệng hố bom
        const smokeShift = (packbikeGame.distance * 0.6 + ent.x * 0.2) % 14;
        ctx.fillStyle = 'rgba(70, 62, 56, 0.42)';
        ctx.beginPath();
        ctx.arc(-8, -2 - smokeShift * 0.7, 6.5, 0, Math.PI * 2);
        ctx.arc(7, -5 - smokeShift, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Nhãn cảnh báo gọn ở mép dưới hố bom
        ctx.fillStyle = '#ffab91';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.fillText('💥 HỐ BOM', 0, 26);
      }
      ctx.restore();
    }

    // 4. Hạt bụi đường đèo khi đẩy xe
    for (const d of packbikeGame.dust) {
      ctx.fillStyle = `rgba(230, 205, 165, ${Math.max(0, d.alpha)})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Vẽ Chiến sĩ Dân công hỏa tuyến & Chiếc Xe Đạp Thồ Điện Biên chi tiết
    ctx.save();
    ctx.translate(142, packbikeGame.visualY);
    if (
      packbikeGame.invincibleTimer > 0 &&
      Math.floor(packbikeGame.invincibleTimer * 10) % 2 === 0
    ) {
      ctx.globalAlpha = 0.45;
    }

    // Bóng đổ dưới chiếc xe đạp thồ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(-8, 28, 54, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hai bánh xe đạp thồ có nan hoa xoay tròn
    [-22, 28].forEach((wx) => {
      ctx.save();
      ctx.translate(wx, 14);
      ctx.strokeStyle = '#181412';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#b0a695';
      ctx.lineWidth = 1.4;
      for (let s = 0; s < 4; s++) {
        const a = packbikeGame.wheelAngle + (s * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * -13, Math.sin(a) * -13);
        ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Khung sắt xe đạp & Cọc tre gia cố (Tay ngai & Cọc thồ)
    ctx.strokeStyle = '#2d421e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-22, 14);
    ctx.lineTo(2, -4);
    ctx.lineTo(28, 14);
    ctx.moveTo(2, -4);
    ctx.lineTo(-14, 14);
    ctx.stroke();

    // Khung tre thồ hàng (màu vàng tre)
    ctx.strokeStyle = '#d4a84f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-22, 14);
    ctx.lineTo(-22, -44);
    ctx.moveTo(-36, -12);
    ctx.lineTo(18, -12);
    ctx.stroke();

    // Các bao tải gạo & hòm đạn chất cao trên xe đạp thồ
    ctx.fillStyle = '#dec081';
    ctx.strokeStyle = '#6b4c2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-22, -24, 46, 15, 6);
    ctx.roundRect(-18, -38, 40, 15, 6);
    ctx.roundRect(-14, -51, 32, 14, 6);
    ctx.fill();
    ctx.stroke();

    // Lá cờ đỏ sao vàng tung bay trên đỉnh kiện hàng
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -51);
    ctx.lineTo(8, -72);
    ctx.stroke();
    ctx.fillStyle = '#c82323';
    ctx.fillRect(8, -72, 24, 15);
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('★', 20, -61);

    // Chiến sĩ Dân công hỏa tuyến bước chân đẩy xe bên trái
    const legSwing = Math.sin(packbikeGame.wheelAngle * 0.9) * 8;
    ctx.strokeStyle = '#2b3d1e';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-42, 4);
    ctx.lineTo(-46 - legSwing, 24);
    ctx.moveTo(-42, 4);
    ctx.lineTo(-38 + legSwing, 24);
    ctx.stroke();

    // Thân áo trấn thủ xanh bộ đội & khăn quàng đỏ ở cổ
    ctx.fillStyle = '#486630';
    ctx.beginPath();
    ctx.roundRect(-51, -20, 18, 26, 5);
    ctx.fill();
    ctx.fillStyle = '#c82323';
    ctx.fillRect(-49, -20, 14, 5);

    // Cánh tay nắm thanh tre tay ngai đẩy xe
    ctx.strokeStyle = '#486630';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-40, -14);
    ctx.lineTo(-24, -12);
    ctx.stroke();

    // Đầu & Mũ cối đính sao vàng
    ctx.fillStyle = '#f5d2a8';
    ctx.beginPath();
    ctx.arc(-41, -28, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#364f24';
    ctx.beginPath();
    ctx.arc(-41, -31, 11, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-54, -32, 26, 3.5);
    ctx.fillStyle = '#ffe600';
    ctx.font = '8px sans-serif';
    ctx.fillText('★', -35, -33);
    ctx.restore();

    // 6. Hiển thị chữ nổi (+50kg / +80kg) khi ăn vật phẩm
    ctx.textAlign = 'center';
    for (const p of packbikeGame.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#000';
      ctx.fillText(p.text, p.x + 1, p.y + 1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    // 7. Thanh tiến trình đường lên Đồi A1 ở đầu Canvas
    const prog = Math.min(1, packbikeGame.distance / packbikeGame.targetDistance);
    ctx.fillStyle = 'rgba(18, 14, 10, 0.72)';
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(16, 12, w - 118, 22, 11);
    ctx.fill();
    ctx.stroke();

    const barGrad = ctx.createLinearGradient(20, 0, w - 110, 0);
    barGrad.addColorStop(0, '#c82323');
    barGrad.addColorStop(1, '#ffe600');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(19, 15, Math.max(14, (w - 124) * prog), 16, 8);
    ctx.fill();

    ctx.fillStyle = '#fff9eb';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `HÀNH TRÌNH VƯỢT ĐÈO PHA ĐIN LÊN ĐỒI A1: ${Math.floor(prog * 100)}%`,
      16 + (w - 118) / 2,
      27
    );

    // 8. Màn hình kết thúc (Thắng hoặc Thua)
    if (packbikeGame.status !== 'playing') {
      ctx.fillStyle = 'rgba(18, 13, 10, 0.86)';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 26px "Segoe UI", sans-serif';
      if (packbikeGame.status === 'won') {
        ctx.fillText('🚩 CHIẾN THẮNG! ĐÃ TỚI ĐỒI A1 ĐIỆN BIÊN PHỦ!', w / 2, h / 2 - 28);
        ctx.fillStyle = '#fff9eb';
        ctx.font = '18px "Segoe UI", sans-serif';
        ctx.fillText(
          `Đồng chí đã thồ thành công ${packbikeGame.cargoKg} kg lương thực & đạn dược vượt Đèo Pha Đin!`,
          w / 2,
          h / 2 + 12
        );
      } else {
        ctx.fillText('💥 XE THỒ GẶP CHƯỚNG NGẠI VẬT TRÊN ĐÈO PHA ĐIN!', w / 2, h / 2 - 28);
        ctx.fillStyle = '#fff9eb';
        ctx.font = '18px "Segoe UI", sans-serif';
        ctx.fillText(
          `Đã đi được ${Math.floor(packbikeGame.distance)}m / 1500m. Nhấn [Space] hoặc "Chơi Lại Từ Đầu" để tiếp tục!`,
          w / 2,
          h / 2 + 12
        );
      }
    }
  };

  // =========================================================================
  // TÍNH NĂNG 1: MINI-GAME NHỊP ĐIỆU "HÒ KÉO PHÁO ĐIỆN BIÊN (1954)"
  // =========================================================================
  const artilleryBackdrop = document.getElementById('artillery-modal');
  const artilleryCloseBtn = document.getElementById('artillery-close-btn');
  const artilleryCanvas = document.getElementById('artillery-canvas');
  const artillerySlopeBadge = document.getElementById('artillery-slope-badge');
  const artilleryComboBadge = document.getElementById('artillery-combo-badge');
  const artilleryStatusBadge = document.getElementById('artillery-status-badge');
  const artilleryPullBtn = document.getElementById('artillery-pull-btn');
  const artilleryRestartBtn = document.getElementById('artillery-restart-btn');

  const artilleryAudio = new Audio('./src/assets/Ho-Keo-Phao-Hoang-Van.mp3');
  artilleryAudio.loop = true;
  artilleryAudio.volume = 0.55;

  const artilleryGame = {
    isOpen: false,
    status: 'playing', // 'playing' | 'won'
    distance: 0,
    targetDistance: 100,
    combo: 0,
    cursorPos: 0.15,   // 0..1 trên thanh nhịp điệu
    cursorDir: 1,
    cursorSpeed: 0.88,
    targetCenter: 0.52,
    targetHalfWidth: 0.11,
    pullAnimTimer: 0,
    lastFeedback: 'Nhấn [Space] đúng vùng vàng "HÒ DÔ TA!"',
    feedbackColor: '#ffe600',
    sparks: []
  };

  const updateArtilleryHUD = () => {
    if (artillerySlopeBadge) {
      artillerySlopeBadge.textContent = `⛰️ Dốc Chuối Điện Biên: ${Math.min(
        100,
        Math.floor(artilleryGame.distance)
      )} / 100m`;
    }
    if (artilleryComboBadge) {
      artilleryComboBadge.textContent = `🔥 Nhịp Hò Dô: Chuỗi x${artilleryGame.combo}`;
    }
    if (artilleryStatusBadge) {
      artilleryStatusBadge.textContent =
        artilleryGame.status === 'won'
          ? '🚩 Pháo 105mm đã vào hầm công sự!'
          : `💪 ${artilleryGame.lastFeedback}`;
    }
  };

  const resetArtilleryGame = () => {
    artilleryGame.status = 'playing';
    artilleryGame.distance = 0;
    artilleryGame.combo = 0;
    artilleryGame.cursorPos = 0.12;
    artilleryGame.cursorDir = 1;
    artilleryGame.cursorSpeed = 0.88;
    artilleryGame.targetCenter = 0.5;
    artilleryGame.pullAnimTimer = 0;
    artilleryGame.lastFeedback = 'Nhấn [Space] khi vạch sáng vào VÙNG VÀNG!';
    artilleryGame.feedbackColor = '#ffe600';
    artilleryGame.sparks = [];
    updateArtilleryHUD();
  };

  const openArtilleryModal = () => {
    artilleryGame.isOpen = true;
    playerController.isArtilleryOpen = true;
    resetArtilleryGame();
    museumMap.setPositionalAudioMuted(true);
    artilleryAudio.currentTime = 0;
    artilleryAudio.play().catch(() => {});
    artilleryBackdrop?.classList.remove('hidden');
  };

  const closeArtilleryModal = () => {
    artilleryGame.isOpen = false;
    playerController.isArtilleryOpen = false;
    artilleryAudio.pause();
    if (!radioState.isPlaying && !cinemaState.isOpen) {
      museumMap.setPositionalAudioMuted(false);
    }
    artilleryBackdrop?.classList.add('hidden');
  };

  const triggerArtilleryPull = () => {
    if (!artilleryGame.isOpen) return;
    if (artilleryGame.status !== 'playing') {
      resetArtilleryGame();
      return;
    }

    const diff = Math.abs(artilleryGame.cursorPos - artilleryGame.targetCenter);
    artilleryGame.pullAnimTimer = 0.35;

    if (diff <= artilleryGame.targetHalfWidth) {
      // Nhịp chuẩn VÙNG VÀNG "HÒ DÔ TA!"
      artilleryGame.combo += 1;
      const gain = 13 + Math.min(8, artilleryGame.combo * 2);
      artilleryGame.distance = Math.min(100, artilleryGame.distance + gain);
      artilleryGame.lastFeedback = `HÒ DÔ TA! Chuẩn nhịp (+${gain}m)!`;
      artilleryGame.feedbackColor = '#76ff03';
      playCelebrationAudio(sceneManager.audioListener, 'star');

      // Đổi nhẹ vị trí vùng vàng cho nhịp tiếp theo thêm phần thú vị
      artilleryGame.targetCenter = 0.32 + Math.random() * 0.38;
      artilleryGame.cursorSpeed = Math.min(1.42, 0.88 + artilleryGame.combo * 0.06);

      for (let i = 0; i < 12; i++) {
        artilleryGame.sparks.push({
          x: 360 + (Math.random() - 0.5) * 80,
          y: 288,
          vx: (Math.random() - 0.5) * 140,
          vy: -60 - Math.random() * 90,
          life: 0.65
        });
      }
    } else if (diff <= artilleryGame.targetHalfWidth * 1.85) {
      // Nhịp Khá
      artilleryGame.combo = Math.max(1, artilleryGame.combo);
      artilleryGame.distance = Math.min(100, artilleryGame.distance + 7);
      artilleryGame.lastFeedback = 'Hai, ba nào! Kéo lên (+7m)!';
      artilleryGame.feedbackColor = '#ffe600';
    } else {
      // Lệch nhịp - Chèn pháo giữ vững không tụt dốc sâu
      artilleryGame.combo = 0;
      artilleryGame.distance = Math.max(0, artilleryGame.distance - 3);
      artilleryGame.lastFeedback = 'Lệch nhịp! Lấy gỗ chèn pháo giữ dốc (-3m)!';
      artilleryGame.feedbackColor = '#ff8a80';
    }

    if (artilleryGame.distance >= 100) {
      artilleryGame.distance = 100;
      artilleryGame.status = 'won';
      playCelebrationAudio(sceneManager.audioListener, 'quiz_win');
      museumMap.launchVictoryFireworks(6);
      localCharacter.showSpeechBubble(
        '🎯 Đã kéo Pháo 105mm vượt Dốc Chuối lên đỉnh Điện Biên Phủ!',
        5.2
      );
      showToast(
        '🎖️ CHIẾN THẮNG! Bạn đạt danh hiệu "Chiến Sĩ Pháo Binh Điện Biên" — Đưa pháo 105mm vào công sự an toàn!',
        5500
      );
    }

    updateArtilleryHUD();
  };

  artilleryPullBtn?.addEventListener('click', () => triggerArtilleryPull());
  artilleryRestartBtn?.addEventListener('click', () => resetArtilleryGame());
  artilleryCloseBtn?.addEventListener('click', () => playerController.closeAllModals());

  window.addEventListener('keydown', (e) => {
    if (!artilleryGame.isOpen) return;
    if (e.code === 'Space') {
      e.preventDefault();
      triggerArtilleryPull();
    }
  });

  const updateAndDrawArtilleryGame = (dt) => {
    if (!artilleryGame.isOpen || !artilleryCanvas) return;
    const ctx = artilleryCanvas.getContext('2d');
    const w = artilleryCanvas.width;
    const h = artilleryCanvas.height;

    if (artilleryGame.status === 'playing') {
      artilleryGame.cursorPos += artilleryGame.cursorDir * artilleryGame.cursorSpeed * dt;
      if (artilleryGame.cursorPos >= 0.96) {
        artilleryGame.cursorPos = 0.96;
        artilleryGame.cursorDir = -1;
      } else if (artilleryGame.cursorPos <= 0.04) {
        artilleryGame.cursorPos = 0.04;
        artilleryGame.cursorDir = 1;
      }
      if (artilleryGame.pullAnimTimer > 0) {
        artilleryGame.pullAnimTimer = Math.max(0, artilleryGame.pullAnimTimer - dt);
      }
    }

    // =====================================================================
    // ĐỒ HỌA MỚI: DỐC CHUỐI ĐÊM TÂY BẮC — TRĂNG, SƯƠNG MÙ, ĐUỐC LỬA, KÉO PHÁO 105MM
    // =====================================================================
    const tNow = performance.now() / 1000;
    const prog = Math.min(1, artilleryGame.distance / 100);
    const SLOPE_Y0 = 248;
    const SLOPE_Y1 = 58;
    const slopeYAt = (x) => SLOPE_Y0 + (SLOPE_Y1 - SLOPE_Y0) * (x / w);
    const slopeAngle = Math.atan2(SLOPE_Y1 - SLOPE_Y0, w);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, 250);
    ctx.clip();

    // 1. Bầu trời đêm: gradient + sao lấp lánh + trăng
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 250);
    skyGrad.addColorStop(0, '#070d1b');
    skyGrad.addColorStop(0.5, '#1b2440');
    skyGrad.addColorStop(1, '#5e3326');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, 250);

    for (let i = 0; i < 46; i++) {
      const sx = (i * 97.3) % w;
      const sy = (i * 53.7) % 140;
      const tw = 0.35 + 0.45 * Math.abs(Math.sin(tNow * 1.6 + i));
      ctx.fillStyle = `rgba(255, 245, 214, ${tw})`;
      ctx.fillRect(sx, sy, i % 5 === 0 ? 2.4 : 1.4, i % 5 === 0 ? 2.4 : 1.4);
    }

    const moonGlow = ctx.createRadialGradient(92, 50, 6, 92, 50, 70);
    moonGlow.addColorStop(0, 'rgba(255, 244, 205, 0.55)');
    moonGlow.addColorStop(1, 'rgba(255, 244, 205, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(10, 0, 170, 130);
    ctx.fillStyle = '#f6efd2';
    ctx.beginPath();
    ctx.arc(92, 50, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 188, 150, 0.45)';
    ctx.beginPath();
    ctx.arc(86, 46, 4, 0, Math.PI * 2);
    ctx.arc(99, 56, 3, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hai lớp núi Hoàng Liên Sơn (parallax theo tiến độ kéo pháo)
    const drawRange = (color, baseY, amp, step, seed, shift) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 250);
      for (let x = -40; x <= w + 40; x += step) {
        const y =
          baseY -
          amp * (0.55 + 0.45 * Math.sin((x + shift) * 0.011 + seed)) -
          amp * 0.35 * Math.sin((x + shift) * 0.027 + seed * 2.1);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 40, 250);
      ctx.closePath();
      ctx.fill();
    };
    drawRange('#17202e', 178, 78, 14, 1.3, -prog * 22);
    drawRange('#0f1822', 205, 60, 12, 4.1, -prog * 46);

    // 3. Rừng chuối Dốc Chuối phía xa (bóng đen)
    const drawBanana = (bx, by, s) => {
      ctx.strokeStyle = '#0b130d';
      ctx.fillStyle = '#0d1a10';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 2 * s, by - 34 * s);
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const ang = -Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(tNow * 1.2 + bx) * 0.05;
        ctx.beginPath();
        ctx.moveTo(bx - 2 * s, by - 34 * s);
        ctx.quadraticCurveTo(
          bx - 2 * s + Math.cos(ang) * 20 * s,
          by - 34 * s + Math.sin(ang) * 22 * s - 6 * s,
          bx - 2 * s + Math.cos(ang) * 34 * s,
          by - 34 * s + Math.sin(ang) * 22 * s + 16 * s
        );
        ctx.quadraticCurveTo(
          bx - 2 * s + Math.cos(ang) * 20 * s,
          by - 34 * s + Math.sin(ang) * 22 * s + 2 * s,
          bx - 2 * s,
          by - 34 * s
        );
        ctx.fill();
      }
    };
    [40, 150, 265, 380, 505, 610].forEach((bx, i) => {
      const gy = slopeYAt(bx) + 4;
      drawBanana(bx + 36, gy - 4, 0.9 + (i % 3) * 0.18);
    });

    // 4. Sườn dốc đất đỏ + cỏ + đá + vệt bánh xe
    const hillGrad = ctx.createLinearGradient(0, 60, 0, 250);
    hillGrad.addColorStop(0, '#5a3d24');
    hillGrad.addColorStop(1, '#2a1a0f');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, SLOPE_Y0);
    ctx.lineTo(w, SLOPE_Y1);
    ctx.lineTo(w, 252);
    ctx.lineTo(0, 252);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#6f8a3b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, SLOPE_Y0 - 1);
    ctx.lineTo(w, SLOPE_Y1 - 1);
    ctx.stroke();
    ctx.strokeStyle = '#8aa84c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, SLOPE_Y0 - 3);
    ctx.lineTo(w, SLOPE_Y1 - 3);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(20, 12, 6, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, SLOPE_Y0 + 9);
    ctx.lineTo(w, SLOPE_Y1 + 9);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 22; i++) {
      const rx = (i * 61.7) % w;
      const ry = slopeYAt(rx) + 14 + ((i * 37) % 38);
      ctx.fillStyle = i % 2 ? 'rgba(98, 80, 60, 0.7)' : 'rgba(70, 52, 36, 0.8)';
      ctx.beginPath();
      ctx.ellipse(rx, ry, 5 + (i % 4), 3 + (i % 3), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cột mốc mét trên dốc (0m → 100m)
    ctx.font = 'bold 9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (let m = 0; m <= 100; m += 25) {
      const mx = 95 + (m / 100) * 495;
      const my = slopeYAt(mx);
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(mx - 1.5, my + 8, 3, 14);
      ctx.fillStyle = 'rgba(255, 243, 210, 0.9)';
      ctx.fillText(`${m}m`, mx, my + 33);
    }

    // 5. Đuốc lửa dọc sườn dốc (nhấp nháy)
    [150, 300, 450, 600].forEach((tx, i) => {
      const ty = slopeYAt(tx) - 2;
      ctx.strokeStyle = '#4a3320';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty - 26);
      ctx.stroke();
      const flick = 0.75 + 0.25 * Math.sin(tNow * 9 + i * 2.1);
      const glow = ctx.createRadialGradient(tx, ty - 30, 2, tx, ty - 30, 46 * flick);
      glow.addColorStop(0, 'rgba(255, 190, 80, 0.55)');
      glow.addColorStop(1, 'rgba(255, 120, 30, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(tx - 50, ty - 80, 100, 100);
      ctx.fillStyle = '#ff9a2e';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 32, 4.2 * flick, 8 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 31, 2.1 * flick, 4.4 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Hầm công sự & lá cờ Quyết chiến Quyết thắng tung bay trên đỉnh dốc
    ctx.fillStyle = '#3e2f20';
    ctx.beginPath();
    ctx.arc(672, 64, 38, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#7b6446';
    for (let sb = 0; sb < 5; sb++) {
      ctx.beginPath();
      ctx.ellipse(645 + sb * 15, 62 - (sb % 2) * 4, 9, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#d9c9a0';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(668, 56);
    ctx.lineTo(668, 8);
    ctx.stroke();
    const waveF = Math.sin(tNow * 3.2) * 3;
    ctx.fillStyle = '#c82323';
    ctx.beginPath();
    ctx.moveTo(669, 10);
    ctx.quadraticCurveTo(686, 6 + waveF, 704, 12);
    ctx.lineTo(704, 34);
    ctx.quadraticCurveTo(686, 30 - waveF, 669, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 686, 29);
    ctx.fillStyle = 'rgba(255, 230, 0, 0.9)';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.fillText('ĐỈNH DỐC', 668, 78);

    // 7. Khẩu pháo lựu 105mm + 5 chiến sĩ kéo pháo trên sườn dốc
    const cannonX = 95 + prog * 495;
    const groundY = slopeYAt(cannonX);
    const isPulling = artilleryGame.pullAnimTimer > 0;
    const stride = isPulling ? 11 : 4.2;
    const lean = isPulling ? 0.4 : 0.22;

    ctx.save();
    ctx.translate(cannonX, groundY);
    ctx.rotate(slopeAngle);

    // Bóng đổ dưới pháo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(10, 2, 62, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bụi đất tung lên khi kéo
    if (isPulling) {
      for (let k = 0; k < 6; k++) {
        const life = artilleryGame.pullAnimTimer * 2.2 + k * 0.17;
        ctx.fillStyle = `rgba(180, 150, 110, ${Math.max(0, 0.34 - k * 0.04)})`;
        ctx.beginPath();
        ctx.arc(-34 - k * 10 - (1 - Math.min(1, life)) * 6, -4 - k * 2.4, 4 + k * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Gỗ chèn bánh sau
    ctx.fillStyle = '#d4a84f';
    ctx.strokeStyle = '#7a5a22';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-22, 0);
    ctx.lineTo(-22, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Càng pháo (2 trụ đỡ phía sau)
    ctx.strokeStyle = '#2f3a20';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-6, -20);
    ctx.lineTo(-46, -2);
    ctx.moveTo(-6, -22);
    ctx.lineTo(-52, -9);
    ctx.stroke();
    ctx.fillStyle = '#3c4a28';
    ctx.fillRect(-52, -4, 8, 4);

    // Nòng pháo lựu 105mm: thân, ống giật, phanh đầu nòng
    ctx.save();
    ctx.translate(2, -30);
    ctx.rotate(-0.2);
    const barrelGrad = ctx.createLinearGradient(0, -7, 0, 7);
    barrelGrad.addColorStop(0, '#6a7f4a');
    barrelGrad.addColorStop(0.5, '#4a5d32');
    barrelGrad.addColorStop(1, '#2d3a1e');
    ctx.fillStyle = barrelGrad;
    ctx.strokeStyle = '#1c2612';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-16, -7, 40, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(22, -4.5, 62, 9, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26311a';
    ctx.fillRect(80, -6.5, 12, 13);
    ctx.strokeRect(80, -6.5, 12, 13);
    ctx.fillStyle = '#171f10';
    ctx.fillRect(84, -6.5, 2.2, 13);
    ctx.fillStyle = '#8c9a6d';
    for (let r = 0; r < 3; r++) ctx.fillRect(30 + r * 17, -4.5, 2, 9);
    ctx.restore();

    // Tấm chắn thép + sao vàng
    ctx.fillStyle = '#566c3a';
    ctx.strokeStyle = '#1f2915';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -50);
    ctx.lineTo(12, -48);
    ctx.lineTo(14, -14);
    ctx.lineTo(-8, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c9d6a8';
    [[-2, -44], [8, -43], [-2, -20], [8, -19]].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 1.1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 3, -29);

    // Bánh xe pháo 105mm (căm quay theo tiến độ)
    ctx.save();
    ctx.translate(2, -17);
    ctx.rotate(prog * 38);
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b3b3b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 14.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#4a5d32';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f2915';
    ctx.lineWidth = 1.6;
    for (let sp = 0; sp < 8; sp++) {
      const a = (sp / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.fillStyle = '#b9b39a';
    ctx.beginPath();
    ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dây thừng căng từ pháo tới các chiến sĩ
    const ropeEndX = 86 + 4 * 30;
    ctx.strokeStyle = '#e0c088';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(14, -22);
    ctx.quadraticCurveTo((14 + ropeEndX) / 2, isPulling ? -26 : -18, ropeEndX, -27);
    ctx.stroke();

    // 5 chiến sĩ pháo binh: chân bước, thân nghiêng gồng kéo, mũ cối sao vàng
    for (let s = 0; s < 5; s++) {
      const sx = 86 + s * 30;
      const swing = Math.sin(tNow * (isPulling ? 9 : 5) + s * 1.3) * stride;
      ctx.save();
      ctx.translate(sx, 0);
      ctx.rotate(lean);

      ctx.strokeStyle = '#2f4423';
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1.5, -14);
      ctx.lineTo(-1.5 + swing * 0.5, 0);
      ctx.moveTo(2, -14);
      ctx.lineTo(2 - swing * 0.5, 0);
      ctx.stroke();

      ctx.fillStyle = s % 2 ? '#526f38' : '#486630';
      ctx.beginPath();
      ctx.roundRect(-6.5, -34, 13, 21, 3);
      ctx.fill();
      ctx.fillStyle = '#8c6a3d';
      ctx.fillRect(-6.5, -22, 13, 2.4);

      ctx.strokeStyle = '#486630';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-2, -31);
      ctx.lineTo(-14, -27);
      ctx.stroke();
      ctx.lineCap = 'butt';

      ctx.fillStyle = '#f0c89a';
      ctx.beginPath();
      ctx.arc(1, -39, 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a8f54';
      ctx.beginPath();
      ctx.arc(1, -41, 7.2, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-6.2, -41.3, 14.4, 2);
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(1, -44.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 8. Sương mù trôi nhẹ phía trước
    for (let m = 0; m < 3; m++) {
      const mx = ((tNow * (8 + m * 5) + m * 260) % (w + 300)) - 150;
      const mg = ctx.createRadialGradient(mx, 190 + m * 14, 4, mx, 190 + m * 14, 120);
      mg.addColorStop(0, 'rgba(210, 222, 235, 0.16)');
      mg.addColorStop(1, 'rgba(210, 222, 235, 0)');
      ctx.fillStyle = mg;
      ctx.fillRect(mx - 130, 120, 260, 130);
    }

    ctx.restore();


    // 4. Khung Thanh Nhịp Điệu "HÒ DÔ TA!" ở phần dưới Canvas (y = 252..330)
    ctx.fillStyle = 'rgba(18, 13, 10, 0.92)';
    ctx.fillRect(0, 250, w, h - 250);
    ctx.strokeStyle = '#8c6239';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 250);
    ctx.lineTo(w, 250);
    ctx.stroke();

    // Dòng thông báo nhịp Hò Dô
    ctx.fillStyle = artilleryGame.feedbackColor;
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(artilleryGame.lastFeedback, w / 2, 272);

    // Thanh bar nhịp điệu (x = 70..650, y = 284, w = 580, h = 28)
    const barX = 70;
    const barY = 284;
    const barW = 580;
    const barH = 28;

    ctx.fillStyle = '#2a211b';
    ctx.strokeStyle = '#d99b26';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 14);
    ctx.fill();
    ctx.stroke();

    // Vùng Khá (màu cam ấm)
    const goodLeft = Math.max(0, artilleryGame.targetCenter - artilleryGame.targetHalfWidth * 1.85);
    const goodRight = Math.min(1, artilleryGame.targetCenter + artilleryGame.targetHalfWidth * 1.85);
    ctx.fillStyle = 'rgba(217, 155, 38, 0.35)';
    ctx.fillRect(barX + goodLeft * barW, barY + 3, (goodRight - goodLeft) * barW, barH - 6);

    // VÙNG VÀNG CHUẨN NHỊP "HÒ DÔ TA!"
    const goldLeft = Math.max(0, artilleryGame.targetCenter - artilleryGame.targetHalfWidth);
    const goldRight = Math.min(1, artilleryGame.targetCenter + artilleryGame.targetHalfWidth);
    const goldGrad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    goldGrad.addColorStop(0, '#ffe600');
    goldGrad.addColorStop(1, '#f29f05');
    ctx.fillStyle = goldGrad;
    ctx.fillRect(barX + goldLeft * barW, barY + 2, (goldRight - goldLeft) * barW, barH - 4);

    ctx.fillStyle = '#1c140d';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillText('★ HÒ DÔ TA! ★', barX + artilleryGame.targetCenter * barW, barY + 18);

    // Con trỏ nhịp chạy qua lại
    const curX = barX + artilleryGame.cursorPos * barW;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c82323';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(curX - 6, barY - 5, 12, barH + 10, 5);
    ctx.fill();
    ctx.stroke();

    // Hạt pháo sáng khi nhấn trúng nhịp vàng
    for (let i = artilleryGame.sparks.length - 1; i >= 0; i--) {
      const sp = artilleryGame.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        artilleryGame.sparks.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(255, 230, 0, ${Math.max(0, sp.life)})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Màn hình chiến thắng khi kéo pháo đủ 100m lên đỉnh Dốc Chuối
    if (artilleryGame.status === 'won') {
      ctx.fillStyle = 'rgba(18, 13, 10, 0.86)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 25px "Segoe UI", sans-serif';
      ctx.fillText('🚩 CHIẾN THẮNG! PHÁO 105MM ĐÃ LÊN ĐỈNH ĐIỆN BIÊN!', w / 2, h / 2 - 22);
      ctx.fillStyle = '#fff9eb';
      ctx.font = '17px "Segoe UI", sans-serif';
      ctx.fillText(
        'Đồng chí đã cùng Đại đoàn Công pháo 351 vượt Dốc Chuối đưa pháo vào hầm công sự an toàn!',
        w / 2,
        h / 2 + 16
      );
    }
  };

  // =========================================================================
  // TÍNH NĂNG 1 & 3: CHUYỂN ĐỔI NGÀY / HOÀNG HÔN / ĐÊM & PHÁO HOA ĐẠI THẮNG
  // =========================================================================
  const timeOfDayBtn = document.getElementById('time-of-day-btn');
  const fireworksBtn = document.getElementById('fireworks-btn');
  const timeModes = ['day', 'sunset', 'night'];
  const timeLabels = {
    day: '☀️ Không gian: Ban Ngày',
    sunset: '🌅 Không gian: Hoàng Hôn',
    night: '🌙 Không gian: Ban Đêm'
  };
  let currentTimeModeIndex = 0;

  timeOfDayBtn?.addEventListener('click', () => {
    currentTimeModeIndex = (currentTimeModeIndex + 1) % timeModes.length;
    const mode = timeModes[currentTimeModeIndex];
    sceneManager.setTimeOfDay(mode);
    museumMap.isNightMode = mode === 'night';
    timeOfDayBtn.textContent = timeLabels[mode];

    if (mode === 'sunset') {
      showToast('🌅 Đã chuyển sang khung cảnh Hoàng Hôn ấm áp trên Quảng trường Lịch sử!');
    } else if (mode === 'night') {
      museumMap.launchVictoryFireworks(6);
      playCelebrationAudio(sceneManager.audioListener, 'declaration');
      showToast('🌙 Đã chuyển sang Ban Đêm lung linh ánh đèn & Pháo hoa rực sáng trên bầu trời!');
    } else {
      showToast('☀️ Đã chuyển về bầu trời Ban Ngày trong xanh!');
    }
  });

  fireworksBtn?.addEventListener('click', () => {
    museumMap.launchVictoryFireworks(6);
    playCelebrationAudio(sceneManager.audioListener, 'declaration');
    localCharacter.showSpeechBubble('🎆 Chào mừng Ngày Toàn Thắng! Pháo hoa rực sáng!', 4.2);
    if (playerController.currentZone === 'indoor') {
      showToast(
        '🎆 Đang bắn Pháo Hoa Chào Mừng Đại Thắng trên bầu trời Quảng trường Ngoài sân! Hãy bước ra sân hoặc chọn mốc "🏛️ Quảng Trường" để chiêm ngưỡng!',
        4800
      );
    } else {
      showToast('🎆 Pháo Hoa Chào Mừng Ngày Toàn Thắng đang rực sáng trên bầu trời Quảng trường!', 4200);
    }
  });

  // =========================================================================
  // NÚT CÀI ĐẶT RIÊNG (⚙️) VÀ NÚT CHỈ ĐƯỜNG GPS RIÊNG (🧭) TỪ NHÂN VẬT TỚI HIỆN VẬT
  // =========================================================================
  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsCloseBtn = document.getElementById('settings-close-btn');

  const gpsMenuBtn = document.getElementById('gps-menu-btn');
  const timelineHud = document.getElementById('timeline-hud');
  const gpsCloseBtn = document.getElementById('gps-close-btn');
  const gpsToggleBtn = document.getElementById('gps-toggle-btn');
  const gpsNearestBtn = document.getElementById('gps-nearest-btn');
  const gpsExhibitSelect = document.getElementById('gps-exhibit-select');
  const timelineTeleportBtn = document.getElementById('timeline-teleport-btn');
  const timelineStepsRow = document.getElementById('timeline-steps-row');

  let activeMilestoneIndex = -1; // -1 = Đang ở chế độ Tự động chỉ Hiện vật gần nhất
  let selectedExhibitForGps = null;
  let gpsEnabled = true;

  // Đóng/mở bảng Cài đặt & Hướng dẫn riêng
  settingsToggleBtn?.addEventListener('click', () => {
    const isNowHidden = settingsPanel?.classList.toggle('hidden');
    settingsToggleBtn.classList.toggle('active', !isNowHidden);
    if (!isNowHidden) {
      timelineHud?.classList.add('hidden');
      gpsMenuBtn?.classList.remove('active');
    }
  });

  settingsCloseBtn?.addEventListener('click', () => {
    settingsPanel?.classList.add('hidden');
    settingsToggleBtn?.classList.remove('active');
  });

  // Đóng/mở bảng Chỉ đường GPS riêng
  gpsMenuBtn?.addEventListener('click', () => {
    const isNowHidden = timelineHud?.classList.toggle('hidden');
    gpsMenuBtn.classList.toggle('active', !isNowHidden);
    if (!isNowHidden) {
      settingsPanel?.classList.add('hidden');
      settingsToggleBtn?.classList.remove('active');
    }
  });

  gpsCloseBtn?.addEventListener('click', () => {
    timelineHud?.classList.add('hidden');
    gpsMenuBtn?.classList.remove('active');
  });

  // Đổ danh sách 20 Hiện vật vào ô chọn GPS để mũi tên chỉ thẳng từ nhân vật tới hiện vật
  if (gpsExhibitSelect) {
    gpsExhibitSelect.innerHTML =
      '<option value="auto_nearest">🎯 Tự động chỉ từ nhân vật đến Hiện vật gần nhất</option>';
    EXHIBITS_DATA.forEach((ex, i) => {
      const opt = document.createElement('option');
      opt.value = ex.id;
      const floorTag =
        ex.zoneType === 'outdoor' ? 'Ngoài sân' : `Tầng ${ex.floor}`;
      opt.textContent = `${i + 1}. [${floorTag}] ${ex.title}`;
      gpsExhibitSelect.appendChild(opt);
    });

    gpsExhibitSelect.addEventListener('change', () => {
      const val = gpsExhibitSelect.value;
      if (val === 'auto_nearest') {
        selectedExhibitForGps = null;
        activeMilestoneIndex = -1;
        gpsNearestBtn?.classList.add('active');
        timelineStepsRow
          ?.querySelectorAll('.timeline-step-btn')
          .forEach((b) => b.classList.remove('active'));
        museumMap.setWayfindingTarget({ mode: 'auto_nearest' });
        showToast('🎯 Mũi tên GPS đang tự động chỉ từ nhân vật đến Hiện vật gần nhất!');
      } else {
        const ex = EXHIBITS_DATA.find((e) => e.id === val);
        if (ex) {
          selectedExhibitForGps = ex;
          activeMilestoneIndex = -1;
          gpsNearestBtn?.classList.remove('active');
          timelineStepsRow
            ?.querySelectorAll('.timeline-step-btn')
            .forEach((b) => b.classList.remove('active'));
          museumMap.setWayfindingTarget({
            mode: 'custom',
            x: ex.position.x,
            z: ex.position.z,
            zoneType: ex.zoneType,
            floor: ex.floor || 1,
            title: ex.title
          });
          showToast(
            `🧭 Mũi tên GPS đang chỉ hướng từ nhân vật tới: "${ex.title}"!`
          );
        }
      }
    });
  }

  gpsNearestBtn?.addEventListener('click', () => {
    selectedExhibitForGps = null;
    activeMilestoneIndex = -1;
    if (gpsExhibitSelect) gpsExhibitSelect.value = 'auto_nearest';
    gpsNearestBtn.classList.add('active');
    timelineStepsRow
      ?.querySelectorAll('.timeline-step-btn')
      .forEach((b) => b.classList.remove('active'));
    museumMap.setWayfindingTarget({ mode: 'auto_nearest' });
    showToast('🎯 Mũi tên GPS đang tự động chỉ từ nhân vật đến Hiện vật gần nhất!');
  });

  const applyTimelineMilestone = (idx, shouldTeleport = false) => {
    const ms = TIMELINE_MILESTONES_DATA[idx] || TIMELINE_MILESTONES_DATA[0];
    activeMilestoneIndex = idx;
    selectedExhibitForGps = null;
    gpsNearestBtn?.classList.remove('active');

    if (timelineStepsRow) {
      const allBtns = timelineStepsRow.querySelectorAll('.timeline-step-btn');
      allBtns.forEach((b, bIdx) => b.classList.toggle('active', bIdx === idx));
    }

    museumMap.setWayfindingTarget({
      mode: 'custom',
      x: ms.targetPos.x,
      z: ms.targetPos.z,
      zoneType: ms.zoneType,
      floor: ms.floor,
      title: ms.title
    });

    if (shouldTeleport) {
      if (guidedTourState.isActive) stopGuidedTour();
      playerController.teleportToTourStation({
        zoneType: ms.zoneType,
        floor: ms.floor,
        playerPos: ms.teleportPos
      });
      localCharacter.showSpeechBubble(`🧭 ${ms.title}`, 3.8);
      showToast(`⚡ Đã di chuyển nhanh tới: ${ms.title}!`, 3800);
    } else {
      showToast(
        `✨ Mũi tên GPS từ nhân vật đang chỉ hướng tới: ${ms.title} (Bấm "⚡ Tới ngay" để dịch chuyển nhanh)!`,
        4200
      );
    }
  };

  if (timelineStepsRow) {
    timelineStepsRow.innerHTML = '';
    TIMELINE_MILESTONES_DATA.forEach((ms, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `timeline-step-btn ${idx === activeMilestoneIndex ? 'active' : ''}`;
      btn.textContent = ms.shortLabel;
      btn.title = ms.title;
      btn.addEventListener('click', () => {
        const alreadyActive = idx === activeMilestoneIndex;
        applyTimelineMilestone(idx, alreadyActive);
      });
      timelineStepsRow.appendChild(btn);
    });
  }

  // Mặc định khởi tạo: Mũi tên GPS tự động chỉ từ nhân vật đến Hiện vật gần nhất trên tầng
  museumMap.setWayfindingTarget({ mode: 'auto_nearest' });

  gpsToggleBtn?.addEventListener('click', () => {
    gpsEnabled = !gpsEnabled;
    museumMap.setWayfindingEnabled(gpsEnabled);
    gpsToggleBtn.classList.toggle('active', gpsEnabled);
    gpsToggleBtn.textContent = gpsEnabled ? '✨ Mũi tên GPS: BẬT' : '✨ Mũi tên GPS: TẮT';
  });

  timelineTeleportBtn?.addEventListener('click', () => {
    if (selectedExhibitForGps) {
      if (guidedTourState.isActive) stopGuidedTour();
      const ex = selectedExhibitForGps;
      playerController.teleportToTourStation({
        zoneType: ex.zoneType,
        floor: ex.floor || 1,
        playerPos: {
          x: ex.position.x,
          y: ex.zoneType === 'indoor' && ex.floor === 2 ? 5.5 : 0,
          z: ex.position.z + 2.6,
          rotY: Math.PI
        }
      });
      localCharacter.showSpeechBubble(`📍 ${ex.title}`, 3.8);
      showToast(`⚡ Đã dịch chuyển nhanh tới hiện vật: "${ex.title}"!`, 3800);
      return;
    }
    const targetIdx = activeMilestoneIndex >= 0 ? activeMilestoneIndex : 1;
    applyTimelineMilestone(targetIdx, true);
  });

  // =========================================================================
  // TÍNH NĂNG 1: TOUR HƯỚNG DẪN VIÊN ẢO TỰ ĐỘNG (THUYẾT MINH TIẾNG VIỆT CHUẨN & ĐỌC HẾT MỚI CHUYỂN TRẠM)
  // =========================================================================
  const guidedTourHud = document.getElementById('guided-tour-hud');
  const tourStepBadge = document.getElementById('tour-step-badge');
  const tourPeriodLabel = document.getElementById('tour-period-label');
  const tourStationTitle = document.getElementById('tour-station-title');
  const tourNarrationText = document.getElementById('tour-narration-text');
  const tourProgressFill = document.getElementById('tour-progress-fill');
  const tourPrevBtn = document.getElementById('tour-prev-btn');
  const tourPauseBtn = document.getElementById('tour-pause-btn');
  const tourNextBtn = document.getElementById('tour-next-btn');
  const tourOpenExhibitBtn = document.getElementById('tour-open-exhibit-btn');
  const tourVoiceBtn = document.getElementById('tour-voice-btn');
  const tourStopBtn = document.getElementById('tour-stop-btn');

  const guidedTourState = {
    isActive: false,
    isPaused: false,
    voiceEnabled: false,
    stationIndex: 0,
    stationTimer: 0,
    minStationDuration: 15.0,
    speechCompleted: false,
    postSpeechHoldTimer: 0,
    totalSegments: 1,
    completedSegments: 0,
    speechSessionId: 0,
    orbitAngle: 0,
    camPos: new THREE.Vector3(),
    lookAt: new THREE.Vector3()
  };

  // (Đã bỏ thuyết minh audio: Tour chỉ dẫn đường bằng camera + HUD chữ)

  const applyTourStation = (index) => {
    const total = GUIDED_TOUR_STATIONS.length;
    guidedTourState.stationIndex = ((index % total) + total) % total;
    guidedTourState.stationTimer = 0;
    guidedTourState.postSpeechHoldTimer = 0;
    guidedTourState.orbitAngle = 0;

    const station = GUIDED_TOUR_STATIONS[guidedTourState.stationIndex];
    // Thời lượng mỗi trạm tính theo độ dài nội dung hiển thị (không audio)
    const wordCount = String(station.narration || '').split(/\s+/).length;
    guidedTourState.minStationDuration = Math.max(9.0, Math.min(18, wordCount * 0.3));

    playerController.teleportToTourStation(station);

    if (tourStepBadge) {
      tourStepBadge.textContent = `🫡 TOUR HƯỚNG DẪN VIÊN ẢO • TRẠM ${station.step}/${total}`;
    }
    if (tourPeriodLabel) tourPeriodLabel.textContent = station.period;
    if (tourStationTitle) tourStationTitle.textContent = station.title;
    if (tourNarrationText) tourNarrationText.textContent = station.narration;
    if (tourProgressFill) tourProgressFill.style.width = '0%';

    if (station.exhibitId && !discoveredIds.has(station.exhibitId)) {
      discoveredIds.add(station.exhibitId);
      localStorage.setItem(
        'party_museum_discovered',
        JSON.stringify(Array.from(discoveredIds))
      );
      updateNotebookUI();
    }

    localCharacter.showSpeechBubble(`🫡 ${station.title}`, 5.0);
  };

  const startGuidedTour = () => {
    guidedTourState.isActive = true;
    guidedTourState.isPaused = false;
    playerController.isTourActive = true;
    if (tourPauseBtn) tourPauseBtn.textContent = '⏸ Tạm dừng';
    guidedTourHud?.classList.remove('hidden');
    applyTourStation(0);
    showToast(
      `🫡 Chiến Sĩ Tiêu Binh: Bắt đầu Tour tham quan qua ${GUIDED_TOUR_STATIONS.length} hiện vật (Ngoài sân → Tầng 1 → Tầng 2)!`,
      4500
    );
  };

  const stopGuidedTour = () => {
    guidedTourState.isActive = false;
    guidedTourState.isPaused = false;
    playerController.isTourActive = false;
    guidedTourHud?.classList.add('hidden');
    sceneManager.snapCameraTo(localCharacter.root.position);
    showToast('🧭 Đã kết thúc Tour tự động. Đồng chí có thể tự do di chuyển tham quan!');
  };

  tourPrevBtn?.addEventListener('click', () => {
    if (!guidedTourState.isActive) return;
    applyTourStation(guidedTourState.stationIndex - 1);
  });

  tourNextBtn?.addEventListener('click', () => {
    if (!guidedTourState.isActive) return;
    applyTourStation(guidedTourState.stationIndex + 1);
  });

  tourPauseBtn?.addEventListener('click', () => {
    if (!guidedTourState.isActive) return;
    guidedTourState.isPaused = !guidedTourState.isPaused;
    tourPauseBtn.textContent = guidedTourState.isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
  });

  if (tourVoiceBtn) tourVoiceBtn.classList.add('hidden');

  tourOpenExhibitBtn?.addEventListener('click', () => {
    if (!guidedTourState.isActive) return;
    const station = GUIDED_TOUR_STATIONS[guidedTourState.stationIndex];
    const ex = EXHIBITS_DATA.find((e) => e.id === station?.exhibitId);
    if (ex) {
      guidedTourState.isPaused = true;
      if (tourPauseBtn) tourPauseBtn.textContent = '▶ Tiếp tục';
      playerController.isModalOpen = true;
      openExhibitModal(ex);
    }
  });

  tourStopBtn?.addEventListener('click', () => {
    stopGuidedTour();
  });

  const updateGuidedTour = (dt) => {
    if (!guidedTourState.isActive) return null;
    const station =
      GUIDED_TOUR_STATIONS[guidedTourState.stationIndex] || GUIDED_TOUR_STATIONS[0];

    // Góc nhìn toàn cảnh (Wide Panoramic Orbit) mượt mà, thoáng đãng, không bị gò bó
    guidedTourState.orbitAngle += dt * 0.22;
    const sway = Math.sin(guidedTourState.orbitAngle) * 0.38;
    const baseDx = station.playerPos.x - station.lookAtPos.x;
    const baseDz = station.playerPos.z - station.lookAtPos.z;
    const baseAngle = Math.atan2(baseDx, baseDz);
    const dist = station.camDist || 14.5;

    guidedTourState.camPos.set(
      station.lookAtPos.x + Math.sin(baseAngle + sway) * dist,
      station.playerPos.y + (station.camHeight || 6.5),
      station.lookAtPos.z + Math.cos(baseAngle + sway) * dist
    );
    guidedTourState.lookAt.set(
      station.lookAtPos.x,
      station.lookAtPos.y + 0.4,
      station.lookAtPos.z
    );

    if (!guidedTourState.isPaused && !playerController.isModalOpen) {
      guidedTourState.stationTimer += dt;
      const pct = Math.min(
        100,
        (guidedTourState.stationTimer / guidedTourState.minStationDuration) * 100
      );
      if (tourProgressFill) tourProgressFill.style.width = `${pct}%`;

      if (guidedTourState.stationTimer >= guidedTourState.minStationDuration) {
        if (guidedTourState.stationIndex + 1 < GUIDED_TOUR_STATIONS.length) {
          applyTourStation(guidedTourState.stationIndex + 1);
        } else {
          stopGuidedTour();
          playerController.triggerLocalEmote('salute', 3.5);
          showToast(
            `🎉 Hoàn thành trọn vẹn ${GUIDED_TOUR_STATIONS.length}/${GUIDED_TOUR_STATIONS.length} hiện vật trong Tour tham quan! Cảm ơn đồng chí!`,
            5200
          );
          return null;
        }
      }
    }

    return {
      camPos: guidedTourState.camPos,
      lookAt: guidedTourState.lookAt
    };
  };

  const openCinemaModal = () => {
    cinemaState.isOpen = true;
    cinemaState.isPlaying = true;
    if (radioState.isPlaying) {
      radioState.wasPausedByCinema = true;
      stopRadioPlayback();
    }
    if (cinemaPlayBtn) cinemaPlayBtn.textContent = '⏸ Tạm dừng';
    museumMap.setPositionalAudioMuted(true);
    cinemaBackdrop?.classList.remove('hidden');
    drawCinemaPlayerFrame();
  };

  const closeCinemaModal = () => {
    cinemaState.isOpen = false;
    cinemaState.isPlaying = false;
    if (cinemaYoutubeIframe) {
      cinemaYoutubeIframe.src = '';
    }
    if (radioState.wasPausedByCinema) {
      radioState.wasPausedByCinema = false;
      startRadioPlayback();
    } else {
      museumMap.setPositionalAudioMuted(false);
    }
    cinemaBackdrop?.classList.add('hidden');
  };

  cinemaTabInteractive?.addEventListener('click', () => {
    cinemaState.mode = 'interactive';
    cinemaTabInteractive.classList.add('active');
    cinemaTabYoutube?.classList.remove('active');
    cinemaPlayerCanvas?.classList.remove('hidden');
    cinemaControlsBar?.classList.remove('hidden');
    if (cinemaYoutubeIframe) {
      cinemaYoutubeIframe.classList.add('hidden');
      cinemaYoutubeIframe.src = '';
    }
  });

  cinemaTabYoutube?.addEventListener('click', () => {
    cinemaState.mode = 'youtube';
    cinemaTabYoutube.classList.add('active');
    cinemaTabInteractive?.classList.remove('active');
    cinemaPlayerCanvas?.classList.add('hidden');
    cinemaControlsBar?.classList.add('hidden');
    if (cinemaYoutubeIframe) {
      cinemaYoutubeIframe.classList.remove('hidden');
      const curChapter = DOCUMENTARY_CHAPTERS[cinemaState.chapterIndex] || DOCUMENTARY_CHAPTERS[0];
      cinemaYoutubeIframe.src = buildYoutubeEmbedSrc(curChapter.youtubeUrl);
    }
  });

  cinemaPlayBtn?.addEventListener('click', () => {
    cinemaState.isPlaying = !cinemaState.isPlaying;
    cinemaPlayBtn.textContent = cinemaState.isPlaying ? '⏸ Tạm dừng' : '▶ Phát tiếp';
  });

  cinemaSeekSlider?.addEventListener('input', () => {
    const chapter = DOCUMENTARY_CHAPTERS[cinemaState.chapterIndex] || DOCUMENTARY_CHAPTERS[0];
    cinemaState.currentTime = (Number(cinemaSeekSlider.value) / 100) * chapter.durationSec;
    drawCinemaPlayerFrame();
  });

  cinemaVolumeSlider?.addEventListener('input', () => {
    cinemaState.volume = Number(cinemaVolumeSlider.value);
  });

  const updateCinemaPlayer = (dt) => {
    if (!cinemaState.isOpen || cinemaState.mode !== 'interactive') return;
    const chapter = DOCUMENTARY_CHAPTERS[cinemaState.chapterIndex] || DOCUMENTARY_CHAPTERS[0];
    const duration = chapter.durationSec || 28;

    if (cinemaState.isPlaying) {
      cinemaState.currentTime += dt;
      cinemaState.toneTimer += dt;
      if (cinemaState.toneTimer >= 0.72) {
        cinemaState.toneTimer = 0;
        playSoftCinemaNote();
      }
      if (cinemaState.currentTime >= duration) {
        // Tự động chuyển sang chương tiếp theo
        cinemaState.chapterIndex = (cinemaState.chapterIndex + 1) % DOCUMENTARY_CHAPTERS.length;
        cinemaState.currentTime = 0;
        const nextChap = DOCUMENTARY_CHAPTERS[cinemaState.chapterIndex];
        if (cinemaChapterTitle) cinemaChapterTitle.textContent = nextChap.title;
        renderCinemaChapterButtons();
      }
    }

    if (cinemaSeekSlider) {
      cinemaSeekSlider.value = String(Math.min(100, (cinemaState.currentTime / duration) * 100));
    }
    if (cinemaTimeLabel) {
      cinemaTimeLabel.textContent = `${formatTimeMMSS(cinemaState.currentTime)} / ${formatTimeMMSS(duration)}`;
    }
    drawCinemaPlayerFrame();
  };

  const savedName =
    localStorage.getItem('museum_player_name') ||
    `Đồng chí #${Math.floor(100 + Math.random() * 899)}`;
  let savedHat = localStorage.getItem('museum_player_hat') || 'pith';

  // Nếu chưa thu thập đủ 8/8 ngôi sao thì tuyệt đối không cho phép đeo Balo Chiến Sĩ
  if (savedHat.includes('backpack') && collectedStarIds.size < totalStarsCount) {
    savedHat = savedHat.startsWith('conical') ? 'conical' : 'pith';
    localStorage.setItem('museum_player_hat', savedHat);
  }

  const nameInput = document.getElementById('player-name-input');
  const hatSelect = document.getElementById('hat-select');
  const respawnBtn = document.getElementById('respawn-btn');
  nameInput.value = savedName;
  hatSelect.value = savedHat;

  // 2. Tạo ngay nhân vật chính tại điểm Spawn & khởi chạy vòng lặp Render 60FPS ngay lập tức
  const localCharacter = new CharacterMesh({
    id: 'local-init',
    name: savedName,
    colorIndex: Math.floor(Math.random() * 6),
    hatType: savedHat,
    isLocal: true
  });
  localCharacter.setHeroGearVisible(
    collectedStarIds.size >= totalStarsCount && savedHat.includes('backpack')
  );
  localCharacter.root.position.set(
    PLAYER_CONFIG.SPAWN_POS.x,
    PLAYER_CONFIG.SPAWN_POS.y,
    PLAYER_CONFIG.SPAWN_POS.z
  );
  localCharacter.root.rotation.y = PLAYER_CONFIG.SPAWN_POS.rotY;
  sceneManager.scene.add(localCharacter.root);
  sceneManager.snapCameraTo(localCharacter.root.position);

  // Khung Chat Trực Tuyến (Online Multiplayer Chat)
  const chatBody = document.getElementById('chat-body');
  const chatHeaderBar = document.getElementById('chat-header-bar');
  const chatToggleBtn = document.getElementById('chat-toggle-btn');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  // Điều khiển Mobile: Virtual Joystick & Nút tương tác [E]
  const joystickZone = document.getElementById('joystick-zone');
  const joystickBase = document.getElementById('joystick-base');
  const joystickStick = document.getElementById('joystick-stick');
  const toggleJoystickBtn = document.getElementById('toggle-joystick-btn');
  const mobileInteractBtn = document.getElementById('mobile-interact-btn');
  const mobileInteractText = document.getElementById('mobile-interact-text');

  const appendChatMessage = ({ name, message }) => {
    if (!chatMessages) return;
    const item = document.createElement('div');
    item.className = 'chat-msg';
    const authorSpan = document.createElement('span');
    authorSpan.className = 'chat-author';
    authorSpan.textContent = `${name || 'Khách'}:`;
    const textSpan = document.createElement('span');
    textSpan.textContent = ` ${message}`;
    item.append(authorSpan, textSpan);
    chatMessages.appendChild(item);

    while (chatMessages.children.length > 40) {
      chatMessages.removeChild(chatMessages.firstChild);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  let isChatCollapsed = false;
  const toggleChatCollapse = (forceOpen = null) => {
    isChatCollapsed = forceOpen === true ? false : forceOpen === false ? true : !isChatCollapsed;
    chatBody?.classList.toggle('collapsed', isChatCollapsed);
    if (chatToggleBtn) {
      chatToggleBtn.textContent = isChatCollapsed ? '+' : '−';
    }
  };

  chatHeaderBar?.addEventListener('click', () => toggleChatCollapse());

  const socketHandler = new SocketHandler({
    scene: sceneManager.scene,
    onRoomStatusChange: ({ roomId, onlineCount }) => {
      roomStatusText.textContent = `Phòng: ${roomId} • Đang tham quan: ${onlineCount}/30 người`;
    },
    onCandlesUpdated: (candles) => {
      museumMap.exhibitsManager?.updateMemorialCandles?.(candles);
    },
    onQuizLeaderboardUpdated: (leaderboard) => {
      if (Array.isArray(leaderboard) && leaderboard.length > 0) {
        cachedLeaderboard = leaderboard;
      }
      museumMap.exhibitsManager?.updateQuizLeaderboard?.(leaderboard);
      renderLeaderboardTable();
    },
    onRemoteHonked: ({ vehicleType }) => {
      playVehicleHonk(vehicleType);
    },
    onChatMessageReceived: (payload) => {
      appendChatMessage(payload);
    }
  });

  const playerController = new PlayerController({
    characterMesh: localCharacter,
    museumMap,
    sceneManager,
    onOpenExhibitModal: openExhibitModal,
    onCloseExhibitModal: closeExhibitModal,
    onOpenCinemaModal: openCinemaModal,
    onCloseCinemaModal: closeCinemaModal,
    onOpenQuizModal: openQuizModal,
    onCloseQuizModal: closeQuizModal,
    onClosePackbikeModal: closePackbikeModal,
    onCloseArtilleryModal: closeArtilleryModal,
    onOpenVehicleModal: openVehicleModal,
    onCloseVehicleModal: closeVehicleModal,
    onOpenQuizLeaderboardModal: openQuizLeaderboardModal,
    onCloseQuizLeaderboardModal: closeQuizLeaderboardModal,
    onHonkVehicle: (vehicleType) => {
      playVehicleHonk(vehicleType);
      socketHandler?.sendVehicleHonk(vehicleType);
      const soundText = vehicleType === 'bike' ? '🔔 Kính coong!' : '📢 Bíp bíp!';
      localCharacter?.showSpeechBubble(soundText, 2.2);
    },
    onToggleVehicle: () => {
      if (playerController.currentVehicle) {
        // Đang lái xe -> bấm 4 mặc định là cất xe, chuyển sang Đi bộ
        playerController.setVehicle(null);
        // Phát tiếng nhẹ khi cất xe (không hiện toast hay bong bóng thông báo)
        try {
          const audioCtx = THREE.AudioContext.getContext();
          if (audioCtx) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.13);
          }
        } catch {}
      } else {
        // Đang đi bộ -> kích hoạt lại xe đã lock (ưu tiên xe người chơi đã chọn)
        const currentCount = discoveredIds.size;
        const vehicleReqs = { bike: 7, jeep: 14, plane: 20 };

        let targetVehicle = lockedVehicleType;
        // Nếu chưa từng lock hoặc xe đã lock chưa đủ điều kiện mở khóa với số hiện vật hiện tại
        if (!targetVehicle || currentCount < (vehicleReqs[targetVehicle] || 7)) {
          if (currentCount >= 20) targetVehicle = 'plane';
          else if (currentCount >= 14) targetVehicle = 'jeep';
          else if (currentCount >= 7) targetVehicle = 'bike';
          else targetVehicle = null;
        }

        if (!targetVehicle) {
          // Chưa đủ 7 hiện vật để mở khóa xe nào
          return;
        }

        lockedVehicleType = targetVehicle;
        try {
          localStorage.setItem('virtual_museum_locked_vehicle', targetVehicle);
        } catch {}

        playerController.setVehicle(targetVehicle);
        playVehicleHonk(targetVehicle);
        socketHandler?.sendVehicleHonk(targetVehicle);
      }
    },
    onStopGuidedTour: stopGuidedTour,
    onToggleMinimap: toggleMinimap,
    onCollectHiddenStar: (starData) => {
      if (collectedStarIds.has(starData.id)) return;
      collectedStarIds.add(starData.id);
      const isNowAll = collectedStarIds.size >= totalStarsCount;
      if (isNowAll) {
        localStorage.setItem('party_museum_all_stars_collected', 'true');
      }
      localStorage.setItem(
        'party_museum_stars',
        JSON.stringify(Array.from(collectedStarIds))
      );
      museumMap.exhibitsManager?.markStarCollected?.(starData.id, isNowAll);
      updateStarsUI();
      playCelebrationAudio(sceneManager.audioListener, 'star');

      if (isNowAll) {
        localCharacter.setHeroGearVisible(true);
        localStorage.setItem('museum_player_hat', 'pith_backpack');
        if (hatSelect) hatSelect.value = 'pith_backpack';
        localCharacter.showSpeechBubble(
          '🌟 Đã tìm đủ 8/8 Sao Vàng Lịch Sử & mở khóa Balo Chiến Sĩ Trường Sơn!',
          5.2
        );
        showToast(
          `🎖️ XUẤT SẮC! Bạn đã thu thập đủ 8/8 Sao Vàng ("${starData.title}") & được trang bị Balo Chiến Sĩ Trường Sơn + Huy Hiệu Sao Vàng!`,
          5800
        );
      } else {
        localCharacter.showSpeechBubble(`⭐ +1 ${starData.title}!`, 3.5);
        showToast(
          `⭐ Đã tìm thấy [${collectedStarIds.size}/${totalStarsCount}] ${starData.title}: ${starData.anecdote}`,
          4800
        );
      }
    },
    onReleaseLantern: () => {
      museumMap.spawnFountainLantern();
      playCelebrationAudio(sceneManager.audioListener, 'star');
      playerController.triggerLocalEmote('heart_flag', 3.0);
      localCharacter.showSpeechBubble('🪷 Thả Hoa Đăng ước nguyện hòa bình!', 3.8);
      showToast(
        '🪷 Bạn đã thả một Hoa Đăng Sen Hồng tỏa sáng trên Đài phun nước Quảng trường!',
        4000
      );
    },
    onOfferMemorial: () => {
      socketHandler.sendMemorialOffer();
      showToast('🕯️ Bạn đã dâng hoa và thắp nến tưởng niệm tại Gian 6!');
    },
    onTriggerEmote: (emoteType) => {
      socketHandler.sendEmote(emoteType);
    },
    onZoneOrFloorChanged: (zone, floor) => {
      if (zone === 'outdoor') {
        minimapZoneLabel.textContent = 'NGOÀI SÂN — QUẢNG TRƯỜNG';
      } else if (floor === 2) {
        minimapZoneLabel.textContent = 'TRONG NHÀ — TẦNG 2 (1954 – NAY)';
        showToast('⬆️ Đã đi Thang máy lên Sảnh Tầng 2 (1954 – Nay & Không gian Tưởng niệm)');
      } else {
        minimapZoneLabel.textContent = 'TRONG NHÀ — TẦNG 1 (1920 – 1954)';
      }
    },
    onTogglePhotoMode: () => {
      isPhotoMode = !isPhotoMode;
      uiLayer.classList.toggle('hidden', isPhotoMode);
      photoModeHint.classList.toggle('hidden', !isPhotoMode);
      localCharacter.setNameplateVisible?.(!isPhotoMode);
      socketHandler.setPhotoMode?.(isPhotoMode);
    },
    onOpenChatInput: () => {
      toggleChatCollapse(true);
      setTimeout(() => chatInput?.focus(), 20);
    },
    onInteractNPC: () => {
      if (guidedTourState.isActive) {
        stopGuidedTour();
      } else {
        startGuidedTour();
      }
    }
  });

  // Gửi tin nhắn Chat trực tuyến & hiện Bong bóng chat 3D trên đầu nhân vật
  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg) {
      const currentName = nameInput.value.trim() || savedName;
      localCharacter.showSpeechBubble(msg, 4.5);
      socketHandler.sendChatMessage(currentName, msg);
      chatInput.value = '';
    }
    chatInput.blur();
  });

  // Thiết lập Virtual Joystick: CHỈ hiển thị với người dùng Mobile/Tablet thực sự
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 820);

  if (isMobile) {
    joystickZone?.classList.remove('hidden');
    toggleJoystickBtn?.classList.remove('hidden');
  } else {
    joystickZone?.classList.add('hidden');
    toggleJoystickBtn?.classList.add('hidden');
  }

  toggleJoystickBtn?.addEventListener('click', () => {
    joystickZone?.classList.toggle('hidden');
  });

  if (joystickBase && joystickStick) {
    let joyActive = false;
    const maxRadius = 38;

    const updateStickFromPoint = (clientX, clientY) => {
      const rect = joystickBase.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }

      joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
      playerController.setJoystickVector(dx / maxRadius, dy / maxRadius);
    };

    const resetStick = () => {
      joyActive = false;
      joystickStick.style.transform = 'translate(0px, 0px)';
      playerController.setJoystickVector(0, 0);
    };

    joystickBase.addEventListener('pointerdown', (e) => {
      joyActive = true;
      joystickBase.setPointerCapture?.(e.pointerId);
      updateStickFromPoint(e.clientX, e.clientY);
    });

    joystickBase.addEventListener('pointermove', (e) => {
      if (!joyActive) return;
      updateStickFromPoint(e.clientX, e.clientY);
    });

    joystickBase.addEventListener('pointerup', resetStick);
    joystickBase.addEventListener('pointercancel', resetStick);
  }

  // Nút cảm ứng [E] và Emote trên Mobile
  mobileInteractBtn?.addEventListener('click', () => {
    playerController.handleInteractKey();
  });

  document.querySelectorAll('.mobile-emote-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const emote = btn.getAttribute('data-emote');
      if (emote) {
        playerController.triggerLocalEmote(emote, emote === 'flag_wave' ? 3.4 : 2.8);
      }
    });
  });

  modalCloseBtn.addEventListener('click', () => playerController.closeAllModals());
  cinemaCloseBtn?.addEventListener('click', () => playerController.closeAllModals());

  respawnBtn.addEventListener('click', () => {
    const newName = nameInput.value.trim() || savedName;
    let newHat = hatSelect.value;
    if (newHat.includes('backpack') && collectedStarIds.size < totalStarsCount) {
      showToast(
        `🔒 Bạn cần thu thập đủ ${totalStarsCount}/${totalStarsCount} Huy hiệu Sao Vàng (hiện có ${collectedStarIds.size}/${totalStarsCount}) để mở khóa Balo Chiến Sĩ!`,
        4200
      );
      hatSelect.value = savedHat;
      return;
    }
    localStorage.setItem('museum_player_name', newName);
    localStorage.setItem('museum_player_hat', newHat);
    window.location.reload();
  });

  // 3. Khởi chạy vòng lặp Render 60 FPS ngay từ giây đầu tiên
  const clock = new THREE.Clock();
  const promptWorldPos = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsedTime = clock.getElapsedTime();

    playerController.update(dt);
    const tourCamera = updateGuidedTour(dt);

    sceneManager.updateCamera(localCharacter.root.position, dt, {
      isSitting: playerController.isSitting,
      saluteMode: playerController.saluteLockTimer > 0,
      tourCamera
    });

    socketHandler.syncLocalPlayer(localCharacter, dt, playerController.isSitting);

    const activeTarget = playerController.activeInteraction;
    if (
      activeTarget &&
      !playerController.isModalOpen &&
      !playerController.isCinemaOpen &&
      !playerController.isQuizOpen &&
      !playerController.isPackbikeOpen &&
      !playerController.isArtilleryOpen &&
      !playerController.isTourActive &&
      playerController.saluteLockTimer <= 0 &&
      playerController.tankClimbTimer <= 0
    ) {
      promptWorldPos.copy(localCharacter.root.position);
      // Đặt prompt [E] ngay dưới chân nhân vật (y + 0.08) để không bao giờ che khuất Bong bóng chat 3D trên đầu khi ngồi ghế hoặc đứng gần hiện vật
      promptWorldPos.y += 0.08;
      const screenCoords = sceneManager.projectToScreen(promptWorldPos);

      if (screenCoords.visible) {
        interactPrompt.style.left = `${screenCoords.x}px`;
        interactPrompt.style.top = `${screenCoords.y}px`;
        interactLabel.textContent = activeTarget.promptText;
        interactPrompt.classList.remove('hidden');
      }
      if (mobileInteractBtn) {
        mobileInteractText.textContent = activeTarget.promptText;
        mobileInteractBtn.classList.remove('hidden');
      }
    } else {
      interactPrompt.classList.add('hidden');
      mobileInteractBtn?.classList.add('hidden');
    }

    museumMap.update(
      dt,
      elapsedTime,
      activeTarget?.highlightId || null,
      localCharacter.root.position,
      discoveredIds
    );
    updateCinemaPlayer(dt);
    updateRadioJukebox(dt);
    updateAndDrawPackbikeGame(dt);
    updateAndDrawArtilleryGame(dt);
    updateInspect3DViewer(dt);

    renderMinimap(
      minimapCanvas,
      localCharacter,
      socketHandler.remotePlayers,
      playerController.currentZone,
      playerController.currentFloor,
      collectedStarIds
    );

    socketHandler.interpolateRemotePlayers(
      dt,
      playerController.currentZone,
      playerController.currentFloor
    );
    sceneManager.render();
  }

  animate();

  // 4. Kết nối mạng bất đồng bộ (không chặn việc vẽ 3D)
  const selfState = await socketHandler.connect({
    name: savedName,
    hatType: savedHat
  });

  if (selfState) {
    localCharacter.id = selfState.id;
    localCharacter.root.position.set(selfState.x, selfState.y || 0, selfState.z);
    localCharacter.root.rotation.y = selfState.rotY;
    sceneManager.snapCameraTo(localCharacter.root.position);
  }
}

bootstrap();
