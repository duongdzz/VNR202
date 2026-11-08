/**
 * RoomManager: Quản lý các phòng triển lãm (tối đa 30 người/phòng).
 * - Đồng bộ vị trí 3D { id, x, y, z, rotY, sitting } ở tần số 15Hz (Dirty State).
 * - Đồng bộ các sự kiện xã hội tức thời:
 *   + Emote (1: Chào, 2: Vỗ tay, 3: Thả tim / Cờ đỏ sao vàng)
 *   + Thắp nến / Dâng hoa tại Gian Tưởng niệm (Gian 6)
 *   + Ghi Sổ lưu niệm ảo (Guestbook 3D)
 */
export class RoomManager {
  constructor(io, { maxPlayersPerRoom = 30, tickRateHz = 15 } = {}) {
    this.io = io;
    this.maxPlayersPerRoom = maxPlayersPerRoom;
    this.tickRateHz = tickRateHz;

    // Map<roomId, { players: Map, dirtyIds: Set, candles: Array, guestbook: Array }>
    this.rooms = new Map();

    const intervalMs = Math.round(1000 / this.tickRateHz);
    this.tickTimer = setInterval(() => this.broadcastDirtyStates(), intervalMs);
  }

  findOrCreateAvailableRoom() {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.size < this.maxPlayersPerRoom) {
        return roomId;
      }
    }
    const newRoomId = `museum-room-${this.rooms.size + 1}`;
    this.rooms.set(newRoomId, {
      players: new Map(),
      dirtyIds: new Set(),
      // Danh sách nến/hoa đã thắp tại Gian 6
      candles: [
        { id: 'init-1', author: 'Ban Tổ Chức', slot: 0 }
      ],
      // Danh sách lời nhắn trên Bảng tin Sổ lưu niệm 3D
      guestbook: [
        { author: 'Minh Anh', text: 'Tự hào truyền thống vẻ vang của Đảng!' },
        { author: 'Quốc Huy', text: 'Đời đời nhớ ơn Chủ tịch Hồ Chí Minh vĩ đại.' },
        { author: 'Thanh Tùng', text: 'Không gian triển lãm 3D rất trang trọng & ý nghĩa!' }
      ],
      // Bảng Vinh Danh "Chiến Sĩ Lịch Sử Xuất Sắc" (Quiz Leaderboard Top 10)
      quizLeaderboard: [
        { name: 'Đồng chí Minh Dương', score: 500, timeSec: 38, rank: 'Chiến Sĩ Lịch Sử Xuất Sắc' },
        { name: 'Đồng chí Hồng Nhung', score: 500, timeSec: 46, rank: 'Chiến Sĩ Lịch Sử Xuất Sắc' },
        { name: 'Đồng chí Quốc Bảo', score: 400, timeSec: 52, rank: 'Chiến Sĩ Lịch Sử Ưu Tú' }
      ]
    });
    return newRoomId;
  }

  addPlayer(socket, profile = {}) {
    const roomId = this.findOrCreateAvailableRoom();
    const room = this.rooms.get(roomId);

    // Spawn ngoài sân trước Cột cờ Hà Nội (X ~ 0, Z ~ 36.5), nhìn thẳng về Tòa nhà Triển lãm
    const spawnX = (Math.random() * 3.0 - 1.5);
    const spawnZ = 36.2 + (Math.random() * 1.6 - 0.8);

    const playerState = {
      id: socket.id,
      name: (profile.name || `Khách #${socket.id.slice(0, 4)}`).slice(0, 16),
      hatType: profile.hatType || (Math.random() > 0.5 ? 'pith' : 'conical'),
      colorIndex: typeof profile.colorIndex === 'number'
        ? profile.colorIndex
        : Math.floor(Math.random() * 6),
      x: Number(spawnX.toFixed(3)),
      y: 0,
      z: Number(spawnZ.toFixed(3)),
      rotY: Number(Math.PI.toFixed(3)),
      sitting: false,
      vehicleType: null
    };

    room.players.set(socket.id, playerState);
    socket.join(roomId);
    socket.data.roomId = roomId;

    return {
      roomId,
      self: playerState,
      players: Array.from(room.players.values()),
      candles: room.candles,
      guestbook: room.guestbook,
      quizLeaderboard: room.quizLeaderboard
    };
  }

  handlePlayerMove(socket, payload) {
    const roomId = socket.data.roomId;
    if (!roomId || !this.rooms.has(roomId)) return;

    const room = this.rooms.get(roomId);
    const player = room.players.get(socket.id);
    if (!player) return;

    const nextX = Number(payload?.x);
    const nextY = Number(payload?.y ?? 0);
    const nextZ = Number(payload?.z);
    const nextRotY = Number(payload?.rotY);
    const nextSitting = Boolean(payload?.sitting);

    if (!Number.isFinite(nextX) || !Number.isFinite(nextZ) || !Number.isFinite(nextRotY)) {
      return;
    }

    player.x = Math.max(-41.5, Math.min(41.5, Number(nextX.toFixed(3))));
    player.y = Math.max(0, Math.min(10.0, Number((Number.isFinite(nextY) ? nextY : 0).toFixed(3))));
    player.z = Math.max(-37.5, Math.min(44.5, Number(nextZ.toFixed(3))));
    player.rotY = Number(nextRotY.toFixed(3));
    player.sitting = nextSitting;
    player.vehicleType = payload?.vehicleType || null;

    room.dirtyIds.add(socket.id);
  }

  /**
   * Đồng bộ Bấm còi / Rung chuông phương tiện cho cả phòng
   */
  handlePlayerHonk(socket, payload) {
    const roomId = socket.data.roomId;
    if (!roomId || !this.rooms.has(roomId)) return;
    const vehicleType = String(payload?.vehicleType || 'bike').slice(0, 16);

    this.io.to(roomId).emit('player:honked', {
      id: socket.id,
      vehicleType
    });
  }

  /**
   * Đồng bộ Emote (1: Salute, 2: Clap/Nod, 3: Heart/Flag) cho cả phòng
   */
  handlePlayerEmote(socket, payload) {
    const roomId = socket.data.roomId;
    if (!roomId || !this.rooms.has(roomId)) return;
    const emoteType = String(payload?.emoteType || 'salute').slice(0, 16);

    this.io.to(roomId).emit('player:emote', {
      id: socket.id,
      emoteType
    });
  }

  /**
   * Đồng bộ Thắp nến / Dâng hoa tại Gian Tưởng niệm (Gian 6)
   */
  handleMemorialOffer(socket) {
    const roomId = socket.data.roomId;
    if (!roomId || !this.rooms.has(roomId)) return;

    const room = this.rooms.get(roomId);
    const player = room.players.get(socket.id);
    const authorName = player ? player.name : 'Khách tham quan';

    const newCandle = {
      id: `candle-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      author: authorName,
      slot: room.candles.length % 18
    };

    room.candles.push(newCandle);
    if (room.candles.length > 24) {
      room.candles.shift();
    }

    this.io.to(roomId).emit('memorial:updated', {
      candles: room.candles,
      latestAuthor: authorName
    });
  }

  /**
   * Đồng bộ lời nhắn Sổ lưu niệm ảo (Guestbook 3D) tối đa 50 ký tự
   */
  handleGuestbookAdd(socket, payload) {
    const roomId = socket.data.roomId;
    if (!roomId || !this.rooms.has(roomId)) return;

    const room = this.rooms.get(roomId);
    const player = room.players.get(socket.id);
    const rawText = String(payload?.text || '').trim().slice(0, 50);
    if (!rawText) return;

    const entry = {
      author: player ? player.name : 'Khách',
      text: rawText
    };

    room.guestbook.unshift(entry);
    if (room.guestbook.length > 9) {
      room.guestbook.pop();
    }

    this.io.to(roomId).emit('guestbook:updated', room.guestbook);
  }

  /**
   * Đồng bộ điểm số Đố Vui Lịch Sử lên Bảng Vàng Top 10 "Chiến Sĩ Lịch Sử Xuất Sắc"
   */
  handleQuizSubmit(socket, payload) {
    const roomId = socket.data.roomId;
    if (!roomId || !this.rooms.has(roomId)) return;

    const room = this.rooms.get(roomId);
    const player = room.players.get(socket.id);
    const name = String(payload?.name || player?.name || 'Khách tham quan').trim().slice(0, 16);
    const score = Math.max(0, Math.min(500, Number(payload?.score) || 0));
    const timeSec = Math.max(1, Math.min(999, Math.round(Number(payload?.timeSec) || 45)));
    const rank = String(
      payload?.rank ||
      (score >= 500
        ? 'Chiến Sĩ Lịch Sử Xuất Sắc'
        : score >= 400
        ? 'Chiến Sĩ Lịch Sử Ưu Tú'
        : 'Chiến Sĩ Yêu Sử')
    ).slice(0, 32);

    const existingIdx = room.quizLeaderboard.findIndex((item) => item.name === name);
    if (existingIdx >= 0) {
      const prev = room.quizLeaderboard[existingIdx];
      // Cập nhật nếu điểm cao hơn hoặc bằng điểm nhưng thời gian nhanh hơn
      if (score > prev.score || (score === prev.score && timeSec < (prev.timeSec || 999))) {
        room.quizLeaderboard[existingIdx] = { name, score, timeSec, rank };
      }
    } else {
      room.quizLeaderboard.push({ name, score, timeSec, rank });
    }

    // Ưu tiên điểm cao nhất, nếu bằng điểm thì thời gian hoàn thành ít hơn đứng trước
    room.quizLeaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.timeSec || 999) - (b.timeSec || 999);
    });
    room.quizLeaderboard = room.quizLeaderboard.slice(0, 10);

    this.io.to(roomId).emit('quiz:updated', room.quizLeaderboard);
  }

  /**
   * Đồng bộ Tin nhắn Chat trực tuyến & Bong bóng chat 3D trên đầu nhân vật
   */
  handleChatMessage(socket, payload) {
    const roomId = socket.data.roomId;
    if (!roomId || !this.rooms.has(roomId)) return;

    const room = this.rooms.get(roomId);
    const player = room.players.get(socket.id);
    const message = String(payload?.message || '').trim().slice(0, 120);
    if (!message) return;

    const senderName = String(payload?.name || player?.name || 'Khách tham quan')
      .trim()
      .slice(0, 16);

    this.io.to(roomId).emit('chatMessage', {
      id: socket.id,
      name: senderName,
      message,
      timestamp: Date.now()
    });
  }

  removePlayer(socket) {
    const roomId = socket.data.roomId;
    if (!roomId || !this.rooms.has(roomId)) return null;

    const room = this.rooms.get(roomId);
    room.players.delete(socket.id);
    room.dirtyIds.delete(socket.id);

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    }

    return { roomId, playerId: socket.id };
  }

  broadcastDirtyStates() {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.dirtyIds.size === 0) continue;

      const updates = [];
      for (const dirtyId of room.dirtyIds) {
        const p = room.players.get(dirtyId);
        if (p) {
          updates.push({
            id: p.id,
            x: p.x,
            y: p.y,
            z: p.z,
            rotY: p.rotY,
            sitting: p.sitting,
            vehicleType: p.vehicleType || null
          });
        }
      }

      room.dirtyIds.clear();

      if (updates.length > 0) {
        this.io.to(roomId).emit('world:delta', updates);
      }
    }
  }
}
