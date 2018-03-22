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
    
    await db.createGame(room, board, gameIndex); // saves the new game & hexes in the databases

    await io.to(room).emit('newGame', newGameBoard); // send game board to user
  } else { // otherwise
    socket.join('*' + roomNum); // create a new room
    io.to(`*${roomNum}`).emit('newGame', 'Waiting on another player to join!'); // and send back a string to initialize for player 1
    roomNum++; // increment room count to assign new rooms
  }

  socket.on('move', data => { // move listener
    moveUnits(data, socket); // pass move data and socket to function to assess move
  })

  socket.on('buy', data => {
    console.log('------ buy data', data)
    buyUnits(data.type, data.player, data.gameIndex, data.socketId, data.room);
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
  // console.log('??????????????????????????? move units data', data);
  // THIS LOGIC WILL MOST LIKELY HAPPEN IN TANDEM WITH THE DATABASE, BUT IS WRITTEN IN LOCAL STORAGE FOR NOW
  let updatedOrigin = await data.updatedOrigin; // new origin object as sent by user
  let originIndex = await data.originIndex; // with its index,
  let updatedTarget = await data.updatedTarget; // same for target
  let targetIndex = await data.targetIndex;
  let gameIndex = await data.gameIndex; // game index to find in storage
  let room = await data.room; // room to send move to

  // let board = games[gameIndex].board; // game board found using above index
  let board = await db.getGameBoard(room, gameIndex); // gets game board from db using above index

  let masterOrigin = await db.getHex(updatedOrigin.index);// origin to be updated/checked against
  // let masterOrigin = await board[originIndex];// origin to be updated/checked against

  let masterTarget = await db.getHex(updatedTarget.index); // same for target
  // let masterTarget = await board[targetIndex]

  // let masterOrigCs = masterOrigin.coordinates; // coordinates of those masters
  let masterOrigCs = [masterOrigin[0].coordinate_0, masterOrigin[0].coordinate_1, masterOrigin[0].coordinate_2]; // coordinates of those masters

  // let masterTarCs = masterTarget.coordinates;
  let masterTarCs = [masterTarget[0].coordinate_0, masterTarget[0].coordinate_1, masterTarget[0].coordinate_2]; // coordinates of those masters

  console.log('[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[ coords ]]]]]]]]]]]]]]]]]]]]]]]]]]')
  console.log('mastertarget.coordinates: ', games[gameIndex].board[targetIndex].coordinates);
  console.log('masterTarCs: ', masterTarCs);
  console.log('masterOrigin.coordinates: ', games[gameIndex].board[originIndex].coordinates);
  console.log('masterOrigCs: ', masterOrigCs);

  let origCs = await updatedOrigin.coordinates; // as well as coordinates of the ones sent by user
  let tarCs = await updatedTarget.coordinates;

  let currentPlayer = await data.currentPlayer; // player whose turn it is
  let socketId = await data.socketId; // socket to send back response if necessary

  let legal = await checkLegalMove(masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget); // assess legality of move
  if (legal) { // if legal move,
    let collision = await checkForCollision(updatedOrigin.index, updatedTarget.index, gameIndex, room); // check for collision
    // let collision = await checkForCollision(originIndex, targetIndex, gameIndex, room); // check for collision
    if (collision) {
      if (collision === 'friendly') { // if collision and collision is friendly,
        await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board); // update hexes without combat occuring

        await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player

        await io.to(room).emit('move', move); // then send back okay to move units
      } else {
        let winner = await resolveCombat(updatedOrigin.index, updatedTarget.index, gameIndex, room); //otherwise, roll for combat
        // let winner = await resolveCombat(originIndex, targetIndex, gameIndex, room); //otherwise, roll for combat
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

        // TODO: mark game as completed

        const board = await gameInit(5, 4); // the reinit board
        gameIndex = uuidv4();

        games[gameIndex] = { board: board, playerOneResources: { gold: 10, wood: 10, metal: 10 }, playerTwoResources: { gold: 10, wood: 10, metal: 10 } };

        const newGameBoard = {
          board: board,
          gameIndex: gameIndex,
          room: room
        };

        await db.createGame(room, board, gameIndex); // Creates and saves new game to the db

        await io.to(room).emit('newGame', newGameBoard);
      }
    } else {
      await updateHexes(originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board); // if move is to unoccupied hex, execute move
      let move = await { 
        originIndex: originIndex, 
        updatedOrigin: updatedOrigin, 
        targetIndex: targetIndex, 
        updatedTarget: updatedTarget
      };

      await db.updateDbHexes(masterOrigin, updatedTarget, currentPlayer, updatedOrigin); // updates the original hex and new hex in the db for the current player

      await io.to(room).emit('move', move);
    }
  } else { // if move request is not legal, send socket failure message, cheating detected
    // console.log('************************ CHEATING ***********************')
    // console.log('-------- master origin: ', masterOrigin);
    // console.log('-------- updated target: ', updatedTarget);
    // console.log('-------- updated origin: ', updatedOrigin);
    // console.log('-------- current player: ', currentPlayer);
    
    await io.to(room).emit('failure');
  }
};

