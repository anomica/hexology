const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');
let path = require('path');
const db = require('../database/index');
const passport = require('passport');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const app = express();
const http = require("http");
const server = http.createServer(app);
var cors = require('cors');
const socketIo = require("socket.io");
const io = socketIo(server);
require('./auth-config.js')(passport);
require('events').EventEmitter.prototype._maxListeners = 100;
// const http = require('http').Server(app);
// require('../server/config/passport')(passport);
app.use(session({
  secret: process.env.SESSION_PASSWORD || 'supersecretsecret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../react-client/dist')));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
app.use(cors())

// local Login Strategy
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).end('You must log in to do that!');
}

app.get('/persistUser', (req, res) => {
  // console.log('req.session.passport.user:', req.session.passport.user);
  // console.log('passport.user:', passport.user);
  // console.log('req.user:', req.user);
  res.send(req.user);
});

app.post('/signup', passport.authenticate('local-signup'), (req, res) => {
  // console.log('req.body', req.body);
  // console.log('req.user upon login:', req.user);
  // let response = {
  //   email: req.body.email,
  //   password: req.body.password
  // }
  res.status(201).json(req.user);
});

app.post('/login', passport.authenticate('local-login'), (req, res) => {
  res.status(201).json(req.user);
});

app.post('/logout', isLoggedIn, function (req, res) {
  req.logout();
  res.clearCookie('connect.sid').status(200).redirect('/');
});

let games = {}; // TODO: TAKE THIS OUT

const coordinateGenerator = (numRows, numCols) => { // creates an array of coordinates for hexes
  let j = 0;
  let y = 0;
  let hexes = [];

  const rowGenerator = (rowIndex, lDiag, rDiag) => { // creates a row in the grid
    let iterations;
    let row = [];
    if (rowIndex % 2 === 0) {
      iterations = numCols;
    } else {
      iterations = numCols - 1;
    }

    for (let i = 0; i < iterations; i++) {
      row.push([lDiag, rowIndex, rDiag]);
      lDiag++;
      rDiag--;
    }
    return row;
  }

  for (let i = 0; i < numRows; i++) {
    if (i % 2 !== 0) {
      y--;
    }
    hexes = hexes.concat(rowGenerator(i, j, y))
    if (i % 2 !== 0) {
      j--;
    }
  }
  return hexes;
}

const isResourceHex = () => { // decides if hex gets resource
  return Math.floor(Math.random() * (5 - 1) + 1) % 4 === 0;
};

const gameInit = (numRows, numCols) => { // creates an array of hexes with properties (the board)
  let i = 0;
  const hexes = coordinateGenerator(numRows, numCols);

  return hexes.map((coordinates, index) => {
    let hex = {};
    hex.coordinates = coordinates;
    hex.index = uuidv4();
    hex.swordsmen = 0;
    hex.archers = 0;
    hex.knights = 0;

    if (index === 0) {
      hex.player = 'player1';
      hex.swordsmen = 10;
    } else if (index === hexes.length - 1) {
      hex.player = 'player2';
      hex.swordsmen = 10;
    } else {
      hex.player = null;
    }
    if (isResourceHex() && index !== 0 && index !== hexes.length - 1) { // for resource hexes that are not starting hexes for either player,
      let resourceType = Math.floor(Math.random() * 3) + 1; // roll a d3
      hex.hasGold = false;
      hex.hasWood = false;
      hex.hasMetal = false;
      if (resourceType === 1) { // assign resource type according to dice roll
        hex.hasGold = true;
      } else if (resourceType === 2) {
        hex.hasWood = true;
      } else {
        hex.hasMetal = true;
      }
    }
    return hex;
  });
};

app.get('/rooms', (req, res) => {
  res.status(200).json(io.sockets.adapter.rooms);
});

let roomNum = 0;
let openRooms = [];

const selectRoom = () => {
  let lowest;
  let index;
  let selected;
  if (openRooms.length) {
    openRooms.forEach((room, i) => {
      if (!lowest) {
        lowest = Number(room);
        index = i
      } else {
        if (Number(room) < lowest) {
          lowest = Number(room);
          index = i;
        }
      }
    });
  }
  selected = openRooms[index];
  openRooms.splice(index, 1);
  return selected;
}

const findOpenRooms = () => { // finds an open room, right now just picking the first one
  openRooms = [];
  // may need to create an array of open rooms
  // and have a setInterval to keep checking them and updating them so that no one gets stuck waiting too long
  var rooms = io.sockets.adapter.rooms;
  for (room in rooms) {
    let roomSize = Object.keys(rooms[room].sockets).length;
    if (roomSize === 1 && room[0] === '*') {
      if (!openRooms.includes(room)) {
        openRooms.push(room);
      }
      return room;
    }
  }
}

setInterval(findOpenRooms, 1000);

io.on('connection', async (socket) => { // initialize socket on user connection
  console.log('User connected');

  socket.on('newGame', () => {
    let newRoom = `*${roomNum}`
    socket.join(newRoom); // create a new room
    io.to(newRoom).emit('newGame', { room: newRoom }); // and send back a string to initialize for player 1
    socket.broadcast.emit('newRoom', { roomName: newRoom, room: io.sockets.adapter.rooms[newRoom] });
    roomNum++; // increment room count to assign new ro
  })

  socket.on('joinGame', async (data) => {
    await socket.join(data.room);
    const board = await gameInit(2, 2);
    let gameIndex = uuidv4();

    //TODO: TAKE OUT THIS OBJECT ONCE DB WORKS
    games[gameIndex] = { // initialize game in local state, to be replaced after we refactor to use DB
      board: board, // set board,
      playerOneResources: { // p1 resources,
        gold: 10,
        wood: 10,
        metal: 10
      },
      playerTwoResources: { // and p2 resources
        gold: 10,
        wood: 10,
        metal: 10
      },
      playerOneTotalUnits: 10,
      playerTwoTotalUnits: 10,
    };

    const newGameBoard = {
      board: board,
      gameIndex: gameIndex,
      room: room
    }

    /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
    // await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases

    await io.to(data.room).emit('gameCreated', newGameBoard); // send game board to user
  })

  socket.on('move', data => { // move listener
    moveUnits(data, socket); // pass move data and socket to function to assess move
  })

  socket.on('buy', data => {
    buyUnits(data.type, data.player, data.gameIndex, data.socketId, data.room);
  })

  socket.on('disconnect', () => {
    console.log('user disconnected');
  })
})

const moveUnits = async (data, socket) => {
  // THIS LOGIC WILL MOST LIKELY HAPPEN IN TANDEM WITH THE DATABASE, BUT IS WRITTEN IN LOCAL STORAGE FOR NOW
  let updatedOrigin = await data.updatedOrigin; // new origin object as sent by user
  let originIndex = await data.originIndex; // with its index,
  let updatedTarget = await data.updatedTarget; // same for target
  let targetIndex = await data.targetIndex;
  let gameIndex = await data.gameIndex; // game index to find in storage
  let room = await data.room; // room to send move to

  ////////////////// IF USING GAME OBJECT ON SERVER ///////////////
  let board = games[gameIndex].board; // game board found using above index
  let masterOrigin = await board[originIndex];// origin to be updated/checked against
  let masterTarget = await board[targetIndex]
  let masterOrigCs = masterOrigin.coordinates; // coordinates of those masters
  let masterTarCs = masterTarget.coordinates;
  ////////////////////////////////////////////////////////////////

  ////////////////////// IF USING DATABASE ///////////////////////
  // let board = await db.getGameBoard(room, gameIndex); // gets game board from db using above index
  // let masterOrigin = await db.getHex(updatedOrigin.index);// origin to be updated/checked against
  // let masterTarget = await db.getHex(updatedTarget.index); // same for target
  // let masterOrigCs = [masterOrigin[0].coordinate_0, masterOrigin[0].coordinate_1, masterOrigin[0].coordinate_2]; // coordinates of those masters
  // let masterTarCs = [masterTarget[0].coordinate_0, masterTarget[0].coordinate_1, masterTarget[0].coordinate_2]; // coordinates of those masters
  ///////////////////////////////////////////////////////////////

  let origCs = await updatedOrigin.coordinates; // as well as coordinates of the ones sent by user
  let tarCs = await updatedTarget.coordinates;
  let currentPlayer = await data.currentPlayer; // player whose turn it is
  let socketId = await data.socketId; // socket to send back response if necessary

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget); // assess legality of move
  if (legal) { // if legal move,
    //////////////////////////////////// IF USING DATABASES ////////////////////////////////
    // let collision = await checkForCollision(updatedOrigin.index, updatedTarget.index, gameIndex, room); // check for collision
    //////////////////////////// IF USING GAME OBJECT ON SERVER ////////////////////////////
    let collision = await checkForCollision(originIndex, targetIndex, gameIndex, room); // check for collision
    if (collision) {
      if (collision === 'friendly') { // if collision and collision is friendly,
        let result = await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board); // update hexes without combat occuring
        let move = {
          updatedOrigin: result.updatedOrigin,
          originIndex: originIndex,
          updatedTarget: result.updatedTarget,
          updatedTarget: updatedTarget
        }
        /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
        // await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player

        await io.to(room).emit('move', move); // then send back okay to move units
      } else {
        io.to(room).emit('combat');
        /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
        // let result = await resolveCombat(updatedOrigin.index, updatedTarget.index, gameIndex, room, updatedOrigin, updatedTarget, currentPlayer); //otherwise, roll for combat
        let result = await resolveCombat(originIndex, targetIndex, gameIndex, room, updatedOrigin, updatedTarget, currentPlayer); //otherwise, roll for combat

        if (result.tie === true) {
          io.to(room).emit('move', result);
        }
        result.isOver ? // if attacker wins, need to change hexes and send back board
        (async () => {
          io.to(socketId).emit('win'); // the attacker gets a personal win message
          socket.to(room).emit('lose'); // while the rest of the room (defender) gets lose message
          const board = gameInit(2, 2);
          let gameIndex = uuidv4();

          //TODO: TAKE OUT THIS OBJECT ONCE DB WORKS
          games[gameIndex] = { // initialize game in local state, to be replaced after we refactor to use DB
            board: board, // set board,
            playerOneResources: { // p1 resources,
              gold: 10,
              wood: 10,
              metal: 10
            },
            playerTwoResources: { // and p2 resources
              gold: 10,
              wood: 10,
              metal: 10
            },
            playerOneTotalUnits: 10,
            playerTwoTotalUnits: 10,
          };

          const newGameBoard = {
            board: board,
            gameIndex: gameIndex,
            room: room
          }

          /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
          // await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases

          await io.to(room).emit('gameCreated', newGameBoard); // send game board to user
        })() :
        () => { // and vice versa
          let move = {
            updatedOrigin: result.updatedOrigin,
            updatedTarget: result.updatedTarget,
            originIndex: originIndex,
            targetIndex: targetIndex
          }
          io.to(room).emit('move', move);
        };
      }
    } else {
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board); // if move is to unoccupied hex, execute move
      let move = await {
        originIndex: originIndex,
        updatedOrigin: updatedOrigin,
        targetIndex: targetIndex,
        updatedTarget: updatedTarget
      };

      /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
      // await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player

      await io.to(room).emit('move', move);
    }
  } else { // if move request is not legal, send socket failure message, cheating detected
    await io.to(room).emit('failure');
  }
};

const checkLegalMove = async (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget, cb) => { // to check move legality,

  // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> CHECKING LEGAL MOVE');
  // console.log('masterOrigCs: ', masterOrigCs);
  // console.log('origCs: ', origCs);
  // console.log('masterTarCs: ', masterTarCs);
  // console.log('tarCs: ', tarCs);

  let isLegal = false;
  if (await masterOrigCs[0] === origCs[0] && masterOrigCs[1] === origCs[1] && masterOrigCs[2] === origCs[2] && // make sure all coordinates match between origin
      masterTarCs[0] === tarCs[0] && masterTarCs[1] === tarCs[1] && masterTarCs[2] === tarCs[2]) { // and target **********NEED TO ADD CHECK TO MAKE SURE RESOURCE COUNTS AND UNIT COUNTS MATCH
    // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> COORDINATES MATCH');

    /////////////////////////// IF USING GAMES OBJECT ON SERVER ///////////////////////////////////
    if (masterOrigin.archers === updatedOrigin.archers + updatedTarget.archers &&
    masterOrigin.knights === updatedOrigin.knights + updatedTarget.knights &&
    masterOrigin.swordsmen === updatedOrigin.swordsmen + updatedTarget.swordsmen) {
    ////////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////// IF USING DATABASE ///////////////////////////////////////////////
    // if (masterOrigin[0].archers === updatedOrigin.archers + updatedTarget.archers &&
    // masterOrigin[0].knights === updatedOrigin.knights + updatedTarget.knights &&
    // masterOrigin[0].swordsmen === updatedOrigin.swordsmen + updatedTarget.swordsmen) {
    ////////////////////////////////////////////////////////////////////////////////////////////////

      isLegal = true;
      return true;
    } else { // master origin units do not match updated origin units + updated target units
      // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> MISMATCH IN UNITS');
      return false;
    }
  } else {
    // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> COORDINATES DO NOT MATCH');
    // console.log('masterOrigin: ', masterOrigin);
    // console.log('updatedOrigin: ', updatedOrigin);
    // console.log('updatedTarget: ', updatedTarget);
    return false;
  }
}

const checkForCollision = async (originHexIndex, targetHexIndex, gameIndex, room) => {

  //////////////////////////////// IF USING GAME OBJECT ON THE SERVER /////////////////////////
  let game = games[gameIndex].board;
  let origin = game[originHexIndex]; // uses games object on server
  let target = game[targetHexIndex]; // uses games object on server


  if (origin.player && target.player) {
    let collision = '';
    origin.player === target.player
      ? (collision += 'friendly')
      : (collision += 'opponent'); // if collision, decide if collision is with own units or enemy units
    return collision;
  } else {
    return false;
  }
  ////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////// IF USING DATABASE //////////////////////////////////////
  // let game = await db.getGameBoard(room, gameIndex);
  // let origin = await db.getHex(originHexIndex); // NOTE: returns an object
  // let target = await db.getHex(targetHexIndex); // NOTE: returns an object

  // if (origin[0].player && target[0].player) {
  //   let collision = '';
  //   origin[0].player === target[0].player
  //     ? (collision += 'friendly')
  //     : (collision += 'opponent'); // if collision, decide if collision is with own units or enemy units
  //   return collision;
  // } else {
  //   return false;
  // }
  /////////////////////////////////////////////////////////////////////////////////////////
};

const updateHexes = async (originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board) => {
  games[gameIndex].board[originIndex] = await updatedOrigin;
  games[gameIndex].board[targetIndex] = await updatedTarget; // This is what will happen on an ordinary move

  currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1'; // then player will toggle
  await reinforceHexes(gameIndex, currentPlayer, targetIndex, room, board); // then check to see if there are reinforcements
}

const resolveCombat = async (originIndex, targetIndex, gameIndex, room, updatedOrigin, updatedTarget, currentPlayer) => { // if combat,

  ////////////////////////////////// IF USING GAME OBJECT ON SERVER //////////////////////////////////
  let attacker = updatedTarget; // get attacking hex
  let defender = games[gameIndex].board[targetIndex]; // and defending hex
  let attackerPlayer = attacker.player;
  let defenderPlayer = defender.player;
  let attackerDidWin;

// Stephanie's changes retrieving from DB
// const resolveCombat = async (originIndex, targetIndex, gameIndex, room) => { // if combat,
//   let board = await db.getGameBoard(room, gameIndex);

//   // let attacker = games[gameIndex].board[originIndex]; // get attacking hex
//   let attacker = board[originIndex]; // get attacking hex

//   // let defender = games[gameIndex].board[targetIndex]; // and defending hex
//   let defender = board[targetIndex]; // and defending hex
  let attackerSwordsmen = attacker.swordsmen;
  let attackerKnights = attacker.knights;
  let attackerArchers = attacker.archers;
  let defenderSwordsmen = defender.swordsmen;
  let defenderKnights = defender.knights;
  let defenderArchers = defender.archers;
  let originalAttackerArmySize = attackerSwordsmen + attackerKnights + attackerArchers;
  let originalDefenderArmySize = defenderSwordsmen + defenderKnights + defenderArchers;

  attackerArchers && defenderArchers ? attackerKnights -= defenderArchers : null; // first, archers pick off knights from afar
  defenderKnights && attackerArchers ? defenderKnights -= attackerArchers : null;

  attackerSwordsmen && defenderKnights ? attackerSwordsmen -= (defenderKnights * 3) : null; // then, knights crash against swordsmen
  defenderSwordsmen && attackerKnights ? defenderSwordsmen -= (attackerKnights * 3) : null;

  attackerArchers && defenderSwordsmen ? attackerArchers -= (defenderSwordsmen * 2) : null; // finally, swordsmen take out archers
  defenderArchers && attackerSwordsmen ? defenderArchers -= (attackerSwordsmen * 2) : null;

  if (attackerSwordsmen < 0) attackerSwordsmen = 0; // no numbers should go below zero
  if (attackerKnights < 0) attackerKnights = 0;
  if (attackerArchers < 0) attackerArchers = 0;
  if (defenderSwordsmen < 0) defenderSwordsmen = 0;
  if (defenderKnights < 0) defenderKnights = 0;
  if (defenderArchers < 0) defenderArchers = 0;

  ///////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////////////////////// IF USING DATABASE //////////////////////////////////////////////
  // let attacker = await db.getHex(originIndex); // get attacking hex (NOTE: returns an object)
  // let defender = await db.getHex(targetIndex); // and defending hex (NOTE: returns an object)
  // let attackerPlayer = attacker[0].player;
  // let defenderPlayer = defender[0].player;
  // let attackerDidWin;

  // let swordsMenKnight = attacker[0].swordsmen - defender[0].knights;
  // let knightsArchers = attacker[0].knights - defender[0].archers;
  // let archerSwordsmen = attacker[0].archers - defender[0].swordsmen;
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  // console.log('++++++++++++++++++++++++++++++++++++++++++++++++ RESOLVE COMBAT');
  // console.log('ATTACKER: ', attacker);
  // console.log('DEFENDER: ', defender);
  // console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');

  // console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& UNITS COMPARISON &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&')
  // console.log('swordsMenKnight: ', '\n ATTACKER SWORDSMEN: ', attacker[0].swordsmen, '\n DEFENDER KNIGHTS: ', defender[0].knights, '\n');
  // console.log('knightsArchers: ', '\n ATTACKER KNIGHTS: ', attacker[0].knights, '\n DEFENDER ARCHERS: ', defender[0].archers, '\n');
  // console.log('archerSwordsmen: ', '\n ATTACKER ARCHERS: ', attacker[0].archers, '\n DEFENDER SWORDSMEN: ', defender[0].swordsmen);
  // console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');

  let defenderArmySize = defenderSwordsmen + defenderArchers + defenderKnights;
  let attackerArmySize = attackerArchers + attackerSwordsmen + attackerKnights;
  if (defenderArmySize === attackerArmySize) {
    let masterOrigin = games[gameIndex].board[originIndex];
    let updatedOrigin = {
      ...masterOrigin,
      swordsmen: Math.floor(masterOrigin.swordsmen / 2),
      archers: Math.floor(masterOrigin.archers / 2),
      knights: Math.floor(masterOrigin.knights / 2),
    };
    let masterTarget = games[gameIndex].board[targetIndex]
    let updatedTarget = {
      ...masterTarget,
      swordsmen: Math.floor(masterTarget.swordsmen / 2),
      archers: Math.floor(masterTarget.archers / 2),
      knights: Math.floor(masterTarget.knights / 2),
    };
    if (currentPlayer === 'player1') {
      games[gameIndex].playerOneTotalUnits = originalAttackerArmySize - attackerArmySize;
      games[gameIndex].playerTwoTotalUnits = originalDefenderArmySize - defenderArmySize;
    } else {
      games[gameIndex].playerOneTotalUnits = originalDefenderArmySize - defenderArmySize;
      games[gameIndex].playerTwoTotalUnits = originalAttackerArmySize - attackerArmySize;
    }
    await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer); // update the board
    return {
      tie: true,
      updatedOrigin: updatedOrigin,
      updatedTarget: updatedTarget,
      originIndex: originIndex,
      targetIndex: targetIndex,
      updatedUnitCounts: {
        playerOneTotalUnits: games[gameIndex].playerOneTotalUnits,
        playerTwoTotalUnits: games[gameIndex].playerTwoTotalUnits,
      }
    };
  }
  if (defenderSwordsmen >= attackerSwordsmen) {
    defenderSwordsmen -= attackerSwordsmen;
    attackerSwordsmen = 0;
  } else if (defenderSwordsmen < attackerSwordsmen) {
    attackerSwordsmen -= defenderSwordsmen;
    defenderSwordsmen = 0;
  }
  if (defenderArchers >= attackerArchers) {
    defenderArchers -= attackerArchers;
    attackerArchers = 0;
  } else if (defenderArchers < attackerArchers) {
    attackerArchers -= defenderArchers;
    defenderArchers = 0;
  }
  if (defenderKnights >= attackerKnights) {
    defenderKnights -= attackerKnights;
    attackerKnights = 0;
  } else if (defenderKnights < attackerKnights) {
    attackerKnights -= defenderKnights;
    defenderKnights = 0;
  }
  defenderArmySize = defenderSwordsmen + defenderArchers + defenderKnights;
  attackerArmySize = attackerArchers + attackerSwordsmen + attackerKnights;

  if (attackerArmySize > defenderArmySize) {
    // otherwise, subtract leftover units to determine winner, at 1 to 1 ratio, starting with swordsmen, archers, knights
    attackerDidWin = true;
    updatedTarget = {
      ...updatedTarget,
      swordsmen: attackerSwordsmen,
      knights: attackerKnights,
      archers: attackerArchers,
      player: attackerPlayer
    }
  } else if (defenderArmySize > attackerArmySize) {
    updatedOrigin = { // reinitialize hex they left
      ...updatedOrigin,
      swordsmen: updatedOrigin.swordsmen + attackerSwordsmen,
      archers: updatedOrigin.knights + attackerKnights,
      knights: updatedOrigin.archers + attackerArchers,
      player: attackerPlayer
    }
    updatedTarget = {
      ...updatedTarget,
      swordsmen: defenderSwordsmen,
      knights: defenderKnights,
      archers: defenderArchers,
      player: defenderPlayer
    }
  }

  await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer); // update the board

  /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
  // let masterOrigin = await db.getHex(updatedOrigin.index);
  // await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin);
  /////////////////////////////////////////////////////////////////////////////////////////////

  return {
    isOver: await attackerDidWin ? checkForWin(defenderPlayer, attackerPlayer, gameIndex, room) : false,
    updatedOrigin: updatedOrigin,
    updatedTarget: updatedTarget
  }
};

const checkForWin = async (losingPlayer, winningPlayer, gameIndex, room) => {
  let isGameOver = true;

  //////////////// IF USING GAME OBJECT ON SERVER ////////////////
  games[gameIndex].board.forEach(hex => {
    if (hex.player === losingPlayer) {
      isGameOver = false;
    }
  })
  ////////////////////////////////////////////////////////////////

  ////////////////////// IF USING DATABASE //////////////////////
  // let board = await db.getGameBoard(room, gameIndex);
  // board.forEach(hex => {
  //   console.log('--------------------------------------------- looping through the board hexes ------------------------------')
  //   console.log('hex id: ', hex.hex_id, '\nhex player: ', hex.player);
  //   if (hex.player === losingPlayer) {
  //     isGameOver = false;
  //   }
  // })
  ////////////////////////////////////////////////////////////////

  if (isGameOver) {
    return winningPlayer;
  }
  return isGameOver;
}

// TODO: this should not be needed once db works... this is all handled in the updateDbhex func
const reinforceHexes = async (gameIndex, currentPlayer, targetIndex, room, board) => {
  let playerResources;
  currentPlayer === 'player1' ? // determine player to give resources to depending on whose turn is starting
  playerResources = games[gameIndex].playerOneResources : // store resource reference to save time typing
  playerResources =  games[gameIndex].playerTwoResources;

  let playerId = await currentPlayer[currentPlayer.length - 1];

  await games[gameIndex].board.forEach(hex => { // then check each hex
    if (hex.player === currentPlayer) { // if hex is owned by current player,
      if (hex.hasGold) { // check if resource hex
        playerResources.gold += 10; // add resource to player
        hex.hasGold = false; // and use up resources on hex
      } else if (hex.hasWood) {
        playerResources.wood += 10;
        hex.hasWood = false; // and use up resources on hex
      } else if (hex.hasMetal) {
        playerResources.metal += 10;
        hex.hasMetal = false; // and use up resources on hex
      }
    }
  })
}

const deleteOldGames = async () => {
  let oldGames = await db.getOldGames();
  for (let i = 0; i < oldGames.length; i++) {
    await db.deleteHex(oldGames[i].game_id); // first mark hexes to delete
    await db.deleteGames(oldGames[i].game_id); // then delete the game
  }
}

// Check for old games and marks them as completed
setInterval(deleteOldGames, 86400000);

const buyUnits = async (type, player, gameIndex, socketId, room) => {

  ///////////////////////////////////// IF USING DATABASE ///////////////////////////////////////
  // let game = await db.getGameBoard(room, gameIndex);
  // let currentPlayerResources = await db.getResources(room, gameIndex, player); // returns an object

  // if (type === 'swordsmen') { // if buying swordsmen
  //   console.log('LETS BUY SOME ----> SWORDSMEN'); //TODO: delete console log
  //   if (player === 'player1') { // for player 1
  //     if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_metal >= 10) { // check if player has enough resources to purchase unit

  //       await db.buySwordsmen(room, gameIndex, player); // update units and resources in the db

  //       let p1Resources = await db.getResources(room, gameIndex, 'player1');
  //       let p2Resources = await db.getResources(room, gameIndex, 'player2');

  //       await io.to(socketId).emit('swordsmen');

  //       await io.to(room).emit('updateResources', {
  //         playerOneResources: {
  //           gold: p1Resources[0].p1_gold,
  //           wood: p1Resources[0].p1_wood,
  //           metal: p1Resources[0].p1_metal
  //         },
  //         playerTwoResources: {
  //           gold: p2Resources[0].p2_gold,
  //           wood: p2Resources[0].p2_wood,
  //           metal: p2Resources[0].p2_metal
  //         }
  //       });
  //       console.log('[[[[[[[[[[[[[[[[[[[[[[[[[[ resources ]]]]]]]]]]]]]]]]]]]]]]]]]')
  //       console.log(p1Resources)
  //       console.log(p2Resources)
  //     } else { // if not enough resources
  //       console.log('~~~~~~~~~~~ player 1 is too poor to buy SWORDSMEN');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   } else if (player === 'player2') { // else same for player 2
  //     if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_metal >= 10) {
  //       db.buySwordsmen(room, gameIndex, player);

  //       let p1Resources = await db.getResources(room, gameIndex, 'player1');
  //       let p2Resources = await db.getResources(room, gameIndex, 'player2');

  //       await io.to(socketId).emit('swordsmen');

  //       await io.to(room).emit('updateResources', {
  //         playerOneResources: {
  //           gold: p1Resources[0].p1_gold,
  //           wood: p1Resources[0].p1_wood,
  //           metal: p1Resources[0].p1_metal
  //         },
  //         playerTwoResources: {
  //           gold: p2Resources[0].p2_gold,
  //           wood: p2Resources[0].p2_wood,
  //           metal: p2Resources[0].p2_metal
  //         }
  //       });

  //       console.log('[[[[[[[[[[[[[[[[[[[[[[[[[[ resources ]]]]]]]]]]]]]]]]]]]]]]]]]');
  //       console.log(p1Resources);
  //       console.log(p2Resources);
  //     } else {
  //       // if not enough resources
  //       console.log('~~~~~~~~~~~ player 2 is too poor to buy SWORDSMEN');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   }
  // }

  // if (type === 'archers') { // if buying archers
  //   console.log('LETS BUY SOME ----> ARCHERS');
  //   if (player === 'player1') { // for player 1
  //     if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_wood >= 20) { // check if player has enough resources to purchase unit

  //       db.buyArchers(room, gameIndex, player); // update units and resources in the db

  //       let p1Resources = await db.getResources(room, gameIndex, 'player1');
  //       let p2Resources = await db.getResources(room, gameIndex, 'player2');

  //       await io.to(socketId).emit('archers');

  //       await io.to(room).emit('updateResources', {
  //         playerOneResources: {
  //           gold: p1Resources[0].p1_gold,
  //           wood: p1Resources[0].p1_wood,
  //           metal: p1Resources[0].p1_metal
  //         },
  //         playerTwoResources: {
  //           gold: p2Resources[0].p2_gold,
  //           wood: p2Resources[0].p2_wood,
  //           metal: p2Resources[0].p2_metal
  //         }
  //       });

  //     } else { // if not enough resources
  //       console.log('~~~~~~~~~~~ player 1 too poor to buy ARCHERS');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   } else if (player === 'player2') { // else same for player 2
  //     if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_wood >= 20) {
  //       db.buyArchers(room, gameIndex, player);

  //       let p1Resources = await db.getResources(room, gameIndex, 'player1');
  //       let p2Resources = await db.getResources(room, gameIndex, 'player2');

  //       await io.to(socketId).emit('archers');

  //       await io.to(room).emit('updateResources', {
  //         playerOneResources: {
  //           gold: p1Resources[0].p1_gold,
  //           wood: p1Resources[0].p1_wood,
  //           metal: p1Resources[0].p1_metal
  //         },
  //         playerTwoResources: {
  //           gold: p2Resources[0].p2_gold,
  //           wood: p2Resources[0].p2_wood,
  //           metal: p2Resources[0].p2_metal
  //         }
  //       });

  //     } else { // if not enough resources
  //       console.log('~~~~~~~~~~~ player 2 too poor to buy ARCHERS');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   }
  // }

  // if (type === 'knights') { // if buying knights
  //   console.log('LETS BUY SOME ----> KNIGHTS');
  //   if (player === 'player1') { // for player 1
  //     if (currentPlayerResources[0].p1_gold >= 20 && currentPlayerResources[0].p1_wood >= 20 && currentPlayerResources[0].p1_metal >= 20) {
  //       // check if player has enough resources to purchase unit
  //       db.buyKnights(room, gameIndex, player); // update units and resources in the db

  //       let p1Resources = await db.getResources(room, gameIndex, 'player1');
  //       let p2Resources = await db.getResources(room, gameIndex, 'player2');

  //       await io.to(socketId).emit('knights');

  //       await io.to(room).emit('updateResources', {
  //         playerOneResources: {
  //           gold: p1Resources[0].p1_gold,
  //           wood: p1Resources[0].p1_wood,
  //           metal: p1Resources[0].p1_metal
  //         },
  //         playerTwoResources: {
  //           gold: p2Resources[0].p2_gold,
  //           wood: p2Resources[0].p2_wood,
  //           metal: p2Resources[0].p2_metal
  //         }
  //       });

  //     } else { // if not enough resources
  //       console.log('~~~~~~~~~~~ player 1 too poor to buy KNIGHTS');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   } else if (player === 'player2') { // else same for player 2
  //     if (currentPlayerResources[0].p2_gold >= 20 && currentPlayerResources[0].p2_wood >= 20 && currentPlayerResources[0].p2_metal >= 20) {
  //       db.buyKnights(room, gameIndex, player);

  //       let p1Resources = await db.getResources(room, gameIndex, 'player1');
  //       let p2Resources = await db.getResources(room, gameIndex, 'player2');

  //       await io.to(socketId).emit('knights');

  //       await io.to(room).emit('updateResources', {
  //         playerOneResources: {
  //           gold: p1Resources[0].p1_gold,
  //           wood: p1Resources[0].p1_wood,
  //           metal: p1Resources[0].p1_metal
  //         },
  //         playerTwoResources: {
  //           gold: p2Resources[0].p2_gold,
  //           wood: p2Resources[0].p2_wood,
  //           metal: p2Resources[0].p2_metal
  //         }
  //       });

  //     } else { // if not enough resources
  //       console.log('~~~~~~~~~~~ player 2 too poor to buy KNIGHTS');
  //       io.to(socketId).emit('not enough resources');
  //     }
  //   }
  // }
  /////////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////// IF USING GAME OBJ ON SERVER /////////////////////////////////////
  let game = games[gameIndex], resources, unitCount;
  player === 'player1' ? resources = game.playerOneResources : resources = game.playerTwoResources;
  player === 'player1' ? unitCount = playerOneTotalUnits : resources = playerTwoTotalUnits;
  if (type === 'swordsmen') {
    if (resources.gold >= 10 && resources.metal >= 10) {
      resources.gold -= 10;
      resources.metal -= 10;
      game.board.forEach(hex => {
        if (hex.player === player) {
          hex.swordsmen += 10;
        }
      })
      game[unitCount] = game[unitCount] += 10;
      io.to(room).emit('swordsmen');
      io.to(room).emit('updateResources', {
        playerOneResources: game.playerOneResources,
        playerTwoResources: game.playerTwoResources      });
    } else {
      io.to(socketId).emit('notEnoughResources');
    }
  } else if (type === 'archers') {
    if (resources.gold >= 10 && resources.wood >= 20) {
      resources.gold -= 10;
      resources.wood -= 20;
      game.board.forEach(hex => {
        if (hex.player === player) {
          hex.archers += 10;
        }
      })
      game[unitCount] = game[unitCount] += 10;
      io.to(room).emit('archers');
      io.to(room).emit('updateResources', {
        playerOneResources: game.playerOneResources,
        playerTwoResources: game.playerTwoResources
      });
    } else {
      io.to(socketId).emit('not enough resources');
    }
  } else if (type === 'knights') {
    if (resources.gold >= 20 && resources.wood >= 20 && resources.metal >= 20) {
      resources.gold -= 20;
      resources.wood -= 20;
      resources.metal -= 20;
      game.board.forEach(hex => {
        if (hex.player === player) {
          hex.knights += 10;
        }
      })
      game[unitCount] = game[unitCount] += 10;
      io.to(room).emit('knights');
      io.to(room).emit('updateResources', {
        playerOneResources: game.playerOneResources,
        playerTwoResources: game.playerTwoResources
      });
    } else {
      io.to(room).emit('not enough resources');
    }
  }
}

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../react-client/dist', 'index.html'));
});

//////////////////////////////////////////////////
// TODO: Take out this section - JUST FOR TESTING
app.post('/users', (req, res) => {
  db.addUser(req.body.username, req.body.email, req.body.password);
  res.end();
})
//////////////////////////////////////////////////

// io.listen(process.env.PORT || 3000);
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters
