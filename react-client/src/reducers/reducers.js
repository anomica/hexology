import defaultState from '../../src/store/DefaultState.js';

const reducers = (state = defaultState, action) => {
  switch(action.type) {
    case 'SELECT-HEX':
      return {
        ...state,
        selectedHex: action.payload
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
    default: return state;
  }
}

export default reducers;
