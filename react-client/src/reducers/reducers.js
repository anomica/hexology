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
    case 'HIGHLIGHT-NEIGHBOR':
      return {
        ...state,
        neighbors: [...state.neighbors, action.payload]
      }
    default: return state;
  }
}

export default reducers;
