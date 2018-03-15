const DefaultState = {
  playerOne: undefined,
  playerTwo: undefined,
  currentPlayerTurn: 1,
  gameId: null,
  selectedHex: null,
  winner: null,
  hexNeighbors: {
    A: ['B', 'E'],
    B: ['A', 'C', 'E', 'F'],
    C: ['B', 'D', 'F', 'G'],
    D: ['C', 'G'],
    E: ['A', 'B', 'F', 'H', 'I'],
    F: ['B', 'C', 'E', 'G', 'I', 'J'],
    G: ['C', 'D', 'F', 'J', 'K'],
    H: ['E', 'I', 'L'],
    I: ['E', 'F', 'H', 'J', 'L', 'M'],
    J: ['F', 'G', 'I', 'K', 'M', 'N'],
    K: ['G', 'J', 'N'],
    L: ['H', 'I', 'M', 'O', 'P'],
    M: ['I', 'J', 'L', 'N', 'P', 'Q'],
    N: ['K', 'J', 'M', 'Q', 'R'],
    O: ['L', 'P'],
    P: ['L', 'M', 'O', 'Q'],
    Q: ['M', 'N', 'P', 'R'],
    R: ['N', 'Q']
  }
}

export default DefaultState;