const checkLegalMove = async (masterOrigCs, origCs, updatedOrigin, masterTarCs, tarCs, updatedTarget, cb) => { // to check move legality,
  // TODO: delete console log
  // console.log('-------------------- checking legal move')
  // console.log('master orig cs: ', masterOrigCs);
  // console.log('orig cs: ', origCs)
  // console.log('master tar cs: ', masterTarCs)
  // console.log('tar cs: ', tarCs)

  if (await masterOrigCs[0] === origCs[0] && masterOrigCs[1] === origCs[1] && masterOrigCs[2] === origCs[2] && // make sure all coordinates match between origin
      masterTarCs[0] === tarCs[0] && masterTarCs[1] === tarCs[1] && masterTarCs[2] === tarCs[2] ) { // and target **********NEED TO ADD CHECK TO MAKE SURE RESOURCE COUNTS AND UNIT COUNTS MATCH
        return true;
      } else {
        return false;
      }
}

// const checkForCollision = async (originIndex, targetIndex, gameIndex, room) => {
const checkForCollision = async (originHexIndex, targetHexIndex, gameIndex, room) => {
  // let game = games[gameIndex].board;
  let game = await db.getGameBoard(room, gameIndex);

  let origin = await db.getHex(originHexIndex); // NOTE: returns an object
  // let origin = game[originIndex]; // uses games object on server

  let target = await db.getHex(targetHexIndex); // NOTE: returns an object
  // let target = game[targetIndex]; // uses games object on server

  if (origin[0].player && target[0].player) {
    let collision = '';
    origin[0].player === target[0].player
      ? (collision += 'friendly')
      : (collision += 'opponent'); // if collision, decide if collision is with own units or enemy units
    return collision;
  } else {
    return false;
  }
};

const updateHexes = async (originIndex, updatedOrigin, targetIndex, updatedTarget, gameIndex, currentPlayer, room, board) => {
  games[gameIndex].board[originIndex] = await updatedOrigin;
  games[gameIndex].board[targetIndex] = await updatedTarget; // This is what will happen on an ordinary move

  currentPlayer === 'player1' ? currentPlayer = 'player2' : currentPlayer = 'player1'; // then player will toggle
  await reinforceHexes(gameIndex, currentPlayer, targetIndex, room, board); // then check to see if there are reinforcements
}

const resolveCombat = async (originIndex, targetIndex, gameIndex, room) => {
  // if combat,
  let board = await db.getGameBoard(room, gameIndex); // gets the hexes (NOTE: This returns an object)

  // let attacker = games[gameIndex].board[originIndex]; // get attacking hex / uses games object on server
  let attacker = await db.getHex(originIndex); // get attacking hex (returns an object)

  // let defender = games[gameIndex].board[targetIndex]; // and defending hex / uses games object on server
  let defender = await db.getHex(targetIndex); // and defending hex (returns an object)

  // console.log('Attacker: ', attacker[0].swordsmen, attacker[0].archers, attacker[0].knights)
  // console.log('Defender: ', defender[0].swordsmen, defender[0].archers, defender[0].knights)

  let attackerRoll = await Math.floor(
    Math.random() * 10 +
      attacker[0].swordsmen +
      attacker[0].archers * 2 +
      attacker[0].knights * 4
  );
  let defenderRoll = await Math.floor(
    Math.random() * 10 +
      attacker[0].swordsmen +
      attacker[0].archers * 2 +
      attacker[0].knights * 4
  );

  if (attackerRoll >= defenderRoll) {
    // and determine winner, tie goes to attacker
    return 'attacker';
  } else {
    return 'defender';
  }
};

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

  ////////////////////////// BEGIN DB STUFF //////////////////////////
  let gameBoard = await db.getGameBoard(room, gameIndex);
  let currentPlayerResources = await db.getResources(room, gameIndex, player);

  // console.log(`------------ player resources for ${player}: `, currentPlayerResources[0]);

  if (type === 'swordsmen') { // if buying swordsmen
    // console.log('///////////// LETS BUY SOME ----> SWORDSMEN'); //TODO: delete console log
    if (player === 'player1') { // for player 1
      if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_metal >= 10) { // check if player has enough resources to purchase unit
        db.buySwordsmen(room, gameIndex, player); // update units and resources in the db
        await io.to(socketId).emit('swordsmen');
      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 1 is too poor to buy SWORDSMEN');
        io.to(socketId).emit('not enough resources');
      }
    } else if (player === 'player2') { // else same for player 2
      if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_metal >= 10) {
        db.buySwordsmen(room, gameIndex, player);
        await io.to(socketId).emit('swordsmen');
      } else {
        // if not enough resources
        // console.log('~~~~~~~~~~~ player 2 is too poor to buy SWORDSMEN');
        io.to(socketId).emit('not enough resources');
      }
    }
  }

  if (type === 'archers') { // if buying archers
    // console.log('///////////// LETS BUY SOME ----> ARCHERS');
    if (player === 'player1') { // for player 1
      if (currentPlayerResources[0].p1_gold >= 10 && currentPlayerResources[0].p1_wood >= 20) { // check if player has enough resources to purchase unit
        db.buyArchers(room, gameIndex, player); // update units and resources in the db
        await io.to(socketId).emit('archers');
      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 1 too poor to buy ARCHERS');
        io.to(socketId).emit('not enough resources');
      }
    } else if (player === 'player2') { // else same for player 2
      if (currentPlayerResources[0].p2_gold >= 10 && currentPlayerResources[0].p2_wood >= 20) {
        db.buyArchers(room, gameIndex, player);
        await io.to(socketId).emit('archers');
      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 2 too poor to buy ARCHERS');
        io.to(socketId).emit('not enough resources');
      }
    }
  }

  if (type === 'knights') { // if buying knights
    // console.log('///////////// LETS BUY SOME ----> KNIGHTS');
    if (player === 'player1') { // for player 1
      if (currentPlayerResources[0].p1_gold >= 20 && currentPlayerResources[0].p1_wood >= 20 && currentPlayerResources[0].p1_metal >= 20) {
        // check if player has enough resources to purchase unit
        db.buyKnights(room, gameIndex, player); // update units and resources in the db
        await io.to(socketId).emit('knights');
      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 1 too poor to buy KNIGHTS');
        io.to(socketId).emit('not enough resources');
      }
    } else if (player === 'player2') { // else same for player 2
      if (currentPlayerResources[0].p2_gold >= 20 && currentPlayerResources[0].p2_wood >= 20 && currentPlayerResources[0].p2_metal >= 20) {
        db.buyKnights(room, gameIndex, player);
        await io.to(socketId).emit('knights');
      } else { // if not enough resources
        // console.log('~~~~~~~~~~~ player 2 too poor to buy KNIGHTS');
        io.to(socketId).emit('not enough resources');
      }
    }
  }
  //////////////////////////// END OF DB STUFF //////////////////////////

  //////////////////////////// SERVER STUFF USING GAME OBJECT //////////////////////////
  // let game = await games[gameIndex], resources;
  // player === 'player1' ? resources = game.playerOneResources : resources = game.playerTwoResources;
  // if (type === 'swordsmen') {
  //   if (resources.gold >= 10 && resources.metal >= 10) {
  //     resources.gold -= 10;
  //     resources.metal -= 10;
  //     await game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.swordsmen += 10;
  //       }
  //     })
  //     await io.to(socketId).emit('swordsmen');
  //   } else {
  //     await io.to(socketId).emit('not enough resources');
  //   }
  // } else if (type === 'archers') {
  //   if (resources.gold >= 10 && resources.wood >= 20) {
  //     resources.gold -= 10;
  //     resources.wood -= 20;
  //     await game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.archers += 10;
  //       }
  //     })
  //     await io.to(socketId).emit('archers');
  //   } else {
  //     await io.to(socketId).emit('not enough resources');
  //   }
  // } else if (type === 'knights') {
  //   if (resources.gold >= 20 && resources.wood >= 20 && resources.metal >= 20) {
  //     resources.gold -= 20;
  //     resources.wood -= 20;
  //     resources.metal -= 20;
  //     await game.board.forEach(hex => {
  //       if (hex.player === player) {
  //         hex.knights += 10;
  //       }
  //     })
  //     await io.to(socketId).emit('knights');
  //   } else {
  //     await io.to(socketId).emit('not enough resources');
  //   }
  // }
}

app.get('/*', (req, res) => res.sendfile('/'));

//////////////////////////////////////////////////
// TODO: Take out this section - JUST FOR TESTING
app.post('/users', (req, res) => {
  // console.log('user req.body', req.body);
  db.addUser(req.body.username, req.body.email, req.body.password);
  res.end();
})
//////////////////////////////////////////////////

// io.listen(process.env.PORT || 3000);
server.listen(process.env.PORT || 3000, function () {
  console.log('listening on port 3000!');
});

// Game State starters