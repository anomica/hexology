import { store } from '../store/index.js';
import { evaluateCombat } from './hexbotUtils.js';
import { botMove, botPurchase } from './hexbotActions.js';
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
  let possibleMoves = {}, possibleNextTurnMoves = {}, moveValues = {};
  let bestMove = [null, null, Number.NEGATIVE_INFINITY]; // first number denotes index of hex to move from, second is hex to move to, third is heuristic of move
  let intermediateMove = [null, null, Number.NEGATIVE_INFINITY]; // also need to track intermediate move to decide on purchase
  let purchase = [];

  let turnCounter = 2;
  let botHexes = [], playerHexes = [], adjacentEnemies = {}, secondaryEnemies = {}, adjacentResources = {}, secondaryResources = {}; // collect all adjacent and secondary adjacent threats and resources
  boardState.forEach(hex => { // check each hex on the board
    let hexIndex = boardState.indexOf(hex);
    if (hex.player === 'player2') { // if player 2,
      botHexes.push(hexIndex); // it's a bot hex
      boardRelationships[hexIndex].forEach(neighbor => { // so check each of its neighbors
        possibleMoves.hasOwnProperty(hexIndex) ? possibleMoves[hexIndex][neighbor] = {} : possibleMoves[hexIndex] = { [neighbor]: {} };
        if (boardState[neighbor].player === 'player1') { // if that neighbor has player one in it, it's owned by the player and is a threat
          adjacentEnemies.hasOwnProperty(hexIndex) ?
          adjacentEnemies[hexIndex].threats.push(neighbor) : adjacentEnemies[hexIndex] = { threats: [neighbor] }; // so store it
        }

        if (boardState[neighbor].hasGold) { // same process for resources
          adjacentResources.hasOwnProperty(hexIndex) ?
          adjacentResources[hexIndex].resources.push([neighbor, 'gold']) : adjacentResources[hexIndex] = { resources: [[neighbor, 'gold']] };
          possibleMoves[hexIndex][neighbor].gold = true;
        } else if (boardState[neighbor].hasWood) {
          adjacentResources.hasOwnProperty(hexIndex) ?
          adjacentResources[hexIndex].resources.push([neighbor, 'wood']) : adjacentResources[hexIndex] = { resources: [[neighbor, 'wood']] };
          possibleMoves[hexIndex][neighbor].wood = true;
        } else if (boardState[neighbor].hasMetal) {
          adjacentResources.hasOwnProperty(hexIndex) ?
          adjacentResources[hexIndex].resources.push([neighbor, 'metal']) : adjacentResources[hexIndex] = { resources: [[neighbor, 'metal']] };
          possibleMoves[hexIndex][neighbor].metal = true;
        }

        boardRelationships[neighbor].forEach(otherNeighbor => { // same process for secondary neighbors, both threats and resources
            if (possibleNextTurnMoves.hasOwnProperty(hexIndex)) {
              possibleNextTurnMoves[hexIndex][neighbor] = { ...possibleNextTurnMoves[hexIndex][neighbor], [otherNeighbor]: {} }
            } else {
              possibleNextTurnMoves[hexIndex] = {};
              possibleNextTurnMoves[hexIndex][neighbor] = {};
              possibleNextTurnMoves[hexIndex][neighbor] = { [otherNeighbor]: {} }
            }
          if (boardState[otherNeighbor].player === 'player1' && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            if (!secondaryEnemies.hasOwnProperty(hexIndex)) {
              secondaryEnemies[hexIndex] = {};
              secondaryEnemies[hexIndex][neighbor] = {}
              secondaryEnemies[hexIndex][neighbor].threats = [otherNeighbor];
            } else if (secondaryEnemies.hasOwnProperty(hexIndex) && !secondaryEnemies[hexIndex].hasOwnProperty(neighbor)) {
              secondaryEnemies[hexIndex][neighbor] = {};
              secondaryEnemies[hexIndex][neighbor].threats = [otherNeighbor];
            } else {
              if (secondaryEnemies[hexIndex][neighbor].threats.indexOf(otherNeighbor) === -1) {
                secondaryEnemies[hexIndex][neighbor].threats.push(otherNeighbor);
              }
            }
          }

          if (boardState[otherNeighbor].hasGold && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            secondaryResources.hasOwnProperty(hexIndex) ?
            secondaryResources[hexIndex].resources.push([otherNeighbor, 'gold']) : secondaryResources[hexIndex] = { resources: [[otherNeighbor, 'gold']] };
            possibleNextTurnMoves[hexIndex][neighbor][otherNeighbor].gold = true;
          } else if (boardState[otherNeighbor].hasWood && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            secondaryResources.hasOwnProperty(hexIndex) ?
            secondaryResources[hexIndex].resources.push([otherNeighbor, 'wood']) : secondaryResources[hexIndex] = { resources: [[otherNeighbor, 'wood']] };
            possibleNextTurnMoves[hexIndex][neighbor][otherNeighbor].wood = true;
          } else if (boardState[otherNeighbor].hasMetal && boardRelationships[hexIndex].indexOf(otherNeighbor) === -1) {
            secondaryResources.hasOwnProperty(hexIndex) ?
            secondaryResources[hexIndex].resources.push([otherNeighbor, 'metal']) : secondaryResources[hexIndex] = { resources: [[otherNeighbor, 'metal']] };
            possibleNextTurnMoves[hexIndex][neighbor][otherNeighbor].metal = true;
          }
        })
      })
    } else if (hex.player === 'player1') {
      playerHexes.push(boardState.indexOf(hex)); // also collect player (enemy) hexes to use in event that no neighbors or secondary neighbors present themselves
    }
  });

  if (Object.keys(adjacentEnemies).length !== 0) { // check all adjacent enemies
    for (let botHex in adjacentEnemies) {
      adjacentEnemies[botHex].threats.forEach(threat => {
        let outcome = evaluateCombat(boardState[botHex], boardState[threat], botTotalUnits, playerTotalUnits);
        adjacentEnemies[botHex][threat] = outcome; // collect result of that combat in adjacent enemies object
      })
      delete adjacentEnemies[botHex].threats;
    }
  }

  if (Object.keys(secondaryEnemies).length !== 0) { // same for secondary threats
    for (let botHex in secondaryEnemies) {
      for (let neighbor in secondaryEnemies[botHex]) {
        secondaryEnemies[botHex][neighbor].threats.forEach(threat => {
          let outcome = evaluateCombat(boardState[botHex], boardState[threat], botTotalUnits, playerTotalUnits);
          secondaryEnemies[botHex][neighbor][threat] = outcome;
        })
        delete secondaryEnemies[botHex][neighbor].threats;
      }
    }
  }

  if (Object.keys(adjacentEnemies).length > 0) { // after all primary and secondary threats collected, deal with adjacent enemies
    for (let botHex in adjacentEnemies) {
      for (let combatIndex in adjacentEnemies[botHex]) { // simulate each combat
        if (adjacentEnemies[botHex][combatIndex].tie || adjacentEnemies[botHex][combatIndex].armyDiff < 0) { // if the combat results in a tie or a loss,
          let newOutcome = evaluateCombatAfterPurchase(adjacentEnemies[botHex][combatIndex], combatIndex, botResources, botHex, boardState, botTotalUnits, playerTotalUnits); // determine if a purchase the bot can make would change outcome
          if (newOutcome.path && !newOutcome.tie) { // if a purchase could lead to a win,
            possibleMoves[botHex][combatIndex] = {
              ...possibleMoves[botHex][combatIndex],
              purchase: newOutcome.path,
              cost: newOutcome.cost,
              winCombat: true,
              armyDiff: newOutcome.armyDiff,
              gameOver: newOutcome.gameOver
            }
          } else if (newOutcome.tie) { // if a purchase could lead to a tie,
            possibleMoves[botHex][combatIndex] = {
              ...possibleMoves[botHex][combatIndex],
              purchase: newOutcome.path,
              cost: newOutcome.cost,
              tie: true,
              armyDiff: newOutcome.armyDiff,
              gameOver: newOutcome.gameOver
            }
          } else { // if a purchase cannot lead to a win,
            possibleMoves[botHex][combatIndex] = {
              ...possibleMoves[botHex][combatIndex],
              loseCombat: true,
              armyDiff: newOutcome.armyDiff,
              gameOver: newOutcome.gameOver
            }
          }
        } else { // if an attack will win outright
          possibleMoves[botHex][combatIndex] = {
            ...possibleMoves[botHex][combatIndex],
            winCombat: true,
            gameOver: adjacentEnemies[botHex][combatIndex].gameOver
          }
        }
      }
    }
  }

  if (Object.keys(secondaryEnemies).length > 0) { // then do the same for secondary enemies
    for (let botHex in secondaryEnemies) {
      for (let neighbor in secondaryEnemies[botHex]) {
        for (let combatIndex in secondaryEnemies[botHex][neighbor]) { // simulate each combat
          if (secondaryEnemies[botHex][neighbor][combatIndex].tie || secondaryEnemies[botHex][neighbor][combatIndex].armyDiff < 0) { // if the combat results in a tie or a loss,
            let newOutcome = evaluateCombatAfterPurchase(secondaryEnemies[botHex][neighbor][combatIndex], combatIndex, botResources, botHex, boardState, botTotalUnits, playerTotalUnits); // determine if a purchase the bot can make would change outcome
            if (newOutcome.path && !newOutcome.tie) { // if a purchase could lead to a win,
              possibleNextTurnMoves[botHex][neighbor][combatIndex] = {
                purchase: newOutcome.path,
                cost: newOutcome.cost,
                winCombat: true,
                nextTurn: true,
                armyDiff: newOutcome.armyDiff,
                gameOver: newOutcome.gameOver
              }
            } else if (newOutcome.tie) { // if a purchase could lead to a tie,
              possibleNextTurnMoves[botHex][neighbor][combatIndex] = {
                [combatIndex]: {
                  purchase: newOutcome.path,
                  cost: newOutcome.cost,
                  tie: true,
                  nextTurn: true,
                  armyDiff: newOutcome.armyDiff,
                  gameOver: newOutcome.gameOver
                }
              }
            } else { // if a purchase cannot lead to a win,
              possibleNextTurnMoves[botHex][neighbor][combatIndex] = {
                [combatIndex]: {
                  loseCombat: true,
                  nextTurn: true,
                  armyDiff: newOutcome.armyDiff,
                  gameOver: newOutcome.gameOver
                }
              }
            }
          } else { // if an attack will win outright
            possibleNextTurnMoves[botHex][neighbor][combatIndex] = {
              [combatIndex]: {
                winCombat: true,
                nextTurn: true,
                armyDiff: newOutcome.armyDiff,
                gameOver: newOutcome.gameOver
              }
            }
          }
        }
      }
    }
  }

  evaluateMoves();

  function evaluateMoves() {
    for (let botHex in possibleMoves) {
      for (let move in possibleMoves[botHex]) {
        let value = heuristic(botHex, possibleMoves[botHex][move], move, true);
        if (!moveValues.hasOwnProperty(botHex)) {
          moveValues[botHex] = {};
        }
        moveValues[botHex][move] = value;
      }
    }
  }

  function heuristic(botHex, target, targetId, flag) {
    let value = 0;

    if (target.gameOver === 'win') {
      if (flag) {
        return Number.POSITIVE_INFINITY;
      } else {
        value += 100;
      }
    }
    if (target.gameOver === 'lose') {
      if (flag) {
        return Number.NEGATIVE_INFINITY;
      } else {
        value -= 100;
      }
    }
    if (target.gameOver === 'tie') {
      if (flag) {
        return 0;
      } else {
        value -= 30;
      }
    }

    if (target.winCombat) value += 75 - target.cost + (target.ArmyDiff ? target.armyDiff : null);
    if (target.loseCombat) value -= 75 - (target.ArmyDiff ? target.armyDiff : null);
    if (target.gold) value += 15;
    if (target.wood) value += 15;
    if (target.metal) value += 15;
    if (target.purchase && !purchase) {
      purchase = target.purchase;
    }

    if (flag) value += evaluateSecondaryMoves(botHex, targetId);

    return value;
  }

  function evaluateSecondaryMoves(botHex, targetId) {
    let value = 0;
    let target = possibleNextTurnMoves[botHex][targetId];
    for (let nextMove in target) {
      let intermediateValue = heuristic(null, target[nextMove], null, null);
      value += intermediateValue;
      if (intermediateValue > intermediateMove[2]) {
        intermediateMove = [targetId, nextMove, intermediateValue];
      }
    }
    return value;
  }

  function evaluateCombatAfterPurchase(combat, combatIndex, resources, botHex, boardState, botTotalUnits, playerTotalUnits) {
    let tempBoardState = _.cloneDeep(boardState);
    botHex = tempBoardState[botHex];
    let combatHex = tempBoardState[combatIndex];
    resources = _.cloneDeep(resources);

    let cheapest = Number.POSITIVE_INFINITY;
    let path = false;
    let tie = false;
    let armyDiff = 0, loseCombat, winCombat, gameOver;

    victoryPossibleThisTurn(botHex, combatHex, resources.gold, resources.wood, resources.metal, [], 0, false, botTotalUnits, playerTotalUnits);
    !path && victoryPossibleThisTurn(botHex, combatHex, resources.gold, resources.wood, resources.metal, [], 0, true, botTotalUnits, playerTotalUnits);

    function victoryPossibleThisTurn(botHex, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag, botTotalUnits, playerTotalUnits) {
      if (gold >= 10 && metal >= 10) {
        buySwordsmen(botHex, combatHex, gold - 10, wood, metal - 10, purchases.concat('swordsmen'), resourceCost + 20, tieFlag, botTotalUnits + 10, playerTotalUnits)
      }
      if (gold >= 10 && wood >= 20) {
        buyArchers(botHex, combatHex, gold - 10, wood - 20, metal, purchases.concat('archers'), resourceCost + 30, tieFlag, botTotalUnits + 10, playerTotalUnits)
      }
      if (gold >= 20 && wood >= 20 && metal >= 20) {
        buyKnights(botHex, combatHex, gold - 20, wood - 20, metal - 20, purchases.concat('knights'), resourceCost + 60, tieFlag, botTotalUnits + 10, playerTotalUnits)
      }
    }

    function buySwordsmen(botHex, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag, botTotalUnits, playerTotalUnits) {
      let botHexCopy = _.cloneDeep(botHex);
      botHexCopy.swordsmen += 10;

      let outcome = evaluateCombat(botHexCopy, combatHex, botTotalUnits, playerTotalUnits);
      if (tieFlag ? outcome.tie : outcome.armyDiff > 0 && !outcome.tie) {
        if (resourceCost < cheapest) {
          cheapest = resourceCost;
          path = purchases;
          tieFlag ? tie = true : null;
          armyDiff = outcome.armyDiff;
          outcome.winCombat ? winCombat = true : null;
          outcome.loseCombat ? loseCombat = true : null;
          outcome.gameOver ? gameOver = outcome.gameOver : null;
        }
      } else {
        victoryPossibleThisTurn(botHexCopy, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag, botTotalUnits, playerTotalUnits);
      }
    }

    function buyArchers(botHex, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag, botTotalUnits, playerTotalUnits) {
      let botHexCopy = _.cloneDeep(botHex);
      botHexCopy.archers += 10;

      let outcome = evaluateCombat(botHexCopy, combatHex, botTotalUnits, playerTotalUnits);
      if (tieFlag ? outcome.tie : outcome.armyDiff > 0 && !outcome.tie) {
        if (resourceCost < cheapest) {
          cheapest = resourceCost;
          path = purchases;
          tieFlag ? tie = true : null;
          outcome.winCombat ? winCombat = true : null;
          outcome.loseCombat ? loseCombat = true : null;
          outcome.gameOver ? gameOver = outcome.gameOver : null;
        }
      } else {
        victoryPossibleThisTurn(botHexCopy, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag, botTotalUnits, playerTotalUnits);
      }
    }

    function buyKnights(botHex, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag, botTotalUnits, playerTotalUnits) {
      let botHexCopy = _.cloneDeep(botHex);
      botHexCopy.knights += 10;

      let outcome = evaluateCombat(botHexCopy, combatHex, botTotalUnits, playerTotalUnits);
      if (tieFlag ? outcome.tie : outcome.armyDiff > 0 && !outcome.tie) {
        if (resourceCost < cheapest) {
          cheapest = resourceCost;
          path = purchases;
          tieFlag ? tie = true : null;
          outcome.winCombat ? winCombat = true : null;
          outcome.loseCombat ? loseCombat = true : null;
          outcome.gameOver ? gameOver = outcome.gameOver : null;
        }
      } else {
        victoryPossibleThisTurn(botHexCopy, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag, botTotalUnits, playerTotalUnits);
      }
    }

    if (cheapest <= Number.POSITIVE_INFINITY) {
      return {
        path: path,
        tie: tie,
        cost: cheapest,
        armyDiff: armyDiff,
        winCombat: winCombat,
        loseCombat: loseCombat,
        gameOver: gameOver
      }
    } else {
      return false;
    }
  }

  for (let hex in moveValues) {
    for (let move in moveValues[hex]) {
      if (moveValues[hex][move] > bestMove[2]) {
        bestMove = [hex, move, moveValues[hex][move]];
      }
    }
  }

  let origin = boardState[bestMove[0]];
  let target = boardState[bestMove[1]];

  let updatedOrigin = {
    ...origin,
    swordsmen: 0,
    archers: 0,
    knights: 0,
    player: null
  }

  let updatedTarget = {
    ...target,
    swordsmen: origin.swordsmen,
    archers: origin.archers,
    knights: origin.knights,
    player: 'player2'
  }

  console.log(possibleNextTurnMoves, bestMove, intermediateMove[1])
  if (possibleMoves[bestMove[0]][bestMove[1]].purchase) {
    purchase = possibleMoves[bestMove[0]][bestMove[1]].purchase;
    botEnactPurchase(purchase);
  } else if (possibleNextTurnMoves[bestMove[0]][bestMove[1]][intermediateMove[1]].purchase) {
    purchase = possibleNextTurnMoves[bestMove[0]][bestMove[1]][intermediateMove[1]].purchase;
    botEnactPurchase(purchase);
  } else if (purchase) {
    botEnactPurchase(purchase);
  }

  function botEnactPurchase(purchase) {
    purchase.forEach(unit => {
      if (unit === 'swordsmen') {
        botResources.gold -= 10;
        botResources.metal -= 10;
        updatedTarget.swordsmen += 10;
      } else if (unit === 'archers') {
        botResources.gold -= 10;
        botResources.wood -= 20;
        updatedTarget.archers += 10;
      } else if (unit === 'knights') {
        botResources.gold -= 20;
        botResources.wood -= 20;
        botResources.metal -= 20;
        updatedTarget.knights += 10;
      }
      botTotalUnits += 10;
    })
    store.dispatch(botPurchase(botResources));
  }

  socket.emit('botMove', {
    updatedOrigin: updatedOrigin,
    originIndex: bestMove[0],
    updatedTarget: updatedTarget,
    targetIndex: bestMove[1],
    gameIndex: gameIndex,
    room: room,
    currentPlayer: 'player2',
    socketId: socket.id,
    resources: purchase.length ? botResources : null,
    purchase: purchase,
    botTotalUnits: botTotalUnits
  });

  store.dispatch(botMove(updatedOrigin, bestMove[0], updatedTarget, bestMove[1]));

  let alpha = Number.NEGATIVE_INFINITY, beta = Number.POSITIVE_INFINITY;
}

export default hexbot;
