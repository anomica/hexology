import defaultState from '../../src/store/DefaultState.js';

const reducers = (state = defaultState, action) => {
  switch(action.type) {
    case 'SELECT-HEX':
      return {
        ...state,
        selectedHex: action.payload
      }
    case 'SET-USER-PLAYER':
      return {
        ...state,
        userPlayer: action.payload,
        playerAssigned: true
      }
    case 'DRAW-BOARD':
      return {
        ...state,
        boardState: action.payload
      }
    case 'SET-GAME-INDEX':
      return {
        ...state,
        gameIndex: action.payload
      }
    case 'HIGHLIGHT-NEIGHBORS':
      let newState;
      state.neighbors.length ?
      newState = {
        ...state,
        neighbors: []
      } :
      newState = {
        ...state,
        neighbors: [...action.payload]
      };
      return newState;
    case 'MOVE-UNITS':
      let originIndex = action.payload.originIndex;
      let targetIndex = action.payload.targetIndex;
      let origin = action.payload.origin;
      let target = action.payload.target;
      let newBoardState = state.boardState.slice();
      newBoardState.splice(originIndex, 1, origin);
      newBoardState.splice(targetIndex, 1, target);
      return {
        ...state,
        boardState: newBoardState,
        selectedHex: {},
        neighbors: []
      }
    case 'REINFORCE-HEX':
      newBoardState = state.boardState.slice();
      let hex = state.boardState[action.payload.hexIndex];
      let reinforcedHex = {
        ...hex,
        units: hex.units += 10,
        hasGold: false,
        hasWood: false,
        hasMetal: false
      }
      newBoardState.splice(action.payload.hexIndex, 1, reinforcedHex);
      return {
        ...state,
        boardState: newBoardState
      }
    case 'SWITCH-PLAYER':
      return {
        ...state,
        currentPlayer: action.payload.currentPlayer
      }
    default: return state;
  }
}

export default reducers;
