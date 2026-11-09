import * as THREE from 'three';
import { NETWORK_CONFIG, PLAYER_CONFIG } from '../constants.js?v=19';
import { CharacterMesh } from '../world/CharacterMesh.js?v=19';
import { PlayerController } from '../controllers/PlayerController.js?v=19';

/**
 * SocketHandler: Quản lý đồng bộ hóa mạng thời gian thực cho phòng 30 người:
 * - Đồng bộ tọa độ 3D `{ id, x, y, z, rotY, sitting }` ở 15Hz (Dirty State).
 * - Đồng bộ Emote [1][2][3], Thắp nến Gian 6, Bảng tin Sổ lưu niệm 3D (Guestbook) và Chat trực tuyến (`chatMessage`).
 */
export class SocketHandler {
  constructor({
    scene,
    onRoomStatusChange,
    onCandlesUpdated,
    onGuestbookUpdated,
    onQuizLeaderboardUpdated,
    onChatMessageReceived,
    onRemoteHonked
  }) {
    this.scene = scene;
    this.onRoomStatusChange = onRoomStatusChange;
    this.onCandlesUpdated = onCandlesUpdated;
    this.onGuestbookUpdated = onGuestbookUpdated;
    this.onQuizLeaderboardUpdated = onQuizLeaderboardUpdated;
    this.onChatMessageReceived = onChatMessageReceived;
    this.onRemoteHonked = onRemoteHonked;

    this.socket = null;
    this.broadcastChannel = null;
    this.selfId = null;
    this.selfProfile = null;
    this.roomId = 'museum-room-1';
    this.photoMode = false;

    // Map<playerId, { mesh: CharacterMesh, targetX, targetY, targetZ, targetRotY, sitting, vehicleType }>
    this.remotePlayers = new Map();

    this.lastSentState = { x: null, y: null, z: null, rotY: null, sitting: false, vehicleType: null };
    this.timeSinceLastSend = 0;
  }

