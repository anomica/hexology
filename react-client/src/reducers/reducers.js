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
    default: return state;
  }
}

export default reducers;
