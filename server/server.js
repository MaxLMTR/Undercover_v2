const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const mysql = require("mysql");
const { createGame, joinGame, startGame, submitDescription, submitDiscussion,findGameByPlayerId, submitVote, submitMrWhite, nextTurn, } = require("./fonctions_server");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, "../public")));

//chemin par defaut
app.get("/", (req, res) => {
  res.sendFile("/index.html");
});

//connexion BDD
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "undercover",
});
connection.connect();

// Route pour récupérer un couple de mot aléatoire
app.get("/random-word", (req, res) => {
  const query = "SELECT word1, word2 FROM undercover ORDER BY RAND() LIMIT 1";
  connection.query(query, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ error: "Erreur lors de la récupération du mot aléatoire." });
    } else {
      res.json(results[0]);
    }
  });
});

//connexion socket
io.on("connection", (socket) => {
  console.log("Un utilisateur s'est connecté:", socket.id);

  //créer une salle
  socket.on("createRoom", (playerName) => {
    const roomInfo = createGame(socket.id, playerName);
    socket.join(roomInfo.id);
    socket.emit("playerInfo", {
      id: socket.id,
    });
    socket.emit("roomCreated", roomInfo);
    io.to(roomInfo.id).emit("updatePlayers", roomInfo.players);
  });

  //rejoindre une salle
  socket.on("joinRoom", ({ playerName, roomCode }) => {
    const roomInfo = joinGame(socket.id, playerName, roomCode);
    if (roomInfo) {
      socket.join(roomInfo.id);
      socket.emit("playerInfo", {
        id: socket.id,
      });
      socket.emit("roomJoined", roomInfo);
      io.to(roomInfo.id).emit("updatePlayers", roomInfo.players);
      if (Object.keys(roomInfo.players).length >= 4) {
        io.to(roomInfo.players[0].id).emit("enoughToStart", {});
      } else {
        io.to(roomInfo.players[0].id).emit("NotenoughToStart", {});
      }
    } else {
      socket.emit("error", "Code de salle invalide.");
    }
  });

  //commencer le jeu
  socket.on("startGame", async () => {
    const gameData = await startGame(socket.id);
    io.to(gameData.roomId).emit("nextPlayer", {
      nextPlayerId: gameData.nextPlayer.id,
      nextPlayerName: gameData.nextPlayer.name,
    });
    if (gameData) {
      io.to(gameData.roomId).emit("gameStarted", gameData);
    }
  });

  //envoyer son mot
  socket.on("submitDescription", (description) => {
    const game = findGameByPlayerId(socket.id);
    const updateData = submitDescription(socket.id, description);
    if (updateData) {
      io.to(updateData.game.id).emit("updateDescriptions", updateData);
      const nextPlayer = nextTurn(game);
      io.to(game.id).emit("nextPlayer", {
        nextPlayerId: nextPlayer.id,
        nextPlayerName: nextPlayer.name,
      });
    }
    if (updateData && updateData.phase == "vote") {
      io.to(updateData.game.id).emit("startVotePhase", updateData.game);
    }
  });

  //discuter
  socket.on("submitDiscussion", (discussion) => {
    const updateData = submitDiscussion(socket.id, discussion);
    io.to(updateData.roomId).emit("updateDiscussion", updateData);
  });

  //voter
  socket.on("submitVote", ({ toEliminatePlayer, playerId }) => {
    const updateData = submitVote(toEliminatePlayer, playerId);
    if (updateData) {
      io.to(playerId).emit("awaitForResults");

      if (updateData.state === "eliminated_mr_white") {
        const nextPlayer = nextTurn(updateData.game);
        io.to(updateData.game.id).emit("nextPlayer", {
          nextPlayerId: nextPlayer.id,
          nextPlayerName: nextPlayer.name,
        });
        io.to(updateData.playerId).emit("disable_button");
        io.to(updateData.playerId).emit("Screen_for_mr_white", updateData);
        io.to(updateData.playerId).emit("eliminate");
        io.to(updateData.game.id).emit("eliminatedMrWhite", updateData);
      } else if (updateData.state === "civils_winner") {
        io.to(updateData.game.id).emit("civilsWinner", updateData);
        io.to(updateData.game.id).emit("disable_button");
      } else if (updateData.state === "undercovers_winner") {
        io.to(updateData.game.id).emit("undercoversWinner", updateData);
        io.to(updateData.game.id).emit("disable_button");
      } else if (updateData.state === "eliminated_simple") {
        const nextPlayer = nextTurn(updateData.game);
        io.to(updateData.game.id).emit("nextPlayer", {
          nextPlayerId: nextPlayer.id,
          nextPlayerName: nextPlayer.name,
        });
        io.to(updateData.playerId).emit("disable_button");
        io.to(updateData.playerId).emit("eliminate");
        io.to(updateData.game.id).emit("eliminated_simple", updateData);
      }
    }
  });

  // verifier le mot de mr white
  socket.on("submitMrWhite", ({ mot, playerId }) => {
    const updateData = submitMrWhite(mot, playerId);
    if (updateData && updateData.winner === "mr_white") {
      io.to(updateData.game.id).emit("mrWhiteWinner", updateData);
    }
    if (updateData && updateData.winner === "civils") {
      io.to(updateData.game.id).emit("mrWhiteNoWinnerButCivilsYes", updateData);
    }
    if (updateData && !updateData.winner) {
      io.to(updateData.game.id).emit("mrWhiteNoWinner", updateData);
    }
  });
});

//ecoute serveur sur le port 3000 (dans notre cas, sinon la variable .env)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur à l'écoute sur le port ${PORT}`);
});