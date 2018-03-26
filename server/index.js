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
    roomNum++; // increment room count to assign new room
  })

  socket.on('joinGame', async (data) => {
    await socket.join(data.room);
    const board = await gameInit(5, 4);
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
    await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases
    /////////////////////////////////////////////////////////////////////////////////////////////

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

  /////////////////////////////////////// IF USING GAME OBJECT ON SERVER ///////////////////////////////////////
  // let board = games[gameIndex].board; // game board found using above index
  // let masterOrigin = await board[originIndex];// origin to be updated/checked against
  // let masterTarget = await board[targetIndex]
  // let masterOrigCs = masterOrigin.coordinates; // coordinates of those masters
  // let masterTarCs = masterTarget.coordinates;
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////////////////////////////////////// IF USING DATABASE //////////////////////////////////////////
  let board = await db.getGameBoard(room, gameIndex); // gets game board from db using above index
  let masterOrigin = await db.getHex(updatedOrigin.index);// origin to be updated/checked against
  let masterTarget = await db.getHex(updatedTarget.index); // same for target
  let masterOrigCs = [masterOrigin[0].coordinate_0, masterOrigin[0].coordinate_1, masterOrigin[0].coordinate_2]; // coordinates of those masters
  let masterTarCs = [masterTarget[0].coordinate_0, masterTarget[0].coordinate_1, masterTarget[0].coordinate_2]; // coordinates of those masters
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  let origCs = await updatedOrigin.coordinates; // as well as coordinates of the ones sent by user
  let tarCs = await updatedTarget.coordinates;
  let currentPlayer = await data.currentPlayer; // player whose turn it is
  let socketId = await data.socketId; // socket to send back response if necessary

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget); // assess legality of move

  if (legal) { // if legal move,

    //////////////////////////////////// IF USING DATABASE ////////////////////////////////
    let collision = await checkForCollision(updatedOrigin.index, updatedTarget.index, gameIndex, room); // check for collision
    ////////////////////////////////////////////////////////////////////////////////////////

    // console.log('........................................checking for collision after legal move.............\n', collision)

    //////////////////////////// IF USING GAME OBJECT ON SERVER ////////////////////////////
    // let collision = await checkForCollision(originIndex, targetIndex, gameIndex, room); // check for collision
    ////////////////////////////////////////////////////////////////////////////////////////

    if (collision) {
      if (collision === 'friendly') { // if collision and collision is friendly,
        let result = await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room); // update hexes without combat occuring

        let move = {
          updatedOrigin: result.updatedOrigin,
          originIndex: originIndex,
          updatedTarget: result.updatedTarget,
          updatedTarget: updatedTarget
        }

        console.log('\n(((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((\nMOVE ON COLLISION:\n', move, '\n(((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((\n')

        /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
        await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player
        /////////////////////////////////////////////////////////////////////////////////////////////

        await io.to(room).emit('move', move); // then send back okay to move units

      } else { // if collision & combat time

        io.to(room).emit('combat');
        
        /////////////////////////////// UNCOMMENT WHEN USING GAME OBJECT ON SERVER /////////////////////////
        // let result = await resolveCombat(originIndex, targetIndex, gameIndex, room, updatedOrigin, updatedTarget, currentPlayer); //otherwise, roll for combat
        ////////////////////////////////////////////////////////////////////////////////////////////////////

        ////////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////////
        let result = await resolveCombat(updatedOrigin.index, updatedTarget.index, gameIndex, room, updatedOrigin, updatedTarget, currentPlayer); //otherwise, roll for combat
        ////////////////////////////////////////////////////////////////////////////////////////////////////

        console.log('\n=================================================================================\nRESULT OF COMBAT:\n', result, '\n=================================================================================\n')

        if (result === 'tie') { // game tie
          console.log('\n===================================================== IT WAS A TIE =================================\n')
          io.to(room).emit('tieGame');

          const board = await gameInit(5, 4);

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
          await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases
          /////////////////////////////////////////////////////////////////////////////////////////////

          setTimeout(() => io.to(room).emit('gameCreated', newGameBoard), 5000);
          return;
        }

        if (result.tie === true) {
          console.log('\n****************************** RESULT.TIE = TRUE ******************************\n');

          let updatedOriginPlayer = null;
          let updatedTargetPlayer = null;

          if (result.updatedOrigin.player) {
            updatedOriginPlayer = 'player' + result.updatedOrigin.player;
          }

          if (result.updatedTarget.player) {
            updatedTargetPlayer = 'player' + result.updatedTarget.player
          }

          let newMove = {
            updatedOrigin: {
              coordinates: [result.updatedOrigin.coordinate_0, result.updatedOrigin.coordinate_1, result.updatedOrigin.coordinate_2],
              index: result.updatedOrigin.hex_index,
              swordsmen: result.updatedOrigin.swordsmen,
              archers: result.updatedOrigin.archers,
              knights: result.updatedOrigin.knights,
              player: updatedOriginPlayer
            },
            updatedTarget: {
              coordinates: [result.updatedTarget.coordinate_0, result.updatedTarget.coordinate_1, result.updatedTarget.coordinate_2],
              index: result.updatedTarget.hex_index,
              swordsmen: result.updatedTarget.swordsmen,
              archers: result.updatedTarget.archers,
              knights: result.updatedTarget.knights,
              player: updatedTargetPlayer
            },
            originIndex: originIndex,
            targetIndex: targetIndex
          }
          io.to(room).emit('move', newMove); // individual combat tie but someone still has units
          return;
        }

        if (result.gameOver) {  // // if the game is over & attacker wins, need to change hexes and send back board

          console.log('\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ GAME IS OVER ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n')

          if (result.gameOver === 'player1' && currentPlayer === 'player1' ||
          result.gameOver === 'player2' && currentPlayer === 'player2') {

            console.log('\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\nresult.gameOver -> WINNER :\n', result.gameOver)
            console.log('\ncurrentPlayer:\n', currentPlayer, '\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n')

            io.to(socketId).emit('winGame'); // the attacker gets a personal win message
            socket.to(room).emit('loseGame'); // while the rest of the room (defender) gets lose message

          } else {

            io.to(socketId).emit('loseGame');
            socket.to(room).emit('winGame');
          }

          const board = await gameInit(5, 4); // init board for new game
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
          await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases
          /////////////////////////////////////////////////////////////////////////////////////////////

          setTimeout(() => io.to(room).emit('gameCreated', newGameBoard), 5000); // send game board to user

        } else { // if the game is not over
          console.log('\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> GAME NOT OVER YET <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
          
          //////////////////////////////////// IF USING GAME OBJECT ON SERVER /////////////////////////
          await updateHexes(originIndex, result.updatedOrigin, targetIndex, result.updatedTarget, gameIndex, currentPlayer, room); // if move is to unoccupied hex, execute move

          // let move = {
          //   updatedOrigin: result.updatedOrigin,
          //   updatedTarget: result.updatedTarget,
          //   originIndex: originIndex,
          //   targetIndex: targetIndex,
          //   updatedUnitCounts: {
          //     playerOneTotalUnits: games[gameIndex].playerOneTotalUnits,
          //     playerTwoTotalUnits: games[gameIndex].playerTwoTotalUnits
          //   }
          // }
          ////////////////////////////////////////////////////////////////////////////////////////////

          ///////////////////////////////////// IF USING DATABASE ////////////////////////////////////
          let updatedOriginPlayer = null;
          let updatedTargetPlayer = null;

          if (result.updatedOrigin.player) {
            updatedOriginPlayer = 'player' + result.updatedOrigin.player;
          }

          if (result.updatedTarget.player) {
            updatedTargetPlayer = 'player' + result.updatedTarget.player;
          }

          let move = {
            updatedOrigin: {
              coordinates: [result.updatedOrigin.coordinate_0, result.updatedOrigin.coordinate_1, result.updatedOrigin.coordinate_2],
              index: result.updatedOrigin.hex_index,
              swordsmen: result.updatedOrigin.swordsmen,
              archers: result.updatedOrigin.archers,
              knights: result.updatedOrigin.knights,
              player: updatedOriginPlayer
            },

            updatedTarget: {
              coordinates: [result.updatedTarget.coordinate_0, result.updatedTarget.coordinate_1, result.updatedTarget.coordinate_2],
              index: result.updatedTarget.hex_index,
              swordsmen: result.updatedTarget.swordsmen,
              archers: result.updatedTarget.archers,
              knights: result.updatedTarget.knights,
              player: updatedTargetPlayer
            },

            originIndex: originIndex,
            targetIndex: targetIndex,

            updatedUnitCounts: {
              playerOneTotalUnits: games[gameIndex].playerOneTotalUnits, // TODO: UPDATE THIS
              playerTwoTotalUnits: games[gameIndex].playerTwoTotalUnits, // TODO: UPDATE THIS
            }
          }

          // console.log('\n---------> MOVE WHEN GAME ISNT OVER:\n', move);

          await db.updateDbHexes(masterOrigin, move.updatedTarget, currentPlayer, move.updatedOrigin); // updates the original hex and new hex in the db for the current player
          
          let moveUpdateOrigin = await db.getHex(move.updatedOrigin.index);
          let moveUpdateTarget = await db.getHex(move.updatedTarget.index);
          
          // console.log('\nmove updated origin from DB:\n', moveUpdateOrigin);
          // console.log('\nmove update target from DB:\n', moveUpdateTarget);
          /////////////////////////////////////////////////////////////////////////////////////////////

          await io.to(room).emit('move', move);

          if (result.flag === 'attacker') {
            console.log('\n-----------------------------> ATTACKER WON THE COMBAT BATTLE <-----------------------------\n');
            await io.to(socketId).emit('combatWin');
            await socket.to(room).emit('combatLoss');
            
          } else if (result.flag === 'defender') {
            console.log('\n-----------------------------> DEFENDER WON THE COMBAT BATTLE <-----------------------------\n');
            await io.to(socketId).emit('combatLoss');
            await socket.to(room).emit('combatWin');
          }
        }
      }

    } else { // if move is to unoccupied hex, execute move
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room); 
      let move = {
        originIndex: originIndex,
        updatedOrigin: updatedOrigin,
        targetIndex: targetIndex,
        updatedTarget: updatedTarget
      };

      // console.log('\n_______________________________________________________________\nMOVE for ', currentPlayer, '\n', move, '\n_______________________________________________________________\n')

      /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
      await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player
      /////////////////////////////////////////////////////////////////////////////////////////////

      await io.to(room).emit('move', move);
    }
  } else { // if move request is not legal, send socket failure message, cheating detected
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>> CHEATING AHHHHH <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
    await io.to(room).emit('failure');
  }
};

