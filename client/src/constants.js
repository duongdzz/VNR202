/**
 * Bảng màu Pastel hoài niệm & Kiến trúc Triển lãm Lịch sử Đảng Cộng sản Việt Nam
 */
export const PALETTE = {
  BG_FOG: 0xdce6ef,             // Xanh da trời nhạt pha kem ấm ngoài trời
  BG_INDOOR: 0xeae3d2,          // Kem ấm bên trong bảo tàng
  AMBIENT_LIGHT: 0xfff8eb,      // Ánh sáng kem dịu
  DIR_LIGHT: 0xfffdf5,          // Ánh nắng mặt trời
  PLAZA_STONE: 0xe5e0d5,        // Đá lát quảng trường sáng
  PLAZA_PATH: 0xd2cbbd,         // Đường dẫn trung tâm
  GRASS_GREEN: 0x7fa668,        // Thảm cỏ xanh pastel
  WATER_POOL: 0x6fa3b8,         // Nước đài phun
  TOWER_SILVER: 0xd8d6d0,       // Cột cờ / Tháp đá xám trắng
  FLAGSTONE_RED: 0x9e3326,      // Gạch đỏ bệ Cột cờ Hà Nội
  BUILDING_FACADE: 0xcbc7be,    // Cột vát nghiêng mặt tiền bảo tàng
  BUILDING_ROOF: 0xdedad0,      // Mái vươn bảo tàng
  BUILDING_DARK: 0x3b3f42,      // Kính/vách tối sau hàng cột mặt tiền & viền màn hình LED
  FLOOR_MAIN: 0xdfd7c6,         // Sàn nội thất Tầng 1
  FLOOR_MEZZANINE: 0xe6decb,    // Sàn gỗ/đá sáng Tầng 2 (Mezzanine)
  WALL_CONCRETE: 0xcac2b2,      // Vách ngăn nội thất
  WOOD_OAK: 0x8c6239,           // Nâu gỗ mộc (bục, bàn, ghế, lan can)
  RED_VERMILION: 0xa63a2b,      // Đỏ son trầm (màu cờ, thảm, phù điêu)
  PARTY_RED: 0xc82323,          // Đỏ tươi Cờ Đảng / Cờ Tổ quốc
  YELLOW_OCHRE: 0xd99b26,       // Vàng nghệ
  STAR_GOLD: 0xf2b705,          // Vàng kim ngôi sao / búa liềm / tượng
  BRIGHT_STAR_YELLOW: 0xffe600, // Vàng tươi (#FFE600) chuẩn ngôi sao 5 cánh trên nón lá & quốc kỳ
  ARMY_GREEN: 0x4f6342,         // Xanh quân đội (Xe tăng, mũ cối)
  TANK_DARK: 0x394730,          // Xanh đậm bánh xích/tháp pháo
  AIRCRAFT_SILVER: 0xcbd2d9,    // Xám bạc máy bay
  AIRCRAFT_BLUE: 0x3b6e9c,      // Đường kẻ xanh thân máy bay
  CONICAL_STRAW: 0xe2c792,      // Vàng rơm (nón lá)
  EYE_BLACK: 0x1e1e1e,          // Mắt chấm đen
  CANDLE_GLOW: 0xffb732,        // Ánh nến lung linh Gian Tưởng niệm
  AVATAR_COLORS: [
    0xd99b26,
    0xa63a2b,
    0x5b7a5e,
    0xc97b5d,
    0x5d7a99,
    0x9e6b78
  ]
};

export const NETWORK_CONFIG = {
  TICK_RATE_HZ: 15,
  SEND_INTERVAL_MS: 1000 / 15,
  REMOTE_LERP_FACTOR: 10.0,
  POSITION_EPSILON: 0.005,
  ROTATION_EPSILON: 0.01
};

export const PLAYER_CONFIG = {
  MOVE_SPEED: 7.8,
  RADIUS: 0.55,
  INTERACT_RADIUS: 2.0,
  SECOND_FLOOR_Y: 5.5,
  // Điểm spawn ngoài sân rộng thoáng phía Nam Cột cờ Hà Nội, nhìn thẳng về Cột cờ và Tòa nhà Triển lãm
  SPAWN_POS: { x: 0, z: 36.5, y: 0, rotY: Math.PI }
};

/**
 * Các điểm tương tác đặc biệt (Đã căn chỉnh khoảng cách >= 6.8 - 11.5 units, bán kính 1.9 - 2.1 units
 * để tuyệt đối không chồng lấn vòng sáng tương tác):
 */
export const SPECIAL_INTERACTIONS = {
  // Điểm đứng nghiêm Chào cờ ngay ĐẰNG TRƯỚC Cột cờ Hà Nội (cách tâm Cột cờ 6.8 units về phía Nam)
  FLAG_SALUTE_SPOT: {
    id: 'special-flag-salute',
    zoneType: 'outdoor',
    floor: 1,
    position: { x: 0, y: 0, z: 30.8 },
    radius: 1.9,
    promptText: 'Đứng Nghiêm Chào Cờ Tổ Quốc (5s)',
    lookTarget: { x: 0, z: 24.0 }
  },
  // NPC Chiến sĩ Tiêu binh đứng trang nghiêm bên cánh Đông bệ Cột cờ (cách Cột cờ 6.7 units)
  FLAGPOLE_NPC: {
    id: 'special-flagpole-npc',
    zoneType: 'outdoor',
    floor: 1,
    position: { x: 6.2, y: 0, z: 26.5 },
    radius: 2.3,
    promptText: 'Bắt đầu Tour Tham Quan 20 Hiện Vật (Chiến Sĩ Tiêu Binh)',
    dialogue: 'Chào đồng chí! Mời đồng chí tham gia Tour Tham Quan đi qua đủ 20 hiện vật từ ngoài sân đến Tầng 2 của Triển lãm!'
  },
  // Khu vực Màn hình lớn Chiếu phim tư liệu trong Phòng Chiếu Phim cánh Đông Tầng 1 (trước bục màn hình)
  THEATER_SCREEN_SPOT: {
    id: 'special-theater-screen',
    zoneType: 'indoor',
    floor: 1,
    position: { x: 49.2, y: 0, z: -18 },
    radius: 1.6,
    promptText: 'Xem Phim Tư Liệu Lịch Sử Đảng'
  },
  // Thang máy hiện đại từ Tầng 1 lên Tầng 2 (Đặt ở hốc Bắc-Tây X = -10.5, cách màn hình rạp chiếu 10.5 units)
  STAIRS_UP_PAD: {
    id: 'special-stairs-up',
    zoneType: 'indoor',
    floor: 1,
    position: { x: -10.5, y: 0, z: -34.0 },
    radius: 2.0,
    promptText: 'Đi Thang Máy Lên Tầng 2 (1954 – Nay)',
    targetPos: { x: -10.5, y: 5.5, z: -30.5, rotY: 0 }
  },
  // Thang máy hiện đại từ Tầng 2 xuống Tầng 1
  STAIRS_DOWN_PAD: {
    id: 'special-stairs-down',
    zoneType: 'indoor',
    floor: 2,
    position: { x: -10.5, y: 5.5, z: -34.0 },
    radius: 2.0,
    promptText: 'Đi Thang Máy Xuống Tầng 1 (1920 – 1954)',
    targetPos: { x: -10.5, y: 0, z: -30.5, rotY: 0 }
  },
  // Bàn đá Lư hương Dâng hoa / Thắp nến tại Gian 6 (Tầng 2) — Cách Tượng Bác Hồ (Z = -34.0) đúng 11.5 units!
  MEMORIAL_ALTAR: {
    id: 'special-memorial-altar',
    zoneType: 'indoor',
    floor: 2,
    position: { x: 0, y: 5.5, z: -22.5 },
    radius: 2.0,
    promptText: 'Thắp Nến & Dâng Hoa Tưởng Niệm'
  },
  // Bục Đố Vui Lịch Sử Đảng "Rung Chuông Vàng" & Bảng Vàng 3D (hốc Bắc-Đông X = +10.5, đối xứng thang máy)
  QUIZ_STATION: {
    id: 'special-quiz-station',
    zoneType: 'indoor',
    floor: 1,
    position: { x: 10.5, y: 0, z: -33.5 },
    radius: 2.15,
    promptText: 'Thử Thách Đố Vui Lịch Sử Đảng (5 Câu Hỏi)'
  },
  // Điểm Thả Hoa Đăng Hòa Bình tại Đài phun nước Tây (cách ghế nghỉ và bục hiện vật > 5.5 units)
  FOUNTAIN_LANTERN_SPOT: {
    id: 'special-fountain-lantern',
    zoneType: 'outdoor',
    floor: 1,
    position: { x: -9.5, y: 0, z: 14.0 },
    radius: 2.2,
    promptText: 'Thả Hoa Đăng Ước Nguyện Hòa Bình'
  },
  // Kiosk / Bãi gửi xe sân trước: đổi phương tiện đã mở khóa (Xe đạp thồ / Jeep UAZ / Máy bay mini)
  VEHICLE_KIOSK: {
    id: 'special-vehicle-kiosk',
    zoneType: 'outdoor',
    floor: 1,
    position: { x: 8.5, y: 0, z: 7.0 },
    radius: 2.6,
    promptText: 'Bãi Gửi Xe — Đổi Phương Tiện (Xe đạp / Jeep / Máy bay)'
  },
  // Màn hình Bảng Xếp Hạng "Chiến sĩ Lịch sử Xuất sắc" đặt thoáng cạnh bàn Đố vui (hoàn toàn không dính tường)
  QUIZ_LEADERBOARD: {
    id: 'special-quiz-leaderboard',
    zoneType: 'indoor',
    floor: 1,
    position: { x: 6.8, y: 0, z: -31.6 },
    radius: 2.2,
    promptText: 'Xem Bảng Xếp Hạng Top 10 — Chiến Sĩ Lịch Sử Xuất Sắc'
  }
};

/**
 * Danh sách Băng ghế đá / ghế gỗ mộc & Hàng ghế Rạp chiếu phim tư liệu:
 * - Hàng ghế khán phòng đặt cách màn hình LED từ 6.7 đến 9.5 units, hướng thẳng vào màn hình (rotY = Math.PI).
 */
export const CINEMA_ROOM = {
  minX: 31.6,
  maxX: 52.6,
  minZ: -30,
  maxZ: -6,
  centerZ: -18,
  screenX: 52.0,
  doorMinZ: -20,
  doorMaxZ: -16
};

const CINEMA_SEATS_DATA = (() => {
  const seats = [];
  const rowXs = [37.2, 39.5, 41.8, 44.1, 46.4];
  const colOffsets = [-3.3, -2.3, -1.3, 1.3, 2.3, 3.3];
  rowXs.forEach((rx, r) => {
    colOffsets.forEach((off, c) => {
      seats.push({
        id: `bench-theater-r${r + 1}c${c + 1}`,
        zoneType: 'indoor',
        floor: 1,
        x: rx,
        y: 0,
        z: CINEMA_ROOM.centerZ + off,
        rotY: Math.PI / 2,
        isTheaterBench: true,
        label: `Ghế Rạp Chiếu Phim • Hàng ${r + 1} • Số ${c + 1}`
      });
    });
  });
  return seats;
})();

export const BENCHES_DATA = [
  // Ghế gỗ dưới tán cây quanh Quảng trường Ngoài sân (đã bỏ ghế chắn lối vào bãi xe)
  { id: 'bench-out-1', zoneType: 'outdoor', floor: 1, x: -8.5, y: 0, z: 32.5, rotY: Math.PI / 2, label: 'Ghế đá dưới tán cây Tây' },
  { id: 'bench-out-2', zoneType: 'outdoor', floor: 1, x: 8.5, y: 0, z: 32.5, rotY: -Math.PI / 2, label: 'Ghế đá dưới tán cây Đông' },
  { id: 'bench-out-3', zoneType: 'outdoor', floor: 1, x: -8.5, y: 0, z: 9.5, rotY: Math.PI / 2, label: 'Ghế nghỉ cạnh Đài phun nước Tây' },

  // 30 Ghế Rạp Chiếu Phim Tư Liệu (5 hàng × 6 ghế, lối đi giữa) trong Phòng Chiếu Phim bên cánh Đông Tầng 1
  // Màn hình đặt sát tường Đông (X ≈ 52), ghế quay mặt về phía +X (rotY = π/2)
  ...CINEMA_SEATS_DATA,

  // Ghế nghỉ trong nhà Tầng 1: Đặt sát vào tường biên Tây & Đông (X = ±29.8) hoàn toàn ngoài lối đi
  { id: 'bench-in-f1-1', zoneType: 'indoor', floor: 1, x: -8.5, y: 0, z: -4.2, rotY: Math.PI, label: 'Ghế nghỉ Sảnh Đón Tiếp (Tây)' },
  { id: 'bench-in-f1-2', zoneType: 'indoor', floor: 1, x: -29.8, y: 0, z: -18.0, rotY: Math.PI / 2, label: 'Ghế nghỉ Gian 1 (Tường Tây)' },
  { id: 'bench-in-f1-3', zoneType: 'indoor', floor: 1, x: 29.8, y: 0, z: -14.0, rotY: -Math.PI / 2, label: 'Ghế nghỉ Gian 3 (Tường Đông)' },

  // Ghế nghỉ Tầng 2: Đặt sát tường biên Tây & Đông (X = ±29.8)
  { id: 'bench-in-f2-1', zoneType: 'indoor', floor: 2, x: -29.8, y: 5.5, z: -18.5, rotY: Math.PI / 2, label: 'Ghế nghỉ Gian 4 (Tầng 2 Tây)' },
  { id: 'bench-in-f2-2', zoneType: 'indoor', floor: 2, x: 29.8, y: 5.5, z: -18.5, rotY: -Math.PI / 2, label: 'Ghế nghỉ Gian 5 (Tầng 2 Đông)' }
];

/**
 * Danh sách 16 Hiện vật Lịch sử Đảng Cộng sản Việt Nam:
 * - Quy tắc khoảng cách tối thiểu: Các bục cách nhau từ 11.5 đến 17.0 units (vượt chuẩn 5-7 units).
 * - Lối đi thông thoáng tối thiểu 5-8 units xung quanh mỗi bục trưng bày.
 * - Đã gắn toàn bộ 18 bức ảnh tư liệu thật từ thư mục `./src/assets/` tương ứng từng hiện vật.
 */
export const EXHIBITS_DATA = [
  // ================= NGOÀI SÂN QUẢNG TRƯỜNG (OUTDOOR) =================
  {
    id: 'outdoor-flagpole',
    zoneType: 'outdoor',
    floor: 1,
    zone: 'Quảng Trường Trung Tâm',
    title: 'Kỳ Đài Cột Cờ Hà Nội & Cờ Tổ Quốc',
    period: 'Biểu tượng Độc lập Dân tộc',
    position: { x: 0, y: 0, z: 24.0 },
    interactRadius: 4.1,
    artifactType: 'hanoi_flagpole',
    artifactColor: PALETTE.PARTY_RED,
    imageUrl: './src/assets/cot-co-ha-noi.jpg',
    summary:
      'Kỳ đài Cột cờ Hà Nội uy nghiêm giữa quảng trường trung tâm, nơi tung bay lá cờ đỏ sao vàng 5 cánh từ mùa Thu Cách mạng Tháng Tám 1945. Bạn có thể bước tới vòng tròn đỏ đằng trước cột cờ (Z = 30.8) và nhấn [E] để thực hiện nghi thức Chào cờ.',
    imageCaption: 'Tư liệu Kỳ đài Cột cờ Hà Nội lịch sử.'
  },
  {
    id: 'outdoor-party-flags',
    zoneType: 'outdoor',
    floor: 1,
    zone: 'Quảng Trường Danh Dự — Thảm Cỏ Cánh Trái',
    title: 'Đài Biểu Tượng Cờ Đảng & Cờ Tổ Quốc',
    period: 'Từ 3/2/1930 đến nay',
    position: { x: -21.0, y: 0, z: 12.5 },
    interactRadius: 3.85,
    artifactType: 'party_flags_monument',
    artifactColor: PALETTE.PARTY_RED,
    imageUrl: './src/assets/co-to-quoc-va-co-dang.jpg',
    summary:
      'Cụm kỳ đài song hành Cờ Đảng Cộng sản Việt Nam (biểu tượng Búa Liềm vàng) và Cờ Tổ quốc (Ngôi sao vàng 5 cánh), thể hiện sự gắn bó máu thịt giữa ý Đảng và lòng Dân.',
    imageCaption: 'Cụm Cờ Đảng – Cờ Tổ quốc tung bay trên quảng trường.'
  },
  {
    id: 'outdoor-relief',
    zoneType: 'outdoor',
    floor: 1,
    zone: 'Quảng Trường Danh Dự — Thảm Cỏ Cánh Phải',
    title: 'Đài Phù Điêu Khối Đại Đoàn Kết Toàn Dân',
    period: 'Biểu tượng Liên minh Công – Nông – Trí',
    position: { x: 21.0, y: 0, z: 12.5 },
    interactRadius: 3.85,
    artifactType: 'relief_monument',
    artifactColor: PALETTE.RED_VERMILION,
    imageUrl: './src/assets/phu-dieu-khoi-dai-doan-ket.jpg',
    summary:
      'Cụm tượng đài và phù điêu khắc họa rõ nét 3 hình tượng tiêu biểu: Công nhân, Chiến sĩ Cách mạng và Nông dân – Trí thức sát cánh bên nhau dưới ngọn cờ vẻ vang của Đảng.',
    imageCaption: 'Phù điêu Khối đại đoàn kết toàn dân tộc Việt Nam.'
  },
  {
    id: 'outdoor-t54',
    zoneType: 'outdoor',
    floor: 1,
    zone: 'Khu Hiện Vật Ngoài Trời — Thảm Cỏ Cánh Trái',
    title: 'Xe Tăng T-54B Số Hiệu 843 (Đại Thắng Mùa Xuân 1975)',
    period: 'Chiến dịch Hồ Chí Minh (30/4/1975)',
    position: { x: -21.0, y: 0, z: 27.5 },
    interactRadius: 3.9,
    artifactType: 'tank_t54',
    artifactColor: PALETTE.ARMY_GREEN,
    imageUrl: './src/assets/Xe_tang_843.jpg',
    summary:
      'Bảo vật Quốc gia — chiếc xe tăng dẫn đầu đội hình tiến vào Dinh Độc Lập trưa ngày 30/4/1975, kết thúc thắng lợi cuộc kháng chiến chống Mỹ cứu nước.',
    imageCaption: 'Bảo vật Quốc gia Xe tăng T-54B số hiệu 843.'
  },
  {
    id: 'outdoor-an26',
    zoneType: 'outdoor',
    floor: 1,
    zone: 'Khu Hiện Vật Ngoài Trời — Thảm Cỏ Cánh Phải',
    title: 'Chuyên Cơ & Máy Bay Vận Tải Lịch Sử',
    period: 'Thế kỷ XX',
    position: { x: 21.0, y: 0, z: 27.5 },
    interactRadius: 3.9,
    artifactType: 'aircraft_an26',
    artifactColor: PALETTE.AIRCRAFT_SILVER,
    imageUrl: './src/assets/chuyen-co-may-bay.jpg',
    summary:
      'Biểu tượng của Không quân Nhân dân Việt Nam anh hùng trong nhiệm vụ bảo vệ bầu trời Tổ quốc và vận tải chi viện chiến trường miền Nam.',
    imageCaption: 'Hiện vật máy bay vận tải quân sự lịch sử.'
  },
  {
    id: 'outdoor-howitzer105',
    zoneType: 'outdoor',
    floor: 1,
    zone: 'Khu Hiện Vật Ngoài Trời — Thảm Cỏ Cánh Tây',
    title: 'Pháo Lựu 105mm "Voi Gầm" Chiến Dịch Điện Biên Phủ (1954)',
    period: 'Chiến dịch Điện Biên Phủ (1954)',
    position: { x: -31.5, y: 0, z: 20.0 },
    interactRadius: 3.9,
    artifactType: 'howitzer_105',
    artifactColor: PALETTE.ARMY_GREEN,
    imageUrl: './src/assets/phao-luu-105.jpg',
    imageUrls: [
      { label: 'Pháo Lựu 105mm Điện Biên Phủ', url: './src/assets/phao-luu-105.jpg' },
      { label: 'Chiến Dịch Điện Biên Phủ (1954)', url: './src/assets/sa-ban-chien-dich-dien-bien-phu.jpg' }
    ],
    summary:
      'Khẩu pháo lựu 105mm gắn liền với kỳ tích "Hò kéo pháo" của bộ đội và dân công ta vượt qua dốc Bưng, dốc Chuối hiểm trở để trút bão lửa xuống tập đoàn cứ điểm Điện Biên Phủ.',
    imageCaption: 'Hiện vật Pháo lựu 105mm trong Chiến dịch Điện Biên Phủ (1954).'
  },
  {
    id: 'outdoor-sam2',
    zoneType: 'outdoor',
    floor: 1,
    zone: 'Khu Hiện Vật Ngoài Trời — Thảm Cỏ Cánh Đông',
    title: 'Bệ Phóng Tên Lửa SAM-2 "Rồng Lửa Thăng Long" (12/1972)',
    period: 'Chiến thắng "Hà Nội – Điện Biên Phủ trên không"',
    position: { x: 31.5, y: 0, z: 20.0 },
    interactRadius: 3.9,
    artifactType: 'sam2_missile',
    artifactColor: PALETTE.AIRCRAFT_SILVER,
    imageUrl: './src/assets/be-phong-ten-lua.jpg',
    imageUrls: [
      { label: 'Bệ Phóng Tên Lửa SAM-2', url: './src/assets/be-phong-ten-lua.jpg' }
    ],
    summary:
      'Tên lửa phòng không SAM-2 (S-75 Dvina) của Quân chủng Phòng không – Không quân đã lập chiến công oanh liệt bắn rơi "pháo đài bay" B-52 trong 12 ngày đêm tháng Chạp năm 1972.',
    imageCaption: 'Hiện vật Bệ phóng tên lửa phòng không SAM-2 (S-75 Dvina) lịch sử.'
  },

  // ================= TẦNG 1: GIAI ĐOẠN 1920 – 1954 =================
  // GIAN 1 (1920 - 1930) - Cánh Tây (Khoảng cách giữa 2 bục = 17.0 units)
  {
    id: 'f1-gian1-thanhnien',
    zoneType: 'indoor',
    floor: 1,
    zone: 'Tầng 1 • Gian 1 (1920 – 1930): Chuẩn Bị Thành Lập Đảng',
    title: 'Báo Thanh Niên & Tác Phẩm "Đường Kách Mệnh"',
    period: 'Năm 1925 – 1927 (Quảng Châu)',
    position: { x: -23.0, y: 0, z: -9.5 },
    interactRadius: 1.95,
    artifactType: 'suitcase_books',
    artifactColor: PALETTE.WOOD_OAK,
    imageUrl: './src/assets/duong-kach-menh.jpg',
    summary:
      'Tờ báo Thanh Niên do lãnh tụ Nguyễn Ái Quốc sáng lập (21/6/1925) và cuốn "Đường Kách mệnh" (1927) — những tài liệu lý luận Mác – Lênin đầu tiên đặt nền móng cho sự ra đời của Đảng.',
    imageCaption: 'Bản gốc tác phẩm "Đường Kách mệnh" (1927) của Nguyễn Ái Quốc.'
  },
  {
    id: 'f1-gian1-founding',
    zoneType: 'indoor',
    floor: 1,
    zone: 'Tầng 1 • Gian 1 (1920 – 1930): Chuẩn Bị Thành Lập Đảng',
    title: 'Hội Nghị Hợp Nhất Thành Lập Đảng (3/2/1930)',
    period: 'Mùa Xuân năm 1930',
    position: { x: -23.0, y: 0, z: -26.5 },
    interactRadius: 1.95,
    artifactType: 'round_table',
    artifactColor: PALETTE.RED_VERMILION,
    imageUrl: './src/assets/hoi-nghi-thanh-lap-dang.jpg',
    summary:
      'Dưới sự chủ trì của đồng chí Nguyễn Ái Quốc tại Cửu Long (Hương Cảng), Hội nghị đã hợp nhất ba tổ chức cộng sản thành Đảng Cộng sản Việt Nam và thông qua Cương lĩnh chính trị đầu tiên.',
    imageCaption: 'Tranh tư liệu Hội nghị hợp nhất thành lập Đảng Cộng sản Việt Nam (3/2/1930).'
  },

  // GIAN 2 (1930 - 1945) - 2 Đảo trưng bày độc lập ở Sảnh Trung tâm
  {
    id: 'f1-gian2-pacbo',
    zoneType: 'indoor',
    floor: 1,
    zone: 'Tầng 1 • Gian 2 (1930 – 1945): Đấu Tranh Giành Chính Quyền',
    title: 'Xô Viết Nghệ Tĩnh & Lán Nà Nưa – Pác Bó',
    period: 'Giai đoạn 1930 – 1945',
    position: { x: -7.8, y: 0, z: -15.5 },
    interactRadius: 1.95,
    artifactType: 'bamboo_hut',
    artifactColor: PALETTE.CONICAL_STRAW,
    imageUrl: './src/assets/lan-na-nua.jpg',
    imageUrls: [
      { label: 'Lán Nà Nưa (Tân Trào)', url: './src/assets/lan-na-nua.jpg' },
      { label: 'Cao trào Xô Viết Nghệ Tĩnh', url: './src/assets/xo-viet-nghe-tinh.jpg' }
    ],
    summary:
      'Từ cao trào Xô Viết Nghệ Tĩnh (1930–1931) đến Hội nghị Trung ương 8 tại Pác Bó (1941) và Lán Nà Nưa — Tân Trào (1945), Đảng đã lãnh đạo toàn dân tiến hành Tổng khởi nghĩa Tháng Tám thành công.',
    imageCaption: 'Tư liệu Lán Nà Nưa (Tuyên Quang) và cao trào Xô Viết Nghệ Tĩnh (1930–1931).'
  },
  {
    id: 'f1-gian2-badinh',
    zoneType: 'indoor',
    floor: 1,
    zone: 'Tầng 1 • Gian 2 (1930 – 1945): Đấu Tranh Giành Chính Quyền',
    title: 'Bản Thảo Tuyên Ngôn Độc Lập & Micro Ba Đình (2/9/1945)',
    period: 'Ngày 2 tháng 9 năm 1945',
    position: { x: 7.8, y: 0, z: -15.5 },
    interactRadius: 1.95,
    artifactType: 'badinh_mic',
    artifactColor: PALETTE.STAR_GOLD,
    imageUrl: './src/assets/ban-tuyen-ngon-doc-lap.jpg',
    summary:
      'Tại Quảng trường Ba Đình lịch sử, Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa — Nhà nước công nông đầu tiên ở Đông Nam Á.',
    imageCaption: 'Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình (2/9/1945).'
  },

  // GIAN 3 (1945 - 1954) - Cánh Đông (Khoảng cách giữa 2 bục = 17.0 units)
  {
    id: 'f1-gian3-packbike',
    zoneType: 'indoor',
    floor: 1,
    zone: 'Tầng 1 • Gian 3 (1945 – 1954): Kháng Chiến Kiến Quốc',
    title: 'Lời Kêu Gọi Toàn Quốc Kháng Chiến & Xe Đạp Thồ',
    period: 'Giai đoạn 1946 – 1954',
    position: { x: 23.0, y: 0, z: -9.5 },
    interactRadius: 1.95,
    artifactType: 'pack_bicycle',
    artifactColor: PALETTE.ARMY_GREEN,
    imageUrl: './src/assets/xe-dap-tho.jpg',
    imageUrls: [
      { label: 'Xe Đạp Thồ Điện Biên', url: './src/assets/xe-dap-tho.jpg' },
      { label: 'Lời Kêu Gọi Toàn Quốc Kháng Chiến', url: './src/assets/loi-keu-goi-toan-nuoc-khang-chien.jpg' }
    ],
    summary:
      'Hưởng ứng Lời kêu gọi Toàn quốc kháng chiến (19/12/1946), hàng vạn dân công với những chiếc xe đạp thồ cải tiến đã vượt đèo dốc tiếp viện cho chiến trường Điện Biên Phủ.',
    imageCaption: 'Đoàn xe đạp thồ dân công hỏa tuyến và bút tích Lời kêu gọi Toàn quốc kháng chiến.'
  },
  {
    id: 'f1-gian3-dienbien',
    zoneType: 'indoor',
    floor: 1,
    zone: 'Tầng 1 • Gian 3 (1945 – 1954): Kháng Chiến Kiến Quốc',
    title: 'Sa Bàn Chiến Dịch Điện Biên Phủ — Đồi A1 (7/5/1954)',
    period: 'Ngày 7 tháng 5 năm 1954',
    position: { x: 23.0, y: 0, z: -26.5 },
    interactRadius: 1.95,
    artifactType: 'hill_a1_diorama',
    artifactColor: PALETTE.PARTY_RED,
    imageUrl: './src/assets/sa-ban-chien-dich-dien-bien-phu.jpg',
    summary:
      'Chiến thắng Điện Biên Phủ "lừng lẫy năm châu, chấn động địa cầu" chiều 7/5/1954 đã kết thúc thắng lợi cuộc kháng chiến 9 năm trường kỳ của dân tộc.',
    imageCaption: 'Lá cờ Quyết chiến Quyết thắng tung bay tại Chiến dịch Điện Biên Phủ (7/5/1954).'
  },

  // ================= TẦNG 2: GIAI ĐOẠN 1954 – NAY (Y = 5.5) =================
  // GIAN 4 (1954 - 1975) - Cánh Tây Tầng 2 (Khoảng cách giữa 2 bục = 16.0 units)
  {
    id: 'f2-gian4-truongson',
    zoneType: 'indoor',
    floor: 2,
    zone: 'Tầng 2 • Gian 4 (1954 – 1975): Thống Nhất Đất Nước',
    title: 'Nghị Quyết TW 15 & Đường Trường Sơn Huyền Thoại',
    period: 'Giai đoạn 1959 – 1975',
    position: { x: -22.5, y: 5.5, z: -10.5 },
    interactRadius: 1.95,
    artifactType: 'truongson_milestone',
    artifactColor: PALETTE.ARMY_GREEN,
    imageUrl: './src/assets/duong-truong-son-huyen-thoai.jpg',
    imageUrls: [
      { label: 'Đường Trường Sơn Huyền Thoại', url: './src/assets/duong-truong-son-huyen-thoai.jpg' },
      { label: 'Nghị Quyết Trung Ương 15 (1959)', url: './src/assets/nghi-quyet-trung-uong-15.jpg' }
    ],
    summary:
      'Nghị quyết Trung ương 15 (1959) và tuyến đường Trường Sơn (Đường 559) đã nối liền hậu phương lớn miền Bắc với tiền tuyến lớn miền Nam.',
    imageCaption: 'Tuyến đường Trường Sơn – Đường Hồ Chí Minh lịch sử và Nghị quyết Trung ương 15.'
  },
  {
    id: 'f2-gian4-paris1975',
    zoneType: 'indoor',
    floor: 2,
    zone: 'Tầng 2 • Gian 4 (1954 – 1975): Thống Nhất Đất Nước',
    title: 'Hiệp Định Paris 1973 & Đài Radio Ngày Toàn Thắng 30/4',
    period: 'Năm 1973 – 1975',
    position: { x: -22.5, y: 5.5, z: -26.5 },
    interactRadius: 1.95,
    artifactType: 'radio_victory',
    artifactColor: PALETTE.WOOD_OAK,
    imageUrl: './src/assets/ngay-toan-thang-30-4.jpg',
    imageUrls: [
      { label: 'Ngày Toàn Thắng 30/4/1975', url: './src/assets/ngay-toan-thang-30-4.jpg' },
      { label: 'Lễ Ký Hiệp Định Paris (1973)', url: './src/assets/hiep-dinh-paris.jpg' }
    ],
    summary:
      'Sự kết hợp giữa ba mặt trận Quân sự – Chính trị – Ngoại giao tại Hội nghị Paris (1973) đã tạo thế và lực tiến tới Đại thắng mùa Xuân 1975, thống nhất Tổ quốc.',
    imageCaption: 'Đại thắng mùa Xuân 30/4/1975 và Lễ ký kết Hiệp định Paris (27/1/1973).'
  },
  {
    id: 'f2-gian4-zin157',
    zoneType: 'indoor',
    floor: 2,
    zone: 'Tầng 2 • Gian 4 (1954 – 1975): Thống Nhất Đất Nước',
    title: 'Xe Vận Tải Quân Sự ZIL-157 Đoàn 559 Trường Sơn',
    period: 'Giai đoạn 1959 – 1975',
    position: { x: -16.2, y: 5.5, z: -16.5 },
    interactRadius: 1.95,
    artifactType: 'truck_zil157',
    artifactColor: PALETTE.ARMY_GREEN,
    imageUrl: './src/assets/xe-van-tai-quan-su.jpg',
    summary:
      'Những đoàn xe vận tải quân sự "không kính" của bộ đội Trường Sơn đã vượt qua mưa bom bão đạn trên các trọng điểm Cổng Trời, Ngã ba Đồng Lộc để chi viện sức người, sức của cho miền Nam ruột thịt.',
    imageCaption: 'Mô hình Xe vận tải quân sự Đoàn 559 vượt đại ngàn Trường Sơn.'
  },

  // GIAN 5 (1986 - NAY) - Cánh Đông Tầng 2 (Khoảng cách giữa 2 bục = 16.0 units)
  {
    id: 'f2-gian5-doimoi',
    zoneType: 'indoor',
    floor: 2,
    zone: 'Tầng 2 • Gian 5 (1986 – Nay): Công Cuộc Đổi Mới',
    title: 'Đại Hội VI (1986) — Từ Thời Kỳ Bao Cấp Đến Đổi Mới',
    period: 'Tháng 12 năm 1986',
    position: { x: 22.5, y: 5.5, z: -10.5 },
    interactRadius: 1.95,
    artifactType: 'doimoi_documents',
    artifactColor: PALETTE.RED_VERMILION,
    imageUrl: './src/assets/dai-hoi-vi.jpg',
    summary:
      'Đại hội VI của Đảng (12/1986) đã khởi xướng đường lối Đổi mới toàn diện, mở ra thời kỳ phát triển kinh tế – xã hội năng động của đất nước.',
    imageCaption: 'Quang cảnh Đại hội đại biểu toàn quốc lần thứ VI của Đảng (12/1986).'
  },
  {
    id: 'f2-gian5-integration',
    zoneType: 'indoor',
    floor: 2,
    zone: 'Tầng 2 • Gian 5 (1986 – Nay): Công Cuộc Đổi Mới',
    title: 'Việt Nam Hội Nhập Quốc Tế & Kỷ Nguyên Vươn Mình',
    period: 'Từ 1995 – Nay',
    position: { x: 22.5, y: 5.5, z: -26.5 },
    interactRadius: 1.95,
    artifactType: 'integration_globe',
    artifactColor: PALETTE.AIRCRAFT_BLUE,
    imageUrl: './src/assets/viet-nam-hoi-nhap-quoc-te.jpg',
    summary:
      'Qua gần 40 năm Đổi mới dưới sự lãnh đạo của Đảng, Việt Nam đã khẳng định cơ đồ, tiềm lực, vị thế và uy tín quốc tế ngày càng cao trên trường quốc tế.',
    imageCaption: 'Việt Nam hội nhập quốc tế sâu rộng và chuyển đổi số quốc gia.'
  },
  {
    id: 'f2-gian5-satellite',
    zoneType: 'indoor',
    floor: 2,
    zone: 'Tầng 2 • Gian 5 (1986 – Nay): Công Cuộc Đổi Mới',
    title: 'Cột Mốc Chủ Quyền Trường Sa & Vệ Tinh VINASAT Việt Nam',
    period: 'Thế kỷ XXI — Kỷ nguyên Số & Biển Đảo',
    position: { x: 16.2, y: 5.5, z: -16.5 },
    interactRadius: 1.95,
    artifactType: 'truongsa_satellite',
    artifactColor: PALETTE.AIRCRAFT_BLUE,
    imageUrl: './src/assets/ve-tinh.jpg',
    imageUrls: [
      { label: 'Vệ tinh VINASAT-1', url: './src/assets/ve-tinh.jpg' },
      { label: 'Cột mốc chủ quyền Trường Xa', url: './src/assets/cot-moc-truong-xa.jpg' }
    ],
    summary:
      'Khẳng định chủ quyền biển đảo thiêng liêng Hoàng Sa – Trường Sa và bước tiến làm chủ không gian vũ trụ, viễn thông, khoa học công nghệ cao của Việt Nam trong thời kỳ công nghiệp hóa – hiện đại hóa.',
    imageCaption: 'Mô hình Cột mốc chủ quyền Trường Sa và Vệ tinh viễn thông VINASAT.'
  },

  // GIAN 6 (KHÔNG GIAN TƯỞNG NIỆM TRUNG TÂM TẦNG 2) — Đặt tại Z = -34.0, cách Bàn Thắp Nến (Z = -22.5) đúng 11.5 units!
  {
    id: 'f2-gian6-memorial',
    zoneType: 'indoor',
    floor: 2,
    zone: 'Tầng 2 • Gian 6: Không Gian Tưởng Niệm & Tôn Vinh',
    title: 'Tưởng Niệm Chủ Tịch Hồ Chí Minh & Các Tổng Bí Thư Của Đảng',
    period: 'Đời Đời Nhớ Ơn (1930 – Nay)',
    position: { x: 0, y: 5.5, z: -34.0 },
    interactRadius: 2.1,
    artifactType: 'memorial_statue',
    artifactColor: PALETTE.STAR_GOLD,
    imageUrl: './src/assets/tuong-dai-ho-chi-minh.jpg',
    imageUrls: [
      { label: 'Tượng Đài Chủ Tịch Hồ Chí Minh', url: './src/assets/tuong-dai-ho-chi-minh.jpg' },
      { label: 'Chân Dung Bác Hồ Kính Yêu', url: './src/assets/bac_ho.jpg' }
    ],
    summary:
      'Không gian trang nghiêm tôn vinh Chủ tịch Hồ Chí Minh vĩ đại — Người sáng lập, rèn luyện Đảng ta — cùng các đồng chí Tổng Bí thư qua các thời kỳ: Trần Phú, Lê Hồng Phong, Hà Huy Tập, Nguyễn Văn Cừ, Trường Chinh, Lê Duẩn, Nguyễn Văn Linh, Đỗ Mười, Lê Khả Phiêu, Nông Đức Mạnh, Nguyễn Phú Trọng...',
    imageCaption: 'Tượng đài và chân dung Chủ tịch Hồ Chí Minh vĩ đại.'
  }
];

/**
 * Dữ liệu các chương Phim Tư Liệu Lịch Sử Đảng trong Rạp Chiếu Phim Tầng 1
 * (Đã tích hợp 4 đường dẫn YouTube embed của bạn kèm dấu phẩy chuẩn cú pháp)
 */
export const DOCUMENTARY_CHAPTERS = [
  {
    id: 'chap-1930',
    title: 'Chương I: Mùa Xuân Lịch Sử — Hội Nghị Thành Lập Đảng (3/2/1930)',
    durationSec: 28,
    bgMedia: './src/assets/bac_ho.jpg',
    youtubeUrl: 'https://www.youtube.com/embed/2hSOHVnGvOo',
    yearBadge: '03 / 02 / 1930',
    headline: 'ĐẢNG CỘNG SẢN VIỆT NAM RA ĐỜI',
    narration: [
      'Từ năm 1920 tại Đại hội Tours đến những lớp huấn luyện chính trị tại Quảng Châu (1925–1927), lãnh tụ Nguyễn Ái Quốc đã chuẩn bị chu đáo về chính trị, tư tưởng và tổ chức.',
      'Mùa Xuân năm 1930, tại Cửu Long (Hương Cảng), Hội nghị hợp nhất các tổ chức cộng sản đã nhất trí thành lập Đảng Cộng sản Việt Nam.',
      'Chính cương vắn tắt và Sách lược vắn tắt do Người soạn thảo đã trở thành Cương lĩnh chính trị đầu tiên, chấm dứt cuộc khủng hoảng về đường lối cứu nước của dân tộc.'
    ]
  },
  {
    id: 'chap-1945',
    title: 'Chương II: Cách Mạng Tháng Tám & Tuyên Ngôn Độc Lập (2/9/1945)',
    durationSec: 30,
    bgMedia: './src/assets/ban-tuyen-ngon-doc-lap.jpg',
    youtubeUrl: 'https://www.youtube.com/embed/9XBaDNiFPbs',
    yearBadge: '02 / 09 / 1945',
    headline: 'NƯỚC VIỆT NAM DÂN CHỦ CỘNG HÒA RA ĐỜI',
    narration: [
      'Dưới ngọn cờ của Đảng và Mặt trận Việt Minh, mùa Thu tháng Tám năm 1945, hơn 20 triệu đồng bào cả nước đã nhất tề vùng dậy giành chính quyền trong 15 ngày.',
      'Ngày 2 tháng 9 năm 1945, tại Quảng trường Ba Đình lịch sử, Chủ tịch Hồ Chí Minh trịnh trọng đọc bản Tuyên ngôn Độc lập bất hủ.',
      '"Nước Việt Nam có quyền hưởng tự do và độc lập, và sự thật đã thành một nước tự do độc lập!"'
    ]
  },
  {
    id: 'chap-1954',
    title: 'Chương III: Điện Biên Phủ — Lừng Lẫy Năm Châu (7/5/1954)',
    durationSec: 28,
    bgMedia: './src/assets/sa-ban-chien-dich-dien-bien-phu.jpg',
    youtubeUrl: 'https://www.youtube.com/embed/CD8sKixEDsI',
    yearBadge: '07 / 05 / 1954',
    headline: 'QUYẾT CHIẾN QUYẾT THẮNG ĐIỆN BIÊN PHỦ',
    narration: [
      'Trải qua 9 năm kháng chiến trường kỳ toàn dân, toàn diện, quân và dân ta đã làm nên 56 ngày đêm "khoét núi, ngủ hầm, mưa dầm, cơm vắt".',
      'Chiều ngày 7/5/1954, lá cờ Quyết chiến Quyết thắng tung bay trên nóc hầm tướng De Castries, kết thúc vẻ vang cuộc kháng chiến chống thực dân Pháp.'
    ]
  },
  {
    id: 'chap-1975',
    title: 'Chương IV: Đại Thắng Mùa Xuân 1975 & Kỷ Nguyên Đổi Mới',
    durationSec: 30,
    bgMedia: './src/assets/ngay-toan-thang-30-4.jpg',
    youtubeUrl: 'https://www.youtube.com/embed/aqMp24oZJa8',
    yearBadge: '30 / 04 / 1975 – NAY',
    headline: 'NON SÔNG THU VỀ MỘT MỐI & ĐỔI MỚI HỘI NHẬP',
    narration: [
      'Chiến dịch Hồ Chí Minh lịch sử toàn thắng trưa ngày 30/4/1975 đã thu non sông về một mối, cả nước cùng đi lên Chủ nghĩa Xã hội.',
      'Từ Đại hội VI (1986) đến nay, công cuộc Đổi mới toàn diện do Đảng khởi xướng và lãnh đạo đã đưa đất nước đạt được những thành tựu to lớn, có ý nghĩa lịch sử.'
    ]
  }
];

/**
 * TÍNH NĂNG 1: Danh sách 8 Ngôi Sao Vàng Lịch Sử (Scavenger Hunt)
 * Đã căn chỉnh vị trí trên lối đi thông thoáng, không chìm vào bệ đá hay hồ nước.
 */
export const HIDDEN_STARS_DATA = [
  {
    id: 'star-1',
    zoneType: 'outdoor',
    floor: 1,
    title: 'Sao Vàng #1: Dấu Chân Quảng Trường Độc Lập',
    anecdote: 'Cột cờ Hà Nội được xây dựng năm 1812 và là nơi lần đầu tiên tung bay Quốc kỳ Việt Nam sau Cách mạng Tháng Tám 1945.',
    position: { x: -5.2, y: 1.05, z: 24.0 }
  },
  {
    id: 'star-2',
    zoneType: 'outdoor',
    floor: 1,
    title: 'Sao Vàng #2: Hào Khí Đại Đoàn Kết',
    anecdote: 'Liên minh Công – Nông – Trí thức là nền tảng vững chắc của khối Đại đoàn kết toàn dân tộc dưới ngọn cờ của Đảng.',
    position: { x: 15.8, y: 1.05, z: 13.0 }
  },
  {
    id: 'star-3',
    zoneType: 'outdoor',
    floor: 1,
    title: 'Sao Vàng #3: Thần Tốc Mùa Xuân 1975',
    anecdote: 'Trưa 30/4/1975, Xe tăng T-54B số hiệu 843 và 390 đã húc đổ cổng Dinh Độc Lập, toàn thắng Chiến dịch Hồ Chí Minh.',
    position: { x: -16.2, y: 1.05, z: 27.5 }
  },
  {
    id: 'star-4',
    zoneType: 'indoor',
    floor: 1,
    title: 'Sao Vàng #4: Ánh Sáng Đường Kách Mệnh',
    anecdote: 'Báo Thanh Niên (21/6/1925) đã mở đầu lịch sử Báo chí Cách mạng Việt Nam do lãnh tụ Nguyễn Ái Quốc sáng lập.',
    position: { x: -18.2, y: 1.05, z: -18.0 }
  },
  {
    id: 'star-5',
    zoneType: 'indoor',
    floor: 1,
    title: 'Sao Vàng #5: Lời Thề Độc Lập Ba Đình',
    anecdote: 'Bản Tuyên ngôn Độc lập ngày 2/9/1945 được Bác Hồ soạn thảo tại tầng 2 ngôi nhà số 48 Hàng Ngang, Hà Nội.',
    position: { x: 0.0, y: 1.05, z: -15.5 }
  },
  {
    id: 'star-6',
    zoneType: 'indoor',
    floor: 1,
    title: 'Sao Vàng #6: Kỳ Tích Xe Đạp Thồ Điện Biên',
    anecdote: 'Hơn 20.000 chiếc xe đạp thồ đã vận chuyển hàng vạn tấn lương thực, đạn dược vượt đèo Pha Đin phục vụ Chiến dịch Điện Biên Phủ.',
    position: { x: 18.2, y: 1.05, z: -18.0 }
  },
  {
    id: 'star-7',
    zoneType: 'indoor',
    floor: 2,
    title: 'Sao Vàng #7: Xẻ Dọc Trường Sơn Đi Cứu Nước',
    anecdote: 'Tuyến đường Trường Sơn – Đường Hồ Chí Minh dài gần 20.000 km là kỳ tích quân sự vĩ đại trong kháng chiến chống Mỹ.',
    position: { x: -17.5, y: 6.55, z: -18.5 }
  },
  {
    id: 'star-8',
    zoneType: 'indoor',
    floor: 2,
    title: 'Sao Vàng #8: Khát Vọng Đổi Mới & Vươn Mình',
    anecdote: 'Đại hội VI (12/1986) của Đảng đã mở ra công cuộc Đổi mới toàn diện, đưa Việt Nam hội nhập sâu rộng cùng thế giới.',
    position: { x: 17.5, y: 6.55, z: -18.5 }
  }
];

/**
 * TÍNH NĂNG 2: Ngân hàng câu hỏi Đố Vui Lịch Sử Đảng "Rung Chuông Vàng"
 */
export const QUIZ_QUESTIONS_DATA = [
  {
    id: 'q1',
    question: 'Hội nghị hợp nhất thành lập Đảng Cộng sản Việt Nam (mùa Xuân năm 1930) do ai chủ trì?',
    options: [
      'A. Đồng chí Nguyễn Ái Quốc',
      'B. Đồng chí Trần Phú',
      'C. Đồng chí Lê Hồng Phong',
      'D. Đồng chí Trường Chinh'
    ],
    correctIndex: 0,
    explanation: 'Từ ngày 6/1 đến đầu tháng 2/1930 tại Cửu Long (Hương Cảng), lãnh tụ Nguyễn Ái Quốc đã chủ trì Hội nghị hợp nhất các tổ chức cộng sản thành Đảng Cộng sản Việt Nam.'
  },
  {
    id: 'q2',
    question: 'Tờ báo cách mạng đầu tiên do Nguyễn Ái Quốc sáng lập vào ngày 21/6/1925 tại Quảng Châu có tên là gì?',
    options: [
      'A. Báo Nhân Dân',
      'B. Báo Thanh Niên',
      'C. Báo Cờ Giải Phóng',
      'D. Báo Cứu Quốc'
    ],
    correctIndex: 1,
    explanation: 'Báo Thanh Niên ra số đầu tiên ngày 21/6/1925, truyền bá chủ nghĩa Mác – Lênin về trong nước và đặt nền móng cho Báo chí Cách mạng Việt Nam.'
  },
  {
    id: 'q3',
    question: 'Tại Hội nghị Trung ương 8 (tháng 5/1941) ở Pác Bó (Cao Bằng), Đảng và Bác Hồ đã quyết định thành lập mặt trận nào?',
    options: [
      'A. Mặt trận Tổ quốc Việt Nam',
      'B. Mặt trận Liên Việt',
      'C. Mặt trận Việt Minh',
      'D. Mặt trận Dân chủ Đông Dương'
    ],
    correctIndex: 2,
    explanation: 'Mặt trận Việt Nam Độc lập Đồng minh (Việt Minh) được thành lập tháng 5/1941 để tập hợp toàn dân chuẩn bị Tổng khởi nghĩa Tháng Tám 1945.'
  },
  {
    id: 'q4',
    question: 'Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập khai sinh nước Việt Nam Dân chủ Cộng hòa vào ngày tháng năm nào?',
    options: [
      'A. Ngày 19/8/1945',
      'B. Ngày 2/9/1945',
      'C. Ngày 19/12/1946',
      'D. Ngày 7/5/1954'
    ],
    correctIndex: 1,
    explanation: 'Ngày 2/9/1945 tại Quảng trường Ba Đình (Hà Nội), Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập khai sinh nước Việt Nam Dân chủ Cộng hòa.'
  },
  {
    id: 'q5',
    question: 'Chiến thắng Điện Biên Phủ "lừng lẫy năm châu, chấn động địa cầu" toàn thắng vào ngày nào?',
    options: [
      'A. Ngày 13/3/1954',
      'B. Ngày 30/4/1954',
      'C. Ngày 7/5/1954',
      'D. Ngày 10/10/1954'
    ],
    correctIndex: 2,
    explanation: '17 giờ 30 phút chiều ngày 7/5/1954, lá cờ "Quyết chiến Quyết thắng" tung bay trên nóc hầm tướng De Castries, kết thúc 56 ngày đêm chiến đấu anh dũng.'
  },
  {
    id: 'q6',
    question: 'Tuyến đường vận tải chiến lược huyền thoại nối hậu phương miền Bắc với tiền tuyến miền Nam mang phiên hiệu đoàn nào?',
    options: [
      'A. Đoàn 559 (Đường Trường Sơn – Đường Hồ Chí Minh)',
      'B. Đoàn 125',
      'C. Đoàn 308',
      'D. Đoàn 312'
    ],
    correctIndex: 0,
    explanation: 'Ngày 19/5/1959, Đoàn 559 được thành lập để mở tuyến đường Trường Sơn – Đường Hồ Chí Minh chi viện cho chiến trường miền Nam.'
  },
  {
    id: 'q7',
    question: 'Chiếc xe tăng T-54B mang số hiệu nào (hiện là Bảo vật Quốc gia) đã dẫn đầu đội hình tiến vào Dinh Độc Lập trưa 30/4/1975?',
    options: [
      'A. Xe tăng 390 và Xe tăng 843',
      'B. Xe tăng 559',
      'C. Xe tăng 1975',
      'D. Xe tăng 304'
    ],
    correctIndex: 0,
    explanation: 'Trưa 30/4/1975, xe tăng T-54B số hiệu 843 do Đại đội trưởng Bùi Quang Thận chỉ huy và xe tăng 390 đã tiến vào Dinh Độc Lập.'
  },
  {
    id: 'q8',
    question: 'Đại hội đại biểu toàn quốc lần thứ mấy của Đảng (tháng 12/1986) đã khởi xướng đường lối Đổi mới toàn diện đất nước?',
    options: [
      'A. Đại hội IV (1976)',
      'B. Đại hội V (1982)',
      'C. Đại hội VI (1986)',
      'D. Đại hội VII (1991)'
    ],
    correctIndex: 2,
    explanation: 'Đại hội VI của Đảng (tháng 12/1986) đã đề ra đường lối Đổi mới toàn diện, mở ra kỷ nguyên phát triển và hội nhập quốc tế của Việt Nam.'
  }
];

/**
 * TÍNH NĂNG 1: Dữ liệu 8 Trạm "Tour Hướng Dẫn Viên Ảo Tự Động"
 * (Khi tương tác với Chiến sĩ Tiêu binh ở ngoài sân gần Cột cờ Hà Nội):
 */
const LEGACY_TOUR_DETAIL = [
  {
    step: 1,
    exhibitId: 'outdoor-flagpole',
    zoneType: 'outdoor',
    floor: 1,
    title: 'Trạm 1/8: Kỳ Đài Cột Cờ Hà Nội & Quảng Trường Độc Lập',
    period: 'Biểu tượng Thiêng liêng của Tổ quốc',
    playerPos: { x: 0, y: 0, z: 31.2, rotY: Math.PI },
    lookAtPos: { x: 0, y: 6.2, z: 24.0 },
    camDist: 16.5,
    camHeight: 7.2,
    narration:
      'Chào mừng đồng chí đến với Triển lãm Lịch sử Đảng Cộng sản Việt Nam! Trước mắt chúng ta là Kỳ đài Cột cờ Hà Nội uy nghiêm, nơi lá cờ đỏ sao vàng tung bay kiêu hãnh từ mùa Thu Cách mạng Tháng Tám năm 1945.',
    spokenSegments: [
      'Chào mừng đồng chí đến với Triển lãm Lịch sử Đảng Cộng sản Việt Nam.',
      'Trạm thứ nhất: Kỳ đài Cột cờ Hà Nội và Quảng trường Độc lập.',
      'Trước mắt chúng ta là Kỳ đài Cột cờ Hà Nội uy nghiêm, nơi lá cờ đỏ sao vàng năm cánh tung bay kiêu hãnh từ mùa Thu Cách mạng Tháng Tám năm một nghìn chín trăm bốn mươi lăm.'
    ]
  },
  {
    step: 2,
    exhibitId: 'outdoor-t54',
    zoneType: 'outdoor',
    floor: 1,
    title: 'Trạm 2/8: Bảo Vật Quốc Gia — Xe Tăng T-54B Số Hiệu 843',
    period: 'Đại Thắng Mùa Xuân 30/4/1975',
    playerPos: { x: -16.2, y: 0, z: 28.0, rotY: -Math.PI / 2 },
    lookAtPos: { x: -21.0, y: 2.0, z: 27.5 },
    camDist: 13.5,
    camHeight: 5.8,
    narration:
      'Tại khu trưng bày ngoài trời cánh Tây là Bảo vật Quốc gia Xe tăng T-54B số hiệu 843 — chiếc xe tăng dẫn đầu đội hình tiến vào Dinh Độc Lập trưa ngày 30 tháng 4 năm 1975, thu non sông về một mối.',
    spokenSegments: [
      'Trạm thứ hai: Bảo vật Quốc gia, Xe tăng T năm bốn B số hiệu tám bốn ba.',
      'Tại khu trưng bày ngoài trời cánh Tây là chiếc xe tăng lịch sử đã dẫn đầu đội hình tiến vào Dinh Độc Lập trưa ngày ba mươi tháng tư năm một nghìn chín trăm bảy mươi lăm, kết thúc thắng lợi cuộc kháng chiến chống Mỹ cứu nước, thu non sông về một mối.'
    ]
  },
  {
    step: 3,
    exhibitId: 'f1-gian1-founding',
    zoneType: 'indoor',
    floor: 1,
    title: 'Trạm 3/8: Hội Nghị Hợp Nhất Thành Lập Đảng (3/2/1930)',
    period: 'Mùa Xuân lịch sử năm 1930',
    playerPos: { x: -18.5, y: 0, z: -26.5, rotY: -Math.PI / 2 },
    lookAtPos: { x: -23.0, y: 1.8, z: -26.5 },
    camDist: 12.8,
    camHeight: 5.5,
    narration:
      'Bước vào Gian 1 Tầng 1: Mùa Xuân năm 1930 tại Cửu Long (Hương Cảng), dưới sự chủ trì của lãnh tụ Nguyễn Ái Quốc, Hội nghị hợp nhất đã thành lập Đảng Cộng sản Việt Nam và thông qua Cương lĩnh chính trị đầu tiên.',
    spokenSegments: [
      'Trạm thứ ba: Hội nghị hợp nhất thành lập Đảng Cộng sản Việt Nam, ngày ba tháng hai năm một nghìn chín trăm ba mươi.',
      'Mùa Xuân năm một nghìn chín trăm ba mươi tại Cửu Long, Hương Cảng, dưới sự chủ trì của lãnh tụ Nguyễn Ái Quốc, Hội nghị đã hợp nhất ba tổ chức cộng sản và thông qua Cương lĩnh chính trị đầu tiên, mở ra bước ngoặt vĩ đại của cách mạng Việt Nam.'
    ]
  },
  {
    step: 4,
    exhibitId: 'f1-gian2-badinh',
    zoneType: 'indoor',
    floor: 1,
    title: 'Trạm 4/8: Bản Tuyên Ngôn Độc Lập & Micro Ba Đình (2/9/1945)',
    period: 'Khai sinh nước Việt Nam Dân chủ Cộng hòa',
    playerPos: { x: 7.8, y: 0, z: -11.0, rotY: Math.PI },
    lookAtPos: { x: 7.8, y: 1.9, z: -15.5 },
    camDist: 13.0,
    camHeight: 5.6,
    narration:
      'Tại Gian 2 trung tâm Tầng 1 là chiếc Micro lịch sử tại Quảng trường Ba Đình ngày 2 tháng 9 năm 1945, nơi Chủ tịch Hồ Chí Minh trịnh trọng đọc bản Tuyên ngôn Độc lập khai sinh nước Việt Nam Dân chủ Cộng hòa.',
    spokenSegments: [
      'Trạm thứ tư: Bản Tuyên ngôn Độc lập và Micro Ba Đình lịch sử, ngày hai tháng chín năm một nghìn chín trăm bốn mươi lăm.',
      'Tại Quảng trường Ba Đình lịch sử, Chủ tịch Hồ Chí Minh đã trịnh trọng đọc bản Tuyên ngôn Độc lập bất hủ, khai sinh nước Việt Nam Dân chủ Cộng hòa, nhà nước công nông đầu tiên ở Đông Nam Á.'
    ]
  },
  {
    step: 5,
    exhibitId: 'f1-gian3-dienbien',
    zoneType: 'indoor',
    floor: 1,
    title: 'Trạm 5/8: Chiến Thắng Điện Biên Phủ — Đồi A1 (7/5/1954)',
    period: 'Lừng lẫy năm châu, chấn động địa cầu',
    playerPos: { x: 18.5, y: 0, z: -26.5, rotY: Math.PI / 2 },
    lookAtPos: { x: 23.0, y: 1.9, z: -26.5 },
    camDist: 12.8,
    camHeight: 5.6,
    narration:
      'Tại Gian 3 cánh Đông Tầng 1: Sau 56 ngày đêm "khoét núi, ngủ hầm, mưa dầm, cơm vắt", chiều ngày 7 tháng 5 năm 1954, lá cờ Quyết chiến Quyết thắng đã tung bay trên chiến trường Điện Biên Phủ.',
    spokenSegments: [
      'Trạm thứ năm: Chiến thắng Điện Biên Phủ, ngày bảy tháng năm năm một nghìn chín trăm năm mươi tư.',
      'Sau năm mươi sáu ngày đêm khoét núi, ngủ hầm, mưa dầm, cơm vắt, chiều ngày bảy tháng năm năm một nghìn chín trăm năm mươi tư, lá cờ Quyết chiến Quyết thắng đã tung bay trên chiến trường Điện Biên Phủ, lừng lẫy năm châu, chấn động địa cầu.'
    ]
  },
  {
    step: 6,
    exhibitId: 'f2-gian4-paris1975',
    zoneType: 'indoor',
    floor: 2,
    title: 'Trạm 6/8: Hiệp Định Paris 1973 & Đài Radio Ngày Toàn Thắng',
    period: 'Thống nhất Tổ quốc (1954 – 1975)',
    playerPos: { x: -18.0, y: 5.5, z: -26.5, rotY: -Math.PI / 2 },
    lookAtPos: { x: -22.5, y: 7.3, z: -26.5 },
    camDist: 12.8,
    camHeight: 5.5,
    narration:
      'Di chuyển lên Tầng 2 Gian 4: Từ đường Trường Sơn huyền thoại và thắng lợi ngoại giao tại Hội nghị Paris năm 1973, quân và dân ta đã tiến lên giành Đại thắng mùa Xuân năm 1975.',
    spokenSegments: [
      'Trạm thứ sáu: Hiệp định Pa-ri năm một nghìn chín trăm bảy mươi ba và Đài Ra-đi-ô Ngày Toàn Thắng.',
      'Di chuyển lên Tầng hai, Gian bốn: Từ tuyến đường Trường Sơn huyền thoại đến thắng lợi ngoại giao tại Hội nghị Pa-ri, quân và dân ta đã tạo thế và lực vững chắc tiến tới Đại thắng mùa Xuân năm một nghìn chín trăm bảy mươi lăm.'
    ]
  },
  {
    step: 7,
    exhibitId: 'f2-gian5-integration',
    zoneType: 'indoor',
    floor: 2,
    title: 'Trạm 7/8: Công Cuộc Đổi Mới (1986) & Kỷ Nguyên Vươn Mình',
    period: 'Từ Đại hội VI (1986) đến nay',
    playerPos: { x: 18.0, y: 5.5, z: -26.5, rotY: Math.PI / 2 },
    lookAtPos: { x: 22.5, y: 7.3, z: -26.5 },
    camDist: 12.8,
    camHeight: 5.5,
    narration:
      'Tại Gian 5 cánh Đông Tầng 2: Đường lối Đổi mới toàn diện do Đại hội VI (12/1986) khởi xướng đã đưa Việt Nam vươn lên mạnh mẽ, hội nhập quốc tế sâu rộng và khẳng định vị thế trên trường quốc tế.',
    spokenSegments: [
      'Trạm thứ bảy: Công cuộc Đổi mới từ Đại hội Sáu năm một nghìn chín trăm tám mươi sáu và Kỷ nguyên vươn mình của dân tộc.',
      'Qua gần bốn mươi năm Đổi mới dưới sự lãnh đạo của Đảng, đất nước ta đã đạt được những thành tựu to lớn, có ý nghĩa lịch sử, khẳng định cơ đồ, tiềm lực, vị thế và uy tín quốc tế ngày càng cao.'
    ]
  },
  {
    step: 8,
    exhibitId: 'f2-gian6-memorial',
    zoneType: 'indoor',
    floor: 2,
    title: 'Trạm 8/8: Không Gian Tưởng Niệm Chủ Tịch Hồ Chí Minh & Các Tổng Bí Thư',
    period: 'Đời đời nhớ ơn công lao trời biển',
    playerPos: { x: 0, y: 5.5, z: -25.5, rotY: Math.PI },
    lookAtPos: { x: 0, y: 8.2, z: -34.0 },
    camDist: 15.2,
    camHeight: 6.5,
    narration:
      'Điểm kết thúc hành trình là Không gian Tưởng niệm trang nghiêm tại trung tâm Tầng 2 — nơi tôn vinh Chủ tịch Hồ Chí Minh vĩ đại và các đồng chí Tổng Bí thư của Đảng qua các thời kỳ. Chúc đồng chí có những trải nghiệm thật ý nghĩa!',
    spokenSegments: [
      'Trạm thứ tám, điểm kết thúc hành trình: Không gian Tưởng niệm Chủ tịch Hồ Chí Minh và các đồng chí Tổng Bí thư của Đảng.',
      'Tại đây, đồng chí có thể thắp nến, dâng hoa tưởng niệm để bày tỏ lòng biết ơn vô hạn đối với Chủ tịch Hồ Chí Minh vĩ đại và các bậc tiền bối cách mạng. Chúc đồng chí có một chuyến tham quan thật nhiều cảm xúc và ý nghĩa!'
    ]
  }
];

/**
 * TÍNH NĂNG 4: Danh sách 5 Ca Khúc Cách Mạng Hào Hùng trên Đài Radio / Jukebox
 * Đã kết nối trực tiếp với 5 file MP3 trong `./src/assets/`
 */
