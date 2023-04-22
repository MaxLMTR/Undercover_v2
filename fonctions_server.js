const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const games = new Map();
const wordPairs = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

function getRandomWordPair() {
  const randomIndex = Math.floor(Math.random() * wordPairs.length);
  return wordPairs[randomIndex];
}

function assignRoles(players) {
  const numPlayers = players.length;
  const numUndercover = Math.floor(numPlayers * 0.25);
  const numMrWhite = Math.floor(numPlayers * 0.25);
  const numCivil = numPlayers - numUndercover - numMrWhite;

  const roles = [
    ...Array(numUndercover).fill('undercover'),
    ...Array(numMrWhite).fill('mr_white'),
    ...Array(numCivil).fill('civil')
  ];

  const shuffledRoles = shuffle(roles);

  return players.map((player, index) => {
    player.role = shuffledRoles[index];
    return player;
  });
}

function shuffle(array) {
  let currentIndex = array.length;
  let temporaryValue;
  let randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function createGame(playerId, playerName) {
  const roomId = uuidv4();
  const newPlayer = {
    id: playerId,
    name: playerName
  };
  const newGame = {
    id: roomId,
    players: [newPlayer],
  };
  games.set(roomId, newGame);
  return newGame;
}

function joinGame(playerId, playerName, roomCode) {
  const game = games.get(roomCode);
  if (game) {
    const newPlayer = {
      id: playerId,
      name: playerName
    };
    game.players.push(newPlayer);
    return game;
  }
  return null;
}

function startGame(playerId) {
  const game = findGameByPlayerId(playerId);
  if (game) {
    const wordPair = getRandomWordPair();
    game.players = assignRoles(game.players);
    game.words = wordPair;
    game.phase = 'description';

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
        word: wordfind(player.role, wordPair.word1, wordPair.word2)
      })),
    };
    return gameData;
  }
  return null;
}

function wordfind(role, civil_w, under_w){
  if(role === 'civil'){
    return civil_w
  }
  else if(role === 'undercover'){
    return under_w
  }
  else if(role === 'mr_white'){
    return ''
  }
}

function submitDescription(playerId, description) {
  const game = findGameByPlayerId(playerId);
  if (game && game.phase === 'description') {
    const player = game.players.find((player) => player.id === playerId);
    if (player && !player.description) {
      player.description = description;

      // Vérifier si tous les joueurs ont soumis leur description
      const allDescriptionsSubmitted = game.players.every((player) => player.description);

      if (allDescriptionsSubmitted) {
        game.phase = 'discussion';
      }

      return {
        success: true,
        roomId: game.id,
        playerId,
        playerName: player.name,
        description,
        phase: game.phase,
      };
    }
  }
  return { success: false };
}

function submitDiscussion(playerId, discussion) {
  const game = findGameByPlayerId(playerId);
  if (game && game.phase === 'discussion') {
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
}

function startDiscussionPhase(game) {
  const discussionDuration = 60000; // 60 secondes ou la durée souhaitée pour la phase de discussion

  setTimeout(() => {
    endDiscussionPhase(game);
  }, discussionDuration);

  // Envoyez les descriptions et la phase de discussion aux clients pour les afficher
  // Vous devez implémenter la fonction 'emitToRoom()' pour envoyer un événement aux clients dans la salle
  emitToRoom(game.id, 'startDiscussion', {
    phase: game.phase,
    descriptions: game.players.map((player) => ({ name: player.name, description: player.description })),
  });
}

function endDiscussionPhase(game) {
  game.phase = 'vote';
  // Envoyez un événement aux clients pour les informer que la phase de discussion est terminée
  emitToRoom(game.id, 'endDiscussion', {
    phase: game.phase,
  });
}

function submitVote(playerId, votedPlayerId) {
  const game = findGameByPlayerId(playerId);
  if (game && game.phase === 'elimination') {
    const player = game.players.find((player) => player.id === playerId);
    const votedPlayer = game.players.find((player) => player.id === votedPlayerId);

    if (player && votedPlayer && !player.votedPlayerId) {
      player.votedPlayerId = votedPlayerId;
      votedPlayer.voteCount = (votedPlayer.voteCount || 0) + 1;

      // Vérifier si tous les joueurs ont soumis leur vote
      const allVotesSubmitted = game.players.every((player) => player.votedPlayerId);

      let eliminatedPlayer = null;
      if (allVotesSubmitted) {
        game.phase = 'description';
        eliminatedPlayer = game.players.reduce((prev, current) => {
          return prev.voteCount > current.voteCount ? prev : current;
        });
        eliminatedPlayer.eliminated = true;

        // Réinitialiser les votes et les descriptions pour le prochain tour
        game.players.forEach((player) => {
          player.votedPlayerId = null;
          player.voteCount = 0;
          player.description = null;
        });
      }

      return {
        success: true,
        playerId,
        votedPlayerId,
        phase: game.phase,
        eliminatedPlayerId: eliminatedPlayer ? eliminatedPlayer.id : null,
      };
    }
  }
  return { success: false };
}

function findGameByPlayerId(playerId) {
  for (const game of games.values()) {
    const player = game.players.find((p) => p.id === playerId);
    if (player) {
      return game;
    }
  }
  return null;
}

module.exports = {
  createGame,
  joinGame,
  startGame,
  submitDescription,
  submitDiscussion,
  submitVote,
  startDiscussionPhase,
};