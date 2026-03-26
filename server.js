const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
});

app.use(express.static(path.join(__dirname, 'public')));

let spinning = false;
const viewers = new Map(); // socket.id -> { name, avatarId }

function broadcastViewers() {
  const list = Array.from(viewers.values());
  io.emit('viewerList', list);
}

io.on('connection', (socket) => {
  console.log('A viewer connected! Total:', io.engine.clientsCount);

  socket.on('joinWithName', (data) => {
    const name = String(data.name || data).trim().slice(0, 20);
    const avatarId = typeof data.avatarId === 'number' ? data.avatarId : 0;
    if (!name) return;
    viewers.set(socket.id, { name, avatarId });
    console.log(`${name} joined with avatar ${avatarId}!`);
    io.emit('playerJoined', name);
    broadcastViewers();
  });

  socket.on('requestSpin', () => {
    if (spinning) return;
    spinning = true;

    const extraRotations = (Math.floor(Math.random() * 4) + 8) * 2 * Math.PI;
    const randomSegment = Math.random() * 2 * Math.PI;
    const duration = 8000 + Math.random() * 2000;

    const spinNames = Array.from(viewers.values()).map(v => v.name);
    if (spinNames.length === 0) { spinning = false; return; }

    io.emit('spin', { extraRotations, randomSegment, duration, names: spinNames });

    setTimeout(() => { spinning = false; }, duration + 4000);
  });

  socket.on('disconnect', () => {
    const viewer = viewers.get(socket.id);
    viewers.delete(socket.id);
    if (viewer) console.log(`${viewer.name} left.`);
    broadcastViewers();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Spinner running at http://localhost:${PORT}`);
});