const checkLegalMove = async (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget, cb) => { // to check move legality,

  // console.log('\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> CHECKING LEGAL MOVE');
  // console.log('masterOrigCs: ', masterOrigCs, ' ----------- origCs: ', origCs);
  // console.log('masterTarCs: ', masterTarCs, ' ----------- tarCs: ', tarCs,);
  // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');

  let isLegal = false;
  
  if (await masterOrigCs[0] === origCs[0] && masterOrigCs[1] === origCs[1] && masterOrigCs[2] === origCs[2] && // make sure all coordinates match between origin
      masterTarCs[0] === tarCs[0] && masterTarCs[1] === tarCs[1] && masterTarCs[2] === tarCs[2]) { // and target **********NEED TO ADD CHECK TO MAKE SURE RESOURCE COUNTS AND UNIT COUNTS MATCH

    // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> COORDINATES MATCH');

    /////////////////////////// IF USING GAMES OBJECT ON SERVER ///////////////////////////////////
    // if (masterOrigin.archers === updatedOrigin.archers + updatedTarget.archers &&
    // masterOrigin.knights === updatedOrigin.knights + updatedTarget.knights &&
    // masterOrigin.swordsmen === updatedOrigin.swordsmen + updatedTarget.swordsmen) {
    ////////////////////////////////////////////////////////////////////////////////////////////////

    /////////////////////////////////// IF USING DATABASE //////////////////////////////////////////
    if (masterOrigin[0].archers === updatedOrigin.archers + updatedTarget.archers &&
    masterOrigin[0].knights === updatedOrigin.knights + updatedTarget.knights &&
    masterOrigin[0].swordsmen === updatedOrigin.swordsmen + updatedTarget.swordsmen) {
    ////////////////////////////////////////////////////////////////////////////////////////////////
      isLegal = true;
      return true;
    } else { // master origin units do not match updated origin units + updated target units
      console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> MISMATCH IN UNITS <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
      console.log('master origin archers: ',  masterOrigin[0].archers)
      console.log('should equal')
      console.log('updated origin archers: ', updatedOrigin.archers, ' updated target knights: ', updatedTarget.archers)

      console.log('\n', 'master origin knights: ', masterOrigin[0].knights, '\nshould equal\nupdated origin knights; ', updatedOrigin.knights, '\nupdated target knights: ', updatedTarget.knights)

      console.log('\n', 'master origin swordsmen: ', masterOrigin[0].swordsmen, '\nshould equal\nupdated origin swordsmen; ', updatedOrigin.swordsmen, '\nupdated target swordsmen: ', updatedTarget.swordsmen)
      return false;
    }
  } else {
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> COORDINATES DO NOT MATCH <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    console.log('masterOrigin: ', masterOrigin);
    console.log('updatedOrigin: ', updatedOrigin);
    console.log('updatedTarget: ', updatedTarget);
    return false;
  }
}

const checkForCollision = async (originHexIndex, targetHexIndex, gameIndex, room) => {

  ///////////////////////////////////// IF USING GAME OBJECT ON THE SERVER /////////////////////////////////////
  // let game = games[gameIndex].board;
  // let origin = game[originHexIndex]; // uses games object on server
  // let target = game[targetHexIndex]; // uses games object on server
  // if (origin.player && target.player) {
  //   let collision = '';
  //   origin.player === target.player
  //     ? (collision += 'friendly')
  //     : (collision += 'opponent'); // if collision, decide if collision is with own units or enemy units
  //   return collision;
  // } else {
  //   return false;
  // }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////////////////////////////////// IF USING DATABASE ////////////////////////////////////////////
  let origin = await db.getHex(originHexIndex); // get original hex from db / NOTE: returns an object
  let target = await db.getHex(targetHexIndex); // get new target hex from db / NOTE: returns an object

  console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nCHECKING FOR COLLISION:\n', 'ORIGIN PLAYER: ', origin[0].hex_owner, ' ------ HEX INDEX: ', originHexIndex, '\nTARGET PLAYER: ', target[0].hex_owner, ' ------ HEX INDEX: ', targetHexIndex, '\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
  
  if (origin[0].hex_owner && target[0].hex_owner) { // if  original hex & new target hex are owned by players
    let collision = '';
    origin[0].hex_owner === target[0].hex_owner // if the owner of origin & new hex are the same player
      ? (collision += 'friendly') // collision is friendly (player's own units)
      : (collision += 'opponent'); // else collision is with enemy units
    return collision;
  } else {
    return false;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////
};

/////////////////////////////////////// IF USING GAME OBJECT ON SERVER ////////////////////////////////////////
const updateHexes = async (originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room) => {
  games[gameIndex].board[originIndex] = await updatedOrigin;
  games[gameIndex].board[targetIndex] = await updatedTarget; // This is what will happen on an ordinary move

  currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1'; // then player will toggle
  await reinforceHexes(gameIndex, currentPlayer, targetIndex, room); // then check to see if there are reinforcements
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

const resolveCombat = async (originIndex, targetIndex, gameIndex, room, updatedOrigin, updatedTarget, currentPlayer) => { // if combat,

  ///////////////////////////////////// IF USING GAME OBJECT ON SERVER //////////////////////////////////////
  // let attacker = updatedTarget; // get attacking hex
  // let defender = games[gameIndex].board[targetIndex]; // and defending hex
  // let attackerPlayer = attacker.player;
  // let defenderPlayer = defender.player;
  // let flag;

  // let attackerSwordsmen = attacker.swordsmen;
  // let attackerKnights = attacker.knights;
  // let attackerArchers = attacker.archers;
  // let defenderSwordsmen = defender.swordsmen;
  // let defenderKnights = defender.knights;
  // let defenderArchers = defender.archers;

  // let originalAttackerArmySize = attackerSwordsmen + attackerKnights + attackerArchers;
  // let originalDefenderArmySize = defenderSwordsmen + defenderKnights + defenderArchers;

  // attackerArchers && defenderArchers ? attackerKnights -= defenderArchers : null; // first, archers pick off knights from afar
  // defenderKnights && attackerArchers ? defenderKnights -= attackerArchers : null;

  // attackerSwordsmen && defenderKnights ? attackerSwordsmen -= (defenderKnights * 3) : null; // then, knights crash against swordsmen
  // defenderSwordsmen && attackerKnights ? defenderSwordsmen -= (attackerKnights * 3) : null;

  // attackerArchers && defenderSwordsmen ? attackerArchers -= (defenderSwordsmen * 2) : null; // finally, swordsmen take out archers
  // defenderArchers && attackerSwordsmen ? defenderArchers -= (attackerSwordsmen * 2) : null;

  // if (attackerSwordsmen < 0) attackerSwordsmen = 0; // no numbers should go below zero
  // if (attackerKnights < 0) attackerKnights = 0;
  // if (attackerArchers < 0) attackerArchers = 0;
  // if (defenderSwordsmen < 0) defenderSwordsmen = 0;
  // if (defenderKnights < 0) defenderKnights = 0;
  // if (defenderArchers < 0) defenderArchers = 0;

  // let attackerUnitsLost = originalAttackerArmySize - attackerSwordsmen - attackerArchers - attackerKnights;
  // let defenderUnitsLost = originalDefenderArmySize - defenderSwordsmen - defenderArchers - defenderKnights;
  
  // if (currentPlayer === 'player1') { // and total unit counts need to be reduced
  //   games[gameIndex].playerOneTotalUnits -= attackerUnitsLost;
  //   games[gameIndex].playerTwoTotalUnits -= defenderUnitsLost;
  // } else {
  //   games[gameIndex].playerOneTotalUnits -= defenderUnitsLost;
  //   games[gameIndex].playerTwoTotalUnits -= attackerUnitsLost;
  // }
  
  // let attackerArmySize = attackerArchers + attackerSwordsmen + attackerKnights;
  // let defenderArmySize = defenderSwordsmen + defenderArchers + defenderKnights;

  // if (defenderArmySize === attackerArmySize) { // assess if there is a tie
    // let masterOrigin = games[gameIndex].board[originIndex]; // if there is, huge side loses half their units
    // updatedOrigin = {
    //   ...masterOrigin,
    //   swordsmen: Math.floor(attackerSwordsmen / 2) || 0,
    //   archers: Math.floor(attackerArchers / 2) || 0,
    //   knights: Math.floor(attackerKnights / 2) || 0,
    // };

    // let masterTarget = games[gameIndex].board[targetIndex];
    // updatedTarget = {
    //   ...masterTarget,
    //   swordsmen: Math.floor(defenderSwordsmen / 2) || 0,
    //   archers: Math.floor(defenderArchers / 2) || 0,
    //   knights: Math.floor(defenderKnights / 2) || 0,
    // };

    // if (currentPlayer === 'player1') { // and total unit counts need to be reduced
    //   games[gameIndex].playerOneTotalUnits -= games[gameIndex].playerOneTotalUnits - updatedOrigin.swordsmen - updatedOrigin.archers - updatedOrigin.knights || 0;
    //   games[gameIndex].playerTwoTotalUnits -= games[gameIndex].playerTwoTotalUnits - updatedTarget.swordsmen - updatedTarget.archers - updatedTarget.knights || 0;
    // } else {
    //   games[gameIndex].playerOneTotalUnits -= games[gameIndex].playerOneTotalUnits - updatedTarget.swordsmen - updatedTarget.archers - updatedTarget.knights || 0;
    //   games[gameIndex].playerTwoTotalUnits -= games[gameIndex].playerTwoTotalUnits - updatedOrigin.swordsmen - updatedOrigin.archers - updatedOrigin.knights || 0;
    // }

    // if (games[gameIndex].playerOneTotalUnits === 0 && games[gameIndex].playerTwoTotalUnits === 0) {
    //   return 'tie';
    // }

    // await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room); // update the board

    // return {
    //   tie: true,
    //   updatedOrigin: updatedOrigin,
    //   updatedTarget: updatedTarget,
    //   originIndex: originIndex,
    //   targetIndex: targetIndex,
    //   updatedUnitCounts: {
    //     playerOneTotalUnits: games[gameIndex].playerOneTotalUnits,
    //     playerTwoTotalUnits: games[gameIndex].playerTwoTotalUnits
    //   }
    // };
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////

  console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< FIRST!!!! INSIDE RESOLVE COMBAT >>>>>>>>>>>>>>>>>>>>>>>>>>>>>');

  //////////////////////////////////////// IF USING DATABASE //////////////////////////////////////////////////
  let attacker = [{ // get attacking hex
    hex_index: updatedTarget.index,
    coordinate_0: updatedTarget.coordinates[0],
    coordinate_1: updatedTarget.coordinates[1],
    coordinate_2: updatedTarget.coordinates[2],
    swordsmen: updatedTarget.swordsmen,
    archers: updatedTarget.archers,
    knights: updatedTarget.knights,
    player: Number(updatedTarget.player[updatedTarget.player.length - 1]) // TODO: update with user id
  }]; 
  let attackerPlayer = attacker[0].player;
  let attackerSwordsmen = attacker[0].swordsmen;
  let attackerArchers = attacker[0].archers;
  let attackerKnights = attacker[0].knights;
  let originalAttackerArmySize = attackerSwordsmen + attackerKnights + attackerArchers;

  let defender = await db.getHex(targetIndex); // and defending hex (NOTE: returns an object)
  let defenderPlayer = defender[0].player;
  let defenderSwordsmen = defender[0].swordsmen;
  let defenderKnights = defender[0].knights;
  let defenderArchers = defender[0].archers;
  let originalDefenderArmySize = defenderSwordsmen + defenderKnights + defenderArchers;

  let flag; // will eventually return 'defender' or 'attacker'

  console.log('\n____________________________________________________________\n  ATTACKER: \n', attacker)
  console.log('\n  DEFENDER: \n', defender, '\n____________________________________________________________\n')

  attackerArchers && defenderArchers ? attackerKnights -= defenderArchers : null; // first, archers pick off knights from afar
  console.log('\n ATTACKER KNIGHTS: ', attackerKnights -= defenderArchers)

  defenderKnights && attackerArchers ? defenderKnights -= attackerArchers : null;
  console.log(' DEFENDER KNIGHTS: ', defenderKnights -= attackerArchers)

  attackerSwordsmen && defenderKnights ? attackerSwordsmen -= (defenderKnights * 3) : null; // then, knights crash against swordsmen
  console.log('\n ATTACKER SWORDSMEN: ', attackerSwordsmen -= (defenderKnights * 3))

  defenderSwordsmen && attackerKnights ? defenderSwordsmen -= (attackerKnights * 3) : null;
  console.log(' DEFENDER SWORDSMEN: ', defenderSwordsmen -= (attackerKnights * 3))

  attackerArchers && defenderSwordsmen ? attackerArchers -= (defenderSwordsmen * 2) : null; // finally, swordsmen take out archers
  console.log('\n ATTACKER ARCHERS: ', attackerArchers -= (defenderSwordsmen * 2))

  defenderArchers && attackerSwordsmen ? defenderArchers -= (attackerSwordsmen * 2) : null;
  console.log(' DEFENDER ARCHERS: ', defenderArchers -= (attackerSwordsmen * 2))

  if (attackerSwordsmen < 0) attackerSwordsmen = 0; // no numbers should go below zero
  if (attackerKnights < 0) attackerKnights = 0;
  if (attackerArchers < 0) attackerArchers = 0;
  if (defenderSwordsmen < 0) defenderSwordsmen = 0;
  if (defenderKnights < 0) defenderKnights = 0;
  if (defenderArchers < 0) defenderArchers = 0;

  console.log('\n-------------------------------- UNITS FLOORED ------------------------------')
  console.log('  ATTACKER SWORDSMEN: ', attackerSwordsmen);
  console.log('  ATTACKER ARCHERS: ', attackerArchers)
  console.log('  ATTACKER KNIGHTS: ', attackerKnights)

  console.log('\n  DEFENDER SWORDSMEN: ', defenderSwordsmen);
  console.log('  DEFENDER ARCHERS: ', defenderArchers)
  console.log('  DEFENDER KNIGHTS: ', defenderKnights,)
  console.log('-------------------------------------------------------------------------------\n')

  let attackerUnitsLost = originalAttackerArmySize - attackerSwordsmen - attackerArchers - attackerKnights;
  let defenderUnitsLost = originalDefenderArmySize - defenderSwordsmen - defenderArchers - defenderKnights;

  console.log('\n{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{{\n ATTACKER UNITS LOST:')

  console.log(`   attackerUnitsLost (${attackerUnitsLost}) = originalAttackerArmySize (${originalAttackerArmySize}) - attackerSwordsmen (${attackerSwordsmen}) - attackerArchers (${attackerArchers}) - attackerKnights (${attackerKnights})`)

  console.log(`\n DEFENDER UNITS LOST:\n   defenderUnitsLost (${defenderUnitsLost}) = originalDefenderArmySize (${originalDefenderArmySize}) - defenderSwordsmen (${defenderSwordsmen}) - defenderArchers (${defenderArchers}) - defenderKnights (${defenderKnights})\n}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}\n`)
  
  let attackerArmySize;
  let defenderArmySize;
  let remainingAttackerSwordsmen;
  let remainingAttackerArchers;
  let remainingAttackerKnights;
  let remainingDefenderSwordsmen;
  let remainingDefenderArchers;
  let remainingDefenderKnights;

  if (defender[0].player === 1) { // if the defender is player 1
    console.log('\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\nDEFENDER = PLAYER 1\nATTACKER = PLAYER 2\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n');
    
    let defenderHex = await db.getHex(defender[0].hex_index); // get the original defender hex

    remainingDefenderSwordsmen = defenderHex[0].swordsmen - defenderSwordsmen; // calc remaining units on the attacker hex
    remainingDefenderArchers = defenderHex[0].archers - defenderArchers;
    remainingDefenderKnights = defenderHex[0].knights - defenderKnights;
    
    defenderArmySize = remainingDefenderSwordsmen + remainingDefenderArchers + remainingDefenderKnights;

    if (defenderArmySize > 0) { // if defender has remaining units on the original hex
      console.log('\ndefender army is > 0: ', defenderArmySize, '\n');
      await db.updateHexUnits(defender[0].hex_index, remainingDefenderSwordsmen, remainingDefenderArchers, remainingDefenderKnights, 'player1'); // find the hex that player 1 is on in the db & update the units on the hex with the DEFENDER units / TODO: update with user id
    } else { // if no units remaining on the hex, reset the player/hex owner in the db
      console.log('\ndefender army is = 0: ', defenderArmySize, '\n');
      await db.updateHexUnits(defender[0].hex_index, 0, 0, 0, null);
    }

    ///////////////// UPDATES ORIGINAL ATTACKER HEX WITH THE REMAINING UNITS LEFT OVER MOVING SOME UNITS /////////////
    let attackerHex = await db.getHex(originIndex); // get the original attacker hex from the db
    remainingAttackerSwordsmen = attackerHex[0].swordsmen - defenderSwordsmen; // calc remaining units on the attacker hex
    remainingAttackerArchers = attackerHex[0].archers - defenderArchers;
    remainingAttackerKnights = attackerHex[0].knights - defenderKnights;

    attackerArmySize = await remainingAttackerSwordsmen + remainingAttackerArchers + remainingAttackerKnights;

    await db.updateHexUnits(attackerHex[0].hex_index, remainingAttackerSwordsmen, remainingAttackerArchers, remainingAttackerKnights, 'player2'); // find hex attacker is on in db & update hex units / TODO: update with user id

    // if (attackerArmySize <= 0) { // if there are no remaining units on the original attacker hex for attacker
    //   await db.updateHexUnits(attackerHex[0].hex_index, remainingAttackerSwordsmen, remainingAttackerArchers, remainingAttackerKnights, null); // find hex attacker is on in db & reset units/player
    // } else { // else if attacker has remaining units 
    //   await db.updateHexUnits(attackerHex[0].hex_index, remainingAttackerSwordsmen, remainingAttackerArchers, remainingAttackerKnights, 'player2'); // find hex attacker is on in db & update hex units / TODO: update with user id
    // }

    console.log('  PLAYER 1: REMAINING DEFENDER army size:', defenderArmySize, '\n  PLAYER 1 DEFENDER hex in db:\n', defenderHex);
    console.log('\n  PLAYER 2: REMAINING ATTACKER army size: ', attackerArmySize, '\n  PLAYER 2 ATTACKER hex in db:\n', attackerHex);

  } else if (defender[0].player === 2) { // else if the defender is player 2
    console.log('\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\nDEFENDER = PLAYER 2\nATTACKER = PLAYER 1\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n');

    await db.updateHexUnits(defender[0].hex_index, defenderSwordsmen, defenderArchers, defenderKnights, 'player2'); // find the hex that player 2 is on in the db & update the units on the hex with the DEFENDER units / TODO: update with user id

    let defenderHex = await db.getHex(defender[0].hex_index); // // get the updated defender hex / returns an object
    remainingDefenderSwordsmen = defenderHex[0].swordsmen - defenderSwordsmen;
    remainingDefenderArchers  = defenderHex[0].archers - defenderArchers;
    remainingDefenderKnights  = defenderHex[0].knights - defenderKnights;
    
    // defenderArmySize = await defenderHex[0].swordsmen + defenderHex[0].archers + defenderHex[0].knights; // total units for player

    /*
      when defender is player 2 if attacker is moving all units (7) to defender hex (2)
      attacker hex is already updating
      need to update defender hex to 0 if attacker hex > defender hex
      update player and hex owner to null
    */

    ///////////////// UPDATES ORIGINAL ATTACKER HEX WITH THE REMAINING UNITS LEFT OVER MOVING SOME UNITS /////////////
    let attackerHex = await db.getHex(originIndex); // get the original attacker hex from the db

    // calc remaining units on the attacker hex if there were any units left behind by the attacker
    remainingAttackerSwordsmen = attackerHex[0].swordsmen - attackerSwordsmen;
    remainingAttackerArchers = attackerHex[0].archers - attackerArchers;
    remainingAttackerKnights = attackerHex[0].knights - attackerKnights;

    // if all attacker units were moved
    if (attackerSwordsmen === attackerHex[0].swordsmen && attackerSwordsmen !== 0) {
      remainingAttackerSwordsmen = attackerHex[0].swordsmen - defenderSwordsmen; // update remaining units on the attacker hex

      if (attackerSwordsmen > defenderSwordsmen) {
        remainingDefenderSwordsmen = 0;
      }

      console.log('\nALL ATTACKER SWORDSMEN MOVED: ', attackerSwordsmen, '\nREMAINING UNITS: ', remainingAttackerSwordsmen);
    } else {
      console.log('\n.... THERE ARE SOME ATTACKER SWORDSMEN LEFT BEHIND\n')
    }

    if (attackerArchers === attackerHex[0].archers && attackerArchers !== 0) {
      remainingAttackerArchers = attackerHex[0].archers - defenderArchers;

      if (attackerArchers > defenderArchers) {
        remainingDefenderArchers = 0;
      }

      console.log('\nALL ATTACKER ARCHERS MOVED: ', attackerArchers, '\nREMAINING UNITS: ', remainingAttackerArchers);
    } else {
      console.log('\n.... THERE ARE SOME ATTACKER ARCHERS LEFT BEHIND\n')
    }

    if (attackerKnights === attackerHex[0].knights && attackerKnights!== 0) {
      remainingAttackerKnights = attackerHex[0].knights - defenderKnights;

      if (attackerKnights > defenderKnights) {
        remainingDefenderKnights = 0;
      }

      console.log('\nALL ATTACKER KNIGHTS MOVED: ', attackerKnights, '\nREMAINING UNITS: ', remainingAttackerKnights);
    } else {
      console.log('\n.... THERE ARE SOME ATTACKER KNIGHTS LEFT BEHIND\n')
    }

    defenderArmySize = await remainingDefenderSwordsmen + remainingDefenderArchers + remainingDefenderKnights; // total units for player

    console.log(`\nDEFENDER (PLAYER 2) army size: remainingDefenderSwordsmen (${remainingDefenderSwordsmen}) + remainingDefenderArchers (${remainingDefenderArchers})+ remainingDefenderKnights (${remainingDefenderKnights})\n`)

    attackerArmySize = await remainingAttackerSwordsmen + remainingAttackerArchers + remainingAttackerKnights;

    console.log(`\nATTACKER (PLAYER 1) army size: remainingAttackerSwordsmen (${remainingAttackerSwordsmen}) + remainingAttackerArchers (${remainingAttackerArchers})+ remainingAttackerKnights (${remainingAttackerKnights})\n`)

    // await db.updateHexUnits(attackerHex[0].hex_index, remainingAttackerSwordsmen, remainingAttackerArchers, remainingAttackerKnights, 'player1'); // find the hex that player 1 is on in the db & update the units on the hex / TODO: update with user id
    
    await db.updateHexUnits(defenderHex[0].hex_index, remainingAttackerSwordsmen, remainingAttackerArchers, remainingAttackerKnights, 'player2'); // find the hex that DEFENDER (player 2) is on in the db & update the units on the hex / TODO: update with user id

    console.log('\nPLAYER 2 (DEFENDER): REMAINING DEFENDER ARMY SIZE: ', defenderArmySize, '\nPLAYER 2: DEFENDER HEX IN DB:\n', defenderHex);

    await db.updateHexUnits(attackerHex[0].index, remainingAttackerSwordsmen, remainingAttackerArchers, remainingAttackerKnights, 'player1'); // find the hex that ATTACKER (player 1) is on in the db & update the units on the hex / TODO: update with user id

    console.log('\nPLAYER 1 (ATTACKER): REMAINING ATTACKER ARMY SIZE: ', attackerArmySize, '\nPLAYER 1: ATTACKER HEX IN DB:\n', attackerHex);
    
  }

  if (defenderArmySize === attackerArmySize) { // assess if there is a tie

    console.log(`\n*********************************\nARMY SIZES ARE THE SAME:\n  defenderArmySize (${defenderArmySize}) === attackerArmySize (${attackerArmySize})\n*********************************\n`);

    let masterOrigin = await db.getHex(originIndex); // if there is, huge side loses half their units / returns an object

    updatedOrigin = {
      ...masterOrigin['0'], // for some reason the object returns at string '0'
      swordsmen: Math.floor(attackerSwordsmen / 2) || 0,
      archers: Math.floor(attackerArchers / 2) || 0,
      knights: Math.floor(attackerKnights / 2) || 0,
    };

    await db.updateHexUnits(updatedOrigin.hex_index, updatedOrigin.swordsmen, updatedOrigin.archers, updatedOrigin.knights, 'player' + updatedOrigin.player); // update the hex units in the db

    let masterTarget = await db.getHex(targetIndex); // returns an object

    updatedTarget = {
      ...masterTarget[0],
      swordsmen: Math.floor(defenderSwordsmen / 2) || 0,
      archers: Math.floor(defenderArchers / 2) || 0,
      knights: Math.floor(defenderKnights / 2) || 0,
    };
    
    await db.updateHexUnits(updatedTarget.hex_index, updatedTarget.swordsmen, updatedTarget.archers, updatedOrigin.knights, 'player' + updatedTarget.player); // update the hex units in the db
    
    let p1TotalUnits = 0;
    let p2TotalUnits = 0;
    
    let currentBoard = await db.getGameBoard(room, gameIndex); // gets current game board
    
    currentBoard.forEach( hex => {
      if (hex.hex_owner === 1) { // if the hex belongs to player one
        let totalUnitsOnHex = hex.swordsmen + hex.archers + hex.knights;
        p1TotalUnits += totalUnitsOnHex; // calculate total units for player 1
      } else if (hex.hex_owner === 2) { // else calc total units for player 2
        let totalUnitsOnHex = hex.swordsmen + hex.archers + hex.knights;
        p2TotalUnits += totalUnitsOnHex;
      }
    });
    
    if (p1TotalUnits === 0 && p2TotalUnits === 0) { // if neither players have any units left on the board, return tie
      return 'tie';
    }

    return { // if the game did not end in a tie, then send back the current hexes
      tie: true,
      updatedOrigin: updatedOrigin,
      updatedTarget: updatedTarget,
      originIndex: originIndex,
      targetIndex: targetIndex,
      updatedUnitCounts: {
        playerOneTotalUnits: p1TotalUnits,
        playerTwoTotalUnits: p2TotalUnits
      }
    };
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  }

  if (defenderArmySize > attackerArmySize) { // if after initial skirmish, defender army is bigger
    
    console.log('\n#######################################\nDEFENDER ARMY SIZE > ATTACKER ARMY SIZE:\n  DEFENDER ARMY SIZE: ', defenderArmySize, '\n  ATTACKER ARMY SIZE: ', attackerArmySize)

    while (attackerArmySize > 0) { // eliminate all attackers, starting with s, then a, then k
      // console.log('\n--- ELIMINATING ALL ATTACKERS: (WHILE ATTACKER ARMY > 0):\n  CURRENT ATTACKER SIZE: ', attackerArmySize)
      if (attackerSwordsmen) {
        attackerSwordsmen--;
        // console.log('1) REDUCING ATTACKER SWORDSMEN BY 1:\nNEW ATTACKER SWORDSMEN: ', attackerSwordsmen)
      } else if (attackerArchers) {
        attackerArchers--;
        // console.log('2) REDUCING ATTACKER ARCHERS BY 1:\nNEW ATTACKER ARCHERS: ', attackerArchers)

      } else if (attackerKnights) {
        attackerKnights--;
        // console.log('3) REDUCING ATTACKER KNIGHTS BY 1:\nNEW ATTACKER KNIGHTS: ', attackerKnights)
      }

      if (defenderSwordsmen) { // and a defender for each attacker unit, same order
        defenderSwordsmen--;
        // console.log('\n4) REDUCING DEFENDER SWORDSMEN BY 1:\nNEW DEFENDER SWORDSMEN: ', defenderSwordsmen)

      } else if (defenderArchers) {
        defenderArchers--;
        // console.log('5) REDUCING DEFENDER ARCHERS BY 1:\nNEW DEFENDER ARCHERS: ', defenderArchers)

      } else if (defenderKnights) {
        defenderKnights--;
        // console.log('6) REDUCING DEFENDER KNIGHTS BY 1:\nNEW DEFENDER KNIGHTS: ', defenderKnights)

      }

      defenderArmySize--;
      attackerArmySize--;

      console.log('\nDEFENDER ARMY SIZE DECREASED BY 1:\n  NEW DEFENDER SIZE: ', defenderArmySize)
      console.log('ATTACKER ARMY SIZE DECREASED BY 1:\n  NEW ATTACKER SIZE: ', attackerArmySize)
      console.log('#######################################\n')
    }

  } else if (attackerArmySize > defenderArmySize) { // otherwise, if attacker army is bigger,

    console.log('\n#######################################\nATTACKER ARMY SIZE > DEFENDER ARMY SIZE: \n  ATTACKER ARMY SIZE:', attackerArmySize, '\n  DEFENDER ARMY SIZE: ', defenderArmySize)

    while (defenderArmySize > 0) { // eliminate all defenders, same order
      // console.log('\n--- ELIMINATING ALL DEFENDERS: (WHILE DEFENDER ARMY > 0):\n NEW DEFENDER SIZE: ', defenderArmySize)

      if (defenderSwordsmen) {
        defenderSwordsmen--;
        // console.log('1) REDUCING DEFENDER SWORDSMEN BY 1:\nNEW DEFENDER SWORDSMEN: ', defenderSwordsmen)

      } else if (defenderArchers) {
        defenderArchers--;
        // console.log('2) REDUCING DEFENDER ARCHERS BY 1:\nNEW DEFENDER ARCHERS: ', defenderArchers)

      } else if (defenderKnights) {
        defenderKnights--;
        // console.log('3) REDUCING DEFENDER KNIGHTS BY 1:\nNEW DEFENDER KNIGHTS: ', defenderKnights)
        
      }

      if (attackerSwordsmen) { // and an attacker for each defender unit, same order
        attackerSwordsmen--;
        // console.log('\n4) REDUCING ATTACKER SWORDSMEN BY 1:\nNEW ATTACKER SWORDSMEN: ', attackerSwordsmen)

      } else if (attackerArchers) {
        attackerArchers--;
        // console.log('5) REDUCING ATTACKER ARCHERS BY 1:\nNEW ATTACKER ARCHERS: ', attackerArchers)

      } else if (attackerKnights) {
        attackerKnights--;
        // console.log('6) REDUCING ATTACKER KNIGHTS BY 1:\nNEW ATTACKER KNIGHTS: ', attackerKnights)

      }

      attackerArmySize--;
      defenderArmySize--;

      console.log('\nDEFENDER ARMY SIZE DECREASE BY 1:\n  NEW DEFENDER SIZE: ', defenderArmySize)
      console.log('ATTACKER ARMY SIZE DECREASE BY 1:\n  NEW ATTACKER SIZE: ', attackerArmySize)
      console.log('#######################################\n')

    }
  }

  ////////////////////////////////////// IF USING GAME OBJECT ON SERVER ////////////////////////////////////////
  ////////////////////////////////////// SHOULDN'T BE NEEDED AFTER DB WORKS ////////////////////////////////////
  // if (currentPlayer === 'player1') {
  //   games[gameIndex].playerOneTotalUnits -= originalAttackerArmySize - attackerArmySize;
  //   games[gameIndex].playerTwoTotalUnits -= originalDefenderArmySize - defenderArmySize;
  // } else {
  //   games[gameIndex].playerOneTotalUnits -= originalDefenderArmySize - defenderArmySize;
  //   games[gameIndex].playerTwoTotalUnits -= originalAttackerArmySize - attackerArmySize;
  // }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////

  defenderArmySize = defenderSwordsmen + defenderArchers + defenderKnights; // reassess army size
  attackerArmySize = attackerArchers + attackerSwordsmen + attackerKnights; // reassess army size

  console.log(`\n....................\nREASSESS DEFENDER ARMY SIZE:\n  defenderArmySize (${defenderArmySize}) = defenderSwordsmen (${defenderSwordsmen}) + defenderArchers (${defenderArchers}) + defenderKnights (${defenderKnights})\n....................\n`)

  console.log(`\n....................\nREASSESS ATTACKER ARMY SIZE:\n  attackerArmySize (${attackerArmySize}) = attackerSwordsmen (${attackerSwordsmen}) + attckerArchers (${attackerArchers}) + attackerKnights (${attackerKnights})\n....................\n`)

  if (attackerArmySize) {
    // defenderArmySize = remainingDefenderSwordsmen + remainingDefenderArchers + remainingDefenderKnights; // reassess army size
    // attackerArmySize = remainingAttackerSwordsmen + remainingAttackerArchers + remainingAttackerKnights; // reassess army size

    console.log('~~~~~~~~~~~~~~~~~~~ the ATTACKER has an army left over ~~~~~~~~~~~~~~~~~~~');

    let origTarget = await db.getHex(updatedTarget.index); // original target hex from db (returns an object)

    updatedTarget = {
      // IF USING GAME OBJ ON SERVER ////
      // ...updatedTarget,
      ///////////////////////////////////

      //////// IF USING DATABASE ///////
      ...origTarget[0],
      //////////////////////////////////

      // swordsmen: remainingAttackerSwordsmen,
      // archers: remainingAttackerArchers,
      // knights: remainingAttackerKnights,

      swordsmen: attackerSwordsmen,
      archers: attackerArchers,
      knights: attackerKnights,

      player: attackerPlayer,
      hex_owner: attackerPlayer
    }
    
    if (origTarget[0].player !== updatedTarget.player) { // if original player on the hex is not the attacker
      await db.updateHexUnits(updatedTarget.hex_index, attackerSwordsmen, attackerArchers, attackerKnights, 'player' + origTarget[0].player); // update units on hex in the db (for original player/owner of hex)

      await db.switchHexOwner(updatedTarget.hex_index, 'player' + updatedTarget.player); // then update the hex player/owner in the db with the attacker player
    }

    let dbUpdatedOrigin = await db.getHex(updatedOrigin.index);

    updatedOrigin = {
      ...dbUpdatedOrigin[0]
    }

    flag = 'attacker';

  } else if (defenderArmySize) {
    console.log('~~~~~~~~~~~~~~~~~~~ the DEFENDER has an army left over ~~~~~~~~~~~~~~~~~~~')

    let origHex = await db.getHex(updatedOrigin.index); // original origin hex from db (returns an object)

    // console.log('\n---------------------- origin hex from db:\n', origHex, '\n----------------------');

    updatedOrigin = { // reinitialize hex they left
      /////////////////// IF USING GAME OBJ ON SERVER ///////////////
      // ...updatedOrigin,
      // swordsmen: updatedOrigin.swordsmen + attackerSwordsmen, // if there are units left behind, make sure they stay
      // archers: updatedOrigin.knights + attackerKnights,
      // knights: updatedOrigin.archers + attackerArchers,
      // player: null,
      // hex_owner: null
      //////////////////////////////////////////////////////////////

      ////////////////////// IF USING DATABASE /////////////////////
      ...origHex[0],
      swordsmen: attackerSwordsmen, // if there are units left behind, make sure they stay
      archers: attackerKnights,
      knights: attackerArchers,
      player: null,
      hex_owner: null
      // swordsmen: origHex[0].swordsmen + attackerSwordsmen, // if there are units left behind, make sure they stay
      // archers: origHex[0].knights + attackerKnights,
      // knights: origHex[0].archers + attackerArchers,
      /////////////////////////////////////////////////////////////
    }

    // console.log('\n+++++++++++++++++++++++++++++++++ updated origin from db:\n', updatedOrigin, '\n+++++++++++++++++++++++++++++++++');

    if (origHex[0].player !== updatedOrigin.player) { // if original player on the hex is not null

      await db.updateHexUnits(updatedOrigin.hex_index, updatedOrigin.swordsmen, updatedOrigin.archers, updatedOrigin.knights, 'player' + origHex[0].player); // update units on hex in the db (for original player/owner of hex)

      await db.switchHexOwner(updatedOrigin.hex_index, null); // then update the hex player/owner in the db with null
    }

    ////////////////////////////////////// IF USING GAME OBJECT ON SERVER ///////////////////////////////
    // updatedOrigin.swordsmen + updatedOrigin.archers + updatedOrigin.knights > 0 ? updatedOrigin.player = attackerPlayer : null;
    /////////////////////////////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////// IF USING DATABASE //////////////////////////////////////////
    if (updatedOrigin.swordsmen + updatedOrigin.archers + updatedOrigin.knights > 0) {
      updatedOrigin.player = attackerPlayer;
      updatedOrigin.hex_owner = attackerPlayer;

      await db.switchHexOwner(updatedOrigin.hex_index, 'player' + attackerPlayer);

    } else {
      updatedOrigin.player = null;
      updatedOrigin.hex_owner = null;

      await db.switchHexOwner(updatedOrigin.hex_index, null);
    }
    
    let origTarget = await db.getHex(updatedTarget.index); // original target hex from db (returns an object)
    /////////////////////////////////////////////////////////////////////////////////////////////////////

    updatedTarget = { //
      /// IF USING GAME OBJECT ON SERVER ///
      // ...updatedTarget,
      //////////////////////////////////////

      ///////// IF USING DATABASE //////////
      ...origTarget[0],
      //////////////////////////////////////

      swordsmen: defenderSwordsmen,
      knights: defenderKnights,
      archers: defenderArchers,
      player: defenderPlayer,
      hex_owner: defenderPlayer
    }

    if (origTarget[0].player !== updatedTarget.player) { // if original player on the hex is not the defender
      await db.updateHexUnits(updatedTarget.hex_index, updatedTarget.swordsmen, updatedTarget.archers, updatedTarget.knights, 'player' + origTarget[0].player); // update units on hex in the db (for original player/owner of hex)

      await db.switchHexOwner(updatedTarget.hex_index, 'player' + updatedTarget.player); // then update the hex player/owner in the db with the defender player
    }

    flag = 'defender';
  }

  /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
  // let masterOrigin = await db.getHex(updatedOrigin.index);
  // await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin);
  /////////////////////////////////////////////////////////////////////////////////////////////

  ////////// SHOULD NOT BE NEEDED AFTER DB WORKS //////////
  // if (games[gameIndex].playerOneTotalUnits < 0) {
  //   games[gameIndex.playerOneTotalUnits] = 0;
  // }
  // if (games[gameIndex].playerTwoTotalUnits < 0) {
  //   games[gameIndex.playerTwoTotalUnits] = 0;
  // }
  ////////////////////////////////////////////////////////

  let finalP1Units = 0;
  let finalP2Units = 0;

  let finalBoard = await db.getGameBoard(room, gameIndex); // get the final game board

  console.log('\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\nCALCUATING EACH PLAYERS HEXES:')
  finalBoard.forEach( hex => {
    if (hex.hex_owner === 1) { // if player 1 owns the hex
      let currentUnits = hex.swordsmen + hex.archers + hex.knights;
      console.log(`\nPLAYER 1 OWNS THIS HEX (HEX ID: ${hex.hex_id}):\n  SWORDSMEN (${hex.swordsmen}) + ARCHERS (${hex.archers}) + KNIGHTS (${hex.knights})`);
      finalP1Units += currentUnits;

    } else if (hex.hex_owner === 2) { // if player 2 owns the hex
      let currentUnits = hex.swordsmen + hex.archers + hex.knights;
      console.log(`\nPLAYER 1 OWNS THIS HEX (HEX ID: ${hex.hex_id}):\n  SWORDSMEN (${hex.swordsmen}) + ARCHERS (${hex.archers}) + KNIGHTS (${hex.knights})`);
      finalP2Units += currentUnits;
    }
  });
  console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')

  console.log('\n-----------------------------------------------\nFINAL P1 UNITS AFTER COMBAT:', finalP1Units);
  console.log('FINAL P2 UNITS AFTER COMBAT:', finalP2Units, '\n-----------------------------------------------')

  // let finalP1Units = await db.getTotalUnits(gameIndex, room, 'player1');
  // console.log('\n<<<<<<<<<<<<<<<<<<<<<<<<<<< final p1 units >>>>>>>>>>>>>>>>>>>>>>>>>\n', finalP1Units, '\n');
  // let finalP2Units = ;

  return {
    /////////////////////////////////// IF USING GAME OBJECT ON SERVER ///////////////////////////////////////////
    // gameOver: await checkForWin(games[gameIndex].playerOneTotalUnits, games[gameIndex].playerTwoTotalUnits),
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////// IF USING DATABASE //////////////////////////////////////////////////////
    gameOver: await checkForWin(finalP1Units, finalP2Units),
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    updatedOrigin: updatedOrigin,
    updatedTarget: updatedTarget,
    flag: flag
  }
};

const checkForWin = async (playerOneUnits, playerTwoUnits) => {
  //////////////// IF USING GAME OBJECT ON SERVER ////////////////
  if (playerOneUnits <= 0) {
    return 'player2';
  } else if (playerTwoUnits <= 0) {
    return 'player1';
  } else {
    return false;
  }
  ////////////////////////////////////////////////////////////////

  ////////////////////// IF USING DATABASE //////////////////////
  // let board = await db.getGameBoard(room, gameIndex);
  // board.forEach(hex => {
  //   console.log('--------------------------------------------- looping through the board hexes ------------------------------')
  //   console.log('hex id: ', hex.hex_id, '\nhex player: ', hex.player);
// const checkForWin = async (losingPlayer, winningPlayer, gameIndex, room) => {
  // console.log('--------------------------------------------- CHECKING FOR WIN ------------------------------');
  // console.log('>>>>>>>>>>>> loser <<<<<<<<<<<<<<<<< ', losingPlayer);
  // console.log('>>>>>>>>>>>> winner <<<<<<<<<<<<<<<<< ', winningPlayer);
  // let isGameOver = true;


  ////////////////////// IF USING DATABASE //////////////////////
  // let board = await db.getGameBoard(room, gameIndex);
  //
  // board.forEach(hex => {
  //   // console.log('--------------------------------------------- looping through the board hexes ------------------------------')
  //   // console.log('hex id: ', hex.hex_id, ' hex player: ', hex.player);
  //   if (hex.player === losingPlayer) {
  //     isGameOver = false;
  //   }
  // })
  // ////////////////////////////////////////////////////////////////
  //
  // if (isGameOver) {
  //   // console.log('_______________________GAME OVER_______________________');
  //
  //   /////////////// UNCOMMENT WHEN USING DATABASE ///////////////////
  //   db.gameComplete(gameIndex, room, winningPlayer, losingPlayer); // updates game to completed & user wins/losses
  //   ////////////////////////////////////////////////////////////////
  //
  //   return winningPlayer;
  // }
  // // console.log('_______________________GAME AINT OVER_______________________')
  // return isGameOver;
}

// TODO: this should not be needed once db works... this is all handled in the updateDbhex func
const reinforceHexes = async (gameIndex, currentPlayer, targetIndex, room) => {
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

// const deleteOldGames = async () => {
  // let oldGames = await db.getOldGames();
//   for (let i = 0; i < oldGames.length; i++) {
//     await db.deleteHex(oldGames[i].game_id); // first mark hexes to delete
//     await db.deleteGames(oldGames[i].game_id); // then delete the game
//   }
// }

// Check for old games and marks them as completed
// setInterval(deleteOldGames, 86400000);

const buyUnits = async (type, player, gameIndex, socketId, room) => {

  ///////////////////////////////////// IF USING DATABASE ///////////////////////////////////////
  let game = await db.getGameBoard(room, gameIndex);
  let currentPlayerResources = await db.getResources(room, gameIndex, player); // returns an object
  
  if (type === 'swordsmen') { // if buying swordsmen
    // console.log('LETS BUY SOME ----> SWORDSMEN');
    if (player === 'player1') { // for player 1
      if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_metal >= 10) { // check if player has enough resources to purchase unit
  
        await db.buySwordsmen(room, gameIndex, player); // update units and resources in the db
  
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
  
        await io.to(socketId).emit('swordsmen');
  
        await io.to(room).emit('updateResources', {
          playerOneResources: {
            gold: p1Resources[0].p1_gold,
            wood: p1Resources[0].p1_wood,
            metal: p1Resources[0].p1_metal
          },
          playerTwoResources: {
            gold: p2Resources[0].p2_gold,
            wood: p2Resources[0].p2_wood,
            metal: p2Resources[0].p2_metal
          }
        });

      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 1 is too poor to buy SWORDSMEN');
        io.to(socketId).emit('not enough resources');
      }
    } else if (player === 'player2') { // else same for player 2
      if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_metal >= 10) {
        db.buySwordsmen(room, gameIndex, player);
  
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
  
        await io.to(socketId).emit('swordsmen');
  
        await io.to(room).emit('updateResources', {
          playerOneResources: {
            gold: p1Resources[0].p1_gold,
            wood: p1Resources[0].p1_wood,
            metal: p1Resources[0].p1_metal
          },
          playerTwoResources: {
            gold: p2Resources[0].p2_gold,
            wood: p2Resources[0].p2_wood,
            metal: p2Resources[0].p2_metal
          }
        });
  
      } else {
        // if not enough resources
        // console.log('~~~~~~~~~~~ player 2 is too poor to buy SWORDSMEN');
        io.to(socketId).emit('not enough resources');
      }
    }
  }
  
  if (type === 'archers') { // if buying archers
    // console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ LETS BUY SOME ----> ARCHERS');
    if (player === 'player1') { // for player 1
      if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_wood >= 20) { // check if player has enough resources to purchase unit
        // console.log('\n[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]')
        // console.log('player 1 is buying archers');
  
        await db.buyArchers(room, gameIndex, player); // update units and resources in the db
  
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
  
        await io.to(socketId).emit('archers');
  
        await io.to(room).emit('updateResources', {
          playerOneResources: {
            gold: p1Resources[0].p1_gold,
            wood: p1Resources[0].p1_wood,
            metal: p1Resources[0].p1_metal
          },
          playerTwoResources: {
            gold: p2Resources[0].p2_gold,
            wood: p2Resources[0].p2_wood,
            metal: p2Resources[0].p2_metal
          }
        });

        // console.log('\nRESOURCES AFTER BUYING ARCHERS (PLAYER 1)')
        // console.log('PLAYER 1 resources:\n', p1Resources);
        // console.log('\nPLAYER 2 resources:\n', p2Resources);
        // console.log('[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]\n')

      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 1 too poor to buy ARCHERS');
        io.to(socketId).emit('not enough resources');
      }
    } else if (player === 'player2') { // else same for player 2
      if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_wood >= 20) {

        // console.log('\n[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]')
        // console.log('player 2 is buying archers')

        await db.buyArchers(room, gameIndex, player);
  
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
  
        await io.to(socketId).emit('archers');
  
        await io.to(room).emit('updateResources', {
          playerOneResources: {
            gold: p1Resources[0].p1_gold,
            wood: p1Resources[0].p1_wood,
            metal: p1Resources[0].p1_metal
          },
          playerTwoResources: {
            gold: p2Resources[0].p2_gold,
            wood: p2Resources[0].p2_wood,
            metal: p2Resources[0].p2_metal
          }
        });

        // console.log('\nRESOURCES AFTER BUYING ARCHERS (PLAYER 2)')
        // console.log('PLAYER 1 resources:\n', p1Resources);
        // console.log('\nPLAYER 2 resources:\n', p2Resources);
        // console.log('[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]\n')

      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 2 too poor to buy ARCHERS');
        io.to(socketId).emit('not enough resources');
      }
    }
  }

  if (type === 'knights') { // if buying knights
    // console.log('LETS BUY SOME ----> KNIGHTS');

    if (player === 'player1') { // for player 1
      if (currentPlayerResources[0].p1_gold >= 20 && currentPlayerResources[0].p1_wood >= 20 && currentPlayerResources[0].p1_metal >= 20) { // check if player has enough resources to purchase unit
        await db.buyKnights(room, gameIndex, player); // update units and resources in the db

        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');

        await io.to(socketId).emit('knights');

        await io.to(room).emit('updateResources', {
          playerOneResources: {
            gold: p1Resources[0].p1_gold,
            wood: p1Resources[0].p1_wood,
            metal: p1Resources[0].p1_metal
          },
          playerTwoResources: {
            gold: p2Resources[0].p2_gold,
            wood: p2Resources[0].p2_wood,
            metal: p2Resources[0].p2_metal
          }
        });

      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 1 too poor to buy KNIGHTS');
        io.to(socketId).emit('not enough resources');
      }
    } else if (player === 'player2') { // else same for player 2
      if (currentPlayerResources[0].p2_gold >= 20 && currentPlayerResources[0].p2_wood >= 20 && currentPlayerResources[0].p2_metal >= 20) {

        await db.buyKnights(room, gameIndex, player);

        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');

        await io.to(socketId).emit('knights');

        await io.to(room).emit('updateResources', {
          playerOneResources: {
            gold: p1Resources[0].p1_gold,
            wood: p1Resources[0].p1_wood,
            metal: p1Resources[0].p1_metal
          },
          playerTwoResources: {
            gold: p2Resources[0].p2_gold,
            wood: p2Resources[0].p2_wood,
            metal: p2Resources[0].p2_metal
          }
        });

      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 2 too poor to buy KNIGHTS');
        io.to(socketId).emit('not enough resources');
      }
    }
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////// IF USING GAME OBJ ON SERVER /////////////////////////////////////
  // let game = games[gameIndex], resources, unitCount;
  // player === 'player1' ? resources = game.playerOneResources : resources = game.playerTwoResources;
  // player === 'player1' ? unitCount = 'playerOneTotalUnits' : unitCount = 'playerTwoTotalUnits';
  // if (type === 'swordsmen') {
  //   if (resources.gold >= 10 && resources.metal >= 10) {
  //     resources.gold -= 10;
  //     resources.metal -= 10;
  //     game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.swordsmen += 10;
  //       }
  //     })
  //     game[unitCount] += 10;
  //     io.to(room).emit('swordsmen');
  //     io.to(room).emit('updateResources', {
  //       playerOneResources: game.playerOneResources,
  //       playerTwoResources: game.playerTwoResources
  //     });
  //   } else {
  //     io.to(socketId).emit('notEnoughResources');
  //   }
  // } else if (type === 'archers') {
  //   if (resources.gold >= 10 && resources.wood >= 20) {
  //     resources.gold -= 10;
  //     resources.wood -= 20;
  //     game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.archers += 10;
  //       }
  //     })
  //     game[unitCount] += 10;
  //     io.to(room).emit('archers');
  //     io.to(room).emit('updateResources', {
  //       playerOneResources: game.playerOneResources,
  //       playerTwoResources: game.playerTwoResources
  //     });
  //   } else {
  //     io.to(socketId).emit('not enough resources');
  //   }
  // } else if (type === 'knights') {
  //   if (resources.gold >= 20 && resources.wood >= 20 && resources.metal >= 20) {
  //     resources.gold -= 20;
  //     resources.wood -= 20;
  //     resources.metal -= 20;
  //     game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.knights += 10;
  //       }
  //     })
  //     game[unitCount] += 10;
  //     io.to(room).emit('knights');
  //     io.to(room).emit('updateResources', {
  //       playerOneResources: game.playerOneResources,
  //       playerTwoResources: game.playerTwoResources
  //     });
  //   } else {
  //     io.to(room).emit('not enough resources');
  //   }
  // }
  /////////////////////////////////////////////////////////////////////////////////////////////////
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