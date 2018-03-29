const DefaultState = {
  playerOne: undefined,
  playerTwo: undefined,
  playerOneTotalUnits: 10,
  playerTwoTotalUnits: 10,
  playerOneResources: {},
  playerTwoResources: {},
  playerOneUnitBank: {
      swordsmen: 0,
      knights: 0,
      archers: 0
  },
  playerTwoUnitBank: {
      swordsmen: 0,
      knights: 0,
      archers: 0
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
  showUnitShop: false,
  deployment: null,
  showLogin: false,
  showSignup: false,
  loggedInUser: 'anonymous',
  spectator: false,
  hexbot: false
}

export default DefaultState;
