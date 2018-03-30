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
const emailHandler = require('./emailhandler.js');
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
  let meridianHexes = [];

  let board = hexes.map((coordinates, index) => {
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

  let meridianHasGold, meridianHasMetal, meridianHasWood = false;
  let meridianWithoutResources = [];

  for (let i = ((numRows + numCols) / 3); i <= (hexes.length / 2) + 1; i+=(numCols - 1)) {
    meridianHexes.push(i);
    checkMeridian(i);
  }
  for (let i = hexes.length - numCols; i >= (hexes.length / 2) - 1; i-=(numCols - 1)) {
    meridianHexes.push(i);
    checkMeridian(i);
  }

  function checkMeridian(i) {
    let hex = board[i];
    if (hex.hasGold) {
      meridianHasGold = true;
    } else if (hex.hasWood) {
      meridianHasWood = true;
    } else if (hex.hasMetal) {
      meridianHasMetal = true;
    } else {
      meridianWithoutResources.push(i);
    }
  };

  if (meridianWithoutResources.length && !meridianHasGold) {
    let index = Math.floor(Math.random() * meridianWithoutResources.length);
    board[meridianWithoutResources[index]].hasGold = true;
    meridianWithoutResources.splice(index, 1);
  }
  if (meridianWithoutResources.length && !meridianHasWood) {
    let index = Math.floor(Math.random() * meridianWithoutResources.length);
    board[meridianWithoutResources[index]].hasWood = true;
    meridianWithoutResources.splice(index, 1);
  }
  if (meridianWithoutResources.length && !meridianHasMetal) {
    let index = Math.floor(Math.random() * meridianWithoutResources.length);
    board[meridianWithoutResources[index]].hasMetal = true;
    meridianWithoutResources.splice(index, 1);
  }

  board = distributeResources(board, meridianHexes);

  return board;
};

const distributeResources = (board, meridianHexes) => {
  let playerOneHalf = [], playerTwoHalf = [];
  let playerOneHexesWithoutResources = [], playerTwoHexesWithoutResources = [];
  for (let i = 1; i < board.length / 2 - 1; i++) {
    if (meridianHexes.indexOf(i) === -1) {
      if (board[i].hasGold) playerOneHalf.push('Gold');
      if (board[i].hasWood) playerOneHalf.push('Wood');
      if (board[i].hasMetal) playerOneHalf.push('Metal');
      if (!board[i].hasGold && !board[i].hasWood && !board.hasMetal) {
        playerOneHexesWithoutResources.push(i);
      };
    }
  }
  for (let i = board.length - 2; i > board.length / 2; i--) {
    if (meridianHexes.indexOf(i) === -1) {
      if (board[i].hasGold) playerTwoHalf.push('Gold');
      if (board[i].hasWood) playerTwoHalf.push('Wood');
      if (board[i].hasMetal) playerTwoHalf.push('Metal');
      else if (!board[i].hasGold && !board[i].hasWood && !board.hasMetal) {
        playerTwoHexesWithoutResources.push(i);
      };
    }
  }

  playerOneHalf.forEach(resource => {
    if (playerTwoHalf.indexOf(resource) === -1) {
      let index = Math.floor(Math.random() * playerTwoHexesWithoutResources.length);
      board[playerTwoHexesWithoutResources[index]][`has${resource}`] = true;
      playerTwoHexesWithoutResources.splice(index, 1);
    }
  })
  playerTwoHalf.forEach(resource => {
    if (playerOneHalf.indexOf(resource) === -1) {
      let index = Math.floor(Math.random() * playerOneHexesWithoutResources.length);
      board[playerOneHexesWithoutResources[index]][`has${resource}`] = true;
      playerOneHexesWithoutResources.splice(index, 1);
    }
  })

  return board;
}

app.get('/rooms', (req, res) => {
  rooms = io.sockets.adapter.rooms
  for (room in rooms) {
    if (rooms[room].length === 2) {
      for (game in games) {
        if (games[game].room === room) {
          rooms[room].gameIndex = games[game].index;
        }
      }
    }
  }
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

  let room; // track room that client is in, when they enter a room, to help with disconnect

  socket.on('sendEmail', request => {
    let username = request.username;
    let email = request.email;
    let message = request.message;
    let room = request.room;
    emailHandler.sendEmail(username, email, room, message);
  });

  socket.on('newGame', request => {
    let newRoom = `*${roomNum}`;
    room = newRoom;
    let gameType = request.gameType;
    socket.join(newRoom); // create a new room
    io.sockets.adapter.rooms[newRoom].player1 = request.username;
    io.to(newRoom).emit('newGame', { room: newRoom }); // and send back a string to initialize for player 1
    gameType === 'public' && socket.broadcast.emit('newRoom', { 
      roomName: newRoom, 
      room: io.sockets.adapter.rooms[newRoom],
      player1: request.username
     });
    roomNum++; // increment room count to assign new ro
  });

  socket.on('joinGame', async (data) => {
    await socket.join(data.room);
    const board = await gameInit(5, 4);
    let gameIndex = uuidv4();
    room = data.room;
    io.sockets.adapter.rooms[room].player2 = data.username;
    socket.broadcast.emit('updateRoom', {
      room: data.room,
    })
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
      room: data.room,
      index: gameIndex
    };

    const newGameBoard = {
      board: board,
      gameIndex: gameIndex,
      room: room,
      playerOneResources: games[gameIndex].playerOneResources,
      playerTwoResources: games[gameIndex].playerTwoResources
    }
    
    /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
    await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases
    /////////////////////////////////////////////////////////////////////////////////////////////

    await io.to(data.room).emit('gameCreated', newGameBoard); // send game board to user
  });

  socket.on('watchGame', data => {
    socket.join(data.room);
    const game = games[data.gameIndex];
    game.user = data.username;
    io.to(socket.id).emit('gameCreated', games[data.gameIndex]);
  })

  socket.on('setLoggedInUser', data => {
    assignLoggedInUser(data.username, data.player, data.gameIndex, data.room)
  });

  socket.on('move', data => { // move listener
    moveUnits(data, socket); // pass move data and socket to function to assess move
  });

  socket.on('buy', data => {
    buyUnits(data.type, data.player, data.gameIndex, data.socketId, data.room);
  });

  socket.on('deployUnits', data => {
    verifyBankSubtractUnits(data.player, data.unit, data.quantity, data.bank, data.gameIndex, data.room);
  })

  socket.on('addUnits', data => {
    deployUnitsOnHex(data.hexIndex, data.gameIndex, data.unit, data.quantity, data.room, data.hexLongIndex, data.player);
  });

  socket.on('initMessages', async (data) => {
    let messageHistory;
    io.to(data.room).emit('getHistory');
    socket.on('sendHistory', data => {
      io.to(data.room).emit('messageHistory', { messageHistory: data.messageHistory });
    })
  })

  socket.on('sendMessage', (request) => {
    io.to(request.room).emit('newMessage', request);
  });

  socket.on('leaveRoom', data => {
    if (data.room !== undefined) {
      db.forceEndGame(data.room); // updates game/marks hexes to complete in db
    }
    socket.leave(data.room);
    socket.broadcast.emit('deleteRoom', data.room);
    room && io.to(room).emit('disconnect');
    delete io.sockets.adapter.rooms[room];
  });

  socket.on('disconnect', () => {
    if (room !== undefined) {
      db.forceEndGame(room); // updates game/marks hexes to complete in db
    }
    room && io.to(room).emit('disconnect');
    console.log('user disconnected');
  });
})

// assignLoggedInUser function: If using game object on server
// const assignLoggedInUser = (username, player, gameIndex, room) => { // need to save to DB
//   console.log(`\nassignLoggedInUser: username (${username}), player (${player}), gameIndex (${gameIndex}), room (${room})'n`)
//   let user;
//   username === null ? user = 'anonymous' : user = username;
//   games[gameIndex][player] = user;

