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
  console.log('req.user upon login:', req.user);
  res.status(201).json(req.user);
});

app.post('/logout', isLoggedIn, function (req, res) {
  req.logout();
  res.clearCookie('connect.sid').status(200).redirect('/');
});

let games = {};


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
      if (resourceType === 1) { // asign resource type according to dice roll
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
  // console.log('socket.id:', socket.id);
  let room = await selectRoom();
  if (room) { // if there is an existing room with one player,
    socket.join(room);
    // console.log('room after joining other player:', io.sockets.adapter.rooms[room]);
    const board = await gameInit(5, 4);
    let gameIndex = uuidv4();

    
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
      }
    };
    const newGameBoard = {
      board: board,
      gameIndex: gameIndex,
      room: room
    }
    
    await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases
    
    let gameBoard = await db.getGameBoard(room, gameIndex); // returns the hexes for the current game

    io.to(room).emit('newGame', newGameBoard); // send game board to user
  } else { // otherwise
    socket.join('*' + roomNum); // create a new room
    io.to(`*${roomNum}`).emit('newGame', 'Waiting on another player to join!'); // and send back a string to initialize for player 1
    roomNum++; // increment room count to assign new rooms
  }

  socket.on('move', data => { // move listener
    moveUnits(data, socket); // pass move data and socket to function to assess move
  })

  socket.on('buy', data => {
    buyUnits(data.type, data.player, data.gameIndex, data.socketId);
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})


app.get('/*', (req, res) => res.sendfile('/'));


// app.post('/newBoard', (req, res) => {
//   games = {};  // ************************THIS IS JUST FOR DEVELOPMENT, IT MAKES IT SO WE DON'T GUM UP THE SERVER WITH A TON OF OBJECTS, IN REAL LIFE WE WON'T EVEN BE STORING GAMES ON THE SERVER MOST LIKELY
//   const board = gameInit(req.body.numRows, req.body.numCols);
//   let gameIndex = uuidv4();
//   games[gameIndex] = {
//     board: board,
//     playerOneResources: {
//       gold: 10,
//       wood: 10,
//       metal: 10
//     },
//     playerTwoResources: {
//       gold: 10,
//       wood: 10,
//       metal: 10
//     }
//   };
//   res.status(201).json({
//     board: board,
//     gameIndex: gameIndex
//   });
// });

const moveUnits = async (data, socket) => {
  // THIS LOGIC WILL MOST LIKELY HAPPEN IN TANDEM WITH THE DATABASE, BUT IS WRITTEN IN LOCAL STORAGE FOR NOW
  let updatedOrigin = data.updatedOrigin; // new origin object as sent by user
  let originIndex = data.originIndex; // with its index,
  let updatedTarget = data.updatedTarget; // same for target
  let targetIndex = data.targetIndex;
  let gameIndex = data.gameIndex; // game index to find in storage
  let room = data.room; // room to send move to

  // let board = games[gameIndex].board; // game board found using above index
  let board = await db.getGameBoard(room, gameIndex); // gets game board from db using above index

  let masterOrigin = board[originIndex]; // origin to be updated/checked against
  let masterTarget = board[targetIndex]; // same for target

  // let masterOrigCs = masterOrigin.coordinates; // coordinates of those masters
  let masterOrigCs = [masterOrigin.coordinate_0, masterOrigin.coordinate_1, masterOrigin.coordinate_2]; // coordinates of those masters

  // let masterTarCs = masterTarget.coordinates;
  let masterTarCs = [masterTarget.coordinate_0, masterTarget.coordinate_1, masterTarget.coordinate_2]; // coordinates of those masters

  let origCs = updatedOrigin.coordinates; // as well as coordinates of the ones sent by user
  let tarCs = updatedTarget.coordinates;

  let currentPlayer = data.currentPlayer; // player whose turn it is
  let socketId = data.socketId; // socket to send back response if necessary

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget); // assess legality of move
  if (legal) {
    // if legal move,
    let collision = await checkForCollision(originIndex, targetIndex, gameIndex, room); // check for collision
    if (collision) {
      if (collision === 'friendly') {
        // if collision and collision is friendly,
        await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer); // update hexes without combat occuring

        await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer); // updates the original hex and new hex in the db for the current player

        io.to(room).emit('move', move); // then send back okay to move units
      } else {
        let winner = await resolveCombat(originIndex, targetIndex, gameIndex, room); //otherwise, roll for combat
        winner === 'attacker' ? (() => { // if attacker wins,
          io.to(socketId).emit('win');
          socket.to(room).emit('lose');

          // TODO: Mark game as completed
        })() : (() => {
          // and vice versa
          io.to(socketId).emit('lose');
          socket.to(room).emit('win');
          // TODO: Mark game as completed
        })();

        // TODO: mark game as completed (await)

        const board = await gameInit(5, 4); // the reinit board
        gameIndex = uuidv4();
        games[gameIndex] = { board: board, playerOneResources: { gold: 10, wood: 10, metal: 10 }, playerTwoResources: { gold: 10, wood: 10, metal: 10 } };
        const newGameBoard = { board: board, gameIndex: gameIndex, room: room };

        await db.createGame(room, board, gameIndex); // Creates and saves new game to the db

        io.to(room).emit('newGame', newGameBoard);
      }
    } else {
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer); // if move is to unoccupied hex, execute move
      let move = { 
        originIndex: originIndex, 
        updatedOrigin: updatedOrigin, 
        targetIndex: targetIndex, 
        updatedTarget: updatedTarget
      };

      await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer); // updates the original hex and new hex in the db for the current player

      console.log('-------- master origin: ', masterOrigin)
      console.log('-------- updated target: ', updatedTarget)
      console.log('-------- current player: ', currentPlayer)

      io.to(room).emit('move', move);
    }
  } else {
    // if move request is not legal, send socket failure message, cheating detected
    io.to(room).emit('failure');
  }
};

const checkLegalMove = (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, cb) => { // to check move legality,
  // TODO: delete console log
  // console.log('-------------------- check legal move')
  // console.log('master orig cs: ', masterOrigCs);
  // console.log('orig cs: ', origCs)
  // console.log('master tar cs: ', masterTarCs)
  // console.log('tar cs: ', tarCs)

  if (masterOrigCs[0] === origCs[0] && masterOrigCs[1] === origCs[1] && masterOrigCs[2] === origCs[2] && // make sure all coordinates match between origin
      masterTarCs[0] === tarCs[0] && masterTarCs[1] === tarCs[1] && masterTarCs[2] === tarCs[2] ) { // and target **********NEED TO ADD CHECK TO MAKE SURE RESOURCE COUNTS AND UNIT COUNTS MATCH
        return true;
      } else {
        return false;
      }
}

const checkForCollision = async (originIndex, targetIndex, gameIndex, room) => {
  // let game = games[gameIndex].board;
  let game = await db.getGameBoard(room, gameIndex);

  let origin = game[originIndex];
  let target = game[targetIndex];

  // TODO: delete console log
  // console.log('------- origin', origin)
  // console.log('------- target', target)

  if (origin.player && target.player) {
    let collision = '';
    origin.player === target.player ? collision += 'friendly' : collision += 'opponent'; // if collision, decide if collision is with own units or enemy units
    return collision;
  } else {
    return false;
  }
}

const updateHexes = async (originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer) => {
  games[gameIndex].board[originIndex] = updatedOrigin;
  games[gameIndex].board[targetIndex] = updatedTarget; // This is what will happen on an ordinary move
  currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1'; // then player will toggle
  await reinforceHexes(gameIndex, currentPlayer, targetIndex); // then check to see if there are reinforcements
}

const resolveCombat = async (originIndex, targetIndex, gameIndex, room) => { // if combat,
  let board = await db.getGameBoard(room, gameIndex);

  // let attacker = games[gameIndex].board[originIndex]; // get attacking hex
  let attacker = board[originIndex]; // get attacking hex
  
  // let defender = games[gameIndex].board[targetIndex]; // and defending hex
  let defender = board[targetIndex]; // and defending hex

  console.log('Attacker: ', attacker.swordsmen, attacker.archers, attacker.knights)
  console.log('Defender: ', defender.swordsmen, defender.archers, defender.knights)

  let attackerRoll = Math.floor(Math.random() * 10 + (attacker.swordsmen) + (attacker.archers * 2) + (attacker.knights * 4));
  let defenderRoll = Math.floor(Math.random() * 10 + (attacker.swordsmen) + (attacker.archers * 2) + (attacker.knights * 4));

  if (attackerRoll >= defenderRoll) { // and determine winner, tie goes to attacker
    return 'attacker';
  } else {
    return 'defender';
  }
}

const reinforceHexes = (gameIndex, currentPlayer) => {
  let playerResources;
  currentPlayer === 'player1' ? // determine player to give resources to depending on whose turn is starting
  playerResources = games[gameIndex].playerOneResources : // store resource reference to save time typing
  playerResources =  games[gameIndex].playerTwoResources;
  games[gameIndex].board.forEach(hex => { // then check each hex
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
setInterval(deleteOldGames, 86400000)
  // this.deleteGames = setInterval(() => {
  //   // console.log('checking for old games...'); //TODO: Delete console log
  //   axios.patch('/deleteGames')
  //   .catch(err => console.error('err in checking old games:', err));
  // }, 5000);
  
  //86400000

const buyUnits = (type, player, gameIndex, socketId) => {
  let game = games[gameIndex], resources;
  player === 'player1' ? resources = game.playerOneResources : resources = game.playerTwoResources;
  if (type === 'swordsmen') {
    if (resources.gold >= 10 && resources.metal >= 10) {
      resources.gold -= 10;
      resources.metal -= 10;
      game.board.forEach(hex => {
        if (hex.player === player) {
          hex.swordsmen += 10;
        }
      })
      io.to(socketId).emit('swordsmen');
    } else {
      io.to(socketId).emit('not enough resources');
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
      io.to(socketId).emit('archers');
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
      io.to(socketId).emit('knights');
    } else {
      io.to(socketId).emit('not enough resources');
    }
  }
}

app.get('/*', (req, res) => res.sendfile('/'));

// //////////////////////////////////////////////////
// // TODO: Take out this section
app.post('/users', (req, res) => {
  console.log('user req.body', req.body); // TODO: take out console log
  db.addUser(req.body.username, req.body.email, req.body.password);
  res.end();
})
// //////////////////////////////////////////////////

/***************************** Creates game *****************************/
// app.post('/createGame', async (req, res) => {
//   await db.createGame(req.body);
//   res.end();
// });

/***************************** Deletes old games *****************************/
// app.patch('/deleteGames', async (req, res) => {
//   console.log('SERVER --> Delete game'); // TODO: delete console log
//   let oldGames = await db.getOldGames();
//   for (let i = 0; i < oldGames.length; i++) {
//     await db.deleteHex(oldGames[i].game_id);  
//     await db.deleteGames(oldGames[i].game_id);
//   }
//   res.end();
// });

// /***************************** Updates game if completed *****************************/
// app.patch('/gameComplete', (req, res) => {
//   console.log('SERVER ---> Game Completed'); //TODO: delete console log
//   console.log('reqbody game:', req.body); //TODO: delete console log
//   db.gameComplete(req.body);
//   res.end();
// });

/***************************** Updates hex when player has moved *****************************/
// app.patch('/hex', (req, res) => {
//   console.log('SERVER --> HEX PATCH REQ:', req.body); // TODO: delete console log
//   db.updateHex(req.body.oldOrigin, req.body.updatedOrigin, req.body.newOrigin);
//   res.end();
// });

// io.listen(process.env.PORT || 3000);
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters