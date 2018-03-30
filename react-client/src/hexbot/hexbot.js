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
  let possibleMoves = {}, possibleNextTurnMoves = {};
  let bestMove = [0, Number.NEGATIVE_INFINITY]; // first number denotes index of hex to move to, second is heuristic of move


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

        // secondaryEnemies = _.cloneDeep(adjacentEnemies);
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
            } else if (secondaryEnemies[hexIndex][neighbor].threats.indexOf(otherNeighbor) === -1) {
              secondaryEnemies[hexIndex][neighbor].threats.push(otherNeighbor);
            }
          }
          console.log('***************', secondaryEnemies);

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
        let outcome = evaluateCombat(boardState[botHex], boardState[threat]);
        adjacentEnemies[botHex][threat] = outcome; // collect result of that combat in adjacent enemies object
      })
      delete adjacentEnemies[botHex].threats;
    }
  }

  console.log('--------------', secondaryEnemies);
  // if (Object.keys(secondaryEnemies).length !== 0) { // same for secondary threats
  //   for (let botHex in secondaryEnemies) {
  //     for (let neighbor in secondaryEnemies[botHex]) {
  //       secondaryEnemies[botHex][neighbor].threats.forEach(threat => {
  //         let outcome = evaluateCombat(boardState[botHex], boardState[threat]);
  //         secondaryEnemies[botHex][neighbor][threat] = outcome;
  //       })
  //     }
  //     delete secondaryEnemies[botHex].threats;
  //   }
  // }


  if (Object.keys(adjacentEnemies).length > 0) { // after all primary and secondary threats collected, deal with adjacent enemies
    for (let botHex in adjacentEnemies) {
      for (let combatIndex in adjacentEnemies[botHex]) { // simulate each combat
        if (adjacentEnemies[botHex][combatIndex].tie || adjacentEnemies[botHex][combatIndex].armyDiff < 0) { // if the combat results in a tie or a loss,
          let newOutcome = evaluateCombatAfterPurchase(adjacentEnemies[botHex][combatIndex], combatIndex, botResources, botHex, boardState); // determine if a purchase the bot can make would change outcome
          if (newOutcome.path && !newOutcome.tie) { // if a purchase could lead to a win,
            possibleMoves[botHex][combatIndex] = {
              ...possibleMoves[botHex][combatIndex],
              purchase: newOutcome.path,
              cost: newOutcome.cost,
              winCombat: true
            }
          } else if (newOutcome.tie) { // if a purchase could lead to a tie,
            possibleMoves[botHex][combatIndex] = {
              ...possibleMoves[botHex][combatIndex],
              purchase: newOutcome.path,
              cost: newOutcome.cost,
              tie: true
            }
          } else { // if a purchase cannot lead to a win,
            possibleMoves[botHex][combatIndex] = {
              ...possibleMoves[botHex][combatIndex],
              loseCombat: true
            }
          }
        } else { // if an attack will win outright
          possibleMoves[botHex][combatIndex] = {
            ...possibleMoves[botHex][combatIndex],
            winCombat: true
          }
        }
      }
    }
  }

  // if (Object.keys(secondaryEnemies).length > 0) { // then do the same for secondary enemies
  //   for (let botHex in secondaryEnemies) {
  //     for (let combatIndex in secondaryEnemies[botHex]) { // simulate each combat
  //       if (secondaryEnemies[botHex][combatIndex].tie || secondaryEnemies[botHex][combatIndex].armyDiff < 0) { // if the combat results in a tie or a loss,
  //         let newOutcome = evaluateCombatAfterPurchase(secondaryEnemies[botHex][combatIndex], combatIndex, botResources, botHex, boardState); // determine if a purchase the bot can make would change outcome
  //         if (newOutcome.path && !newOutcome.tie) { // if a purchase could lead to a win,
  //           possibleNextTurnMoves[botHex][combatIndex] = {
  //             purchase: newOutcome.path,
  //             cost: newOutcome.cost,
  //             winCombat: true,
  //             nextTurn: true
  //           }
  //         } else if (newOutcome.tie) { // if a purchase could lead to a tie,
  //           possibleNextTurnMoves[botHex][combatIndex] = {
  //             [combatIndex]: {
  //               purchase: newOutcome.path,
  //               cost: newOutcome.cost,
  //               tie: true,
  //               nextTurn: true
  //             }
  //           }
  //         } else { // if a purchase cannot lead to a win,
  //           possibleNextTurnMoves[botHex][combatIndex] = {
  //             [combatIndex]: {
  //               loseCombat: true,
  //               nextTurn: true
  //             }
  //           }
  //         }
  //       } else { // if an attack will win outright
  //         possibleNextTurnMoves[botHex][combatIndex] = {
  //           [combatIndex]: {
  //             winCombat: true,
  //             nextTurn: true
  //           }
  //         }
  //       }
  //     }
  //   }
  // }

  function evaluateCombatAfterPurchase(combat, combatIndex, resources, botHex, boardState) {
    let tempBoardState = _.cloneDeep(boardState);
    botHex = tempBoardState[botHex];
    let combatHex = tempBoardState[combatIndex];
    resources = _.cloneDeep(resources);

    let cheapest = Number.POSITIVE_INFINITY;
    let path = false;
    let tie = false;

    victoryPossibleThisTurn(botHex, combatHex, resources.gold, resources.wood, resources.metal, [], 0);
    !path && victoryPossibleThisTurn(botHex, combatHex, resources.gold, resources.wood, resources.metal, [], 0, true);

    function victoryPossibleThisTurn(botHex, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag) {
      if (gold >= 10 && metal >= 10) {
        buySwordsmen(botHex, combatHex, gold - 10, wood, metal - 10, purchases.concat('swordsmen'), resourceCost + 20, tieFlag)
      }
      if (gold >= 10 && wood >= 20) {
        buyArchers(botHex, combatHex, gold - 10, wood - 20, metal, purchases.concat('archers'), resourceCost + 30, tieFlag)
      }
      if (gold >= 20 && wood >= 20 && metal >= 20) {
        buyKnights(botHex, combatHex, gold - 20, wood - 20, metal - 20, purchases.concat('knights'), resourceCost + 60, tieFlag)
      }
    }

    function buySwordsmen(botHex, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag) {
      let botHexCopy = _.cloneDeep(botHex);
      botHexCopy.swordsmen += 10;

      let outcome = evaluateCombat(botHexCopy, combatHex);
      if (tieFlag ? outcome.tie : outcome.armyDiff > 0 && !outcome.tie) {
        if (resourceCost < cheapest) {
          cheapest = resourceCost;
          path = purchases;
          tieFlag ? tie = true : null;
        }
      } else {
        victoryPossibleThisTurn(botHexCopy, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag);
      }
    }

    function buyArchers(botHex, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag) {
      let botHexCopy = _.cloneDeep(botHex);
      botHexCopy.archers += 10;

      let outcome = evaluateCombat(botHexCopy, combatHex);
      if (tieFlag ? outcome.tie : outcome.armyDiff > 0 && !outcome.tie) {
        if (resourceCost < cheapest) {
          cheapest = resourceCost;
          path = purchases;
          tieFlag ? tie = true : null;
        }
      } else {
        victoryPossibleThisTurn(botHexCopy, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag);
      }
    }

    function buyKnights(botHex, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag) {
      let botHexCopy = _.cloneDeep(botHex);
      botHexCopy.knights += 10;

      let outcome = evaluateCombat(botHexCopy, combatHex);
      if (tieFlag ? outcome.tie : outcome.armyDiff > 0 && !outcome.tie) {
        if (resourceCost < cheapest) {
          cheapest = resourceCost;
          path = purchases;
          tieFlag ? tie = true : null;
        }
      } else {
        victoryPossibleThisTurn(botHexCopy, combatHex, gold, wood, metal, purchases, resourceCost, tieFlag);
      }
    }
    return { path: path, tie: tie, cost: cheapest }
  }
  console.log(possibleMoves);
  console.log(possibleNextTurnMoves);

  let alpha = Number.NEGATIVE_INFINITY, beta = Number.POSITIVE_INFINITY;

  const heuristic = (units, resources, bank, hexes) => {
    let value = units + (resources / 2) + (botBank / 3) + (hexes.length / 4);
  }
}

export default hexbot;