export const REVOLUTIONARY_SONGS_DATA = [
  {
    id: 'song-tienquanca',
    title: '1. Tiến Quân Ca (Quốc Ca Việt Nam — Văn Cao, 1944)',
    audioUrl: './src/assets/Tien-Quan-Ca-Various-Artists.mp3',
    tempo: 112,
    waveType: 'sawtooth',
    notes: [
      [392.0, 1.0], [523.25, 1.0], [523.25, 1.5], [659.25, 0.5], [587.33, 1.0], [523.25, 1.0],
      [783.99, 2.0], [659.25, 1.0], [783.99, 1.0], [1046.5, 1.5], [880.0, 0.5], [783.99, 2.0],
      [659.25, 1.0], [783.99, 1.0], [659.25, 1.0], [587.33, 1.0], [523.25, 2.5], [0, 0.5]
    ]
  },
  {
    id: 'song-muaxuan',
    title: '2. Đảng Đã Cho Ta Một Mùa Xuân (Phạm Tuyên, 1960)',
    audioUrl: './src/assets/Dang-Da-Cho-Ta-Mot-Mua-Xuan-Le-Anh-Dung-Quang-Hao-Ngoc-Ky.mp3',
    tempo: 124,
    waveType: 'triangle',
    notes: [
      [523.25, 1.0], [659.25, 1.0], [783.99, 1.5], [880.0, 0.5], [783.99, 1.0], [659.25, 1.0],
      [587.33, 1.5], [659.25, 0.5], [783.99, 2.0], [880.0, 1.0], [1046.5, 1.5], [880.0, 0.5],
      [783.99, 1.0], [659.25, 1.0], [523.25, 2.5], [0, 0.5]
    ]
  },
  {
    id: 'song-cangoihcm',
    title: '3. Ca Ngợi Hồ Chủ Tịch (Văn Cao, 1949)',
    audioUrl: './src/assets/Ca-Ngoi-Ho-Chi-Minh-Quang-Ha.mp3',
    tempo: 98,
    waveType: 'sine',
    notes: [
      [392.0, 1.5], [523.25, 0.5], [659.25, 1.5], [587.33, 0.5], [523.25, 1.0], [587.33, 1.0],
      [783.99, 2.0], [880.0, 1.0], [783.99, 1.0], [659.25, 1.5], [523.25, 0.5], [587.33, 2.0],
      [659.25, 1.0], [587.33, 1.0], [523.25, 2.5], [0, 0.5]
    ]
  },
  {
    id: 'song-hokeophao',
    title: '4. Hò Kéo Pháo — Chiến Dịch Điện Biên (Hoàng Vân, 1954)',
    audioUrl: './src/assets/Ho-Keo-Phao-Hoang-Van.mp3',
    tempo: 118,
    waveType: 'sawtooth',
    notes: [
      [440.0, 1.0], [587.33, 1.0], [440.0, 1.0], [587.33, 1.0], [659.25, 1.5], [783.99, 0.5],
      [880.0, 2.0], [783.99, 1.0], [659.25, 1.0], [587.33, 1.5], [523.25, 0.5], [440.0, 2.5], [0, 0.5]
    ]
  },
  {
    id: 'song-nhucobachotrongngayvui',
    title: '5. Như Có Bác Trong Ngày Vui Đại Thắng (Phạm Tuyên, 1975)',
    audioUrl: './src/assets/Nhu-Co-Bac-Ho-Trong-Ngay-Vui-Dai-Thang-Various-Artists.mp3',
    tempo: 136,
    waveType: 'triangle',
    notes: [
      [523.25, 1.0], [659.25, 1.0], [783.99, 1.5], [1046.5, 1.5], [880.0, 1.0], [1046.5, 1.0],
      [783.99, 2.0], [880.0, 1.0], [783.99, 1.0], [659.25, 1.0], [587.33, 1.0], [523.25, 2.5], [0, 0.5]
    ]
  }
];

/**
 * Dữ liệu Thanh Dòng Thời Gian Lịch Sử (Interactive Timeline HUD) & Chỉ Đường GPS 3D dưới sàn
 */
export const TIMELINE_MILESTONES_DATA = [
  {
    id: 'tl-outdoor',
    shortLabel: '🏛️ Quảng Trường',
    yearLabel: 'Sân Lễ Đài',
    title: 'Quảng Trường Độc Lập & Kỳ Đài Cột Cờ Hà Nội',
    zoneType: 'outdoor',
    floor: 1,
    targetExhibitId: 'outdoor-flagpole',
    teleportPos: { x: 0, y: 0, z: 31.5, rotY: Math.PI },
    targetPos: { x: 0, y: 0, z: 24.0 }
  },
  {
    id: 'tl-1930',
    shortLabel: '🚩 1920 – 1930',
    yearLabel: 'Gian 1 (Tầng 1)',
    title: 'Chuẩn Bị & Thành Lập Đảng Cộng Sản Việt Nam (3/2/1930)',
    zoneType: 'indoor',
    floor: 1,
    targetExhibitId: 'f1-gian1-founding',
    teleportPos: { x: -18.5, y: 0, z: -18.0, rotY: -Math.PI / 2 },
    targetPos: { x: -23.0, y: 0, z: -26.5 }
  },
  {
    id: 'tl-1945',
    shortLabel: '⭐ 1930 – 1945',
    yearLabel: 'Gian 2 (Tầng 1)',
    title: 'Cách Mạng Tháng Tám & Tuyên Ngôn Độc Lập (2/9/1945)',
    zoneType: 'indoor',
    floor: 1,
    targetExhibitId: 'f1-gian2-badinh',
    teleportPos: { x: 0, y: 0, z: -12.0, rotY: Math.PI },
    targetPos: { x: 7.8, y: 0, z: -15.5 }
  },
  {
    id: 'tl-1954',
    shortLabel: '⛰️ 1945 – 1954',
    yearLabel: 'Gian 3 (Tầng 1)',
    title: 'Toàn Quốc Kháng Chiến & Chiến Thắng Điện Biên Phủ (7/5/1954)',
    zoneType: 'indoor',
    floor: 1,
    targetExhibitId: 'f1-gian3-dienbien',
    teleportPos: { x: 18.5, y: 0, z: -18.0, rotY: Math.PI / 2 },
    targetPos: { x: 23.0, y: 0, z: -26.5 }
  },
  {
    id: 'tl-1975',
    shortLabel: '🚛 1954 – 1975',
    yearLabel: 'Gian 4 (Tầng 2)',
    title: 'Đường Trường Sơn & Đại Thắng Mùa Xuân (30/4/1975)',
    zoneType: 'indoor',
    floor: 2,
    targetExhibitId: 'f2-gian4-paris1975',
    teleportPos: { x: -18.0, y: 5.5, z: -22.0, rotY: -Math.PI / 2 },
    targetPos: { x: -22.5, y: 5.5, z: -26.5 }
  },
  {
    id: 'tl-1986',
    shortLabel: '🌏 1986 – Nay',
    yearLabel: 'Gian 5 (Tầng 2)',
    title: 'Công Cuộc Đổi Mới Toàn Diện & Kỷ Nguyên Vươn Mình',
    zoneType: 'indoor',
    floor: 2,
    targetExhibitId: 'f2-gian5-integration',
    teleportPos: { x: 18.0, y: 5.5, z: -22.0, rotY: Math.PI / 2 },
    targetPos: { x: 22.5, y: 5.5, z: -26.5 }
  },
  {
    id: 'tl-memorial',
    shortLabel: '🕯️ Tưởng Niệm',
    yearLabel: 'Gian 6 (Tầng 2)',
    title: 'Không Gian Tưởng Niệm Chủ Tịch Hồ Chí Minh & Các Tổng Bí Thư',
    zoneType: 'indoor',
    floor: 2,
    targetExhibitId: 'f2-gian6-memorial',
    teleportPos: { x: 0, y: 5.5, z: -24.5, rotY: Math.PI },
    targetPos: { x: 0, y: 5.5, z: -34.0 }
  }
];

/**
 * TOUR THAM QUAN (không thuyết minh audio): đi qua đủ toàn bộ hiện vật theo thứ tự
 * Ngoài sân → Tầng 1 → Tầng 2. Nội dung chi tiết dùng lại từ LEGACY_TOUR_DETAIL nếu có,
 * các hiện vật còn lại được tự sinh từ EXHIBITS_DATA (tên, giai đoạn, tóm tắt).
 */
export const GUIDED_TOUR_STATIONS = (() => {
  const total = EXHIBITS_DATA.length;
  const AISLE_Z = -18;
  return EXHIBITS_DATA.map((ex, i) => {
    const legacy = LEGACY_TOUR_DETAIL.find((s) => s.exhibitId === ex.id);
    const { x, z } = ex.position;
    const isOutdoor = ex.zoneType === 'outdoor';
    const floorY = ex.floor === 2 ? 5.5 : 0;

    let px = x;
    let pz = z;
    if (isOutdoor) {
      if (Math.abs(x) < 0.5) pz = z + 6.5;
      else px = x + (x < 0 ? 5.2 : -5.2);
    } else {
      const fz = AISLE_Z - z >= 0 ? 1 : -1;
      pz = z + fz * 4.4;
    }

    const lookY = isOutdoor ? (Math.abs(x) < 0.5 ? 6.2 : 1.6) : floorY + 1.4;
    const station = {
      step: i + 1,
      exhibitId: ex.id,
      zoneType: ex.zoneType,
      floor: ex.floor,
      title: `Trạm ${i + 1}/${total}: ${ex.title}`,
      period: ex.period,
      playerPos: { x: px, y: floorY, z: pz, rotY: Math.atan2(x - px, z - pz) },
      lookAtPos: { x, y: lookY, z },
      camDist: isOutdoor ? 13.5 : 8.6,
      camHeight: isOutdoor ? 5.6 : 3.4,
      narration: ex.summary
    };

    if (legacy) {
      station.playerPos = legacy.playerPos;
      station.lookAtPos = legacy.lookAtPos;
      station.camDist = legacy.camDist;
      station.camHeight = legacy.camHeight;
      station.period = legacy.period || station.period;
      station.narration = legacy.narration || station.narration;
    }
    return station;
  });
})();

/**
 * HỆ THỐNG PHƯƠNG TIỆN MỞ KHÓA THEO TIẾN ĐỘ KHÁM PHÁ (tổng 20 hiện vật)
 */
export const VEHICLE_TYPES = {
  bike: {
    id: 'bike',
    label: 'Xe đạp thồ Điện Biên',
    emoji: '🚲',
    unlockCount: 7,
    speedMul: 1.3,
    seatY: 0.62,
    honk: 'bell'
  },
  jeep: {
    id: 'jeep',
    label: 'Xe Jeep UAZ mini',
    emoji: '🚙',
    unlockCount: 14,
    speedMul: 1.6,
    seatY: 0.78,
    honk: 'horn'
  },
  plane: {
    id: 'plane',
    label: 'Máy bay mini 2 chỗ',
    emoji: '🛩️',
    unlockCount: 20,
    speedMul: 2.0,
    seatY: 0.9,
    hoverY: 1.75,
    honk: 'horn'
  }
};
