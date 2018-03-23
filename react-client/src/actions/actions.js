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
    type: 'UPDATED-UNIT-COUNTS',
    playerOneTotalUnits: playerOneTotalUnits,
    playerTwoTotalUnits: playerTwoTotalUnits
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
