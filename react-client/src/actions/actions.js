export const selectHex = (hex) => (
  {
    type: 'SELECT-HEX',
    payload: hex
  }
)

export const drawBoard = (boardState) => (
  {
    type: 'DRAW-BOARD',
    payload: boardState
  }
)