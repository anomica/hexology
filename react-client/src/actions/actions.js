export const selectHex = (coordinates) => (
  {
    type: 'SELECT-HEX',
    payload: coordinates
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

export const drawBoard = (boardState) => (
  {
    type: 'DRAW-BOARD',
    payload: boardState
  }
)
