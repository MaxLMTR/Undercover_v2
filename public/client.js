const socket = io();

// Elements du DOM
const playerNameInput = document.getElementById("playerName"); const createRoomBtn = document.getElementById("createRoom"); const joinRoomBtn = document.getElementById("joinRoom");
const roomCodeInput = document.getElementById("roomCode"); const lobby = document.getElementById("lobby"); const room = document.getElementById("room"); const roomId = document.getElementById("room-id");
const playersList = document.getElementById("players"); const startGameBtn = document.getElementById("startGame"); const game = document.getElementById("game");
const playerWord = document.getElementById("player-word"); const descriptionInput = document.getElementById("description"); const submitDescriptionBtn = document.getElementById("submitDescription");
const descriptionsList = document.getElementById("descriptions"); const discussionList = document.getElementById("discussion"); const eliminationList = document.getElementById("votelist");
const submitVoteBtn = document.getElementById("submitVote"); const gameResults = document.getElementById("game-results"); const resultMessage = document.getElementById("result-message");
const discussionInput = document.getElementById("discussionin"); const submitDiscussionBtn = document.getElementById("submitDiscussion"); const result_message = document.getElementById("result-message");
const phase_description = document.getElementById("phase-description"); const phase_vote = document.getElementById("phase-vote"); const phase_resultats = document.getElementById("phase-resultats");
const timer_p = document.getElementById("timer"); const alive_players_p = document.getElementById("alive_players"); const players_list = document.getElementById("players_list");
const currentPlayerNameElement = document.getElementById("current-player"); const elimine_span = document.getElementById("elimine"); const for_mr_white = document.getElementById("mr_white_container");
const mrWhiteInput = document.getElementById("mrWhiteInput"); const submitMrWhiteBtn = document.getElementById("submitMrWhite");

// Variables globales
let playerId = null;  let currentPhase = null;  let elimine = false;

//créer une salle
createRoomBtn.addEventListener("click", () => {
  const playerName = playerNameInput.value.trim();
  if (playerName) {
    socket.emit("createRoom", playerName);
  } else {
    alert("Veuillez entrer un nom de joueur.");
  }
});

//rejoindre une salle
joinRoomBtn.addEventListener("click", () => {
  const playerName = playerNameInput.value.trim();
  const roomCode = roomCodeInput.value.trim();
  if (playerName && roomCode) {
    socket.emit("joinRoom", {
      playerName,
      roomCode,
    });
  } else {
    alert("Veuillez entrer un nom de joueur et un code de salle.");
  }
});

//commencer le jeu
startGameBtn.addEventListener("click", () => {
  socket.emit("startGame");
});

//envoyer son mot
submitDescriptionBtn.addEventListener("click", () => {
  const description = descriptionInput.value.trim();
  if (description) {
    socket.emit("submitDescription", description);
    descriptionInput.value = "";
  } else {
    alert("Veuillez entrer une description.");
  }
});

//discuter
submitDiscussionBtn.addEventListener("click", () => {
  const discussion = discussionInput.value;
  if (discussion) {
    socket.emit("submitDiscussion", discussion);
    discussionInput.value = "";
  } else {
    alert("Veuillez entrer un message.");
  }
});

//voter
submitVoteBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const toEliminatePlayer = document.getElementById("votelist").value;
  socket.emit("submitVote", { toEliminatePlayer, playerId });
  phase_vote.style.display = "none";
  phase_description.style.display = "none";
  phase_resultats.style.display = "inline-block";
});

//saisir mot par mr white
submitMrWhiteBtn.addEventListener("click", () => {
  const mot = mrWhiteInput.value;
  if (mot) {
    socket.emit("submitMrWhite", { mot, playerId });
    mrWhiteInput.value = "";
    for_mr_white.style.display = "none";
  } else {
    alert("Veuillez entrer un mot.");
  }
});

//retours serveur

//recuperer infos du joueur
socket.on("playerInfo", (playerInfo) => {
  playerId = playerInfo.id;
});

//room créé
socket.on("roomCreated", (roomInfo) => {
  showRoom(roomInfo);
});

//mettre à jour la liste des joueurs
socket.on("updatePlayers", (players) => {
  updatePlayersList(players);
});

//room réjointe
socket.on("roomJoined", (roomInfo) => {
  showRoom(roomInfo);
});

//au moins 4 joueurs ok
socket.on("enoughToStart", () => {
  startGameBtn.disabled = false;
});

//au moins 4 joueurs pas ok
socket.on("NotenoughToStart", () => {
  startGameBtn.disabled = true;
});

