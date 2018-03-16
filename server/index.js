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
    let row = []
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

  return hexes.map((letter, index) => {
    let hex = {};
    hex.coordinates = letter;
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
  console.log('rooms:', rooms);
  for (room in rooms) {
    console.log('Rooms[room][sockets]', rooms[room].sockets);
    console.log('Rooms[room][sockets].length', Object.keys(rooms[room].sockets).length);
    let roomSize = Object.keys(rooms[room].sockets).length;
    if (roomSize === 1 && room[0] === '*') {
      console.log('room:', room);
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
  console.log('socket:', socket);
  console.log('socketid:', socket.id);
  let room = selectRoom();
  if (room) {
    socket.join(room);
    console.log('room after joining other player:', io.sockets.adapter.rooms[room]);
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
  const board = gameInit(req.body.numRows, req.body.numCols);
  res.send(board);
});

app.patch('/movePlayer', (req, res) => {

});

// io.listen(process.env.PORT || 3000);
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters
