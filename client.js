const socket = io();

// Elements du DOM
const playerNameInput = document.getElementById('playerName');
const createRoomBtn = document.getElementById('createRoom');
const joinRoomBtn = document.getElementById('joinRoom');
const roomCodeInput = document.getElementById('roomCode');
const lobby = document.getElementById('lobby');
const room = document.getElementById('room');
const roomId = document.getElementById('room-id');
const playersList = document.getElementById('players');
const startGameBtn = document.getElementById('startGame');
const game = document.getElementById('game');
const playerWord = document.getElementById('player-word');
const descriptionInput = document.getElementById('description');
const submitDescriptionBtn = document.getElementById('submitDescription');
const descriptionsList = document.getElementById('descriptions');
const discussionList = document.getElementById('discussion');
const eliminationList = document.getElementById('elimination');
const submitVoteBtn = document.getElementById('submitVote');
const gameResults = document.getElementById('game-results');
const resultMessage = document.getElementById('result-message');
const discussionInput = document.getElementById('discussionin');
const submitDiscussionBtn = document.getElementById('submitDiscussion');

// Variables globales
let playerId = null;
let currentPhase = null;

// Gestion des événements
createRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (playerName) {
    socket.emit('createRoom', playerName);
  } else {
    alert('Veuillez entrer un nom de joueur.');
  }
});

joinRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const roomCode = roomCodeInput.value.trim();
  if (playerName && roomCode) {
    socket.emit('joinRoom', {
      playerName,
      roomCode
    });
  } else {
    alert('Veuillez entrer un nom de joueur et un code de salle.');
  }
});

startGameBtn.addEventListener('click', () => {
  socket.emit('startGame');
  console.log("Bouton start game appuyé");
});

submitDescriptionBtn.addEventListener('click', () => {
  const description = descriptionInput.value.trim();
  if (description) {
    socket.emit('submitDescription', description);
    descriptionInput.value = '';
  } else {
    alert('Veuillez entrer une description.');
  }
});

submitDiscussionBtn.addEventListener('click', () => {
  const discussion = discussionInput.value;
  if (discussion) {
    socket.emit('submitDiscussion', discussion);
    discussionInput.value = '';
  } else {
    alert('Veuillez entrer un message.');
  }
});

submitVoteBtn.addEventListener('click', () => {
  const selectedPlayer = document.querySelector('#elimination li.selected');
  if (selectedPlayer) {
    const targetPlayerId = selectedPlayer.getAttribute('data-player-id');
    socket.emit('submitVote', targetPlayerId);
  } else {
    alert('Veuillez sélectionner un joueur à éliminer.');
  }
});

// Gestion des événements du serveur
socket.on('playerInfo', (playerInfo) => {
  playerId = playerInfo.id;
});

socket.on('roomCreated', (roomInfo) => {
  showRoom(roomInfo);
});

socket.on('roomJoined', (roomInfo) => {
  showRoom(roomInfo);
});

socket.on('enoughToStart', () => {
  startGameBtn.disabled = false;
});

socket.on('NotenoughToStart', () => {
  startGameBtn.disabled = true;
});

socket.on('updatePlayers', (players) => {
  updatePlayersList(players);
});

socket.on('gameStarted', (gameData) => {
  currentPhase = 'description';
  lobby.style.display = 'none';
  room.style.display = 'none';
  game.style.display = 'block';
  playerWord.textContent = gameData.players.find(p => p.id === playerId).word;
});

socket.on('updateDescriptions', (updateData) => {
  updateDescriptionsList(updateData);
});

socket.on('startDiscussion', (data) => {
  // Mettez à jour l'interface utilisateur pour afficher les descriptions et démarrer la phase de discussion
  // Par exemple, vous pouvez afficher les descriptions dans un élément de liste
  descriptionInput.style.display = 'none';
  submitDescriptionBtn.style.display = 'none';
  discussionInput.style.display = 'inline-block';
  submitDiscussionBtn.style.display = 'inline-block';
  // Affichez un compte à rebours pour la phase de discussion
  // ...
});

socket.on('updateDiscussion', (updateData) => {
  updateDiscussionList(updateData);
});

socket.on('endDiscussion', (data) => {
  // Mettez à jour l'interface utilisateur pour terminer la phase de discussion et passer à la phase de vote
  // Par exemple, vous pouvez masquer l'élément de liste des descriptions et afficher un formulaire de vote
  // ...
});
socket.on('updateElimination', (elimination) => {
  updateEliminationList(elimination);
});

socket.on('gameResult', (result) => {
  displayGameResult(result);
});

// Fonctions utilitaires
function showRoom(roomInfo) {
  lobby.style.display = 'none';
  room.style.display = 'block';
  roomId.textContent = roomInfo.id;
}

function updatePlayersList(players) {
  playersList.innerHTML = '';
  players.forEach((player) => {
    const li = document.createElement('li');
    li.setAttribute('player-id', player.id);
    li.textContent = player.name;
    playersList.appendChild(li);
  });
}

function updateDescriptionsList(updateData) {
  const li = document.createElement('li');
  li.textContent = updateData.playerName +" : " + updateData.description;
  li.setAttribute('data-player-id', updateData.playerId);
  descriptionsList.appendChild(li);
}

function updateDiscussionList(updateData) {
  const li = document.createElement('li');
  li.textContent = updateData.playerName +" : " + updateData.discussion;
    li.setAttribute('data-player-id', updateData.playerId);
    discussionList.appendChild(li);
  
}

function updateEliminationList(elimination) {
  eliminationList.innerHTML = '';
  elimination.forEach((player) => {
    if (player.id !== playerId) {
      const li = document.createElement('li');
      li.textContent = player.name;
      li.setAttribute('data-player-id', player.id);
      li.addEventListener('click', () => {
        const selectedPlayer = document.querySelector('#elimination li.selected');
        if (selectedPlayer) {
          selectedPlayer.classList.remove('selected');
        }
        li.classList.add('selected');
      });
      eliminationList.appendChild(li);
    }
  });
}

function displayGameResult(result) {
  game.style.display = 'none';
  gameResults.style.display = 'block';
  if (result === 'civils') {
    resultMessage.textContent = 'Les Civils ont gagné !';
  } else if (result === 'impostors') {
    resultMessage.textContent = 'Les Imposteurs ont gagné !';
  } else if (result === 'mrWhite') {
    resultMessage.textContent = 'Mr.White a gagné !';
  }
}