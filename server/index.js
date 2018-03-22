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
    roomNum++; // increment room count to assign new ro
  })

  socket.on('joinGame', (data) => {
    socket.join(data.room);
    const board = gameInit(5, 4);
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
      }
    };

    const newGameBoard = {
      board: board,
      gameIndex: gameIndex,
      room: room
    }
    io.to(data.room).emit('gameCreated', newGameBoard); // send game board to user
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
  let updatedOrigin = data.updatedOrigin; // new origin object as sent by user
  let originIndex = data.originIndex; // with its index,
  let updatedTarget = data.updatedTarget; // same for target
  let targetIndex = data.targetIndex;
  let gameIndex = data.gameIndex; // game index to find in storage
  let room = data.room; // room to send move to

  let board = games[gameIndex].board; // game board found using above index
  // let board = await db.getGameBoard(room, gameIndex); // gets game board from db using above index

  // console.log('////////////////// BOARD /////////////////', board[0], '////////////////// END OF BOARD /////////////////');

  let masterOrigin = board[originIndex]; // origin to be updated/checked against
  let masterTarget = board[targetIndex]; // same for target
  let masterOrigCs = masterOrigin.coordinates; // coordinates of those masters
  // let masterOrigCs = [masterOrigin.coordinate_0, masterOrigin.coordinate_1, masterOrigin.coordinate_2]; // coordinates of those masters
  let masterTarCs = masterTarget.coordinates;
  // let masterTarCs = [masterTarget.coordinate_0, masterTarget.coordinate_1, masterTarget.coordinate_2]; // coordinates of those masters

  let origCs = updatedOrigin.coordinates; // as well as coordinates of the ones sent by user
  let tarCs = updatedTarget.coordinates;

  let currentPlayer = data.currentPlayer; // player whose turn it is
  let socketId = data.socketId; // socket to send back response if necessary

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget); // assess legality of move
  if (legal) { // if legal move,
    let collision = await checkForCollision(originIndex, targetIndex, gameIndex); // check for collision
    if (collision) {
      if (collision === 'friendly') {
        // if collision and collision is friendly,
        await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board); // update hexes without combat occuring

        // await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer); // updates the original hex and new hex in the db for the current player

        await io.to(room).emit('move', move); // then send back okay to move units
      } else {
        let result = await resolveCombat(originIndex, targetIndex, gameIndex, updatedOrigin, updatedTarget, currentPlayer); //otherwise, roll for combat
        result.isOver ? // if attacker wins, need to change hexes and send back board
        (() => {
          io.to(socketId).emit('win'); // the attacker gets a personal win message
          socket.to(room).emit('lose'); // while the rest of the room (defender) gets lose message
          const board = gameInit(5, 4);
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
            }
          };

          const newGameBoard = {
            board: board,
            gameIndex: gameIndex,
            room: room
          }
          io.to(data.room).emit('gameCreated', newGameBoard); // send game board to user
        })() :
        (() => { // and vice versa
          let move = {
            updatedOrigin: result.updatedOrigin,
            updatedTarget: result.updatedTarget,
            originIndex: originIndex,
            targetIndex: targetIndex
          }
          io.to(room).emit('move', move);
        })();
        // const board = gameInit(5, 4); // the reinit board
        // gameIndex = uuidv4();
        // games[gameIndex] = {
        //   board: board,
        //   playerOneResources: {
        //     gold: 10,
        //     wood: 10,
        //     metal: 10
        //   },
        //   playerTwoResources: {
        //     gold: 10,
        //     wood: 10,
        //     metal: 10
        //   }
        // };
        // const newGameBoard = {
        //   board: board,
        //   gameIndex: gameIndex,
        //   room: room
        // }
        // io.to(room).emit('newGame', newGameBoard);

      }
    } else {
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board); // if move is to unoccupied hex, execute move
      let move = {
        originIndex: originIndex,
        updatedOrigin: updatedOrigin,
        targetIndex: targetIndex,
        updatedTarget: updatedTarget
      };
      // await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer); // updates the original hex and new hex in the db for the current player

      // console.log('-------- master origin: ', masterOrigin)
      // console.log('-------- updated target: ', updatedTarget)
      // console.log('-------- current player: ', currentPlayer)

      await io.to(room).emit('move', move);
    }
  } else {
    // if move request is not legal, send socket failure message, cheating detected
    await io.to(room).emit('failure');
  }
};

const checkLegalMove = (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, masterOrigin, masterTarget, cb) => { // to check move legality,
  let isLegal = false;
  if (masterOrigCs[0] === origCs[0] && masterOrigCs[1] === origCs[1] && masterOrigCs[2] === origCs[2] && // make sure all coordinates match between origin
      masterTarCs[0] === tarCs[0] && masterTarCs[1] === tarCs[1] && masterTarCs[2] === tarCs[2]  ) { // and target **********NEED TO ADD CHECK TO MAKE SURE RESOURCE COUNTS AND UNIT COUNTS MATCH
        if (masterOrigin.archers === updatedOrigin.archers + updatedTarget.archers &&
        masterOrigin.knights === updatedOrigin.knights + updatedTarget.knights &&
        masterOrigin.swordsmen === updatedOrigin.swordsmen + updatedTarget.swordsmen) {
          isLegal = true;
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
}

const checkForCollision = async (originIndex, targetIndex, gameIndex, room) => {
  let game = games[gameIndex].board;
  // let game = await db.getGameBoard(room, gameIndex);

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

const updateHexes = async (originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board) => {
  // console.log('************************ BOARD IN UPDATE HEXES ************************', board[0], '************************ END OF BOARD IN UPDATE HEXES ************************');
  games[gameIndex].board[originIndex] = updatedOrigin;
  games[gameIndex].board[targetIndex] = updatedTarget; // This is what will happen on an ordinary move
  currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1'; // then player will toggle
  await reinforceHexes(gameIndex, currentPlayer, targetIndex, room, board); // then check to see if there are reinforcements
}


const resolveCombat = (originIndex, targetIndex, gameIndex, updatedOrigin, updatedTarget, currentPlayer) => { // if combat,
  let attacker = updatedTarget // get attacking hex
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

  let swordsMenKnight = attacker.swordsmen - defender.knights;
  let knightsArchers = attacker.knights - defender.archers;
  let archerSwordsmen = attacker.archers - defender.swordsmen;
  let attackerSwordsmen;
  let attackerKnights;
  let attackerArchers;
  let defenderSwordsmen;
  let defenderKnights;
  let defenderArchers;

  if (swordsMenKnight > 0) {
    attackerSwordsmen = swordsMenKnight;
    defenderKnights = 0;
  } else {
    attackerSwordsmen = 0;
    defenderKnights = Math.abs(attackerSwordsmen);
  }

  if (knightsArchers > 0) {
    attackerKnights = knightsArchers;
    let defenderArchers = 0;
  } else {
    attackerKnights = 0;
    defenderArchers = Math.abs(knightsArchers);
  }

  if (archerSwordsmen > 0) {
    attackerArchers = archerSwordsmen;
    defenderSwordsmen = 0;
  } else {
    attackerArchers = 0;
    defenderSwordsmen = Math.abs(archerSwordsmen);
  }

  let defendingArmy = defenderSwordsmen + defenderArchers + defenderKnights;
  let attackingArmy = attackerArchers + attackerSwordsmen + attackerKnights;

  if (defendingArmy > attackingArmy) {
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
  } else { // tie goes to attacker
    attackerDidWin = true;
    updatedTarget = {
      ...updatedTarget,
      swordsmen: attackerSwordsmen,
      knights: attackerKnights,
      archers: attackerArchers,
      player: attackerPlayer
    }
  }

  updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer); // update the board

  return {
    isOver: attackerDidWin ? checkForWin(defenderPlayer, attackerPlayer, gameIndex) : false,
    updatedOrigin: updatedOrigin,
    updatedTarget: updatedTarget
  }
}

const checkForWin = (losingPlayer, winningPlayer, gameIndex) => {
  let isGameOver = true;
  games[gameIndex].board.forEach(hex => {
    if (hex.player === losingPlayer) {
      isGameOver = false;
    }
  })

  if (isGameOver) {
    return winningPlayer;
  }
  return isGameOver;
}

const reinforceHexes = async (gameIndex, currentPlayer, targetIndex, room, board) => {
  let playerResources;
  currentPlayer === 'player1' ? // determine player to give resources to depending on whose turn is starting
  playerResources = games[gameIndex].playerOneResources : // store resource reference to save time typing
  playerResources =  games[gameIndex].playerTwoResources;

  // console.log('---- player resources', playerResources, '----- player ', currentPlayer);

  // let gameBoard = await board;

  // console.log('{{{{{{{{{{{{{{{{{{{ REINFORCE HEX BOARD }}}}}}}}}}}}}}}}}}}}}}}', board[0], '{{{{{{{{{{{{{{{{{{{ END OF REINFORCE HEX BOARD }}}}}}}}}}}}}}}}}}}}}}}');


  let playerId = await currentPlayer[currentPlayer.length - 1];

  // board.forEach(hex => {
  //   console.log('------ hex player = player -----', hex.player, playerId, hex.has_gold);
  //   if (hex.player === playerId) {
  //     if (hex.has_gold) {
  //       // console.log('*********** HEX HAS GOLD *************', hex.hex_id)
  //       db.updateGold(hex, playerId);
  //     }
  //   }
  // });

  // await db.updateResources(room, gameIndex, currentPlayer);

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
// setInterval(deleteOldGames, 86400000)
  // this.deleteGames = setInterval(() => {
  //   // console.log('checking for old games...'); //TODO: Delete console log
  //   axios.patch('/deleteGames')
  //   .catch(err => console.error('err in checking old games:', err));
  // }, 5000);

  //86400000

const buyUnits = (type, player, gameIndex, socketId, room) => {
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
      io.to(room).emit('swordsmen');
      io.to(room).emit('updateResources', {
        playerOneResources: game.playerOneResources,
        playerTwoResources: game.playerTwoResources
      });
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
const PORT = 8080;
const HOST = '0.0.0.0';
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters
