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
  console.log('req.user:', req.user);
  res.send(req.user);
});

app.post('/signup', passport.authenticate('local-signup'), (req, res) => {
  console.log('req.body', req.body);
  console.log('req.user upon login:', req.user);
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
    if (isResourceHex() && index !== 0 && index !== hexes.length - 1) {
      let resourceType = Math.floor(Math.random() * 3) + 1;
      hex.hasGold = false;
      hex.hasWood = false;
      hex.hasMetal = false;
      if (resourceType === 1) {
        hex.hasGold = true;
      } else if (resourceType === 2) {
        hex.hasWood = true;
      } else {
        hex.hasMetal = true;
      }
    } else {
      hex.hasGold = false;
      hex.hasWood = false;
      hex.hasMetal = false;
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

io.on('connection', socket => {
  console.log('User connected');
  // console.log('socket.id:', socket.id);
  let room = selectRoom();
  if (room) {
    socket.join(room);
    // console.log('room after joining other player:', io.sockets.adapter.rooms[room]);
    const board = gameInit(5, 4);
    let gameIndex = uuidv4();
    games[gameIndex] = {
      board: board,
      playerOneResources: {
        gold: 0,
        wood: 0,
        metal: 0
      },
      playerTwoResources: {
        gold: 0,
        wood: 0,
        metal: 0
      }
    };
    const newGameBoard = {
      board: board,
      gameIndex: gameIndex,
      room: room
    }
    io.to(room).emit('newGame', newGameBoard);
  } else {
    socket.join('*' + roomNum);
    io.to(`*${roomNum}`).emit('newGame', 'Waiting on another player to join!');
    roomNum++;
  }

  socket.on('move', data => {
    moveUnits(data, socket);
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})


app.get('/*', (req, res) => res.sendfile('/'));


app.post('/newBoard', (req, res) => {
  games = {};  // ************************THIS IS JUST FOR DEVELOPMENT, IT MAKES IT SO WE DON'T GUM UP THE SERVER WITH A TON OF OBJECTS, IN REAL LIFE WE WON'T EVEN BE STORING GAMES ON THE SERVER MOST LIKELY
  const board = gameInit(req.body.numRows, req.body.numCols);
  let gameIndex = uuidv4();
  games[gameIndex] = {
    board: board,
    playerOneResources: {
      gold: 0,
      wood: 0,
      metal: 0
    },
    playerTwoResources: {
      gold: 0,
      wood: 0,
      metal: 0
    }
  };
  res.status(201).json({
    board: board,
    gameIndex: gameIndex
  });
});

const moveUnits = async (data, socket) => {
  // THIS LOGIC WILL MOST LIKELY HAPPEN IN TANDEM WITH THE DATABASE, BUT IS WRITTEN IN LOCAL STORAGE FOR NOW
  let updatedOrigin = data.updatedOrigin;
  let originIndex = data.originIndex;
  let updatedTarget = data.updatedTarget;
  let targetIndex = data.targetIndex;
  let gameIndex = data.gameIndex;
  let board = games[gameIndex].board;
  let masterOrigin = board[originIndex];
  let masterTarget = board[targetIndex];
  let masterOrigCs = masterOrigin.coordinates;
  let masterTarCs = masterTarget.coordinates;
  let origCs = updatedOrigin.coordinates;
  let tarCs = updatedTarget.coordinates;
  let currentPlayer = data.currentPlayer;
  let room = data.room;
  let socketId = data.socketId;

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget);
  if (legal) {
    let collision = await checkForCollision(originIndex, targetIndex, gameIndex);
    if (collision) {
      if (collision === 'friendly') {
        await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer);
        io.to(room).emit('move', move);
      } else {
        let winner = await resolveCombat(originIndex, targetIndex, gameIndex);
        winner === 'attacker' ?
        (() => {
          io.to(socketId).emit('win');
          socket.to(room).emit('lose');
        })() :
        (() => {
          io.to(socketId).emit('lose');
          socket.to(room).emit('win');
        })();
        const board = gameInit(5, 4);
        gameIndex = uuidv4();
        games[gameIndex] = {
          board: board,
          playerOneResources: {
            gold: 0,
            wood: 0,
            metal: 0
          },
          playerTwoResources: {
            gold: 0,
            wood: 0,
            metal: 0
          }
        };
        const newGameBoard = {
          board: board,
          gameIndex: gameIndex,
          room: room
        }
        io.to(room).emit('newGame', newGameBoard);
      }
    } else {
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer);
      let move = {
        originIndex: originIndex,
        updatedOrigin: updatedOrigin,
        targetIndex: targetIndex,
        updatedTarget: updatedTarget
      }
      io.to(room).emit('move', move);
    }
  } else {
    io.to(room).emit('failure');
  }
};

const checkLegalMove = (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, cb) => {
  if (masterOrigCs[0] === origCs[0] && masterOrigCs[1] === origCs[1] && masterOrigCs[2] === origCs[2] &&
      masterTarCs[0] === tarCs[0] && masterTarCs[1] === tarCs[1] && masterTarCs[2] === tarCs[2]) {
        return true;
      } else {
        return false;
      }
}

const checkForCollision = (originIndex, targetIndex, gameIndex) => {
  let game = games[gameIndex].board;
  let origin = game[originIndex];
  let target = game[targetIndex];

  if (origin.player && target.player) {
    let collision = '';
    origin.player === target.player ? collision += 'friendly' : collision += 'opponent';
    return collision;
  } else {
    return false;
  }
}

const updateHexes = async (originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer) => {
  games[gameIndex].board[originIndex] = updatedOrigin;
  games[gameIndex].board[targetIndex] = updatedTarget; //// This is what will happen on an ordinary move
  currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1';
  await reinforceHexes(gameIndex, currentPlayer);
}

const resolveCombat = (originIndex, targetIndex, gameIndex) => {
  let attacker = games[gameIndex].board[originIndex];
  let defender = games[gameIndex].board[targetIndex];

  let attackerRoll = Math.floor(Math.random() * 101 * attacker.swordsmen + (attacker.swordsmen * 5)) - 100;
  let defenderRoll = Math.floor(Math.random() * 101 * defender.swordsmen + (defender.swordsmen * 5)) - 100;

  if (attackerRoll >= defenderRoll) {
    return 'attacker';
  } else {
    return 'defender';
  }
}

const reinforceHexes = (gameIndex, currentPlayer) => {
  let playerResources;
  currentPlayer === 'player1' ?
  playerResources = games[gameIndex].playerOneResources :
  playerResources =  games[gameIndex].playerTwoResources;
  games[gameIndex].board.forEach(hex => {
    if (hex.player === currentPlayer) {
      if (hex.hasGold) {
        playerResources.gold += 10;
      } else if (hex.hasWood) {
        playerResources.wood += 10;
      } else if (hex.hasMetal) {
        playerResources.metal += 10;
      }
    }
  })
}

app.get('/*', (req, res) => res.sendfile('/'));


// io.listen(process.env.PORT || 3000);
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters
