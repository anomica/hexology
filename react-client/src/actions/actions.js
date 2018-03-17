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

export const highlightOpponents = (opponents) => (
  {
    type: 'HIGHLIGHT-OPPONENTS',
    payload: opponents
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
