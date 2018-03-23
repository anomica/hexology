import defaultState from '../../src/store/DefaultState.js';

const reducers = (state = defaultState, action) => {
  switch(action.type) {
    case 'SET-ROOMS':
      return {
        ...state,
        rooms: action.payload
      }
    case 'NEW-ROOM':
      return {
        ...state,
        rooms: {
          ...state.rooms,
          ...action.payload
        }
      }
    case 'SET-SOCKET':
      return {
        ...state,
        socket: action.payload
      }
    case 'SET-ROOM':
      return {
        ...state,
        room: action.payload
      }
    case 'MENU-TOGGLE':
      return {
        ...state,
        menuVisible: !state.menuVisible
      }
    case 'EXIT-GAME':
      return {
        ...state,
        socket: null,
        room: null
      }
    case 'SELECT-HEX': // select hex on user click
      return {
        ...state,
        selectedHex: action.payload
      }
    case 'SET-USER-PLAYER': // part of game init, when users log in they get player 1 or player 2
      return {
        ...state,
        userPlayer: action.payload,
        playerAssigned: true
      }
    case 'DRAW-BOARD':
      return {
        ...state,
        boardState: action.payload,
        playerOneResources: {
          gold: 10,
          wood: 10,
          metal: 10
        },
        playerTwoResources: {
          gold: 10,
          wood: 10,
          metal: 10
        }
      }
    case 'SET-GAME-INDEX':
      return {
        ...state,
        gameIndex: action.payload
      }
    case 'HIGHLIGHT-NEIGHBORS':
      let newState;
      state.neighbors.length ? // if there are neighbors selected,
      newState = {
        ...state,
        neighbors: [] // reinitialize the neighbors array
      } :
      newState = {
        ...state,
        neighbors: [...action.payload] // otherwise, add the current hex's users
      };
      return newState;
    case 'MOVE-UNITS':
      let originIndex = action.payload.originIndex; //  store indices of hexes in question for creating array copies
      let targetIndex = action.payload.targetIndex;
      let origin = action.payload.origin; // updated versions of hex moved from and hex moved to
      let target = action.payload.target;
      let newBoardState = state.boardState.slice(); // create clean copy of board state
      newBoardState.splice(originIndex, 1, origin); // replace each of origin and target with updated copies in array
      newBoardState.splice(targetIndex, 1, target);
      return {
        ...state,
        boardState: newBoardState, // insert board state with updated hexes
        selectedHex: {}, // initialize selected hex
        neighbors: [] // and neighbor array
      }
    case 'REINFORCE-HEX':
      newBoardState = state.boardState.slice();
      let hex = state.boardState[action.payload.hexIndex];
      let playerOne = state.playerOneResources;
      let playerTwo = state.playerTwoResources;
      let resource = action.payload.resourceType;
      let reinforcedHex = { // since resource gets used up, its resource should be set to 0
        ...hex,
        hasGold: false,
        hasWood: false,
        hasMetal: false
      }
      newBoardState.splice(action.payload.hexIndex, 1, reinforcedHex); // replace hex with used up resource hex
      if (state.currentPlayer === 'player1') { // for player 1,
        return {
          ...state,
          boardState: newBoardState,
          playerOneResources: {
            ...playerOne,
            [resource]: playerOne[resource] += 10 // add ten to whichever resource is necessary
          }
        }
      } else if (state.currentPlayer === 'player2') { // same, but for player 2
        return {
          ...state,
          boardState: newBoardState,
          playerTwoResources: {
            ...playerTwo,
            [resource]: playerTwo[resource] += 10
          }
        }
      }
    case 'UPDATE-RESOURCES':
      return {
        ...state,
        playerOneResources: action.payload.playerOneResources,
        playerTwoResources: action.payload.playerTwoResources
      }
    case 'SWORDSMEN':
      let playerResources, hexIndex;
      action.payload.player === 'player1' ?
      playerResources = 'playerOneResources' : playerResources = 'playerTwoResources';
      newBoardState = state.boardState.slice();
      newBoardState.forEach(hex => {
        if (hex.player === action.payload.player) {
          hex.swordsmen += 10;
        }
      })
      return {
        ...state,
        boardState: newBoardState
      }
    case 'ARCHERS':
      action.payload.player === 'player1' ?
      playerResources = 'playerOneResources' : playerResources = 'playerTwoResources';
      newBoardState = state.boardState.slice();
      newBoardState.forEach(hex => {
        if (hex.player === action.payload.player) {
          hex.archers += 10;
        }
      })
      return {
        ...state,
        boardState: newBoardState,
      }
    case 'KNIGHTS':
      action.payload.player === 'player1' ?
      playerResources = 'playerOneResources' : playerResources = 'playerTwoResources';
      newBoardState = state.boardState.slice();
      newBoardState.forEach(hex => {
        if (hex.player === action.payload.player) {
          hex.knights += 10;
        }
      })
      return {
        ...state,
        boardState: newBoardState,
      }
    case 'SWITCH-PLAYER':
      return {
        ...state,
        currentPlayer: action.payload.currentPlayer
      }
    case 'TOGGLE-UNIT-SHOP':
      return {
        ...state,
        showUnitShop: action.payload.toggle
      }
    case 'UPDATE-BANK':
      let unit;
      console.log('action.payload:', action.payload);
      action.payload.unit === 'swordsmen' ? unit = 'swordsmen'
      : action.payload.unit === 'archer' ? unit = 'archer'
      : unit = 'knight';
      if (action.payload.player === 'player1') {
        console.log('state.playerOneUnitBank', state.playerOneUnitBank)
        return {
          ...state,
          playerOneUnitBank: {
            ...state.playerOneUnitBank,
            [unit]: state.playerOneUnitBank[unit] += 10
          }
        }
      } else {
        return {
          ...state,
          playerTwoUnitBank: {
            ...state.playerTwoUnitBank,
            [unit]: playerTwoUnitBank[unit] += 10
          }
        }
      }
      
    default: return state;
  }
}

export default reducers;
