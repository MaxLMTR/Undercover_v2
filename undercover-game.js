class Player {
  constructor(id, username) {
      this.id = id;
      this.username = username;
      this.role = null;
      this.secretWord = null;
      this.description = null;
      this.vote = null;
      this.eliminated = false;
  }
}

class UndercoverGame {
  constructor() {
      this.players = [];
      this.currentPhase = null;
      this.currentPlayerIndex = 0;
  }

  addPlayer(id, username) {
      const player = new Player(id, username);
      this.players.push(player);
  }

  removePlayer(id) {
      this.players = this.players.filter((player) => player.id !== id);
  }

  startGame() {
      this.assignRolesAndWords();
      this.currentPhase = 'description';
      this.currentPlayerIndex = 0;
  }

  assignRolesAndWords() {
      // Implémentez ici la logique pour attribuer les rôles et les mots secrets aux joueurs
  }

  nextPhase() {
      if (this.currentPhase === 'description') {
          this.currentPhase = 'discussion';
      } else if (this.currentPhase === 'discussion') {
          this.currentPhase = 'elimination';
      } else if (this.currentPhase === 'elimination') {
          this.currentPhase = 'description';
      }
      this.currentPlayerIndex = 0;
  }

  addDescription(playerId, description) {
      const player = this.players.find((player) => player.id === playerId);
      player.description = description;
  }

  nextPlayer() {
      this.currentPlayerIndex++;
  }

  isPhaseOver() {
      if (this.currentPhase === 'description') {
          return this.currentPlayerIndex >= this.players.length;
      } else if (this.currentPhase === 'elimination') {
          return this.players.every((player) => player.vote !== null);
      }
      return false;
  }

  addVote(playerId, playerToEliminate) {
      const player = this.players.find((player) => player.id === playerId);
      player.vote = playerToEliminate;
  }

  eliminatePlayer() {
      // Implémentez ici la logique pour éliminer le joueur avec le plus de votes
  }

  isGameOver() {
      // Implémentez ici la logique pour vérifier si le jeu est terminé en fonction des règles du jeu
  }

  getWinners() {
      // Implémentez ici la logique pour déterminer les gagnants en fonction des règles du jeu
  }

  resetGame() {
      this.players = [];
      this.currentPhase = null;
      this.currentPlayerIndex = 0;
  }
}

module.exports = { UndercoverGame };
