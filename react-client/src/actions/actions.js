export const selectHex = (coordinates) => (
  {
    type: 'SELECT-HEX',
    payload: coordinates
  }
)

export const highlightNeighbors = (neighbor) => (
  {
    type: 'HIGHLIGHT-NEIGHBORS',
    payload: neighbor
  }
)

export const drawBoard = (boardState) => (
  {
    type: 'DRAW-BOARD',
    payload: boardState
  }
)