//le jeu a commencé
socket.on("gameStarted", (gameData) => {
  gameUpdate(gameData);
  currentPhase = "description";
  lobby.style.display = "none";
  room.style.display = "none";
  game.style.display = "block";
  phase_description.style.display = "block";
  playerWord.textContent = gameData.players.find((p) => p.id === playerId).word;
});

//mise à jour liste descriptions
socket.on("updateDescriptions", (updateData) => {
  updateDescriptionsList(updateData);
});

//mise à jour liste discussion
socket.on("updateDiscussion", (updateData) => {
  updateDiscussionList(updateData);
});

//commencer phase vote
socket.on("startVotePhase", (data) => {
  startVote(data);
});

//attente que tout le monde ait voté
socket.on("awaitForResults", () => {
  phase_resultats.style.display = "inline-block";
  result_message.innerText = "Attente des résultats de vote";
});

//affichage container pour que mr white saisisse son mot
socket.on("Screen_for_mr_white", (data) => {
  for_mr_white.style.display = "inline-block";
});

//mr white a été éliminé et va deviner son mot
socket.on("eliminatedMrWhite", (data) => {
  gameUpdate(data.game);
  result_message.innerText = `${data.playerName} a été éliminé(e), c'était ${data.votedAgainst.role}🤵, il va devoir deviner son mot`;
});

//les civils ont gagné
socket.on("civilsWinner", (data) => {
  gameUpdateEnd(data.game);
  result_message.innerText =
    result_message.innerText = `${data.playerName} - ${data.votedAgainst.role} a été éliminé(e), c'était un ${data.votedAgainst.role}, les civils ont gagné 😇🎉👏!`;
});

//les imposteurs ont gagné
socket.on("undercoversWinner", (data) => {
  gameUpdateEnd(data.game);
  result_message.innerText = `${data.playerName} a été éliminé(e), c'était un ${data.votedAgainst.role}, les imposteurs ont gagné 🤵🕵️🎉👏!`;
});

//élimination sans fin de jeu
socket.on("eliminated_simple", (data) => {
  gameUpdate(data.game);
  if (elimine == false) {
    submitDescriptionBtn.style.display = "inline-block";
    descriptionInput.style.display = "inline-block";
    phase_vote.style.display = "none";
  }
  currentPlayerNameElement.style.display = "inline-block";
  result_message.innerText = `${data.playerName} a été éliminé(e), c'était un ${data.votedAgainst.role}`;
  timer();
});

//passage au joueur prochain pour donner une description
socket.on("nextPlayer", ({ nextPlayerId, nextPlayerName }) => {
  if (nextPlayerId == playerId) {
    submitDescriptionBtn.disabled = false;
    currentPlayerNameElement.textContent = "C'est à votre tour!";
  } else {
    submitDescriptionBtn.disabled = true;
    currentPlayerNameElement.textContent = `C'est au tour de : ${nextPlayerName}`;
  }
});

//timer 30s avant prochain tour
function timer() {
  timer_p.style.display = "inline-block";
  let timeRemaining = 30;
  const countdown = setInterval(() => {
    timeRemaining--;
    timer_p.innerText = `Prochain tour dans : ${timeRemaining}`;
    if (timeRemaining <= 0) {
      clearInterval(countdown);
      timer_p.style.display = "none";
      phase_resultats.style.display = "none";
      phase_description.style.display = "inline-block";
    }
  }, 1000);
}

//desactiver bouton envoyer description
socket.on("disable_button", () => {
  submitDescriptionBtn.disabled = true;
});

//mettre à jour l'affichage du joueur eliminé
socket.on("eliminate", () => {
  elimine = true;
  elimine_span.textContent = " Vous avez été éliminé";
  descriptionInput.style.display = "none";
  submitDescriptionBtn.style.display = "none";
  submitVoteBtn.style.display = "none";
  eliminationList.style.display = "none";
});

//mr white a deviné le mot et a gagné
socket.on("mrWhiteWinner", (updateData) => {
  result_message.innerText = `Mr White - ${updateData.name} a deviné le mot ${updateData.mot} et a gagné 🤵🎉👏!`;
  gameUpdateEnd(updateData.game);
});

//mr white n'a pas deviné son mot et la partie continue
socket.on("mrWhiteNoWinner", (updateData) => {
  if (elimine == false) {
    submitDescriptionBtn.style.display = "inline-block";
    descriptionInput.style.display = "inline-block";
    phase_vote.style.display = "none";
  }
  currentPlayerNameElement.style.display = "inline-block";
  result_message.innerText = `Mr White - ${updateData.name} n'a pas deviné le mot, la partie continue !`;
  timer();
});

//mr white n'a pas deviné son mot et les civils ont gagné
socket.on("mrWhiteNoWinnerButCivilsYes", (updateData) => {
  gameUpdateEnd(updateData.game);
  result_message.innerText = `Mr White - ${updateData.name} n'a pas deviné le mot et a été éliminé, les civils ont gagné 😇🎉👏!`;
});

//affichage de la room
function showRoom(roomInfo) {
  lobby.style.display = "none";
  room.style.display = "block";
  roomId.textContent = roomInfo.id;
}

//mettre a jour liste des joueurs
function updatePlayersList(players) {
  playersList.innerHTML = "";
  players.forEach((player) => {
    const li = document.createElement("li");
    li.setAttribute("player-id", player.id);
    li.textContent = player.name;
    playersList.appendChild(li);
  });
}

//mettre a jour la liste des descriptions
function updateDescriptionsList(updateData) {
  const li = document.createElement("li");
  li.textContent = updateData.playerName + " : " + updateData.description;
  li.setAttribute("data-player-id", updateData.playerId);
  descriptionsList.appendChild(li);
}

//mettre a jour la liste du chat
function updateDiscussionList(updateData) {
  const li = document.createElement("li");
  li.textContent = updateData.playerName + " : " + updateData.discussion;
  li.setAttribute("data-player-id", updateData.playerId);
  discussionList.appendChild(li);
}

//commencer le vote
function startVote(data) {
  currentPlayerNameElement.style.display = "none";

  if (elimine == false) {
    submitDescriptionBtn.style.display = "none";
    descriptionInput.style.display = "none";
    phase_vote.style.display = "inline-block";
  } else {
    phase_vote.style.display = "none";
    phase_description.style.display = "none";
    result_message.innerText = "Attente des résultats de vote";
    phase_resultats.style.display = "inline-block";
  }
  eliminationList.innerHTML = "";
  const players_not_eliminated = data.players.filter(
    (player) => !player.eliminated,
  );
  const players_filtred = players_not_eliminated.filter(
    (player) => player.id != playerId,
  );
  players_filtred.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = `${player.name}`;
    eliminationList.appendChild(option);
  });
}

//mettre a jour l'affichage de la liste des joueurs pendant le jeu
function gameUpdate(game) {
  let civilsAlive = 0;
  let undercoversAlive = 0;
  let mrWhiteAlive = 0;

  game.players.forEach((player) => {
    if (player && !player.eliminated) {
      if (player.role === "civil") {
        civilsAlive++;
      } else if (player.role === "undercover") {
        undercoversAlive++;
      } else if (player.role === "mr_white") {
        mrWhiteAlive++;
      }
    }
  });
  alive_players_p.innerText = `${civilsAlive} civils vivants\n${undercoversAlive} undercovers vivants\n${mrWhiteAlive} Mr Whites vivants`;
  players_list.innerHTML = "";
  game.players.forEach((player) => {
    const li = document.createElement("li");
    li.setAttribute("player-id", player.id);
    if (player && player.eliminated) {
      li.innerHTML = `${player.name} - ${player.role} 💀`;
    } else {
      li.textContent = player.name;
    }
    players_list.appendChild(li);
  });
}

//mettre a jour l'affichage de la liste des joueurs à la fin du jeu
function gameUpdateEnd(game) {
  let civilsAlive = 0;
  let undercoversAlive = 0;
  let mrWhiteAlive = 0;

  game.players.forEach((player) => {
    if (player && !player.eliminated) {
      if (player.role === "civil") {
        civilsAlive++;
      } else if (player.role === "undercover") {
        undercoversAlive++;
      } else if (player.role === "mr_white") {
        mrWhiteAlive++;
      }
    }
  });
  alive_players_p.innerText = `${civilsAlive} civils vivants\n${undercoversAlive} undercovers vivants\n${mrWhiteAlive} Mr Whites vivants`;
  players_list.innerHTML = "";
  game.players.forEach((player) => {
    const li = document.createElement("li");
    li.setAttribute("player-id", player.id);
    if (player && player.eliminated) {
      li.innerHTML = `${player.name} - ${player.role} 💀`;
    } else {
      li.innerHTML = `${player.name} - ${player.role}`;
    }
    players_list.appendChild(li);
  });
}

//copier l'id de la salle dans le presse papier
document.getElementById("copy-room-id").addEventListener("click", () => {
  const roomId = document.getElementById("room-id").textContent;
  const tempInput = document.createElement("input");
  document.body.appendChild(tempInput);
  tempInput.value = roomId;
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
});