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

let games = {};

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).end('You must log in to do that!');
}

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

    if (index === 0) {
      hex.player = 'player1';
      hex.units = 10;
    } else if (index === hexes.length - 1) {
      hex.player = 'player2';
      hex.units = 10;
    } else {
      hex.player = null;
      hex.units = 0;
    }
    if (isResourceHex() && index !== 0 && index !== hexes.length - 1) {
      hex.hasResource = true;
    } else {
      hex.hasResource = false;
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
  let room = selectRoom();
  if (room) {
    socket.join(room);
    let newGameBoard = gameInit(5, 4);
    io.to(room).emit('newGame', newGameBoard);
  } else {
    socket.join('*' + roomNum);
    roomNum++;
    io.to(room).emit('newGame', 'waiting for another player to join');
  }

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})


app.get('/*', (req, res) => res.sendfile('/'));


app.post('/newBoard', (req, res) => {
  games = {};  // ************************THIS IS JUST FOR DEVELOPMENT, IT MAKES IT SO WE DON'T GUM UP THE SERVER WITH A TON OF OBJECTS, IN REAL LIFE WE WON'T EVEN BE STORING GAMES ON THE SERVER MOST LIKELY
  const board = gameInit(req.body.numRows, req.body.numCols);
  let gameIndex = uuidv4();
  games[gameIndex] = board;
  res.status(201).json({
    board: board,
    gameIndex: gameIndex
  });
});

app.patch('/move', async (req, res, next) => {
  // THIS LOGIC WILL MOST LIKELY HAPPEN IN TANDEM WITH THE DATABASE, BUT IS WRITTEN IN LOCAL STORAGE FOR NOW
  let body = req.body;
  let updatedOrigin = body.updatedOrigin;
  let originIndex = body.originIndex;
  let updatedTarget = body.updatedTarget;
  let targetIndex = body.targetIndex;
  let gameIndex = body.gameIndex;
  let board = games[gameIndex];
  let masterOrigin = board[originIndex];
  let masterTarget = board[targetIndex];
  let masterOrigCs = masterOrigin.coordinates;
  let masterTarCs = masterTarget.coordinates;
  let origCs = updatedOrigin.coordinates;
  let tarCs = updatedTarget.coordinates;
  let currentPlayer = body.currentPlayer;

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget);
  if (legal) {
    let collision = await checkForCollision(originIndex, targetIndex, gameIndex);
    if (collision) {
      if (collision === 'friendly') {
        await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer);
        res.status(201).end();
      } else {
        let winner = await resolveCombat(originIndex, targetIndex, gameIndex);
        winner === 'attacker' ?
        res.status(202).end() :
        res.status(204).end();
      }
    } else {
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer);
      res.status(201).end();
    }
  } else {
    res.status(501).end();
  }
});

const checkLegalMove = (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, cb) => {
  if (masterOrigCs[0] === origCs[0] && masterOrigCs[1] === origCs[1] && masterOrigCs[2] === origCs[2] &&
      masterTarCs[0] === tarCs[0] && masterTarCs[1] === tarCs[1] && masterTarCs[2] === tarCs[2]) {
        return true;
      } else {
        return false;
      }
}

const checkForCollision = (originIndex, targetIndex, gameIndex) => {
  let game = games[gameIndex];
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

const updateHexes = (originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer) => {
  games[gameIndex][originIndex] = updatedOrigin;
  games[gameIndex][targetIndex] = updatedTarget; //// This is what will happen on an ordinary move
  reinforceHexes(gameIndex, currentPlayer);
}

const resolveCombat = (originIndex, targetIndex, gameIndex) => {
  let attacker = games[gameIndex][originIndex];
  let defender = games[gameIndex][targetIndex];

  let attackerRoll = Math.floor(Math.random() * 101 * attacker.units + (attacker.units * 5)) - 100;
  let defenderRoll = Math.floor(Math.random() * 101 * defender.units + (defender.units * 5)) - 100;

  if (attackerRoll >= defenderRoll) {
    return 'attacker';
  } else {
    return 'defender';
  }
}

const reinforceHexes = (gameIndex, currentPlayer) => {
  games[gameIndex].forEach(hex => {
    if (hex.hasResource && hex.player === currentPlayer) {
      hex.units += 10;
    }
  })
}

app.get('/*', (req, res) => res.sendfile('/'));


// io.listen(process.env.PORT || 3000);
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters
