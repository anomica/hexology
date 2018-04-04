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
  hexbot: false,
  warningModalOpen: false,
  forfeitModalOpen: false,
<<<<<<< HEAD
  deployTroopsModal: false
=======
  icons: false
>>>>>>> ae8ff63869805f4d6d1b7b9c2a73459da9e4412a
}

export default DefaultState;
