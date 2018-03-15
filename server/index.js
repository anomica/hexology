const express = require('express');
const bodyParser = require('body-parser');
const url = require('url');
const db = require('../database/index');
const passport = require('passport');
const session = require('express-session');

const app = express();
// require('../server/config/passport')(passport);
app.use(session({
  secret: process.env.SESSION_PASSWORD || 'supersecretsecret',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/../app'));
app.use(express.static(__dirname + '/../node_modules'));

app.use(bodyParser.json());

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).end('You must log in to do that!');
}

app.get('*', (req, res) => res.redirect('/'));

app.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters

const coordinateGenerator = (numRows, numCols) => { // creates an array of coordinates for hexes
  let j = 0;
  let rowLength = numRows - 1;
  let hexes = [];
  
  const rowGenerator = (rowIndex, firstCol) => { // creates a row in the grid
    let iterations;
    let row = []
    if (rowIndex % 2 === 0) {
      iterations = rowLength;
    } else {
      iterations = rowLength - 1;
    }
    
    for (let i = 0; i < iterations; i++) {
      row.push([firstCol, rowIndex]);
      firstCol++;
    }
    return row;
  }
  
  for (let i = 0; i < numRows; i++) {
    hexes = hexes.concat(rowGenerator(i, j))
    if (i % 2 !== 0) {
      j--;
    }
  }
  return hexes;
}

const isResourceHex = () => { // decides if hex gets resource
  return Math.floor(Math.random() * (5 - 1) + 1) % 4 === 0;
};

const gameInit = () => { // creates an array of hexes with properties (the board)
  let i = 0;
  const hexes = coordinateGenerator(5);

    return hexes.map((letter, index) => {
      let hex = {};
      hex.coordinates = letter;
      
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
      if (isResourceHex() && index !== 0 && index !== 17) {
        hex.hasResource = true;
      } else {
        hex.hasResource = false;
      }
      return hex;
    });
};



