const DefaultState = {
  playerOne: undefined,
  playerTwo: undefined,
  playerOneResources: {},
  playerTwoResources: {},
  playerOneUnitBank: {
      swordsmen: 0,
      knight: 0,
      archer: 0
  },
  playerTwoUnitBank: {
      swordsmen: 0,
      knight: 0,
      archer: 0
  },
  playerAssigned: false,
  userPlayer: undefined,
  currentPlayer: 'player1',
  gameIndex: null,
  selectedHex: {},
  boardState: null,
  winner: null,
  neighbors: [],
  menuVisible: true,
  showUnitShop: false
}

export default DefaultState;
