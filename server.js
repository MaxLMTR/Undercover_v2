const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const mysql = require('mysql');
const {
  createGame,
  joinGame,
  startGame,
  submitDescription,
  submitDiscussion,
  findGameByPlayerId,
  submitVote,
} = require('./fonctions_server');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => { res.sendFile('index.html'); });

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'undercover'
});

connection.connect();

// Route pour récupérer un mot aléatoire
app.get('/random-word', (req, res) => {
  const query = 'SELECT word1, word2 FROM undercover ORDER BY RAND() LIMIT 1';
  connection.query(query, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Erreur lors de la récupération du mot aléatoire.' });
    } else {
      res.json(results[0]);
    }
  });
});


io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté:', socket.id);

  //créer une salle
  socket.on('createRoom', (playerName) => {
    const roomInfo = createGame(socket.id, playerName);
    socket.join(roomInfo.id);
    socket.emit('playerInfo', {
      id: socket.id
    });
    socket.emit('roomCreated', roomInfo);
    io.to(roomInfo.id).emit('updatePlayers', roomInfo.players);
  });
  
  //rejoindre une salle
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
        io.to(roomInfo.players[0].id).emit('enoughToStart', { });
      }
      else{
        io.to(roomInfo.players[0].id).emit('NotenoughToStart', { });
      }
    } else {
      socket.emit('error', 'Code de salle invalide.');
    }
  });

  //commencer le jeu
  socket.on('startGame', async () => {
    const gameData = await startGame(socket.id);
    if (gameData) {
      io.to(gameData.roomId).emit('gameStarted', gameData);
    }
  });

  //envoyer son mot
  socket.on('submitDescription', (description) => {
    const updateData = submitDescription(socket.id, description);
    if (updateData) {
      io.to(updateData.roomId).emit('updateDescriptions', updateData);
    }
    if (updateData.phase == 'vote') {
      io.to(updateData.roomId).emit('startVotePhase', findGameByPlayerId(updateData.playerId));
    }
  });

  //discuter
  socket.on('submitDiscussion', (discussion) => {
    const updateData = submitDiscussion(socket.id, discussion);
    io.to(updateData.roomId).emit('updateDiscussion', updateData);
  });

  //voter
  socket.on('submitVote', ({
    toEliminatePlayer,
    playerId
  }) => {
    const updateData = submitVote(toEliminatePlayer, playerId);
    console.log(updateData.state);
    if (updateData) {
      io.to(playerId).emit('awaitForResults');
      console.log(playerId);
    }
    if (updateData.state === 'eliminated_mr_white') {
      io.to(updateData.playerId).emit('Screen_for_mr_white', updateData);
      io.to(updateData.roomId).emit('civilsWinner', updateData);
    }
    if (updateData.state === 'civils_winner') {
      io.to(updateData.roomId).emit('civilsWinner', updateData);
      io.to(updateData.roomId).emit('disable_button');
    }
    if (updateData.state === 'undercovers_winner') {
      io.to(updateData.roomId).emit('undercoversWinner', updateData);
      io.to(updateData.roomId).emit('disable_button');
    }
    if (updateData.state === 'eliminated_simple') {
      io.to(updateData.roomId).emit('eliminated_simple', updateData);
      io.to(toEliminatePlayer).emit('disable_button');
    }
    //
  });

  //voter
  socket.on("submitVote", (votedPlayerId) => {
    // Mettez à jour la logique du serveur pour comptabiliser les votes et déterminer le résultat
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur à l'écoute sur le port ${PORT}`);
});
