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
    case 'HIGHLIGHT-OPPONENTS': // this can be refactored to just directly render based on hex.player when we have it set up
      state.opponentControlled.length ?
      newState = {
        ...state,
        opponentControlled: []
      } :
      newState = {
        ...state,
        opponentControlled: [...action.payload]
      };
      return newState;
    case 'MOVE-UNITS':
      let originIndex = action.payload.originIndex;
      let targetIndex = action.payload.targetIndex;
      let origin = action.payload.origin;
      let target = action.payload.target;
      return {
        ...state,
        boardState: [...state.boardState.slice(0, originIndex), origin, ...state.boardState.slice(originIndex + 1, targetIndex), target, ...state.boardState.slice(targetIndex + 1, state.boardState.length)],
        selectedHex: {},
        neighbors: []
      }
    default: return state;
  }
}

export default reducers;
