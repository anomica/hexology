import { store } from '../store/index.js';
import { evaluateCombat } from './hexbotUtils.js';

const boardRelationships = {
  0: [1, 4],
  1: [0, 2, 4, 5],
  2: [1, 3, 5, 6],
  3: [2, 6],
  4: [0, 1, 5, 7, 8],
  5: [1, 2, 4, 6, 8, 9],
  6: [2, 3, 5, 9, 10],
  7: [4, 8, 11],
  8: [4, 5, 7, 9, 11, 12],
  9: [5, 6, 8, 10, 12, 13],
  10: [6, 9, 13],
  11: [7, 8, 12, 14, 15],
  12: [8, 9, 11, 13, 15, 16],
  13: [9, 10, 12, 16, 17],
  14: [11, 15],
  15: [11, 12, 14, 16],
  16: [12, 13, 15, 17],
  17: [13, 16]
}

const hexbot = (state = store.getState().state) => {
  const socket = state.socket;
  const room = state.room;
  let boardState = state.boardState;
  let gameIndex = state.gameIndex;
  let playerOneTotalUnits = state.playerOneTotalUnits, playerTwoTotalUnits = state.playerTwoTotalUnits;
  let playerOneResources = state.playerOneResources, playerTwoResources = state.playerTwoResources;
  let playerOneUnitBank = state.playerOneUnitBank, playerTwoUnitBank = state.playerTwoUnitBank;
  let bestMove = [0, Number.NEGATIVE_INFINITY]; // first number denotes index of hex to move to, second is heuristic of move


  let turnCounter = 2;
  let botHexes = [], playerHexes = [], adjacentEnemies = {}, secondaryEnemies = {};
  boardState.forEach(hex => {
    if (hex.player === 'player2') {
      let hexIndex = boardState.indexOf(hex);
      botHexes.push(hexIndex);
      boardRelationships[hexIndex].forEach(neighbor => {
        if (boardState[neighbor].player === 'player1') {
          adjacentEnemies.hasOwnProperty(hexIndex) ?
          adjacentEnemies[hexIndex].threats.push(neighbor) : adjacentEnemies[hexIndex] = { threats: [neighbor] };
        }
        boardRelationships[neighbor].forEach(otherNeighbor => {
          if (boardState[otherNeighbor].player === 'player1' && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            secondaryEnemies.hasOwnProperty(hexIndex)
            && secondaryEnemies[hexIndex].threats.indexOf(otherNeighbor) === -1 ?
            secondaryEnemies[hexIndex].threats.push(otherNeighbor) : secondaryEnemies[hexIndex] = { threats: [otherNeighbor] };
          }
        })
      })
    } else if (hex.player === 'player1') {
      playerHexes.push(boardState.indexOf(hex));
    }
  });

  if (Object.keys(adjacentEnemies).length !== 0) {
    for (let botHex in adjacentEnemies) {
      adjacentEnemies[botHex].threats.forEach(threat => {
        let outcome = evaluateCombat(boardState[botHex], boardState[threat]);
        adjacentEnemies[botHex][threat] = outcome;
      })
    }
  }

  if (Object.keys(secondaryEnemies).length !== 0) {
    for (let botHex in secondaryEnemies) {
      secondaryEnemies[botHex].threats.forEach(threat => {
        let outcome = evaluateCombat(boardState[botHex], boardState[threat]);
        secondaryEnemies[botHex][threat] = outcome;
      })
    }
  }

  let alpha = Number.NEGATIVE_INFINITY, beta = Number.POSITIVE_INFINITY;

  const heuristic = (units, resources, bank, hexes) => {
    let value = units + (resources / 2) + (botBank / 3) + (hexes.length / 4);
  }
}

export default hexbot;