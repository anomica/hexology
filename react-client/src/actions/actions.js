export const setRooms = (rooms) => (
  {
    type: 'SET-ROOMS',
    payload: rooms
  }
)

export const setSocket = (socket) => (
  {
    type: 'SET-SOCKET',
    payload: socket
  }
)

export const setRoom = (room) => (
  {
    type: 'SET-ROOM',
    payload: room
  }
)

export const newRoom = (room) => (
  {
    type: 'NEW-ROOM',
    payload: {
      [room.roomName]: room.room
    }
  }
)

export const updateRoom = (room) => (
  {
    type: 'UPDATE-ROOM',
    payload: {
      [room.roomName]: room.room
    }
  }
)

export const deleteRoom = (room) => (
  {
    type: 'DELETE-ROOM',
    payload: room
  }
)

export const menuToggle = () => (
  {
    type: 'MENU-TOGGLE'
  }
)

export const exitGame = () => (
  {
    type: 'EXIT-GAME'
  }
)

export const setUserPlayer = (player) => (
  {
    type: 'SET-USER-PLAYER',
    payload: player
  }
)

export const selectHex = (hex) => (
  {
    type: 'SELECT-HEX',
    payload: hex
  }
)

export const highlightNeighbors = (neighbors) => (
  {
    type: 'HIGHLIGHT-NEIGHBORS',
    payload: neighbors
  }
)

export const moveUnits = (origin, originIndex, target, targetIndex) => (
  {
    type: 'MOVE-UNITS',
    payload: {
      origin: origin,
      originIndex: originIndex,
      target: target,
      targetIndex: targetIndex
    }
  }
)

export const updateUnitCounts = (playerOneTotalUnits, playerTwoTotalUnits) => (
  {
    type: 'UPDATE-UNIT-COUNTS',
    payload: {
      playerOneTotalUnits: playerOneTotalUnits,
      playerTwoTotalUnits: playerTwoTotalUnits
    }
  }
)

export const reinforceHex = (hexIndex, resourceType) => (
  {
    type: 'REINFORCE-HEX',
    payload: {
      hexIndex: hexIndex,
      resourceType: resourceType
    }
  }
)

export const updateResources = (playerOneResources, playerTwoResources) => (
  {
    type: 'UPDATE-RESOURCES',
    payload: {
      playerOneResources: playerOneResources,
      playerTwoResources: playerTwoResources
    }
  }
)

export const swordsmen = (player) => (
  {
    type: 'SWORDSMEN',
    payload: {
      player: player
    }
  }
)

export const archers = (player) => (
  {
    type: 'ARCHERS',
    payload: {
      player: player
    }
  }
)

export const knights = (player) => (
  {
    type: 'KNIGHTS',
    payload: {
      player: player
    }
  }
)

export const switchPlayer = (currentPlayer) => (
  {
    type: 'SWITCH-PLAYER',
    payload: {
      currentPlayer: currentPlayer
    }
  }
)

export const drawBoard = (boardState) => (
  {
    type: 'DRAW-BOARD',
    payload: boardState
  }
)

export const setGameIndex = (gameIndex) => (
  {
    type: 'SET-GAME-INDEX',
    payload: gameIndex
  }
)

export const resetBoard = () => (
  {
    type: 'RESET-BOARD'
  }
)

export const toggleUnitShop = (toggle) => (
  {
    type: 'TOGGLE-UNIT-SHOP',
    payload: toggle
  }
)

export const updateBank = (playerOneUnitBank, playerTwoUnitBank) => (
  {
    type: 'UPDATE-BANK',
    payload: {
      playerOneUnitBank: playerOneUnitBank,
      playerTwoUnitBank: playerTwoUnitBank
    }
  }
)

export const deployUnits = (player, unit, quantity, playerOneUnitBank, playerTwoUnitBank) => (
  {
    type: 'DEPLOY-UNITS',
    payload: {
      player: player,
      unit: unit,
      quantity: quantity,
      playerOneUnitBank: playerOneUnitBank,
      playerTwoUnitBank: playerTwoUnitBank
    }
  }
)

export const addUnitsToHex = (hex, hexIndex, player) => (
  {
    type: 'ADD-UNITS-TO-HEX',
    payload: {
      hex: hex,
      hexIndex: hexIndex,
      player: player
    }
  }
)

export const toggleLoginSignup = (type) => (
  {
    type: 'TOGGLE-LOGIN-SIGNUP',
    payload: type
  }
)

export const login = (username) => (
  {
    type: 'LOGIN',
    payload: username
  }
)

export const setLoggedInPlayer = (user1, user2) => (
  {
    type: 'SET-LOGGED-IN-PLAYER',
    payload: {
      player1: user1,
      player2: user2
    }
  }
)

export const setSpectator = isTrue => (
  {
    type: 'SET-SPECTATOR',
    payload: isTrue
  }
)

export const setHexbot = value => (
  {
    type: 'SET-HEXBOT',
    payload: value
  }
)

export const warningOpen = isTrue => (
  {
    type: 'WARNING-OPEN',
    payload: isTrue
  }
)

export const forfeitOpen = isTrue => (
  {
    type: 'FORFEIT-OPEN',
    payload: isTrue
  }
)
