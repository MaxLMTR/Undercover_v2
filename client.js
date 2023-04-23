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
const eliminationList = document.getElementById('votelist');
const submitVoteBtn = document.getElementById('submitVote');
const gameResults = document.getElementById('game-results');
const resultMessage = document.getElementById('result-message');
const discussionInput = document.getElementById('discussionin');
const submitDiscussionBtn = document.getElementById('submitDiscussion');
const game_vote = document.getElementById('game-vote');
const game_vote_result = document.getElementById('game-result-vote');
const result_message = document.getElementById('result-message');

// Variables globales
let playerId = null;
let currentPhase = null;

//créer une salle
createRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (playerName) {
    socket.emit('createRoom', playerName);
  } else {
    alert('Veuillez entrer un nom de joueur.');
  }
});

//rejoindre une salle
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

//commencer le jeu
startGameBtn.addEventListener('click', () => {
  socket.emit('startGame');
  console.log("Bouton start game appuyé");
});

//envoyer son mot
submitDescriptionBtn.addEventListener('click', () => {
  const description = descriptionInput.value.trim();
  if (description) {
    socket.emit('submitDescription', description);
    descriptionInput.value = '';
  } else {
    alert('Veuillez entrer une description.');
  }
});

//discuter
submitDiscussionBtn.addEventListener('click', () => {
  const discussion = discussionInput.value;
  if (discussion) {
    socket.emit('submitDiscussion', discussion);
    discussionInput.value = '';
  } else {
    alert('Veuillez entrer un message.');
  }
});

//voter
submitVoteBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const toEliminatePlayer = document.getElementById("votelist").value;
  console.log(toEliminatePlayer);
  console.log(playerId);
  socket.emit("submitVote", { toEliminatePlayer, playerId });
  game_vote.style.display = 'none';
  game_vote_result.style.display = 'inline-block';
});

socket.on('playerInfo', (playerInfo) => {
  playerId = playerInfo.id;
});

socket.on('roomCreated', (roomInfo) => {
  showRoom(roomInfo);
});

socket.on('updatePlayers', (players) => {
  updatePlayersList(players);
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

socket.on('updateDiscussion', (updateData) => {
  updateDiscussionList(updateData);
});

socket.on('startVotePhase', (data) => {
  startVote(data);
});

socket.on('awaitForResults', () => {
  game_vote_result.style.display = 'inline-block';
  result_message.innerText = 'Attente des résultats de vote';
});

socket.on('Screen_for_mr_white', (data) => {
  //
});

socket.on('eliminated_mr_white', (data) => {
  game_vote_result.style.display = 'inline-block';
  result_message.innerText = `${data.playerName} a été éliminé(e), c'était ${data.votedAgainst.role}, il va devoir deviner son mot`
});

socket.on('civils_winner', (data) => {
  game_vote_result.style.display = 'inline-block';
  result_message.innerText = result_message.innerText = `${data.playerName} a été éliminé(e), c'était un ${data.votedAgainst.role}, les civils ont gagné !`
});

socket.on('undercoversWinner', (data) => {
  result_message.innerText = `${data.playerName} a été éliminé(e), c'était un ${data.votedAgainst.role}, les imposteurs ont gagné !`
});

socket.on('eliminated_simple', (data) => {
  result_message.innerText = `${data.playerName} a été éliminé(e), c'était un ${data.votedAgainst.role}`
});

socket.on('disable_button', () => {
  submitDescriptionBtn.disabled = true;
});


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

function startVote(data) {
  game_vote.style.display = 'inline-block';
  console.log("#########################################");
  console.log(data);
  eliminationList.innerHTML = '';
  const players_not_eliminated = data.players.filter((player) => !player.eliminated);
  players_not_eliminated.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = `${player.name}`;
    eliminationList.appendChild(option);
  });
}