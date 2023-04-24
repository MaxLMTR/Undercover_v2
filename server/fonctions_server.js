const games = new Map();
let fetch = null;
async function initializeFetch() {
  if (!fetch) {
    const module = await import("node-fetch");
    fetch = module.default;
  }
}

//recuperer paire de mots de la BDD
async function getRandomWordPair() {
  await initializeFetch();
  try {
    const response = await fetch("http://localhost:3000/random-word");
    const wordPair = await response.json();
    return wordPair;
  } catch (error) {
    console.error("Erreur lors de la récupération du mot aléatoire:", error);
  }
}

//créer un jeu
function createGame(playerId, playerName) {
  let roomId;
  do {
    roomId = generateRoomId(6);
  } while (games.has(roomId));
  const newPlayer = {
    id: playerId,
    name: playerName,
  };
  const newGame = {
    id: roomId,
    players: [newPlayer],
  };
  games.set(roomId, newGame);
  return newGame;
}

//generer un numero de salle
function generateRoomId(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return [...Array(length)].map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}

//rejoindre un jeu
function joinGame(playerId, playerName, roomCode) {
  const game = games.get(roomCode);
  if (game) {
    const newPlayer = {
      id: playerId,
      name: playerName,
    };
    game.players.push(newPlayer);
    return game;
  }
  return null;
}

//commencer le jeu
async function startGame(playerId) {
  const game = findGameByPlayerId(playerId);
  if (game) {
    const wordPair = await getRandomWordPair();
    game.players = assignRoles(game.players);
    game.words = { civil: wordPair.word1, undercover: wordPair.word2 };
    game.phase = "description";

    const nonWhitePlayer = game.players.find(
      (player) => player.role !== "mr_white",
    );
    if (nonWhitePlayer) {
      nonWhitePlayer.turn = true;
    }

    const gameData = {
      roomId: game.id,
      words: {
        civil: wordPair.word1,
        undercover: wordPair.word2,
      },
      players: game.players.map((player) => ({
        id: player.id,
        name: player.name,
        role: player.role,
        word: wordfind(player.role, wordPair.word1, wordPair.word2),
      })),
    };
    return gameData;
  }
  return null;
}

//envoyer son mot
function submitDescription(playerId, description) {
  const game = findGameByPlayerId(playerId);
  if (game && game.phase === "description") {
    const player = game.players.find((player) => player.id === playerId);
    if (
      player &&
      (!player.description || player.description === "") &&
      !player.eliminated
    ) {
      player.description = description;

      // Vérifier si tous les joueurs ont soumis leur description
      const players_not_eliminated = game.players.filter(
        (player) => !player.eliminated,
      );
      const allDescriptionsSubmitted = players_not_eliminated.every(
        (player) => player.description,
      );

      if (allDescriptionsSubmitted) {
        game.phase = "vote";
      }

      return {
        success: true,
        game: game,
        playerId,
        playerName: player.name,
        description,
        phase: game.phase,
      };
    }
  }
  return { success: false };
}

//discussion
function submitDiscussion(playerId, discussion) {
  const game = findGameByPlayerId(playerId);
  const player = game.players.find((player) => player.id === playerId);
  // Vérifier si tous les joueurs ont soumis leur description
  return {
    success: true,
    roomId: game.id,
    playerId,
    playerName: player.name,
    discussion,
    phase: game.phase,
  };
}

//envoyer vote
function submitVote(toEliminatePlayer, PlayerWhoVoted) {
  const game = findGameByPlayerId(toEliminatePlayer);
  if (game && game.phase === "vote" && !PlayerWhoVoted.eliminated) {
    const player_to_eliminate = game.players.find(
      (player) => player.id === toEliminatePlayer,
    );
    const player_who_voted = game.players.find(
      (player) => player.id === PlayerWhoVoted,
    );
    if (
      player_who_voted &&
      (!player_who_voted.voted || player_who_voted.voted == false)
    ) {
      player_who_voted.voted = true;

      if (!player_to_eliminate.votes) {
        player_to_eliminate.votes = 1;
      }
      if (player_to_eliminate.votes) {
        player_to_eliminate.votes = player_to_eliminate.votes + 1;
      }

      const players_not_eliminated = game.players.filter(
        (player) => !player.eliminated,
      );
      const allVotesSubmitted = players_not_eliminated.every(
        (player) => player.voted,
      );

      if (allVotesSubmitted) {
        game.phase = "elimination";
        let maxVotes = -1;
        let eliminatedPlayer = null;
        game.players.forEach((player) => {
          if (player.votes && player.votes > maxVotes) {
            maxVotes = player.votes;
            eliminatedPlayer = player;
          }
        });
        game.players.forEach((player) => {
          player.description = "";
          player.votes = 0;
          player.voted = false;
        });
        if (eliminatedPlayer) {
          eliminatedPlayer.eliminated = true;
        }

        if (eliminatedPlayer.role === "mr_white") {
          return {
            state: "eliminated_mr_white",
            success: true,
            game: game,
            playerId: eliminatedPlayer.id,
            playerName: eliminatedPlayer.name,
            votedAgainst: eliminatedPlayer,
            phase: game.phase,
          };
        }
        const check = checkForWinner(game);
        if (check && check.winner === "civils") {
          return {
            state: "civils_winner",
            success: true,
            game: game,
            playerId: eliminatedPlayer.id,
            playerName: eliminatedPlayer.name,
            votedAgainst: eliminatedPlayer,
            phase: game.phase,
          };
        }

        if (check && check.winner === "undercovers") {
          return {
            state: "undercovers_winner",
            success: true,
            game: game,
            playerId: eliminatedPlayer.id,
            playerName: eliminatedPlayer.name,
            votedAgainst: eliminatedPlayer,
            phase: game.phase,
          };
        }

        game.phase = "description";
        return {
          state: "eliminated_simple",
          success: true,
          game: game,
          playerId: eliminatedPlayer.id,
          playerName: eliminatedPlayer.name,
          votedAgainst: eliminatedPlayer,
          phase: game.phase,
        };
      }

      return {
        state: "just_voted",
      };
    }
  }
  return { success: false };
}

//verifier s'il y a des gagnants
function checkForWinner(game) {
  const civils = game.players.filter((player) => player.role === "civil");
  const undercovers = game.players.filter(
    (player) => player.role === "undercover",
  );
  const mrWhites = game.players.filter((player) => player.role === "mr_white");

  const aliveCivils = civils.filter((player) => !player.eliminated);
  const aliveUndercovers = undercovers.filter((player) => !player.eliminated);
  const aliveMrWhites = mrWhites.filter((player) => !player.eliminated);

  // Les civils gagnent s'ils éliminent tous les undercovers et les Mr.Whites.
  if (aliveUndercovers.length === 0 && aliveMrWhites.length === 0) {
    return { winner: "civils", players: aliveCivils, game: game };
  }

  // Les imposteurs (Undercovers et/ou Mr.Whites) gagnent s'ils survivent jusqu'à ce qu'il ne reste plus qu'1 Civil.
  if (
    aliveCivils.length === 1 &&
    (aliveUndercovers.length > 0 || aliveMrWhites.length > 0)
  ) {
    const impostors = aliveUndercovers.concat(aliveMrWhites);
    return { winner: "undercovers", players: impostors, game: game };
  }
  return null;
}

// Ajoutez une fonction pour permettre à Mr.White de deviner le mot secret des civils
function submitMrWhite(guessedWord, playerId) {
  const game = findGameByPlayerId(playerId);
  const player = game.players.find((player) => player.id === playerId);
  game.phase = "description";
  if (
    player &&
    player.role === "mr_white" &&
    guessedWord.toLowerCase() === game.words.civil.toLowerCase()
  ) {
    return {
      game: game,
      winner: "mr_white",
      name: player.name,
      mot: game.words.civil,
    };
  }
  const check = checkForWinner(game);
  if (check && check.winner === "civils") {
    return {
      game: game,
      winner: "civils",
      name: player.name,
      mot: game.words.civil,
    };
  }
  return { game: game, name: player.name };
}

function wordfind(role, civil_w, under_w) {
  if (role === "civil") {
    return civil_w;
  } else if (role === "undercover") {
    return under_w;
  } else if (role === "mr_white") {
    return "";
  }
}

//trouver le jeu avec l'id du joueur
function findGameByPlayerId(playerId) {
  for (const game of games.values()) {
    const player = game.players.find((p) => p.id === playerId);
    if (player) {
      return game;
    }
  }
  return null;
}

//affecter les roles
function assignRoles(players) {
  const numPlayers = players.length;
  const numUndercover = Math.floor(numPlayers * 0.25);
  const numMrWhite = Math.floor(numPlayers * 0.25);
  const numCivil = numPlayers - numUndercover - numMrWhite;

  const roles = [
    ...Array(numUndercover).fill("undercover"),
    ...Array(numMrWhite).fill("mr_white"),
    ...Array(numCivil).fill("civil"),
  ];

  const shuffledRoles = shuffle(roles);

  return players.map((player, index) => {
    player.role = shuffledRoles[index];
    player.turn = false;
    return player;
  });
}

//melanger la liste
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function nextTurn(game) {
  const currentPlayerIndex = game.players.findIndex((player) => player.turn);
  game.players[currentPlayerIndex].turn = false;

  const nonEliminatedPlayers = game.players.filter(
    (player) => !player.eliminated,
  );
  const currentPlayer = nonEliminatedPlayers.findIndex(
    (player) => player.id === game.players[currentPlayerIndex].id,
  );

  let nextPlayerIndex;
  if (currentPlayerIndex === -1) {
    const mrWhiteIndex = nonEliminatedPlayers.findIndex(
      (player) => player.role === "mr_white",
    );

    if (mrWhiteIndex === 0) {
      nextPlayerIndex = 1;
    } else {
      nextPlayerIndex = 0;
    }
  } else {
    nextPlayerIndex = (currentPlayer + 1) % nonEliminatedPlayers.length;
  }
  const nextPlayer = nonEliminatedPlayers[nextPlayerIndex];
  nextPlayer.turn = true;

  return nextPlayer;
}

module.exports = {
  createGame,
  joinGame,
  startGame,
  submitDescription,
  submitDiscussion,
  findGameByPlayerId,
  submitVote,
  submitMrWhite,
  nextTurn,
};