import defaultState from '../../src/store/DefaultState.js';

const reducers = (state = defaultState, action) => {
  console.log(action)
  switch(action.type) {
    case 'SELECT-HEX':
      return {
        ...state,
        selectedHex: action.payload
      }
    default: return state;
  }
}

export default reducers;
