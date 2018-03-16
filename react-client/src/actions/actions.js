export const selectHex = (coordinates) => (
  {
    type: 'SELECT-HEX',
    payload: coordinates
  }
)

export const highlightNeighbor = (neighbor) => (
  {
    type: 'HIGHLIGHT-NEIGHBOR',
    payload: neighbor
  }
)

export const drawBoard = (boardState) => (
  {
    type: 'DRAW-BOARD',
    payload: boardState
  }
)