//   console.log('games[gameIndex].player1: ', games[gameIndex].player1)
//   console.log('games[gameIndex].player2: ', games[gameIndex].player2)

//   io.to(room).emit('setLoggedInUser', { // need to pull from DB here
//     player1: games[gameIndex].player1,
//     player2: games[gameIndex].player2
//   })
// }

// assignLoggedInUser function: If using database
const assignLoggedInUser = async (username, player, gameIndex, room) => { // need to save to DB
  // console.log(`\nassignLoggedInUser: username (${username}), player (${player}), gameIndex (${gameIndex}), room (${room})'n`);

  let user;
  username === null ? user = 'anonymous' : user = username;

  await db.setGamePlayers(user, player, gameIndex, room); // set the game player in the game in the db

  let p1Username = await db.getPlayerUsername('player1', gameIndex, room); // get player1 username
  let p2Username = await db.getPlayerUsername('player2', gameIndex, room); // get player2 username
  await io.to(room).emit('setLoggedInUser', { // need to pull from DB here
    player1: p1Username[0].username,
    player2: p2Username[0].username
  })

  // console.log('\nCURRENT PLAYERS IN THE GAME:\n')
  // console.log('\np1Username: ', p1Username[0].username);
  // console.log('p2Username: ', p2Username[0].username, '\n');
}

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

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget, room, gameIndex); // assess legality of move

  if (legal) { // if legal move,
    //////////////////////////// IF USING GAME OBJECT ON SERVER ////////////////////////////
    // let collision = await checkForCollision(originIndex, targetIndex, gameIndex, room); // check for collision
    ////////////////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////// IF USING DATABASE ////////////////////////////////
    let collision = await checkForCollision(updatedOrigin.index, updatedTarget.index, gameIndex, room); // check for collision
    ////////////////////////////////////////////////////////////////////////////////////////

    if (collision) {
      if (collision === 'friendly') { // if collision and collision is friendly,
        // console.log('\n.....friendly collision....\n')

        await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room); // update hexes without combat occuring

        let move = {
          updatedOrigin: updatedOrigin,
          originIndex: originIndex,
          targetIndex: targetIndex,
          updatedTarget: updatedTarget,
          playerOneResources: games[gameIndex].playerOneResources,
          playerTwoResources: games[gameIndex].playerTwoResources
        }

        // console.log('\n(((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((\nMOVE ON FRIENDLY COLLISION:\n', move, '\n(((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((\n')

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

        // console.log('\n=================================================================================\nRESULT OF COMBAT:\n', result, '\n=================================================================================\n')
        if (result === 'tie') { // game tie
          // console.log('\n===================================================== IT WAS A TIE =================================\n')
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

        if (result.tie === true) { // individual combat tie but someone still has units
          // console.log('\n****************************** individual combat tie but someone still has units (result.tie === true) ******************************\n');

          let updatedOriginPlayer = null;
          let updatedTargetPlayer = null;

          if (result.updatedOrigin.player) {
            updatedOriginPlayer = 'player' + result.updatedOrigin.player;
          }

          if (result.updatedTarget.player) {
            updatedTargetPlayer = 'player' + result.updatedTarget.player
          }

          await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room);

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
            targetIndex: targetIndex,
            playerOneResources: games[gameIndex].playerOneResources,
            playerTwoResources: games[gameIndex].playerTwoResources,
            tie: true
          }
          io.to(room).emit('move', newMove);
          return;
        }

        if (result.gameOver) {  // // if the game is over & attacker wins, need to change hexes and send back board
          // console.log('\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ GAME IS OVER ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n')

          if (result.gameOver === 'player1' && currentPlayer === 'player1' ||
          result.gameOver === 'player2' && currentPlayer === 'player2') {

            // console.log('\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\nresult.gameOver -> WINNER: ', result.gameOver);

            // console.log('\ncurrentPlayer: ', currentPlayer, '\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n');

  
          } else {

            if (result.gameOver === 'player1') { // if player1 won
              await db.gameComplete(result.gameIndex, room, 'player1', 'player2');
            } else if (result.gameOver === 'player2') { // if player2 won
              await db.gameComplete(result.gameIndex, room, 'player2', 'player1');
            }
            io.to(socketId).emit('loseGame', result.gameOver);
            socket.to(room).emit('winGame', result.gameOver);
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
          // console.log('\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> GAME NOT OVER YET <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n');

          //////////////////////////////////// IF USING GAME OBJECT ON SERVER /////////////////////////

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

          let dbP1TotalUnits = await db.getPlayerTotalUnits(room, gameIndex, 'player1');
          let dbP2TotalUnits = await db.getPlayerTotalUnits(room, gameIndex, 'player2');

          await updateHexes(originIndex, result.updatedOrigin, targetIndex, result.updatedTarget, gameIndex, currentPlayer, room); // if move is to unoccupied hex, execute move

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
              playerOneTotalUnits: dbP1TotalUnits[0].p1_total_units,
              playerTwoTotalUnits: dbP2TotalUnits[0].p2_total_units,
            },
            playerOneResources: games[gameIndex].playerOneResources,
            playerTwoResources: games[gameIndex].playerTwoResources
          }

          // console.log('\n---------> MOVE WHEN GAME ISNT OVER:\n', move, '\n');

          await db.updateDbHexes(masterOrigin, move.updatedTarget, currentPlayer, move.updatedOrigin); // updates the original hex and new hex in the db for the current player
          /////////////////////////////////////////////////////////////////////////////////////////////

          await io.to(room).emit('move', move);

          if (result.flag === 'attacker') {
            // console.log('\n-----------------------------> ATTACKER WON THE COMBAT BATTLE <-----------------------------\n');
            await io.to(socketId).emit('combatWin', updatedTarget.player);
            await socket.to(room).emit('combatLoss', updatedTarget.player);
          } else if (result.flag === 'defender') {
            // console.log('\n-----------------------------> DEFENDER WON THE COMBAT BATTLE <-----------------------------\n');
            await io.to(socketId).emit('combatLoss', updatedTarget.player);
            await socket.to(room).emit('combatWin', updatedTarget.player);
          }
        }
      }

    } else { // if move is to unoccupied hex, execute move
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room);
      let move = {
        originIndex: originIndex,
        updatedOrigin: updatedOrigin,
        targetIndex: targetIndex,
        updatedTarget: updatedTarget,
        playerOneResources: games[gameIndex].playerOneResources,
        playerTwoResources: games[gameIndex].playerTwoResources
      };

      /////////////////////////////// UNCOMMENT WHEN USING DATABASE ///////////////////////////////
      await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player
      /////////////////////////////////////////////////////////////////////////////////////////////

      await io.to(room).emit('move', move);
    }
  } else { // if move request is not legal, send socket failure message, cheating detected
    // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>> CHEATING AHHHHH <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
    await io.to(room).emit('failure');
  }
};

///////////////////////////////////////////// verifyBankSubtractUnits FUNCTION IF USING GAME OBJECT ON SERVER:
// const verifyBankSubtractUnits = async(player, unit, quantity, bank, gameIndex, room) => { // verify purchase & update player bank
  //   if (player === 'player1' && games[gameIndex].playerOneUnitBank[unit] === bank) {
  //     games[gameIndex].playerOneUnitBank[unit] = games[gameIndex].playerOneUnitBank[unit] - quantity;
  //     io.to(room).emit('deployUnits', {
  //       playerOneUnitBank: games[gameIndex].playerOneUnitBank,
  //       playerTwoUnitBank: games[gameIndex].playerTwoUnitBank,
  //       unit: unit,
  //       player: player,
  //       quantity: quantity
  //     });
  //   } else if (player === 'player2') {
  //     if (unit === 'swordsmen' && p2TotalSwordsmen === bank) {
  //       console.log('\nverified player 2 has enough units to buy swordsmen')

  //       await db.decreasePlayerBank(room, gameIndex, 'player2', 'swordsmen', quantity); // decrease the player's bank in the db by units being moved

  //       io.to(room).emit('deployUnits', {
  //         playerOneUnitBank: {
  //           swordsmen: p1TotalSwordsmen,
  //           archers: p1TotalArchers,
  //           knights: p1TotalKnights,
  //         },
  //         playerTwoUnitBank: {
  //           swordsmen: p2TotalSwordsmen - quantity,
  //           archers: p2TotalArchers,
  //           knights: p2TotalKnights,
  //         },
  //         unit: unit,
  //         player: player,
  //         quantity: quantity
  //       });
  //     }

