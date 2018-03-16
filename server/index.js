const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');
let path = require('path');
const db = require('../database/index');
const passport = require('passport');
const session = require('express-session');
const uuidv4 = require('uuid/v4');

const app = express();
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

app.get('/*', (req, res) => res.sendfile('/'));

app.post('/newBoard', (req, res) => {
  const board = gameInit(req.body.numRows, req.body.numCols);
  res.send(board);
});

app.patch('/movePlayer', (req, res) => {

});

app.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters
