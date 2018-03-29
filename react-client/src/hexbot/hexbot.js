import { store } from '../store/index.js';
import { evaluateCombat } from './hexbotUtils.js';
import _ from 'lodash';

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
  let playerTotalUnits = state.playerOneTotalUnits, botTotalUnits = state.playerTwoTotalUnits;
  let playerResources = state.playerOneResources, botResources = state.playerTwoResources;
  let playerUnitBank = state.playerOneUnitBank, botUnitBank = state.playerTwoUnitBank;
  let bestMove = [0, Number.NEGATIVE_INFINITY]; // first number denotes index of hex to move to, second is heuristic of move


  let turnCounter = 2;
  let botHexes = [], playerHexes = [], adjacentEnemies = {}, secondaryEnemies = {}, adjacentResources = {}, secondaryResources = {}; // collect all adjacent and secondary adjacent threats and resources
  boardState.forEach(hex => {
    let hexIndex = boardState.indexOf(hex);
    if (hex.player === 'player2') {
      botHexes.push(hexIndex);
      boardRelationships[hexIndex].forEach(neighbor => {
        if (boardState[neighbor].player === 'player1') {
          adjacentEnemies.hasOwnProperty(hexIndex) ?
          adjacentEnemies[hexIndex].threats.push(neighbor) : adjacentEnemies[hexIndex] = { threats: [neighbor] };
        }

        if (boardState[neighbor].hasGold) {
          adjacentResources.hasOwnProperty(hexIndex) ?
          adjacentResources[hexIndex].resources.push([neighbor, 'gold']) : adjacentResources[hexIndex] = { resources: [[neighbor, 'gold']] };
        } else if (boardState[neighbor].hasWood) {
          adjacentResources.hasOwnProperty(hexIndex) ?
          adjacentResources[hexIndex].resources.push([neighbor, 'wood']) : adjacentResources[hexIndex] = { resources: [[neighbor, 'wood']] };
        } else if (boardState[neighbor].hasMetal) {
          adjacentResources.hasOwnProperty(hexIndex) ?
          adjacentResources[hexIndex].resources.push([neighbor, 'metal']) : adjacentResources[hexIndex] = { resources: [[neighbor, 'metal']] };
        }

        boardRelationships[neighbor].forEach(otherNeighbor => {
          if (boardState[otherNeighbor].player === 'player1' && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            secondaryEnemies.hasOwnProperty(hexIndex)
            && secondaryEnemies[hexIndex].threats.indexOf(otherNeighbor) === -1 ?
            secondaryEnemies[hexIndex].threats.push(otherNeighbor) : secondaryEnemies[hexIndex] = { threats: [otherNeighbor] };
          }

          if (boardState[otherNeighbor].hasGold && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            secondaryResources.hasOwnProperty(hexIndex) ?
            secondaryResources[hexIndex].resources.push([otherNeighbor, 'gold']) : secondaryResources[hexIndex] = { resources: [[otherNeighbor, 'gold']] };
          } else if (boardState[otherNeighbor].hasWood && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            secondaryResources.hasOwnProperty(hexIndex) ?
            secondaryResources[hexIndex].resources.push([otherNeighbor, 'wood']) : secondaryResources[hexIndex] = { resources: [[otherNeighbor, 'wood']] };
          } else if (boardState[otherNeighbor].hasMetal && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            secondaryResources.hasOwnProperty(hexIndex) ?
            secondaryResources[hexIndex].resources.push([otherNeighbor, 'metal']) : secondaryResources[hexIndex] = { resources: [[otherNeighbor, 'metal']] };
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

  if (Object.keys(adjacentEnemies).length > 0) {
    for (let botHex in adjacentEnemies) {
      for (let combatIndex in adjacentEnemies[botHex]) {
        if (adjacentEnemies[botHex][combatIndex].tie || adjacentEnemies[botHex][combatIndex].armyDiff < 0) {
          evaluateCombatAfterPurchase(adjacentEnemies[botHex][combatIndex], combatIndex, botResources, botHex, boardState);
        }
      }
    }
  }

  function evaluateCombatAfterPurchase(combat, combatIndex, resources, botHex, boardState) {
    let tempBoardState = _.cloneDeep(boardState);
    let swordsmenPurchase = false, archersPurchase = false, knightsPurchase = false;
    if (resources.gold >= 10 && resources.wood >= 20) {
      tempBoardState[botHex].archers += 10;
      let outcome = evaluateCombat(tempBoardState[botHex], tempBoardState[combatIndex]);
      if (outcome.armyDiff > 0 || outcome.tie) {
        archersPurchase = true;
      }
    }
    if (resources.gold >= 20 && resources.wood >= 20 && resources.metal >= 20) {
      tempBoardState[botHex].knights += 10;
      let outcome = evaluateCombat(tempBoardState[botHex], tempBoardState[combatIndex]);
      if (outcome.armyDiff > 0 || outcome.tie) {
        knightsPurchase = true;
      }
    }
    if (resources.gold >= 10 && resources.wood >= 10) {
      tempBoardState[botHex].swordsmen += 10;
      let outcome = evaluateCombat(tempBoardState[botHex], tempBoardState[combatIndex]);
      if (outcome.armyDiff > 0 || outcome.tie) {
        swordsmenPurchase = true;
      }
    }
  }

  let alpha = Number.NEGATIVE_INFINITY, beta = Number.POSITIVE_INFINITY;

  const heuristic = (units, resources, bank, hexes) => {
    let value = units + (resources / 2) + (botBank / 3) + (hexes.length / 4);
  }
}

export default hexbot;
