import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager } from './RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

// Tắt bộ nhớ đệm (Cache) cho toàn bộ file tĩnh để trình duyệt luôn nạp phiên bản ES Module mới nhất
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath, { etag: false, lastModified: false }));

const roomManager = new RoomManager(io, {
  maxPlayersPerRoom: 30,
  tickRateHz: 15
});

io.on('connection', (socket) => {
  socket.on('player:join', (profile) => {
    const { roomId, self, players, candles, guestbook, quizLeaderboard } = roomManager.addPlayer(socket, profile);

    socket.emit('room:joined', {
      roomId,
      selfId: self.id,
      players,
      candles,
      guestbook,
      quizLeaderboard
    });

    socket.to(roomId).emit('player:joined', self);
  });

  socket.on('player:move', (payload) => {
    roomManager.handlePlayerMove(socket, payload);
  });

  socket.on('player:emote', (payload) => {
    roomManager.handlePlayerEmote(socket, payload);
  });

  socket.on('player:honk', (payload) => {
    roomManager.handlePlayerHonk(socket, payload);
  });

  socket.on('memorial:offer', () => {
    roomManager.handleMemorialOffer(socket);
  });

  socket.on('guestbook:add', (payload) => {
    roomManager.handleGuestbookAdd(socket, payload);
  });

  socket.on('quiz:submit', (payload) => {
    roomManager.handleQuizSubmit(socket, payload);
  });

  socket.on('chatMessage', (payload) => {
    roomManager.handleChatMessage(socket, payload);
  });

  socket.on('disconnect', () => {
    const removed = roomManager.removePlayer(socket);
    if (removed) {
      socket.to(removed.roomId).emit('player:left', { id: removed.playerId });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Virtual Museum Server] Running at http://localhost:${PORT}`);
});