  connect(profile) {
    return new Promise((resolve) => {
      let resolved = false;

      const fallbackToLocalChannel = () => {
        if (resolved) return;
        resolved = true;
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }
        const selfState = this.setupBroadcastChannelMode(profile);
        resolve(selfState);
      };

      if (typeof window.io === 'function') {
  try {
    // Nếu ở localhost thì để trống, nếu ở Vercel thì trỏ về server backend online
    const BACKEND_URL = window.location.hostname === 'localhost' 
      ? undefined 
      : 'https://vnr202-server.onrender.com';

    this.socket = window.io(BACKEND_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 5000
    });

          const timer = setTimeout(fallbackToLocalChannel, 1100);

          this.socket.on('connect', () => {
            this.socket.emit('player:join', profile);
          });

          this.socket.on('connect_error', () => {
            clearTimeout(timer);
            fallbackToLocalChannel();
          });

          this.socket.on('room:joined', (payload) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);

            this.roomId = payload.roomId;
            this.selfId = payload.selfId;

            let selfData = null;
            payload.players.forEach((p) => {
              if (p.id === this.selfId) {
                selfData = p;
              } else {
                this.addOrUpdateRemotePlayer(p);
              }
            });

            if (payload.candles) this.onCandlesUpdated?.(payload.candles);
            if (payload.guestbook) this.onGuestbookUpdated?.(payload.guestbook);
            if (payload.quizLeaderboard) this.onQuizLeaderboardUpdated?.(payload.quizLeaderboard);

            this.notifyStatus();
            resolve(selfData);
          });

          this.socket.on('player:joined', (playerState) => {
            if (playerState.id !== this.selfId) {
              this.addOrUpdateRemotePlayer(playerState);
              this.notifyStatus();
            }
          });

          this.socket.on('world:delta', (updates) => {
            for (const u of updates) {
              if (u.id === this.selfId) continue;
              const remote = this.remotePlayers.get(u.id);
              if (remote) {
                remote.targetX = u.x;
                remote.targetY = u.y ?? 0;
                remote.targetZ = u.z;
                remote.targetRotY = u.rotY;
                remote.sitting = Boolean(u.sitting);
                if (remote.vehicleType !== u.vehicleType) {
                  remote.vehicleType = u.vehicleType || null;
                  remote.mesh.setVehicle(remote.vehicleType);
                }
              }
            }
          });

          this.socket.on('player:honked', ({ id, vehicleType }) => {
            if (id === this.selfId) return;
            const remote = this.remotePlayers.get(id);
            if (remote) {
              const soundText = vehicleType === 'bike' ? '🔔 Kính coong!' : '📢 Bíp bíp!';
              remote.mesh.showSpeechBubble(soundText, 2.5);
              this.onRemoteHonked?.({ id, vehicleType });
            }
          });

          this.socket.on('player:emote', ({ id, emoteType }) => {
            if (id === this.selfId) return;
            const remote = this.remotePlayers.get(id);
            if (remote) {
              remote.mesh.triggerEmote(emoteType);
            }
          });

          this.socket.on('memorial:updated', ({ candles }) => {
            this.onCandlesUpdated?.(candles);
          });

          this.socket.on('guestbook:updated', (entries) => {
            this.onGuestbookUpdated?.(entries);
          });

          this.socket.on('quiz:updated', (leaderboard) => {
            this.onQuizLeaderboardUpdated?.(leaderboard);
          });

          this.socket.on('chatMessage', (payload) => {
            if (!payload || !payload.message) return;
            if (payload.id !== this.selfId) {
              const remote = this.remotePlayers.get(payload.id);
              if (remote) {
                remote.mesh.showSpeechBubble(payload.message, 4.5);
              }
            }
            this.onChatMessageReceived?.(payload);
          });

          this.socket.on('player:left', ({ id }) => {
            this.removeRemotePlayer(id);
            this.notifyStatus();
          });
        } catch {
          fallbackToLocalChannel();
        }
      } else {
        fallbackToLocalChannel();
      }
    });
  }

  setupBroadcastChannelMode(profile) {
    this.selfId = `local-${Math.random().toString(36).slice(2, 8)}`;
    this.roomId = 'museum-room-1 (Multi-Tab)';

    const spawnX = Number((PLAYER_CONFIG.SPAWN_POS.x + (Math.random() * 2.4 - 1.2)).toFixed(3));
    const spawnZ = Number((PLAYER_CONFIG.SPAWN_POS.z + (Math.random() * 1.4 - 0.7)).toFixed(3));

    this.selfProfile = {
      id: this.selfId,
      name: (profile.name || 'Khách tham quan').slice(0, 16),
      hatType: profile.hatType || 'pith',
      colorIndex: Math.floor(Math.random() * 6),
      x: spawnX,
      y: 0,
      z: spawnZ,
      rotY: PLAYER_CONFIG.SPAWN_POS.rotY,
      sitting: false
    };

    this.localCandles = [{ id: 'init-1', author: 'Ban Tổ Chức', slot: 0 }];
    this.localGuestbook = [
      { author: 'Minh Anh', text: 'Tự hào truyền thống vẻ vang của Đảng!' },
      { author: 'Quốc Huy', text: 'Đời đời nhớ ơn Chủ tịch Hồ Chí Minh vĩ đại.' },
      { author: 'Thanh Tùng', text: 'Triển lãm 3D rất trang trọng & ý nghĩa!' }
    ];

    this.onCandlesUpdated?.(this.localCandles);
    this.onGuestbookUpdated?.(this.localGuestbook);

    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('virtual-museum-room-1');

      this.broadcastChannel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || msg.id === this.selfId) return;

        if (msg.type === 'join') {
          this.addOrUpdateRemotePlayer(msg.player);
          this.notifyStatus();
          this.broadcastChannel.postMessage({
            type: 'welcome',
            id: this.selfId,
            player: {
              ...this.selfProfile,
              x: this.lastSentState.x ?? this.selfProfile.x,
              y: this.lastSentState.y ?? 0,
              z: this.lastSentState.z ?? this.selfProfile.z,
              rotY: this.lastSentState.rotY ?? this.selfProfile.rotY,
              sitting: this.lastSentState.sitting ?? false
            }
          });
        } else if (msg.type === 'welcome') {
          this.addOrUpdateRemotePlayer(msg.player);
          this.notifyStatus();
        } else if (msg.type === 'move') {
          const remote = this.remotePlayers.get(msg.id);
          if (remote) {
            remote.targetX = msg.x;
            remote.targetY = msg.y ?? 0;
            remote.targetZ = msg.z;
            remote.targetRotY = msg.rotY;
            remote.sitting = Boolean(msg.sitting);
            if (remote.vehicleType !== msg.vehicleType) {
              remote.vehicleType = msg.vehicleType || null;
              remote.mesh.setVehicle(remote.vehicleType);
            }
          }
        } else if (msg.type === 'honk') {
          const remote = this.remotePlayers.get(msg.id);
          if (remote) {
            const soundText = msg.vehicleType === 'bike' ? '🔔 Kính coong!' : '📢 Bíp bíp!';
            remote.mesh.showSpeechBubble(soundText, 2.5);
            this.onRemoteHonked?.({ id: msg.id, vehicleType: msg.vehicleType });
          }
        } else if (msg.type === 'emote') {
          const remote = this.remotePlayers.get(msg.id);
          if (remote) remote.mesh.triggerEmote(msg.emoteType);
        } else if (msg.type === 'memorial') {
          this.localCandles.push(msg.candle);
          this.onCandlesUpdated?.(this.localCandles);
        } else if (msg.type === 'guestbook') {
          this.localGuestbook.unshift(msg.entry);
          this.onGuestbookUpdated?.(this.localGuestbook);
        } else if (msg.type === 'chatMessage') {
          const remote = this.remotePlayers.get(msg.id);
          if (remote) {
            remote.mesh.showSpeechBubble(msg.message, 4.5);
          }
          this.onChatMessageReceived?.({
            id: msg.id,
            name: msg.name,
            message: msg.message,
            timestamp: Date.now()
          });
        } else if (msg.type === 'leave') {
          this.removeRemotePlayer(msg.id);
          this.notifyStatus();
        }
      };

      this.broadcastChannel.postMessage({
        type: 'join',
        id: this.selfId,
        player: this.selfProfile
      });

      window.addEventListener('beforeunload', () => {
        this.broadcastChannel.postMessage({
          type: 'leave',
          id: this.selfId
        });
      });
    }

    this.notifyStatus();
    return this.selfProfile;
  }

  addOrUpdateRemotePlayer(state) {
    if (this.remotePlayers.has(state.id)) {
      const existing = this.remotePlayers.get(state.id);
      existing.targetX = state.x;
      existing.targetY = state.y ?? 0;
      existing.targetZ = state.z;
      existing.targetRotY = state.rotY;
      existing.sitting = Boolean(state.sitting);
      if (existing.vehicleType !== state.vehicleType) {
        existing.vehicleType = state.vehicleType || null;
        existing.mesh.setVehicle(existing.vehicleType);
      }
      return;
    }

    const avatar = new CharacterMesh({
      id: state.id,
      name: state.name,
      colorIndex: state.colorIndex,
      hatType: state.hatType,
      isLocal: false
    });

    avatar.root.position.set(state.x, state.y ?? 0, state.z);
    avatar.root.rotation.y = state.rotY || 0;
    avatar.setNameplateVisible(!this.photoMode);
    if (state.vehicleType) {
      avatar.setVehicle(state.vehicleType);
    }
    this.scene.add(avatar.root);

    this.remotePlayers.set(state.id, {
      mesh: avatar,
      targetX: state.x,
      targetY: state.y ?? 0,
      targetZ: state.z,
      targetRotY: state.rotY || 0,
      sitting: Boolean(state.sitting),
      vehicleType: state.vehicleType || null
    });
  }

  removeRemotePlayer(id) {
    const remote = this.remotePlayers.get(id);
    if (!remote) return;

    this.scene.remove(remote.mesh.root);
    remote.mesh.dispose();
    this.remotePlayers.delete(id);
  }

  /**
   * Gửi trạng thái di chuyển/ngồi/phương tiện lên Server (15Hz + Dirty Check)
   */
  syncLocalPlayer(localMesh, dt, isSitting = false) {
    if (!this.selfId || !localMesh) return;

    this.timeSinceLastSend += dt * 1000;
    if (this.timeSinceLastSend < NETWORK_CONFIG.SEND_INTERVAL_MS) return;

    const x = Number(localMesh.root.position.x.toFixed(3));
    const y = Number(localMesh.root.position.y.toFixed(3));
    const z = Number(localMesh.root.position.z.toFixed(3));
    const rotY = Number(localMesh.root.rotation.y.toFixed(3));
    const vehicleType = localMesh.vehicleType || null;

    const dx = Math.abs(x - (this.lastSentState.x ?? 999));
    const dy = Math.abs(y - (this.lastSentState.y ?? 999));
    const dz = Math.abs(z - (this.lastSentState.z ?? 999));
    const dRot = Math.abs(rotY - (this.lastSentState.rotY ?? 999));
    const sitChanged = isSitting !== this.lastSentState.sitting;
    const vehicleChanged = vehicleType !== this.lastSentState.vehicleType;

    if (
      dx > NETWORK_CONFIG.POSITION_EPSILON ||
      dy > NETWORK_CONFIG.POSITION_EPSILON ||
      dz > NETWORK_CONFIG.POSITION_EPSILON ||
      dRot > NETWORK_CONFIG.ROTATION_EPSILON ||
      sitChanged ||
      vehicleChanged
    ) {
      const packet = { id: this.selfId, x, y, z, rotY, sitting: isSitting, vehicleType };

      if (this.socket && this.socket.connected) {
        this.socket.emit('player:move', packet);
      } else if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'move', ...packet });
      }

      this.lastSentState = { x, y, z, rotY, sitting: isSitting, vehicleType };
      this.timeSinceLastSend = 0;
    }
  }

  sendVehicleHonk(vehicleType) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player:honk', { vehicleType });
    } else if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'honk', id: this.selfId, vehicleType });
    }
  }

  sendEmote(emoteType) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player:emote', { emoteType });
    } else if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'emote', id: this.selfId, emoteType });
    }
  }

  sendMemorialOffer() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('memorial:offer');
    } else if (this.broadcastChannel) {
      const candle = { id: `c-${Date.now()}`, author: this.selfProfile?.name || 'Khách' };
      this.localCandles.push(candle);
      this.onCandlesUpdated?.(this.localCandles);
      this.broadcastChannel.postMessage({ type: 'memorial', id: this.selfId, candle });
    }
  }

  sendGuestbookEntry(text) {
    const clean = String(text || '').trim().slice(0, 50);
    if (!clean) return;

    if (this.socket && this.socket.connected) {
      this.socket.emit('guestbook:add', { text: clean });
    } else if (this.broadcastChannel) {
      const entry = { author: this.selfProfile?.name || 'Khách', text: clean };
      this.localGuestbook.unshift(entry);
      this.onGuestbookUpdated?.(this.localGuestbook);
      this.broadcastChannel.postMessage({ type: 'guestbook', id: this.selfId, entry });
    }
  }

  sendQuizScore(name, score, timeSec, rank) {
    const payload = {
      name: String(name || this.selfProfile?.name || 'Khách tham quan').slice(0, 16),
      score: Number(score) || 0,
      timeSec: Math.max(1, Math.round(Number(timeSec) || 45)),
      rank: String(rank || 'Chiến Sĩ Lịch Sử Xuất Sắc')
    };
    if (this.socket && this.socket.connected) {
      this.socket.emit('quiz:submit', payload);
    } else if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'quizSubmit', id: this.selfId, ...payload });
    }
  }

  /**
   * Gửi tin nhắn Chat trực tuyến lên Server & đồng bộ bong bóng chat cho cả phòng
   */
  sendChatMessage(name, message) {
    const cleanMsg = String(message || '').trim().slice(0, 120);
    if (!cleanMsg) return;
    const cleanName = String(name || this.selfProfile?.name || 'Khách tham quan')
      .trim()
      .slice(0, 16);

    const payload = {
      id: this.selfId,
      name: cleanName,
      message: cleanMsg
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('chatMessage', payload);
    } else {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'chatMessage', ...payload });
      }
      this.onChatMessageReceived?.({ ...payload, timestamp: Date.now() });
    }
  }

  setPhotoMode(isPhotoMode) {
    this.photoMode = isPhotoMode;
    for (const remote of this.remotePlayers.values()) {
      remote.mesh.setNameplateVisible(!isPhotoMode);
    }
  }

  interpolateRemotePlayers(dt, currentZone = 'outdoor', currentFloor = 1) {
    const lerpAlpha = Math.min(1.0, dt * NETWORK_CONFIG.REMOTE_LERP_FACTOR);

    for (const remote of this.remotePlayers.values()) {
      const pos = remote.mesh.root.position;
      const distToTarget = Math.hypot(
        remote.targetX - pos.x,
        remote.targetZ - pos.z,
        (remote.targetY ?? 0) - pos.y
      );

      if (distToTarget > 8.0) {
        pos.set(remote.targetX, remote.targetY ?? 0, remote.targetZ);
      } else {
        pos.x = THREE.MathUtils.lerp(pos.x, remote.targetX, lerpAlpha);
        pos.y = THREE.MathUtils.lerp(pos.y, remote.targetY ?? 0, lerpAlpha);
        pos.z = THREE.MathUtils.lerp(pos.z, remote.targetZ, lerpAlpha);
      }

      remote.mesh.root.rotation.y = PlayerController.lerpAngleShortest(
        remote.mesh.root.rotation.y,
        remote.targetRotY,
        lerpAlpha
      );

      const remoteZone = remote.targetZ >= 0 ? 'outdoor' : 'indoor';
      const remoteFloor = (remote.targetY ?? 0) > 2.5 ? 2 : 1;
      remote.mesh.root.visible =
        remoteZone === currentZone &&
        (currentZone === 'outdoor' || remoteFloor === currentFloor);

      const isRemoteMoving = distToTarget > 0.03 && distToTarget <= 8.0 && !remote.sitting;
      remote.mesh.updateProceduralAnimation(dt, isRemoteMoving, remote.sitting);
    }
  }

  notifyStatus() {
    this.onRoomStatusChange?.({
      roomId: this.roomId,
      onlineCount: this.remotePlayers.size + 1
    });
  }
}
