const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let spinning = false;

io.on('connection', (socket) => {
  console.log('A viewer connected! Total:', io.engine.clientsCount);
  io.emit('viewerCount', io.engine.clientsCount);

  socket.on('requestSpin', () => {
    if (spinning) return;
    spinning = true;

    // Generate spin parameters server-side so everyone gets the same result
    const extraRotations = (Math.floor(Math.random() * 4) + 5) * 2 * Math.PI;
    const randomSegment = Math.random() * 2 * Math.PI;
    const duration = 4000 + Math.random() * 1000;

    // Broadcast to ALL clients (including sender)
    io.emit('spin', { extraRotations, randomSegment, duration });

    setTimeout(() => { spinning = false; }, duration + 2000);
  });

  socket.on('disconnect', () => {
    console.log('A viewer left. Total:', io.engine.clientsCount);
    io.emit('viewerCount', io.engine.clientsCount);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Spinner running at http://localhost:${PORT}`);
});
