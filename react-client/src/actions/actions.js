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

export const reinforceHex = (hexIndex, resourceType) => (
  {
    type: 'REINFORCE-HEX',
    payload: {
      hexIndex: hexIndex,
      resourceType: resourceType
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
