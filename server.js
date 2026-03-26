const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  transports: ['websocket'],
});

app.use(express.static(path.join(__dirname, 'public')));

let spinning = false;
const viewers = new Map(); // socket.id -> name

function broadcastViewers() {
  const names = Array.from(viewers.values());
  io.emit('viewerList', names);
}

io.on('connection', (socket) => {
  console.log('A viewer connected! Total:', io.engine.clientsCount);

  socket.on('joinWithName', (name) => {
    const clean = String(name).trim().slice(0, 20);
    if (!clean) return;
    viewers.set(socket.id, clean);
    console.log(`${clean} joined!`);
    io.emit('playerJoined', clean);
    broadcastViewers();
  });

  socket.on('requestSpin', () => {
    if (spinning) return;
    spinning = true;

    // Generate spin parameters server-side so everyone gets the same result
    const extraRotations = (Math.floor(Math.random() * 4) + 8) * 2 * Math.PI;
    const randomSegment = Math.random() * 2 * Math.PI;
    const duration = 8000 + Math.random() * 2000;

    // Lock the names at spin time so everyone uses the same list
    const spinNames = Array.from(viewers.values());
    if (spinNames.length === 0) { spinning = false; return; }

    // Broadcast to ALL clients (including sender)
    io.emit('spin', { extraRotations, randomSegment, duration, names: spinNames });

    setTimeout(() => { spinning = false; }, duration + 4000);
  });

  socket.on('disconnect', () => {
    const name = viewers.get(socket.id);
    viewers.delete(socket.id);
    if (name) console.log(`${name} left.`);
    broadcastViewers();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Spinner running at http://localhost:${PORT}`);
});
