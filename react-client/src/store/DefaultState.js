const DefaultState = {
  playerOne: undefined,
  playerTwo: undefined,
  playerOneTotalUnits: 10,
  playerTwoTotalUnits: 10,
  playerOneResources: {},
  playerTwoResources: {},
  playerAssigned: false,
  userPlayer: undefined,
  currentPlayer: 'player1',
  gameIndex: null,
  selectedHex: {},
  boardState: null,
  winner: null,
  neighbors: [],
  menuVisible: true
}

export default DefaultState;