// verifyBankSubtractUnits FUNCTION IF USING DATABASE:
const verifyBankSubtractUnits = async (player, unit, quantity, bank, gameIndex, room) => { // verify purchase & update player bank

  // console.log('\n---------------------------------------------------------')
  // console.log('\nINSIDE VERIFYING BANK FUNCTION\n')
  // console.log(`\nplayer (${player}), unit (${unit}), quantity (${quantity}), bank (${bank}), gameIndex (${gameIndex}), room (${room})\n`)

  let p1TotalBank = await db.getPlayerBank(room, gameIndex, 'player1');
  let p1TotalSwordsmen = p1TotalBank[0].p1_swordsmen_bank; // units in bank
  let p1TotalArchers = p1TotalBank[0].p1_archers_bank;
  let p1TotalKnights = p1TotalBank[0].p1_knights_bank;

  // console.log('\np1TotalBank: ', p1TotalBank)
  // console.log('p1TotalSwordsmen: ', p1TotalSwordsmen)
  // console.log('p1TotalArchers: ', p1TotalArchers)
  // console.log('p1TotalKnights: ', p1TotalKnights)

  let p2TotalBank = await db.getPlayerBank(room, gameIndex, 'player2');
  let p2TotalSwordsmen = p2TotalBank[0].p2_swordsmen_bank; // units in bank
  let p2TotalArchers = p2TotalBank[0].p2_archers_bank;
  let p2TotalKnights = p2TotalBank[0].p2_knights_bank;

  // console.log('\np2TotalBank: ', p2TotalBank)
  // console.log('p2TotalSwordsmen: ', p2TotalSwordsmen)
  // console.log('p2TotalArchers: ', p2TotalArchers)
  // console.log('p2TotalKnights: ', p2TotalKnights)

  if (player === 'player1') {
    // IF PLAYER 1 IS BUYING SWORDSMEN
    if (unit === 'swordsmen' && p1TotalSwordsmen === bank) {
      // console.log('\nverified player 1 has enough units to buy swordsmen')

      await db.decreasePlayerBank(room, gameIndex, 'player1', 'swordsmen', quantity); // decrease the player's bank in the db by units being moved

      io.to(room).emit('deployUnits', {
        playerOneUnitBank: {
          swordsmen: p1TotalSwordsmen - quantity,
          archers: p1TotalArchers,
          knights: p1TotalKnights,
        },
        playerTwoUnitBank: {
          swordsmen: p2TotalSwordsmen,
          archers: p2TotalArchers,
          knights: p2TotalKnights,
        },
        unit: unit,
        player: player,
        quantity: quantity
      });
    }

    // IF PLAYER 1 IS BUYING ARCHERS
    if (unit === 'archers' && p1TotalArchers === bank) {
      // console.log('\nverified player 1 has enough units to buy archers')

      await db.decreasePlayerBank(room, gameIndex, 'player1', 'archers', quantity); // decrease the player's bank in the db by units being moved

      io.to(room).emit('deployUnits', {
        playerOneUnitBank: {
          swordsmen: p1TotalSwordsmen,
          archers: p1TotalArchers - quantity,
          knights: p1TotalKnights,
        },
        playerTwoUnitBank: {
          swordsmen: p2TotalSwordsmen,
          archers: p2TotalArchers,
          knights: p2TotalKnights,
        },
        unit: unit,
        player: player,
        quantity: quantity
      });
    }

    // IF PLAYER 1 IS BUYING KNIGHTS
    if (unit === 'knights' && p1TotalKnights === bank) {
      // console.log('\nverified player 1 has enough units to buy knights')

      await db.decreasePlayerBank(room, gameIndex, 'player1', 'knights', quantity); // decrease the player's bank in the db by units being moved

      io.to(room).emit('deployUnits', {
        playerOneUnitBank: {
          swordsmen: p1TotalSwordsmen,
          archers: p1TotalArchers,
          knights: p1TotalKnights - quantity,
        },
        playerTwoUnitBank: {
          swordsmen: p2TotalSwordsmen,
          archers: p2TotalArchers,
          knights: p2TotalKnights,
        },
        unit: unit,
        player: player,
        quantity: quantity
      });
    }
  } else if (player === 'player2') {
    // IF PLAYER 2 IS BUYING SWORDSMEN
    if (unit === 'swordsmen' && p2TotalSwordsmen === bank) {
      // console.log('\nverified player 2 has enough units to buy swordsmen')

      await db.decreasePlayerBank(room, gameIndex, 'player2', 'swordsmen', quantity); // decrease the player's bank in the db by units being moved

      io.to(room).emit('deployUnits', {
        playerOneUnitBank: {
          swordsmen: p1TotalSwordsmen,
          archers: p1TotalArchers,
          knights: p1TotalKnights,
        },
        playerTwoUnitBank: {
          swordsmen: p2TotalSwordsmen - quantity,
          archers: p2TotalArchers,
          knights: p2TotalKnights,
        },
        unit: unit,
        player: player,
        quantity: quantity
      });
    }

    if (unit === 'archers' && p2TotalArchers === bank) {
      // console.log('\nverified player 2 has enough units to buy archers')

      await db.decreasePlayerBank(room, gameIndex, 'player2', 'archers', quantity); // decrease the player's bank in the db by units being moved

      io.to(room).emit('deployUnits', {
        playerOneUnitBank: {
          swordsmen: p1TotalSwordsmen,
          archers: p1TotalArchers,
          knights: p1TotalKnights,
        },
        playerTwoUnitBank: {
          swordsmen: p2TotalSwordsmen,
          archers: p2TotalArchers - quantity,
          knights: p2TotalKnights,
        },
        unit: unit,
        player: player,
        quantity: quantity
      });
    }
    if (unit === 'knights' && p2TotalKnights === bank) {
      // console.log('\nverified player 2 has enough units to buy knights')

      await db.decreasePlayerBank(room, gameIndex, 'player2', 'knights', quantity); // decrease the player's bank in the db by units being moved

      io.to(room).emit('deployUnits', {
        playerOneUnitBank: {
          swordsmen: p1TotalSwordsmen,
          archers: p1TotalArchers,
          knights: p1TotalKnights,
        },
        playerTwoUnitBank: {
          swordsmen: p2TotalSwordsmen,
          archers: p2TotalArchers,
          knights: p2TotalKnights - quantity,
        },
        unit: unit,
        player: player,
        quantity: quantity
      });
    }

  } else {
    io.to(room).emit('cheating detected');
  }
}

const checkLegalMove = async (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget, room, gameIndex) => { // to check move legality,

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
      // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> MISMATCH IN UNITS <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
      // console.log('master origin archers: ',  masterOrigin[0].archers)
      // console.log('should equal')
      // console.log('updated origin archers: ', updatedOrigin.archers, ' updated target knights: ', updatedTarget.archers)

      // console.log('\n', 'master origin knights: ', masterOrigin[0].knights, '\nshould equal\nupdated origin knights; ', updatedOrigin.knights, '\nupdated target knights: ', updatedTarget.knights)

      // console.log('\n', 'master origin swordsmen: ', masterOrigin[0].swordsmen, '\nshould equal\nupdated origin swordsmen; ', updatedOrigin.swordsmen, '\nupdated target swordsmen: ', updatedTarget.swordsmen)

      // console.log('\nmasterOrigin:\n', masterOrigin)
      // console.log('\nupdatedOrigin:\n', updatedOrigin)
      // console.log('\nupdatedTarget:\n', updatedTarget)

      let dbTargetHex = await db.getHex(updatedTarget.index);
      // console.log('\nupdatedTargetHex in DB to be updated:\n', dbTargetHex)

      let dbOriginHex = await db.getHex(updatedOrigin.index);

      // console.log('\ndbOriginHex:\n', dbOriginHex);

      if ('player' + dbTargetHex[0].hex_owner === updatedTarget.player) { // if owners of both hexes are the same
        // await db.updatePlayerTotalUnits(room, gameIndex, updatedTarget.player, dbTargetHex[0].swordsmen + dbTargetHex[0].archers + dbTargetHex[0].knights, 'decrease'); // decrease total units for player in game in db by the original amount on hex

        // await db.updatePlayerTotalUnits(room, gameIndex, updatedTarget.player, updatedTarget.swordsmen + updatedTarget.archers + updatedTarget.knights, 'increase'); // increase total units for player in game in db

        await db.updateHexUnits(updatedTarget.index, updatedTarget.swordsmen, updatedTarget.archers, updatedTarget.knights, updatedTarget.player); // update the hex in db with the new units on the hex

        let checkTarget = await db.getHex(updatedTarget.index);
        // console.log('\nnew target hex in the db:\n', checkTarget)

        await db.updateHexUnits(updatedOrigin.index, updatedOrigin.swordsmen, updatedOrigin.archers, updatedOrigin.knights, dbOriginHex[0].player)// remove the units moved from updated origin hex in the db

        let checkOrigin = await db.getHex(updatedOrigin.index);

        if ((checkOrigin[0].swordsmen + checkOrigin[0].archers + checkOrigin[0].knights) === 0) { // if no remaining units left on the hex, update player/hex owner to null on the hex
          await db.switchHexOwner(checkOrigin.index, null); // TODO: this is not updating the hex_owner to null for some reason!!!!
        }

        // console.log('\nnew updated origin hex in the db:\n', checkOrigin)

        isLegal = true;
        return true;
      }
      return false;
    }
  } else {
    // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> COORDINATES DO NOT MATCH <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    // console.log('masterOrigin: ', masterOrigin);
    // console.log('updatedOrigin: ', updatedOrigin);
    // console.log('updatedTarget: ', updatedTarget);
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

  // console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\nCHECKING FOR COLLISION:\n', 'ORIGIN PLAYER: ', origin[0].hex_owner, '\nORIGIN HEX:\n', origin, ' ------ HEX INDEX: ', originHexIndex, '\n  TARGET PLAYER: ', target[0].hex_owner, '\nTARGET HEX:\n', target, '------ HEX INDEX: ', targetHexIndex, '\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

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

/////////////////////////////////////////// IF USING GAME OBJECT ON SERVER ///////////////////////////////
// const deployUnitsOnHex = async (hexIndex, gameIndex, unit, quantity, room) => { // updates a single hex with deployed troops from bank
//   games[gameIndex].board[hexIndex][unit] = games[gameIndex].board[hexIndex][unit] + quantity; // need to update DB here
//   io.to(room).emit('troopsDeployed', {
//     hex: games[gameIndex].board[hexIndex],
//     hexIndex: hexIndex
//   });
// }
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////// IF USING DATABASE ///////////////////////////////////////////
const deployUnitsOnHex = async (hexArrayIndex, gameIndex, unit, quantity, room, hexLongIndex, currentPlayer) => { // updates a single hex with deployed troops from bank

  // console.log('\ninside deploy units on hex function\n')
  // console.log(`hexArrayIndex (${hexArrayIndex}), gameIndex (${gameIndex}), unit (${unit}), quantity (${quantity}), room (${room}), hexLongIndex(${hexLongIndex}), currentPlayer (${currentPlayer})`)

  /////////////////////////////////////////// IF USING DATABASE ///////////////////////////////////////////
  await db.deployUnits(room, hexLongIndex, gameIndex, unit, quantity, currentPlayer); // this will deploy the units to the hex & decrease the player's bank

  let hexFromDb = await db.getHex(hexLongIndex); // get updated hex with deployed units (this also decreases the player's bank in game)

  await db.updatePlayerTotalUnits(room, gameIndex, currentPlayer, quantity, 'increase'); // increase player's total units in the game in db

  // console.log('\nupdated hex from the db after deploying units on hex: \n', hexFromDb, '\n')

  await io.to(room).emit('troopsDeployed', {
    hex: {
      coordinates: [hexFromDb[0].coordinate_0, hexFromDb[0].coordinate_1, hexFromDb[0].coordinate_2],
      index: hexFromDb[0].hex_index,
      swordsmen: hexFromDb[0].swordsmen,
      archers: hexFromDb[0].archers,
      knights: hexFromDb[0].knights,
      player: currentPlayer
    },
    hexIndex: hexArrayIndex
  });
  // console.log('\nTROOPS DEPLOYED YAY\n')
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

  // console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< FIRST!!!! INSIDE RESOLVE COMBAT >>>>>>>>>>>>>>>>>>>>>>>>>>>>>');

  //////////////////////////////////////// IF USING DATABASE //////////////////////////////////////////////////
  let attacker = [{ // get attacking hex; this needs to be an object in an array bc reasons
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
  let attackerSwordsmen = attacker[0].swordsmen, originalAttackerSwordsmen = attacker[0].swordsmen;
  let attackerArchers = attacker[0].archers, originalAttackerArchers = attacker[0].archers;
  let attackerKnights = attacker[0].knights, originalAttackerKnights = attacker[0].knights;
  let originalAttackerArmySize = attackerSwordsmen + attackerKnights + attackerArchers;

  let defender = await db.getHex(targetIndex); // and defending hex (NOTE: returns an object)
  let defenderPlayer = defender[0].player;
  let defenderSwordsmen = defender[0].swordsmen, originalDefenderSwordsmen = defender[0].swordsmen;
  let defenderArchers = defender[0].archers, originalDefenderArchers = defender[0].archers;
  let defenderKnights = defender[0].knights, originalDefenderKnights = defender[0].knights;
  let originalDefenderArmySize = defenderSwordsmen + defenderKnights + defenderArchers;

  let flag; // will eventually return 'defender' or 'attacker'

  // console.log('\n____________________________________________________________\n  ATTACKER: \n', attacker)
  // console.log('\n  DEFENDER: \n', defender, '\n  CURRENT PLAYER: ', currentPlayer, '\n____________________________________________________________\n')

  attackerKnights && defenderArchers ? attackerKnights -= defenderArchers : null; // first, archers pick off knights from afar
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

  let attackerUnitsLost = originalAttackerArmySize - attackerSwordsmen - attackerArchers - attackerKnights;
  let defenderUnitsLost = originalDefenderArmySize - defenderSwordsmen - defenderArchers - defenderKnights;

  if (currentPlayer === 'player1') { // if the ATTACKER is PLAYER 1 & total unit counts need to be reduced
    await db.updatePlayerTotalUnits(room, gameIndex, 'player1', attackerUnitsLost, 'decrease'); // update ATTACKER total units in the db

    await db.updatePlayerTotalUnits(room, gameIndex, 'player2', defenderUnitsLost, 'decrease'); // update DEFENDER total units in the db

  } else { // else if the ATTACKER is PLAYER 2
    await db.updatePlayerTotalUnits(room, gameIndex, 'player1', defenderUnitsLost, 'decrease'); // update DEFENDER total units in the db

    await db.updatePlayerTotalUnits(room, gameIndex, 'player2', attackerUnitsLost, 'decrease'); // update ATTACKER total units in the db
  }

  let attackerArmySize = attackerArchers + attackerSwordsmen + attackerKnights;
  let defenderArmySize = defenderSwordsmen + defenderArchers + defenderKnights;

  if (defenderArmySize === attackerArmySize) { // if the defender army = attacker army on combat

    // console.log(`\n*********************************\nARMY SIZES ARE THE SAME:\n  defenderArmySize (${defenderArmySize}) === attackerArmySize (${attackerArmySize})\n*********************************\n`);

    let masterOrigin = await db.getHex(originIndex); // if there is, each side loses half their units
    updatedOrigin = {
      ...masterOrigin['0'], // for some reason the object returns at string '0'
      // get remaining units on the hex (original total units minus units being moved) + half of the moved units (ie, attacker lost half of their moved units)
      swordsmen: (masterOrigin['0'].swordsmen - originalAttackerSwordsmen + Math.floor(attackerSwordsmen / 2)) || 0,
      archers: (masterOrigin['0'].archers - originalAttackerArchers + Math.floor(attackerArchers / 2)) || 0,
      knights: (masterOrigin['0'].knights - originalAttackerKnights + Math.floor(attackerKnights / 2)) || 0
    };

    await db.updateHexUnits(updatedOrigin.hex_index, updatedOrigin.swordsmen, updatedOrigin.archers, updatedOrigin.knights, 'player' + updatedOrigin.player); // update the original hex's units in the db

    let masterTarget = await db.getHex(targetIndex); // returns an object

    updatedTarget = {
      ...masterTarget[0],
      swordsmen: Math.floor(defenderSwordsmen / 2) || 0, // defender loses half of their army
      archers: Math.floor(defenderArchers / 2) || 0,
      knights: Math.floor(defenderKnights / 2) || 0
    };

    await db.updateHexUnits(updatedTarget.hex_index, updatedTarget.swordsmen, updatedTarget.archers, updatedOrigin.knights, 'player' + updatedTarget.player); // update the target hex's units in the db

    if (attacker[0].player === 1) { // if player 1 is the attacker
      let updatedAttackerArmy = updatedOrigin.swordsmen + updatedOrigin.archers + updatedOrigin.knights;
      let updatedDefenderArmy = updatedTarget.swordsmen + updatedTarget.archers + updatedTarget.knights;

      await db.updatePlayerTotalUnits(room, gameIndex, 'player1', originalAttackerArmySize - updatedAttackerArmy, 'decrease'); // first, subtract the original units on the hex from the player's total units in the game in the db
      // await db.updatePlayerTotalUnits(room, gameIndex, 'player1', updatedAttackerArmy, 'increase'); // then increase the player's total units by the updated army on the hex in the game in the db

      await db.updatePlayerTotalUnits(room, gameIndex, 'player2', originalDefenderArmySize - updatedDefenderArmy, 'decrease'); // first, subtract the original units on the hex from the player's total units in the game in the db
      // await db.updatePlayerTotalUnits(room, gameIndex, 'player2', updatedDefenderArmy, 'increase'); // defender will only lose half of their hex's army

    } else if (attacker[0].player === 2) { // if player 2 is the attacker
      let updatedAttackerArmy = updatedOrigin.swordsmen + updatedOrigin.archers + updatedOrigin.knights;
      let updatedDefenderArmy = updatedTarget.swordsmen + updatedTarget.archers + updatedTarget.knights;

      await db.updatePlayerTotalUnits(room, gameIndex, 'player2', originalAttackerArmySize - updatedAttackerArmy, 'decrease'); // first, subtract the original units on the hex from the player's total units in the game in the db
      // await db.updatePlayerTotalUnits(room, gameIndex, 'player2', updatedAttackerArmy, 'increase'); // then increase the player's total units by the updated army on the hex in the game in the db

      await db.updatePlayerTotalUnits(room, gameIndex, 'player1', originalDefenderArmySize - updatedDefenderArmy, 'decrease'); // first, subtract the original units on the hex from the player's total units in the game in the db
      // await db.updatePlayerTotalUnits(room, gameIndex, 'player1', updatedDefenderArmy, 'increase'); // defender will only lose half of their hex's army
    }

    // then get both player's total units from game in db
    let p1TotalUnits = await db.getPlayerTotalUnits(room, gameIndex, 'player1');
    let p2TotalUnits = await db.getPlayerTotalUnits(room, gameIndex, 'player2');
    p1TotalUnits = p1TotalUnits[0].p1_total_units;
    p2TotalUnits = p2TotalUnits[0].p2_total_units;

    // console.log('\n+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\nPLAYER 1 TOTAL UNITS FROM DB: ', p1TotalUnits, '\nPLAYER 2 TOTAL UNITS FROM DB: ', p2TotalUnits, '\n+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n');
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

    // console.log('\n#######################################\nDEFENDER ARMY SIZE > ATTACKER ARMY SIZE:\n  DEFENDER ARMY SIZE: ', defenderArmySize, '\n  ATTACKER ARMY SIZE: ', attackerArmySize)

    while (attackerArmySize > 0) { // eliminate all attackers, starting with s, then a, then k
      if (attackerSwordsmen) {
        attackerSwordsmen--;
      } else if (attackerArchers) {
        attackerArchers--;
      } else if (attackerKnights) {
        attackerKnights--;
      }

      if (defenderSwordsmen) { // and a defender for each attacker unit, same order
        defenderSwordsmen--;
      } else if (defenderArchers) {
        defenderArchers--;
      } else if (defenderKnights) {
        defenderKnights--;
      }

      defenderArmySize--;
      attackerArmySize--;
    }

  } else if (attackerArmySize > defenderArmySize) { // otherwise, if attacker army is bigger,
    while (defenderArmySize > 0) { // eliminate all defenders, same order
      if (defenderSwordsmen) {
        defenderSwordsmen--;
      } else if (defenderArchers) {
        defenderArchers--;
      } else if (defenderKnights) {
        defenderKnights--;
      }

      if (attackerSwordsmen) { // and an attacker for each defender unit, same order
        attackerSwordsmen--;
      } else if (attackerArchers) {
        attackerArchers--;
      } else if (attackerKnights) {
        attackerKnights--;
      }
      attackerArmySize--;
      defenderArmySize--;
    }
  }

  if (currentPlayer === 'player1') {
    await db.updatePlayerTotalUnits(room, gameIndex, 'player1', (originalAttackerArmySize - attackerArmySize), 'decrease'); // update attacker total units in db

    await db.updatePlayerTotalUnits(room, gameIndex, 'player2', (originalDefenderArmySize - defenderArmySize), 'decrease'); // update defender total units in db

  } else {
    await db.updatePlayerTotalUnits(room, gameIndex, 'player1', (originalDefenderArmySize - defenderArmySize), 'decrease'); // update defender total units in db

    await db.updatePlayerTotalUnits(room, gameIndex, 'player2', (originalAttackerArmySize - attackerArmySize), 'decrease'); // update attacker total units in db
  }

  ////////////////////////////////////// IF USING GAME OBJECT ON SERVER ////////////////////////////////////////
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

  if (attackerArmySize) { // if the attacker has remaining units left
    // console.log('\n~~~~~~~~~~~~~~~~~~~ the ATTACKER has an army left over ~~~~~~~~~~~~~~~~~~~\n');

    // Target hex stuff
    let origTarget = [{
      hex_index: updatedTarget.index,
      coordinate_0: updatedTarget.coordinates[0],
      coordinate_1: updatedTarget.coordinates[1],
      coordinate_2: updatedTarget.coordinates[2],
      player: Number(updatedTarget.player[updatedTarget.player.length - 1]),
      hex_owner: Number(updatedTarget.player[updatedTarget.player.length - 1]),
      swordsmen: updatedTarget.swordsmen,
      archers: updatedTarget.archers,
      knights: updatedTarget.knights
    }];

    // console.log('\nORIGINAL TARGET ARRAY -- OBJECT --\n', origTarget);

    let hexInDb = await db.getHex(origTarget[0].hex_index);

    // console.log('\nTARGET HEX -- IN DB NEEDS TO BE UPDATED --\n', hexInDb);

    updatedTarget = {
      // IF USING GAME OBJ ON SERVER ////
      // ...updatedTarget,
      ///////////////////////////////////

      //////// IF USING DATABASE ///////
      ...origTarget[0],
      //////////////////////////////////
      swordsmen: attackerSwordsmen,
      archers: attackerArchers,
      knights: attackerKnights,
      player: attackerPlayer,
      hex_owner: attackerPlayer
    }

    // console.log('\nupdatedTarget object:\n', updatedTarget, '\n');

    if (hexInDb[0].player) { // if hex in db had player/owner
      await db.updateHexUnits(origTarget[0].hex_index, updatedTarget.swordsmen, updatedTarget.archers, updatedTarget.knights, 'player' + hexInDb[0].player); // update hex in db with attacker's remaining units
    } else { // if null
      await db.updateHexUnits(origTarget[0].hex_index, updatedTarget.swordsmen, updatedTarget.archers, updatedTarget.knights, null); // update hex in db with attacker's remaining units
    }

    await db.switchHexOwner(origTarget[0].hex_index, 'player' + updatedTarget.player); // switch the player/hex owner in db to the attacker

    let checkHexInDb = await db.getHex(origTarget[0].hex_index);

    // console.log('\nUPDATED TARGET HEX IN DB -- AFTER UPDATING IN DB --:\n', checkHexInDb);

    // Origin hex stuff
    // console.log('\nORIGINAL UPDATED ORIGIN -- OBJECT --\n', updatedOrigin);

    let originPlayer = updatedOrigin.player ? Number(updatedOrigin.player[updatedOrigin.player.length - 1]) : null;

    let origUpdatedOrigin = [{
      hex_index: updatedOrigin.index,
      coordinate_0: updatedOrigin.coordinates[0],
      coordinate_1: updatedOrigin.coordinates[1],
      coordinate_2: updatedOrigin.coordinates[2],
      swordsmen: updatedOrigin.swordsmen,
      archers: updatedOrigin.archers,
      knights: updatedOrigin.knights,
      player: originPlayer,
      hex_owner: originPlayer
    }];

    // console.log('\nORIG UPDATED ORIGIN ------- OBJECT I CREATED --------:\n', origUpdatedOrigin, '\n');

    let dbUpdatedOrigin = await db.getHex(updatedOrigin.index); // get current origin hex in db to get player on the hex

    // console.log('\nORIGIN HEX IN ----- DB TO BE UPDATED ------:\n', dbUpdatedOrigin);

    updatedOrigin = {
      ...origUpdatedOrigin[0]
    }

    // console.log('\nUPDATED ORIGIN ---- OBJECT TO BE SENT TO FRONT END -----:\n', updatedOrigin)

    await db.updateHexUnits(origUpdatedOrigin[0].hex_index, origUpdatedOrigin[0].swordsmen, origUpdatedOrigin[0].archers, origUpdatedOrigin[0].knights, 'player' + dbUpdatedOrigin[0].player); // update hex in db with origin's remaining units

    // console.log('\n... update hexes in db complete...')

    originPlayer = origUpdatedOrigin.player ? ('player' + origUpdatedOrigin.player) : null;

    // console.log('\norigin player: ', originPlayer)

    await db.switchHexOwner(origUpdatedOrigin[0].hex_index, originPlayer); // switch the player/hex owner in db

    // console.log('\nswitched hex owners')

    let checkUpdatedOriginHex = await db.getHex(origUpdatedOrigin[0].hex_index); // get current origin hex in db to get player on the hex

    // console.log('\nORIGIN HEX IN DB -- AFTER UPDATING IN DB --:\n', checkUpdatedOriginHex)

    flag = 'attacker';

  } else if (defenderArmySize) {
    // console.log('\n~~~~~~~~~~~~~~~~~~~ the DEFENDER has an army left over ~~~~~~~~~~~~~~~~~~~\n')

    // console.log('\nORIGINAL UPDATED ORIGIN:\n', updatedOrigin)

    let origUpdatedOriginPlayer = null;
    if (updatedOrigin.player) {
      origUpdatedOriginPlayer = Number(updatedOrigin.player[updatedOrigin.player.length - 1]); //TODO: update with player
    }

    let origUpdatedOrigin = [{
      hex_index: updatedOrigin.index,
      coordinate_0: updatedOrigin.coordinates[0],
      coordinate_1: updatedOrigin.coordinates[1],
      coordinate_2: updatedOrigin.coordinates[2],
      swordsmen: updatedOrigin.swordsmen,
      archers: updatedOrigin.archers,
      knights: updatedOrigin.knights,
      player: origUpdatedOriginPlayer,
      hex_owner: origUpdatedOriginPlayer
    }];

    let dbUpdatedOrigin = await db.getHex(origUpdatedOrigin[0].hex_index); // original origin hex from db (returns an object)

    // calculate remaining units on origin hex to determine if player should remain on/own hex or not
    let remainingAttackerSwordsmen = origUpdatedOrigin[0].swordsmen + attackerSwordsmen;
    let remainingAttackerArchers = origUpdatedOrigin[0].archers + attackerArchers;
    let remainingAttackerKnights = origUpdatedOrigin[0].knights + attackerKnights;
    let remainingAttackerArmy = remainingAttackerSwordsmen + remainingAttackerArchers + remainingAttackerKnights;
    let updatedPlayer = null;
    if (remainingAttackerArmy > 0) {
      updatedPlayer = attackerPlayer;
    }

    updatedOrigin = { // reinitialize hex they left
      /////////////////// IF USING GAME OBJ ON SERVER ///////////////
      // ...updatedOrigin,
      // swordsmen: updatedOrigin.swordsmen + attackerSwordsmen, // if there are units left behind, make sure they stay
      // archers: updatedOrigin.knights + attackerKnights,
      // knights: updatedOrigin.archers + attackerArchers,
      // player: attackerSwordsmen || attackerArchers || attackerKnights ? attackerPlayer : null
      //////////////////////////////////////////////////////////////

      ////////////////////// IF USING DATABASE /////////////////////
      ...origUpdatedOrigin[0],
      swordsmen: remainingAttackerSwordsmen, // if there are units left behind, make sure they stay
      archers: remainingAttackerArchers,
      knights: remainingAttackerKnights,
      player: updatedPlayer,
      hex_owner: updatedPlayer
      /////////////////////////////////////////////////////////////
    }

    await db.updateHexUnits(origUpdatedOrigin[0].hex_index, updatedOrigin.swordsmen, updatedOrigin.archers, updatedOrigin.knights, 'player' + dbUpdatedOrigin[0].player); // update hex in db with origin's remaining units

    let origTarget = [{
      hex_index: updatedTarget.index,
      coordinate_0: updatedTarget.coordinates[0],
      coordinate_1: updatedTarget.coordinates[1],
      coordinate_2: updatedTarget.coordinates[2],
      player: Number(updatedTarget.player[updatedTarget.player.length - 1]),
      hex_owner: Number(updatedTarget.player[updatedTarget.player.length - 1]),
      swordsmen: updatedTarget.swordsmen,
      archers: updatedTarget.archers,
      knights: updatedTarget.knights
    }];

    let dbUpdatedTarget = await db.getHex(updatedTarget.index); // original target hex from db (returns an object)

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

    await db.updateHexUnits(updatedTarget.hex_index, updatedTarget.swordsmen, updatedTarget.archers, updatedTarget.knights, 'player' + dbUpdatedTarget[0].player); // update units on hex in the db (for original player/owner of hex)

    if (dbUpdatedTarget[0].player !== defenderPlayer) { // if original player on the hex is not the defender
      await db.switchHexOwner(updatedTarget.hex_index, 'player' + defenderPlayer); // update the hex player/owner in the db with the defender player
    }

    flag = 'defender';
  }

  let updatedP1TotalUnits = await db.getPlayerTotalUnits(room, gameIndex, 'player1');
  let updatedP2TotalUnits = await db.getPlayerTotalUnits(room, gameIndex, 'player2');

  if (updatedP1TotalUnits[0].p1_total_units < 0) {
    await db.updatePlayerTotalUnits(room, gameIndex, 'player1', 0, 'replace'); // zero out any negative units
  }
  if (updatedP2TotalUnits[0].p2_total_units < 0) {
    await db.updatePlayerTotalUnits(room, gameIndex, 'player2', 0, 'replace');
  }

  return {
    /////////////////////////////////// IF USING GAME OBJECT ON SERVER ///////////////////////////////////////////
    // gameOver: await checkForWin(games[gameIndex].playerOneTotalUnits, games[gameIndex].playerTwoTotalUnits),
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////// IF USING DATABASE //////////////////////////////////////////////////////
    gameOver: await checkForWin(updatedP1TotalUnits[0].p1_total_units, updatedP2TotalUnits[0].p2_total_units),
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////
    updatedOrigin: updatedOrigin,
    updatedTarget: updatedTarget,
    flag: flag,
    gameIndex: gameIndex
  }
};

const checkForWin = async (playerOneUnits, playerTwoUnits) => {
  if (playerOneUnits <= 0) {
    return 'player2';
  } else if (playerTwoUnits <= 0) {
    return 'player1';
  } else {
    return false;
  }
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
  // ********* need to add stuff in here for updating unitBanks for each player *********

  ///////////////////////////////////// IF USING DATABASE ///////////////////////////////////////
  // console.log(`\n-----------------------------> BUY UNITS: \ntype (${type}), player (${player}), gameIndex (${gameIndex}), socketId (${socketId}), room (${room})\n`);
  let game = await db.getGameBoard(room, gameIndex);

  let currentPlayerResources = await db.getResources(room, gameIndex, player); // returns an object

  // IF BUYING SWORDSMEN
  if (type === 'swordsmen') { // if buying swordsmen
    // console.log('\nLETS BUY SOME ----> SWORDSMEN');
    // IF PLAYER 1 IS BUYING SWORDSMEN
    if (player === 'player1') { // for player 1
      // console.log('\nplayer 1 buying swordsmen\n')
      if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_metal >= 10) { // check if player has enough resources to purchase unit

        await db.buySwordsmen(room, gameIndex, player); // decreases player resources in db
        // console.log('\ndecreased player resources in db successfully');

        await db.increasePlayerBank(room, gameIndex, player, 'swordsmen', 10); // after units have been purchased, increase player's bank for swordsmen in db
        // console.log('\nincreased player unit bank in db successfully');

        // then get the updated player resources from game in db
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
        // console.log('\nplayer1 and player2 resources fetched')
        // console.log('\np1Resources:\n', p1Resources)
        // console.log('\np2Resources:\n', p2Resources)

        // then get the updated player bank from the game in db
        let p1Bank = await db.getPlayerBank(room, gameIndex, 'player1');
        let p2Bank = await db.getPlayerBank(room, gameIndex, 'player2');
        // console.log('\ngot updated bank successfully')
        // console.log('\np1Bank:\n', p1Bank)
        // console.log('\np2Bank:\n', p2Bank, '\n')

        await io.to(room).emit('swordsmen', {
          playerOneUnitBank: {
            swordsmen: p1Bank[0].p1_swordsmen_bank,
            archers: p1Bank[0].p1_archers_bank,
            knights: p1Bank[0].p1_knights_bank
          },
          playerTwoUnitBank: {
            swordsmen: p2Bank[0].p2_swordsmen_bank,
            archers: p2Bank[0].p2_archers_bank,
            knights: p2Bank[0].p2_knights_bank
          }
        });

        games[gameIndex].playerOneResources.gold -= 10;
        games[gameIndex].playerOneResources.metal -= 10;

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

    // ELSE IF PLAYER 2 IS BUYING SWORDSMEN
    } else if (player === 'player2') { // else same for player 2
      // console.log('\nplayer 2 buying swordsmen\n')
      if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_metal >= 10) {

        await db.buySwordsmen(room, gameIndex, player); // decreases player resources in db
        // console.log('\ndecreased player resources in db successfully');

        // after units have been purchased, increase player's bank for swordsmen in db
        await db.increasePlayerBank(room, gameIndex, player, 'swordsmen', 10);
        // console.log('\nincreased player unit bank in db successfully');

        // then get the updated player resources from game in db
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
        // console.log('\nplayer1 and player2 resources fetched')
        // console.log('\np1Resources:\n', p1Resources)
        // console.log('\np2Resources:\n', p2Resources)

        // then get the updated player bank from the game in db
        let p1Bank = await db.getPlayerBank(room, gameIndex, 'player1');
        let p2Bank = await db.getPlayerBank(room, gameIndex, 'player2');
        // console.log('\ngot updated bank successfully')
        // console.log('\np1Bank:\n', p1Bank)
        // console.log('\np2Bank:\n', p2Bank, '\n')

        await io.to(room).emit('swordsmen', {
          playerOneUnitBank: {
            swordsmen: p1Bank[0].p1_swordsmen_bank,
            archers: p1Bank[0].p1_archers_bank,
            knights: p1Bank[0].p1_knights_bank
          },
          playerTwoUnitBank: {
            swordsmen: p2Bank[0].p2_swordsmen_bank,
            archers: p2Bank[0].p2_archers_bank,
            knights: p2Bank[0].p2_knights_bank
          }
        });

        games[gameIndex].playerTwoResources.gold -= 10;
        games[gameIndex].playerTwoResources.metal -= 10;

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

  // IF BUYING ARCHERS
  if (type === 'archers') { // if buying archers
    // console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ LETS BUY SOME ----> ARCHERS');

    // IF PLAYER 1 IS BUYING ARCHERS
    if (player === 'player1') { // for player 1
      // console.log('player 1 buying archers')
      if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_wood >= 20) { // check if player has enough resources to purchase unit

        await db.buyArchers(room, gameIndex, player); // decreases player's resources in db
        // console.log('\ndecreased player resources in db successfully');

        await db.increasePlayerBank(room, gameIndex, player, 'archers', 10); // after units have been purchased, increase player's bank for archers in db
        // console.log('\nincreased player unit bank in db successfully');

        // then get the updated player resources from game in db
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
        // console.log('\nplayer1 and player2 resources fetched')
        // console.log('\np1Resources:\n', p1Resources)
        // console.log('\np2Resources:\n', p2Resources)

        // then get the updated player bank from the game in db
        let p1Bank = await db.getPlayerBank(room, gameIndex, 'player1');
        let p2Bank = await db.getPlayerBank(room, gameIndex, 'player2');
        // console.log('\ngot updated bank successfully')
        // console.log('\np1Bank:\n', p1Bank)
        // console.log('\np2Bank:\n', p2Bank, '\n')

        await io.to(room).emit('archers', {
          playerOneUnitBank: {
            swordsmen: p1Bank[0].p1_swordsmen_bank,
            archers: p1Bank[0].p1_archers_bank,
            knights: p1Bank[0].p1_knights_bank
          },
          playerTwoUnitBank: {
            swordsmen: p2Bank[0].p2_swordsmen_bank,
            archers: p2Bank[0].p2_archers_bank,
            knights: p2Bank[0].p2_knights_bank
          }
        });

        games[gameIndex].playerOneResources.gold -= 10;
        games[gameIndex].playerOneResources.wood -= 20;

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

    // ELSE IF PLAYER 2 IS BUYING ARCHERS
    } else if (player === 'player2') { // else same for player 2

      // console.log('player 2 buying archers')
      if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_wood >= 20) {

        await db.buyArchers(room, gameIndex, player); // decreases player's resources in db
        // console.log('\ndecreased player resources in db successfully');

        await db.increasePlayerBank(room, gameIndex, player, 'archers', 10); // after units have been purchased, increase player's bank for archers in db
        // console.log('\nincreased player unit bank in db successfully');

        // then get the updated player resources from game in db
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
        // console.log('\nplayer1 and player2 resources fetched')
        // console.log('\np1Resources:\n', p1Resources)
        // console.log('\np2Resources:\n', p2Resources)

        // then get the updated player bank from the game in db
        let p1Bank = await db.getPlayerBank(room, gameIndex, 'player1');
        let p2Bank = await db.getPlayerBank(room, gameIndex, 'player2');
        // console.log('\ngot updated bank successfully')
        // console.log('\np1Bank:\n', p1Bank)
        // console.log('\np2Bank:\n', p2Bank, '\n')

        await io.to(room).emit('archers', {
          playerOneUnitBank: {
            swordsmen: p1Bank[0].p1_swordsmen_bank,
            archers: p1Bank[0].p1_archers_bank,
            knights: p1Bank[0].p1_knights_bank
          },
          playerTwoUnitBank: {
            swordsmen: p2Bank[0].p2_swordsmen_bank,
            archers: p2Bank[0].p2_archers_bank,
            knights: p2Bank[0].p2_knights_bank
          }
        });

        games[gameIndex].playerTwoResources.gold -= 10;
        games[gameIndex].playerTwoResources.wood -= 20;

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

  // IF BUYING KNIGHTS
  if (type === 'knights') { // if buying knights
    // console.log('LETS BUY SOME ----> KNIGHTS');

    // IF PLAYER 1 IS BUYING KNIGHTS
    if (player === 'player1') { // for player 1
      // console.log('player 1 buying knights')
      if (currentPlayerResources[0].p1_gold >= 20 && currentPlayerResources[0].p1_wood >= 20 && currentPlayerResources[0].p1_metal >= 20) { // check if player has enough resources to purchase unit
        await db.buyKnights(room, gameIndex, player); // decreases resources in the db
        // console.log('\ndecreased player resources in db successfully');

        await db.increasePlayerBank(room, gameIndex, player, 'knights', 10); // after units have been purchased, increase player's bank for archers in db
        // console.log('\nincreased player unit bank in db successfully');

        // then get the updated player resources from game in db
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
        // console.log('\nplayer1 and player2 resources fetched')
        // console.log('\np1Resources:\n', p1Resources)
        // console.log('\np2Resources:\n', p2Resources)

        // then get the updated player bank from the game in db
        let p1Bank = await db.getPlayerBank(room, gameIndex, 'player1');
        let p2Bank = await db.getPlayerBank(room, gameIndex, 'player2');
        // console.log('\ngot updated bank successfully')
        // console.log('\np1Bank:\n', p1Bank)
        // console.log('\np2Bank:\n', p2Bank, '\n')

        await io.to(room).emit('knights', {
          playerOneUnitBank: {
            swordsmen: p1Bank[0].p1_swordsmen_bank,
            archers: p1Bank[0].p1_archers_bank,
            knights: p1Bank[0].p1_knights_bank
          },
          playerTwoUnitBank: {
            swordsmen: p2Bank[0].p2_swordsmen_bank,
            archers: p2Bank[0].p2_archers_bank,
            knights: p2Bank[0].p2_knights_bank
          }
        });

        games[gameIndex].playerOneResources.gold -= 20;
        games[gameIndex].playerOneResources.wood -= 20;
        games[gameIndex].playerOneResources.metal -= 20;

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

    // IF PLAYER 2 IS BUYING KNIGHTS
    } else if (player === 'player2') { // else same for player 2
      // console.log('player 2 buying knights')
      if (currentPlayerResources[0].p2_gold >= 20 && currentPlayerResources[0].p2_wood >= 20 && currentPlayerResources[0].p2_metal >= 20) {

        await db.buyKnights(room, gameIndex, player); // decreases resources in the db
        // console.log('\ndecreased player resources in db successfully');

        await db.increasePlayerBank(room, gameIndex, player, 'knights', 10); // after units have been purchased, increase player's bank for archers in db
        // console.log('\nincreased player unit bank in db successfully');

        // then get the updated player resources from game in db
        let p1Resources = await db.getResources(room, gameIndex, 'player1');
        let p2Resources = await db.getResources(room, gameIndex, 'player2');
        // console.log('\nplayer1 and player2 resources fetched')
        // console.log('\np1Resources:\n', p1Resources)
        // console.log('\np2Resources:\n', p2Resources)

        // then get the updated player bank from the game in db
        let p1Bank = await db.getPlayerBank(room, gameIndex, 'player1');
        let p2Bank = await db.getPlayerBank(room, gameIndex, 'player2');
        // console.log('\ngot updated bank successfully')
        // console.log('\np1Bank:\n', p1Bank)
        // console.log('\np2Bank:\n', p2Bank, '\n')

        await io.to(room).emit('knights', {
          playerOneUnitBank: {
            swordsmen: p1Bank[0].p1_swordsmen_bank,
            archers: p1Bank[0].p1_archers_bank,
            knights: p1Bank[0].p1_knights_bank
          },
          playerTwoUnitBank: {
            swordsmen: p2Bank[0].p2_swordsmen_bank,
            archers: p2Bank[0].p2_archers_bank,
            knights: p2Bank[0].p2_knights_bank
          }
        });

        games[gameIndex].playerTwoResources.gold -= 20;
        games[gameIndex].playerTwoResources.wood -= 20;
        games[gameIndex].playerTwoResources.metal -= 20;

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
  // let game = games[gameIndex], resources, bank, unitCount;
  // if (!game.playerOneUnitBank) {
  //   game.playerOneUnitBank = {
  //     archers: 0,
  //     knights: 0,
  //     swordsmen: 0
  //   }
  // }
  // if (!game.playerTwoUnitBank) {
  //   game.playerTwoUnitBank = {
  //     archers: 0,
  //     knights: 0,
  //     swordsmen: 0
  //   }
  // }
  // if (player === 'player1') {
  //   resources = game.playerOneResources;
  //   bank = game.playerOneUnitBank;
  //   unitCount = 'playerOneTotalUnits';
  // } else {
  //   resources = game.playerTwoResources;
  //   bank = game.playerTwoUnitBank;
  //   unitCount = 'playerOneTotalUnits';
  // }
  // if (type === 'swordsmen') {
  //   if (resources.gold >= 10 && resources.metal >= 10) {
  //     resources.gold -= 10;
  //     resources.metal -= 10;
  //     bank.swordsmen += 10;
  //     game[unitCount] += 10;
  //     io.to(room).emit('swordsmen', {
  //       playerOneUnitBank: game.playerOneUnitBank,
  //       playerTwoUnitBank: game.playerTwoUnitBank
  //     });
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
  //     bank.archers += 10;
  //     game[unitCount] += 10;
  //     io.to(room).emit('archers', {
  //       playerOneUnitBank: game.playerOneUnitBank,
  //       playerTwoUnitBank: game.playerTwoUnitBank
  //     });

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

  //     game[unitCount] += 10;
  //     bank.knights += 10;
  //     io.to(room).emit('knights', {
  //       playerOneUnitBank: game.playerOneUnitBank,
  //       playerTwoUnitBank: game.playerTwoUnitBank
  //     });
  //     io.to(room).emit('updateResources', {
  //       playerOneResources: game.playerOneResources,
  //       playerTwoResources: game.playerTwoResources
  //     });
  //   } else {
  //     io.to(room).emit('not enough resources');
  //   }
  // }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
const PORT = 8080;
const HOST = '0.0.0.0';
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters
