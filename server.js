const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const {
  createGame,
  joinGame,
  startGame,
  submitDescription,
  submitDiscussion,
  submitVote,
  startDiscussionPhase
} = require('./fonctions_server');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => { res.sendFile('index.html'); });

io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté:', socket.id);

  socket.on('createRoom', (playerName) => {
    const roomInfo = createGame(socket.id, playerName);
    socket.join(roomInfo.id);
    socket.emit('playerInfo', {
      id: socket.id
    });
    socket.emit('roomCreated', roomInfo);
    io.to(roomInfo.id).emit('updatePlayers', roomInfo.players);
  });

  socket.on('joinRoom', ({
    playerName,
    roomCode
  }) => {
    const roomInfo = joinGame(socket.id, playerName, roomCode);
    if (roomInfo) {
      socket.join(roomInfo.id);
      socket.emit('playerInfo', {
        id: socket.id
      });
      socket.emit('roomJoined', roomInfo);
      io.to(roomInfo.id).emit('updatePlayers', roomInfo.players);
      if(Object.keys(roomInfo.players).length>=4){
        socket.to(roomInfo.players[0].id).emit('enoughToStart', { });
      }
      else{
        socket.to(roomInfo.players[0].id).emit('NotenoughToStart', { });
      }
    } else {
      socket.emit('error', 'Code de salle invalide.');
    }
  });

  socket.on('startGame', () => {
    const gameData = startGame(socket.id);
    if (gameData) {
      io.to(gameData.roomId).emit('gameStarted', gameData);
    }
  });

  socket.on('submitDescription', (description) => {
    const updateData = submitDescription(socket.id, description);
    if (updateData) {
      io.to(updateData.roomId).emit('updateDescriptions', updateData);
      console.log(updateData);
    }
    if (updateData.phase === 'discussion') {
      io.to(updateData.roomId).emit('startDiscussion', updateData);
    }
  });

  socket.on('submitDiscussion', (discussion) => {
    const updateData = submitDiscussion(socket.id, discussion);
    if (updateData) {
      io.to(updateData.roomId).emit('updateDiscussion', updateData);
    }
    if (updateData.phase === 'discussion') {
      io.to(updateData.roomId).emit('startDiscussion', updateData);
    }
  });

  socket.on('submitVote', (targetPlayerId) => {
    const resultData = submitVote(socket.id, targetPlayerId);
    if (resultData) {
      io.to(resultData.roomId).emit('gameResult', resultData.result);
    }
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur à l'écoute sur le port ${PORT}`);
});